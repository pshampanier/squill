type TitlebarProps = {
  children?: React.ReactNode;
};

export default function Titlebar({ children }: TitlebarProps) {
  return <header className="bg-blue-500 h-11 p-1 text-white draggable">{children}</header>;
}
