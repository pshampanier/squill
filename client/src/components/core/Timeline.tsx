import cx from "classix";
import React, { useCallback, useEffect, useRef } from "react";
import ChevronIcon from "@/icons/chevron-right.svg?react";
import { primary as colors, secondary as secondaryColors } from "@/utils/colors";

const SCROLL_TO_BOTTOM_THRESHOLD = 50;

type TimelineProps = {
  children: React.ReactNode;
  className?: string;
};

function Timeline({ children, className }: TimelineProps) {
  const scrollBottomOffset = useRef<number>(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const classes = cx("timeline flex flex-col w-full overflow-y-auto overflow-x-hidden", className);

  // - When the component is mounted, scroll to the bottom
  // - When the content is resized, scroll to the bottom if the user is already at the bottom
  useEffect(() => {
    // This element is used to track the size of the content.
    const contentElement = contentRef.current;

    // This function is called when the content is resized.
    const handleResize = (entries: ResizeObserverEntry[]) => {
      for (const entry of entries) {
        if (entry.target === contentElement) {
          if (scrollBottomOffset.current < SCROLL_TO_BOTTOM_THRESHOLD) {
            scrollBottomOffset.current = 0;
            timelineElement.scrollTo({
              top: timelineElement.scrollHeight,
              behavior: "smooth",
            });
          }
        }
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (contentElement) {
      resizeObserver.observe(contentElement);
    }

    // This element is used to track the scroll position.
    const timelineElement = timelineRef.current;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = timelineElement;
      scrollBottomOffset.current = scrollHeight - scrollTop - clientHeight;
    };

    if (timelineElement) {
      // Automatic move to the bottom of the timeline when the component is mounted
      timelineElement.scrollTop = timelineElement.scrollHeight;
      timelineElement.addEventListener("scroll", handleScroll);
    }

    return () => {
      contentElement && resizeObserver.unobserve(contentElement);
      timelineElement?.removeEventListener("scroll", handleScroll);
    };
  }, []);
  return (
    <div ref={timelineRef} className={classes}>
      <div ref={contentRef} className="content">
        {children}
      </div>
    </div>
  );
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
    self: cx("timeline-group flex flex-col w-full", className),
    chevron: cx("flex flex-none w-4 h-4 transition-transform", open && "rotate-90"),
    header: cx(
      "group-header flex flex-row items-center justify-start w-full h-8 text-sm font-semibold rounded pl-2 pr-2 mb-0.5 mt-0.5",
      secondaryColors("background", "text"),
    ),
    body: cx("group-body w-full"),
  };
  return (
    <section className={classes.self}>
      <div className={cx(classes.header)}>
        <button className="flex flex-row h-full w-full items-center space-x-2" onClick={handleToggleOpen}>
          <ChevronIcon className={classes.chevron} />
          <div className="flex select-none capitalize">{title}</div>
        </button>
      </div>
      <div className={classes.body}>{open && children}</div>
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
    self: cx("item flex flex-col items-start space-x-3 pt-4 w-full", className),
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
      <div
        className="content flex pl-8 pt-2"
        style={{ width: "calc(100% - 2rem)" /* 2rem is equivalent pl-8 (32px) */ }}
      >
        {children}
      </div>
    </div>
  );
}

Timeline.Item = TimelineItem;
Timeline.Group = TimelineGroup;
export default Timeline;
