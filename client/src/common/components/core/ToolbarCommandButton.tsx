import CommandButton from "@/components/core/CommandButton";

type ToolbarCommandButtonProps = {
  command: string;
};

export default function ToolbarCommandButton({ command }: ToolbarCommandButtonProps) {
  const classes = "h-9 p-2 rounded-sm hover:bg-blue-600 text-white";
  return CommandButton({ command, className: classes });
}
