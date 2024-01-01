import { useClasses } from "@/utils/classes";

type SwitchProps = {
  id?: string;
  size?: "xs" | "sm" | "md" | "lg";
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function Switch({ id, size, defaultChecked, disabled, onChange }: SwitchProps) {
  const classes = useClasses([
    size === "xs" && "w-[40px] h-[22px] before:w-[18px] before:h-[18px]",
    size === "sm" && "w-11 h-6 before:w-5 before:h-5",
    (size === "md" || !size) && "w-[3.25rem] h-7 before:w-6 before:h-6",
    size === "lg" && "w-[4.25rem] h-9 before:w-8 before:h-8",
    "relative appearance-none p-px decoration-0 text-transparent rounded-full cursor-pointer",
    "border border-solid border-transparent",
    "transition-colors ease-in-out duration-200",
    "before:inline-block before:bg-white before:rounded-full before:shadow before:ring-0 before:transform before:transition before:ease-in-out before:duration-200 before:translate-x-0",
    "disabled:opacity-50 disabled:pointer-events-none",
    "focus:ring-blue-600 focus:checked:border-blue-600",
    "checked:bg-none checked:border-blue-600",
    "checked:text-blue-600 checked:before:bg-blue-200 checked:before:translate-x-full",
    { light: "bg-gray-100" },
    { dark: "bg-gray-800 border-gray-700 checked:bg-blue-500 checked:border-blue-500 checked:before:bg-blue-200" },
    { dark: "focus:ring-offset-gray-600 before:bg-gray-400" },
  ]);

  return (
    <input
      id={id}
      type="checkbox"
      className={classes}
      disabled={disabled}
      defaultChecked={defaultChecked}
      onChange={onChange}
    />
  );
}
