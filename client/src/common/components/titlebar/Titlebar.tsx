type TitlebarProps = {
  children?: React.ReactNode;
};

export default function Titlebar({ children }: TitlebarProps) {
  return <header className="flex bg-blue-500 space-x-2 h-11 p-1 text-white w-full draggable">{children}</header>;
}
