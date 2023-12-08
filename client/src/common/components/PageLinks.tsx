import React from "react";
import KeyboardShortcut from "./core/KeyboardShortcut";

type CommandLinksProps = {
  children: React.ReactNode;
};

const PageLinks = ({ children }: CommandLinksProps) => {
  return <div className="mt-2">{children}</div>;
};

type LinkProps = {
  children: React.ReactNode;
  shortcuts: [string, string];
};

const Link = ({ children, shortcuts }: LinkProps) => {
  return (
    <dl className="flex text-sm table-row h-6">
      <dt className="table-cell text-right pr-1">
        <a href="#">{children}</a>
      </dt>
      <dd className="table-cell text-left">
        <KeyboardShortcut shortcuts={shortcuts} />
      </dd>
    </dl>
  );
};

PageLinks.Link = Link;

export default PageLinks;
