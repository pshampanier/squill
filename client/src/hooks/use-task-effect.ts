import { useEffect, useRef, useState } from "react";

type TaskFunction = () => Promise<void>;
export type TaskStatus = "pending" | "running" | "success" | "error";

type TaskEffect = {
  taskStatus: TaskStatus;
  setTaskStatus: (status: TaskStatus) => void;
  message: Error | string;
  setMessage: (message: string) => void;

  /**
   * Set the async task function to be executed.
   *
   * The task function should return a promise.
   * Setting a new task will automatically run task that changing the task status to "running".
   */
  setTask(task: TaskFunction, message?: string): void;
};

export function useTaskEffect(
  initialStatus: TaskStatus = "pending",
  initialTask?: TaskFunction,
  initialMessage: string = "",
): TaskEffect {
  const [taskStatus, setTaskStatus] = useState<TaskStatus>(initialStatus);
  const [message, setMessage] = useState<Error | string>(initialMessage);

  // The task function is stored in a ref so that it can be updated without causing a re-render.
  const task = useRef<TaskFunction>(initialTask);

  const setTask = (newTask: TaskFunction, message?: string) => {
    task.current = newTask;
    setTaskStatus("running");
    if (message !== undefined) {
      setMessage(message);
    }
  };

  useEffect(() => {
    if (taskStatus === "running") {
      setMessage(initialMessage);
      task
        .current()
        .then(() => {
          setTaskStatus("success");
        })
        .catch((e) => {
          setMessage(e);
          setTaskStatus("error");
        });
    }
  }, [taskStatus]);

  return {
    taskStatus,
    setTaskStatus,
    message,
    setMessage,
    setTask,
  };
}
