import cx from "classix";
import React from "react";

type BreadcrumbProps = {
  className?: string;
  children: React.ReactNode;
};

export default function Breadcrumb({ className, children }: BreadcrumbProps) {
  const classes = {
    nav: cx("flex justify-between", className),
    ol: "inline-flex items-center",
  };

  const lastIndex = React.Children.count(children) - 1;
  return (
    <nav className={classes.nav} data-component="breadcrumb">
      <ol className={classes.ol}>
        {React.Children.map(children, (child, index) => (
          <>
            <li key={index}>{child}</li>
            {index < lastIndex && <span className="mx-2 select-none">/</span>}
          </>
        ))}
      </ol>
    </nav>
  );
}
