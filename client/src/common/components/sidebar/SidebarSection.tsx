import { ReactNode } from "react";

type Props = {
  children?: ReactNode;
  label: string;
};

export default function SidebarSection({ children, label }: Props) {
  return (
    <div className="flex flex-col space-y-1 w-full">
      <label className="px-2 text-sm font-semibold w-full text-gray-500 uppercase dark:text-gray-400">{label}</label>
      {children && children}
    </div>
  );
}
