import { SerializedResource } from "@/resources/resources";
import { serializable, serialize } from "@/utils/serializable";
import { AuthenticationMethod, AUTHENTICATION_METHOD_VALUES, Authentication, RefreshToken } from "@/models/auth";
import { SecurityTokens } from "@/models/auth";
import { AuthenticationError, HttpRequestError, UserError } from "@/utils/errors";
import {
  HTTP_HEADER_CONTENT_TYPE,
  HTTP_HEADER_X_REQUEST_ID,
  MEDIA_TYPE_APPLICATION_JSON,
  MEDIA_TYPE_PLAIN_TEXT,
  HTTP_HEADER_X_API_KEY,
} from "@/utils/constants";
import { Driver } from "@/models/drivers";
import { PushMessage, PushMessageType } from "@/models/push-notifications";

const API_PATH = "/api/v1";

/**
 * A handler associated to a push notification subscription.
 */
export type PushNotificationHandler = (message: PushMessage) => void;

type FetchOptions = {
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: string;
};

export class Agent {
  static agent?: Agent;

  /// The URL of the REST API.
  readonly url!: string;

  /// The API key used to authenticate the client.
  readonly apiKey!: string;

  /// A unique identifier of the client.
  /// This identifier is used by the server to associated the web socket connection with the client.
  readonly clientId!: string;

  /// The version of the agent.
  @serializable("string")
  readonly version!: string;

  /// A list of authentication methods supported by the agent.
  @serializable("array", {
    items: { type: "string", options: { format: new RegExp(`^${AUTHENTICATION_METHOD_VALUES.join("|")}$`) } },
  })
  readonly authenticationMethods!: AuthenticationMethod[];

  @serializable("array", { items: { type: "object", options: { factory: Driver } } })
  readonly drivers!: Driver[];

  readonly pushSubscriptions: {
    log: PushNotificationHandler[];
    query: PushNotificationHandler[];
  };

  /// The security token used to authenticate the client.
  private securityTokens: SecurityTokens = null;

  /// The Unix Epoch time (in milliseconds) at which the access token will expire.
  /// If there is no security tokens, this value is undefined.
  private accessTokenExpiresAt: number = 0;

  /// The web socket connection used to receive notifications events from the agent.
  private websocket?: WebSocket;

  private setSecurityTokens(token: SecurityTokens): void {
    this.securityTokens = token;
    this.accessTokenExpiresAt = Date.now() + this.securityTokens.expiresIn * 1000;
  }

  /// Refresh the security token.
  ///
  /// This method will try to refresh the security token using the refresh token. If the security token has successfully
  /// Being refreshed, the new security token is stored in the agent and its expiration date updated. Otherwise an error
  /// is thrown and the current security token is discarded.
  private async refreshToken(): Promise<void> {
    const url = this.url + API_PATH + "/auth/refresh-token";
    const authRefresh = new RefreshToken({ refreshToken: this.securityTokens.refreshToken });
    const response = await fetch(url, {
      method: "POST",
      headers: {
        [HTTP_HEADER_X_API_KEY]: this.apiKey,
        [HTTP_HEADER_CONTENT_TYPE]: MEDIA_TYPE_APPLICATION_JSON,
      },
      body: JSON.stringify(serialize<RefreshToken>(authRefresh)),
    });
    if (response.ok) {
      const contentType = response.headers.get(HTTP_HEADER_CONTENT_TYPE) || MEDIA_TYPE_PLAIN_TEXT;
      this.setSecurityTokens(
        new SerializedResource<SecurityTokens>(contentType, await response.text()).as(SecurityTokens),
      );
    } else {
      this.securityTokens = null;
      this.accessTokenExpiresAt = 0;
      if (response.status === 401 /* Unauthorized */) {
        throw new AuthenticationError();
      } else {
        throw new HttpRequestError(response.status, response.statusText, await response.text());
      }
    }
  }

  constructor(url: string, apiKey: string) {
    this.url = url?.endsWith("/") ? url.slice(0, url.length - 1) : url;
    this.apiKey = apiKey;
    this.clientId = crypto.randomUUID();
    this.pushSubscriptions = {
      log: [],
      query: [],
    };
  }

  private async fetch<T extends object>(
    path: string,
    method: string,
    options?: FetchOptions,
  ): Promise<SerializedResource<T>> {
    try {
      let url = this.url + API_PATH + path;

      if (options && options.query) {
        !url.endsWith("?") && (url += "?");
        url += new URLSearchParams(options.query);
      }

      if (this.accessTokenExpiresAt && this.accessTokenExpiresAt < Date.now()) {
        // The security token has expired, we need to refresh it.
        await this.refreshToken();
      }

      const headers: Record<string, string> = {
        [HTTP_HEADER_X_API_KEY]: this.apiKey,
        ...(this.securityTokens && { Authorization: `Bearer ${this.securityTokens.accessToken}` }),
        ...(options?.body && { [HTTP_HEADER_CONTENT_TYPE]: MEDIA_TYPE_APPLICATION_JSON }),
        ...(options?.headers && options?.headers),
      };

      const response = await fetch(url, {
        method: method,
        headers: headers,
        ...(options?.body && { body: options?.body }),
      });
      if (response.ok) {
        const contentType = response.headers.get(HTTP_HEADER_CONTENT_TYPE) || MEDIA_TYPE_PLAIN_TEXT;
        return new SerializedResource<T>(contentType, await response.text());
      } else if (response.headers.get(HTTP_HEADER_CONTENT_TYPE) === MEDIA_TYPE_APPLICATION_JSON) {
        // The server returned a JSON error message.
        throw new UserError({
          requestId: response.headers.get(HTTP_HEADER_X_REQUEST_ID),
          ...(await response.json()),
        });
      } else if (response.status === 401 /* Unauthorized */) {
        throw new AuthenticationError();
      } else {
        throw new HttpRequestError(response.status, response.statusText, await response.text());
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(error as string);
      }
    }
  }

  async get<T extends object>(path: string, options?: FetchOptions): Promise<SerializedResource<T>> {
    return this.fetch(path, "GET", options);
  }

  async put<B extends object, R extends object>(
    path: string,
    body: B,
    options?: FetchOptions,
  ): Promise<SerializedResource<R>> {
    return this.fetch<R>(path, "PUT", { ...options, body: JSON.stringify(serialize<B>(body)) });
  }

  async post<B extends object | string, R extends object>(
    path: string,
    body: B,
    options?: FetchOptions,
  ): Promise<SerializedResource<R>> {
    if (typeof body === "object" && typeof body !== "string") {
      return this.fetch<R>(path, "POST", { ...options, body: JSON.stringify(serialize(body)) });
    } else {
      return this.fetch<R>(path, "POST", { ...options, body });
    }
  }

  async logon(auth: Authentication): Promise<void> {
    if (auth.method === "user_password") {
      this.setSecurityTokens((await this.post<Authentication, SecurityTokens>("/auth/logon", auth)).as(SecurityTokens));
      this.connectWebSocket();
    } else {
      throw new Error("Not implemented");
    }
  }

  /**
   * Subscribe to push notifications of a given type.
   * The same handler can be used to subscribe to multiple types of notifications.
   */
  subscribeToPushNotifications(type: PushMessageType, handler: PushNotificationHandler): void {
    this.pushSubscriptions[type].push(handler);
  }

  /**
   * Unsubscribe from push notifications of a given type.
   */
  unsubscribeFromPushNotifications(type: PushMessageType, handler: PushNotificationHandler): void {
    this.pushSubscriptions[type] = this.pushSubscriptions[type].filter((h) => h !== handler);
  }

  static async connect(url: string, apiKey: string): Promise<Agent> {
    Agent.agent = (await new Agent(url, apiKey).get<Agent>("/agent")).as(() => new Agent(url, apiKey));
    return Agent.agent;
  }

  private connectWebSocket() {
    const query = `token=${this.securityTokens.accessToken}&api_key=${this.apiKey}&client_id=${this.clientId}`;
    this.websocket = new WebSocket(`${this.url.replace("http", "ws")}${API_PATH}/ws?${query}`);
    this.websocket.addEventListener("open", (event) => {
      console.log("WebSocket is open now.", event);
    });

    this.websocket.addEventListener("message", (event) => {
      console.debug("WebSocket message received:", event.data);
      const message = new SerializedResource<PushMessage>("application/json", event.data).as(PushMessage);
      const subscriptions = this.pushSubscriptions[message.type];
      for (const handler of subscriptions) {
        handler(message);
      }
    });

    this.websocket.addEventListener("close", (event) => {
      console.log("WebSocket is closed now.", event);
    });

    this.websocket.addEventListener("error", (error) => {
      console.error("WebSocket error:", error);
    });
  }
}

export function agent(): Agent {
  if (!Agent.agent) {
    throw new Error("Agent not connected");
  }
  return Agent.agent;
}
