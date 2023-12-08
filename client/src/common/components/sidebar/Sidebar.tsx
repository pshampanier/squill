import { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export default function Sidebar({ children }: Props) {
  return (
    <aside className="flex flex-col w-64 h-full px-5 overflow-y-auto bg-gray-100">
      <div className="flex flex-col justify-between flex-1 mt-6">
        <nav className="space-y-3">{children}</nav>
      </div>
    </aside>
  );
}
