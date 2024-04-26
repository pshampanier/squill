import { useEffect, useState } from "react";

type TaskFunction = () => Promise<void>;
export type TaskStatus = "pending" | "running" | "success" | "error";

type TaskEffect = {
  taskStatus: TaskStatus;
  message: Error | string;
  setTaskStatus: (status: TaskStatus) => void;
  setTask(task: TaskFunction): void;
};

export function useTaskEffect(
  initialStatus: TaskStatus,
  initialTask: TaskFunction,
  initialMessage: string
): TaskEffect {
  const [taskStatus, setTaskStatus] = useState<TaskStatus>(initialStatus);
  const [message, setMessage] = useState<Error | string>(initialMessage);
  const [task, setTask] = useState<TaskFunction>(() => initialTask);
  useEffect(() => {
    if (taskStatus === "running") {
      setMessage(initialMessage);
      task()
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
    message,
    setTaskStatus,
    setTask,
  };
}
