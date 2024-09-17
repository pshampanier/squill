/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 ********************************************************************/
import { formatRegExp, serializable } from "@/utils/serializable";
import { QueryExecution } from "@/models/query-execution";


/**
 * The type of a Push Notification.
/// 
/// The type of the notification is used to determine the structure of the notification object.
/// It could be either a message or a query execution.
 */
export const PUSH_MESSAGE_TYPE_VALUES = ["log", "query"] as const;
export type PushMessageType = (typeof PUSH_MESSAGE_TYPE_VALUES)[number];


/**
 * The level of the message sent through a the Push Notification Channel.
 */
export const LOG_LEVEL_VALUES = ["info", "warning", "error"] as const;
export type LogLevel = (typeof LOG_LEVEL_VALUES)[number];



/**
 * A log message sent by the agent to the client through the Push Notification Channel.
 **/
export class Log {
  
  @serializable("string", { format: formatRegExp(LOG_LEVEL_VALUES), required: true })
  level!: LogLevel;
  
  /**
   * The log message.
   **/
  @serializable("string", { required: true })
  message!: string;
  
  constructor(object?: Partial<Log>) {
    Object.assign(this, object);
  }
}


/**
 * A Push Notification sent by the agent to the client through the Notification Channel.
 **/
export class PushMessage {
  
  /**
   * A info/warning/error log message if the type is `log`.
   **/
  @serializable("object", { factory: Log })
  log?: Log;
  
  /**
   * An updated query execution if the type is `query`.
   **/
  @serializable("object", { factory: QueryExecution })
  query?: QueryExecution;
  
  /**
   * A flag indicating if the notification should be displayed to the user.
   **/
  @serializable("boolean", { required: true })
  silent!: boolean;
  
  @serializable("string", { format: formatRegExp(PUSH_MESSAGE_TYPE_VALUES), required: true })
  type!: PushMessageType;
  
  constructor(object?: Partial<PushMessage>) {
    Object.assign(this, object);
    this.log = new Log(object?.log);
    this.query = new QueryExecution(object?.query);
  }
}