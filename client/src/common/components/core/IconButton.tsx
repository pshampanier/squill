import { useClasses } from "@/utils/classes";

type Props = {
  className?: string;
  icon: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  tooltip?: string;
  onClick: () => void;
};

export function IconButton({ icon, onClick, className }: Props) {
  const Icon = icon;

  const classes = useClasses(["flex items-center justify-center", className]);

  return (
    <button onClick={onClick} className={classes}>
      <Icon className="w-8 h-8" />
    </button>
  );
}
