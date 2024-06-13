import cx from "classix";
import React, { useCallback } from "react";
import ChevronIcon from "@/icons/chevron-right.svg?react";
import { primary as colors } from "@/utils/colors";

type TimelineProps = {
  children: React.ReactNode;
  className?: string;
};

function Timeline({ children, className }: TimelineProps) {
  const classes = cx("timeline flex flex-col w-full overflow-auto", className);
  return <div className={classes}>{children}</div>;
}

type TimelineGroupProps = {
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
};

function TimelineGroup({ title, children, className, defaultOpen = true }: TimelineGroupProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  const handleToggleOpen = useCallback(() => {
    setOpen((prev) => !prev);
  }, [open]);

  const classes = {
    self: cx("group flex flex-col w-full", className),
    chevron: cx("flex flex-none w-4 h-4 mr-2 transition-transform", !open && "rotate-90", open && "-rotate-90"),
    header: cx(
      "group-header flex flex-row items-center justify-start w-full h-8 text-sm font-semibold",
      colors("background", "text"),
    ),
  };
  return (
    <section className={classes.self}>
      <div className={cx(classes.header)}>
        <button className="flex flex-row space-x-2 h-full items-center" onClick={handleToggleOpen}>
          <div className="flex select-none">{title}</div>
          <ChevronIcon className={classes.chevron} />
        </button>
      </div>
      {open && <div className="group-body">{children}</div>}
    </section>
  );
}

type TimelineItemProps = {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  label?: string;
  title?: React.ReactNode;
  severity?: "message" | "info" | "success" | "warning" | "danger";
};

function TimelineItem({ children, className, icon, label, title, severity = "message" }: TimelineItemProps) {
  const classes = {
    self: cx("item flex flex-col items-start space-x-3 pt-4", className),
    status: {
      self: cx("status", colors(`${severity}:background`, `${severity}:text`)),
      icon: "status-icon",
      label: "status-text",
    },
  };
  return (
    <div className={classes.self}>
      <div className="flex flex-row items-center space-x-2 h-6">
        <div className={classes.status.self}>
          <span className={classes.status.icon}>{icon}</span>
          <span className={classes.status.label}>{label}</span>
        </div>
        <div className="flex flex-row h-full pl-2">{title}</div>
      </div>
      <div className="content flex pl-8 pt-2">{children}</div>
    </div>
  );
}

Timeline.Item = TimelineItem;
Timeline.Group = TimelineGroup;
export default Timeline;
