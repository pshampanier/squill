type SpaceProps = {
  children?: React.ReactNode;
};

export default function Space({ children }: SpaceProps) {
  return <div className="flex flex-col h-full w-full">{children}</div>;
}
