import { Resource } from "./resource";
import { User } from "./user/user";
import { serializable } from "@/utils/serializable";
import { AuthenticationMethods, AUTHENTICATION_METHODS, AuthRequest, AuthUserPassword } from "@/utils/auth";

const API_PATH = "/api/v1";

type FetchOptions = {
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: string;
};

export class Agent {
  static agent?: Agent;

  readonly url!: string;

  @serializable("string")
  readonly version!: string;

  @serializable("array", {
    items: { type: "string", options: { format: new RegExp(`^${AUTHENTICATION_METHODS.join("|")}$`) } },
  })
  readonly authenticationMethods!: AuthenticationMethods[];

  constructor(url: string) {
    this.url = url?.endsWith("/") ? url.slice(0, url.length - 1) : url;
  }

  private async fetch<T extends object>(path: string, method: string, options?: FetchOptions): Promise<Resource<T>> {
    let url = this.url + API_PATH + path + /** debug **/ (/\.[a-z]+$/.test(path) ? "" : ".json");

    if (options && options.query) {
      !url.endsWith("?") && (url += "?");
      url += new URLSearchParams(options.query);
    }

    const response = await fetch(url, {
      method: method,
      ...(options?.headers && { headers: options?.headers }),
      ...(options?.body && { body: options?.body }),
    });
    if (response.ok) {
      const contentType = response.headers.get("content-type") || "text/plain";
      return new Resource<T>(contentType, await response.text());
    } else if (response.status === 401 /* Unauthorized */) {
      throw new AuthenticationError();
    } else {
      throw new Error(response.statusText);
    }
  }

  async get<T extends object>(path: string, options?: FetchOptions): Promise<Resource<T>> {
    return this.fetch(path, "GET", options);
  }

  async logon(auth: AuthRequest): Promise<User> {
    if (auth.method === "user_password") {
      const { username } = auth.credentials as AuthUserPassword;
      return (await this.get<User>(`/users/${username}/user`)).as(User);
    } else {
      throw new Error("Not implemented");
    }
  }

  static async connect(url: string): Promise<Agent> {
    Agent.agent = (await new Agent(url).get<Agent>("/agent")).as(() => new Agent(url));
    return Agent.agent;
  }
}

export function agent(): Agent {
  if (!Agent.agent) {
    throw new Error("Agent not connected");
  }
  return Agent.agent;
}

export class AuthenticationError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}
