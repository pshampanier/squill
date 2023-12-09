type SpaceProps = {
  children?: React.ReactNode;
};

export default function Space({ children }: SpaceProps) {
  return <div className="flex h-screen">{children}</div>;
}
