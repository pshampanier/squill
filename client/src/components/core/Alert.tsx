import cx from "classix";
import { ColorsFunction, primary } from "@/utils/colors";
import { ColorsContext } from "@/stores/ColorsContext";
import { useContext } from "react";
import Button from "@/components/core/Button";
import CloseIcon from "@/icons/close.svg?react";
import { SVGIcon } from "@/utils/types";
import WarningIcon from "@/icons/exclamation-triangle.svg?react";
import InfoIcon from "@/icons/information-circle.svg?react";
import MessageIcon from "@/icons/exclamation-circle.svg?react";
import SuccessIcon from "@/icons/check-circle.svg?react";

type AlertSeverity = "message" | "info" | "success" | "warning" | "danger";
type AlertProps = {
  severity: AlertSeverity;
  className?: string;
  children: React.ReactNode;
  colors?: ColorsFunction;
  title?: boolean | string;
  icon?: boolean | SVGIcon;
  onDismiss?: () => void;
  border?: boolean;
};

function Alert({ severity, className, children, title, icon, onDismiss, colors, border }: AlertProps) {
  colors = colors || useContext(ColorsContext) || primary;

  const classes = {
    component: cx(
      "flex flex-row items-top p-4 rounded text-sm space-x-2",
      border && "border border-solid",
      colors(`${severity}:background`, `${severity}:text`, `${severity}:border`),
      className
    ),
    dismiss: cx(
      "flex grow-0 ml-auto w-5 h-5 border-0 p-1 ring-0 outline-none rounded-full hover:bg-transparent dark:hover:bg-transparent",
      colors(`${severity}:text`)
    ),
  };

  if (typeof title === "boolean" && title === true) {
    title = {
      message: "Message",
      info: "Info",
      success: "Success",
      warning: "Warning",
      danger: "Error",
    }[severity];
  }

  const Icon = (() => {
    if (typeof icon !== "boolean") {
      return icon;
    } else if (typeof icon === "boolean" && icon === true) {
      return {
        message: MessageIcon,
        info: InfoIcon,
        success: SuccessIcon,
        warning: WarningIcon,
        danger: MessageIcon,
      }[severity];
    } else {
      return null;
    }
  })();

  return (
    <div className={classes.component} role="alert">
      {icon && <Icon className="flex grow-0 w-5 h-5" />}
      <div className="flex flex-col flex-grow">
        {title && <h1 className="font-bold mb-2">{title}</h1>}
        <div>{children}</div>
      </div>
      {onDismiss && <Button className={classes.dismiss} onClick={onDismiss} variant="ghost" icon={CloseIcon} />}
    </div>
  );
}

export default Alert;
