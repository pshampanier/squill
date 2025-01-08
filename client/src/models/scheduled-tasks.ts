/*********************************************************************
 * THIS CODE IS GENERATED FROM API.YAML BY BUILD.RS, DO NOT MODIFY IT.
 ******************************************************/
import { serializable } from "@/utils/serializable";


/**
 * The name of a scheduled task.
 */
export const SCHEDULED_TASK_NAME_VALUES = ["cleanup_connection_history", "vacuum"] as const;
export type ScheduledTaskName = (typeof SCHEDULED_TASK_NAME_VALUES)[number];

/**
 * The status of a scheduled task.
 */
export const SCHEDULED_TASK_STATUS_VALUES = ["pending", "running", "failed", "completed"] as const;
export type ScheduledTaskStatus = (typeof SCHEDULED_TASK_STATUS_VALUES)[number];

/**
 * A scheduled task.
   * 
   * A task must be unique by its `name` and `entity_id`.
   * If a task is not related to a specific entity, the `entity_id` value stored in database will be `nil` UUID 
   * (i.e., all bits set to zero: `00000000-0000-0000-0000-000000000000`).
   * 
 **/
export class ScheduledTask {
  
  /**
   * The unique identifier of the entity the task is related to (if any).
   **/
  @serializable("string", { format: "uuid", snakeCase: "property" })
  entityId?: string;
  
  /**
   * The process identifier of the agent that executed the task.
   **/
  @serializable("integer", { required: true, min: 0, snakeCase: "property" })
  executedByPid!: number;
  
  /**
   * The name of the scheduled task.
   **/
  @serializable("string", { format: formatRegExp(SCHEDULED_TASK_NAME_VALUES), required: true })
  name!: ScheduledTaskName;
  
  /**
   * The number of retries of the task.
   **/
  @serializable("integer", { required: true, min: 0 })
  retries!: number;
  
  /**
   * The date and time when the task is expected to run.
   **/
  @serializable("datetime", { required: true, snakeCase: "property" })
  scheduledFor!: Date;
  
  /**
   * The status of the task.
   **/
  @serializable("string", { format: formatRegExp(SCHEDULED_TASK_STATUS_VALUES), required: true })
  status!: ScheduledTaskStatus;
  
  constructor(object?: Partial<ScheduledTask>) {
    Object.assign(this, object);
  }
}