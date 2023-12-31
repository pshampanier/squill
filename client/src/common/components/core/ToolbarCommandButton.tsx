import CommandButton from "@/components/core/CommandButton";

type ToolbarCommandButtonProps = {
  command: string;
};

export default function ToolbarCommandButton({ command }: ToolbarCommandButtonProps) {
  const classes = "w-8 h-8 p-1 rounded hover:bg-blue-600 text-white";
  return CommandButton({ command, className: classes });
}
