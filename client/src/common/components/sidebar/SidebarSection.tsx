import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  label: string;
};

export default function SidebarSection({ children, label }: Props) {
  return (
    <div className="space-y-1 ">
      <label className="px-3 text-xs text-gray-500 uppercase dark:text-gray-400">
        {label}
      </label>
      {children}
    </div>
  );
}
