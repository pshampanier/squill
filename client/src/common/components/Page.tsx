import { ReactNode } from "react";

type Props = {
  children?: ReactNode;
};

export default function Page({ children }: Props) {
  return <div className="flex flex-col flex-1 overflow-hidden bg-white">{children}</div>;
}
