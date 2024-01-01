import React from "react";
import KBD from "@/components/core/KBD";
import { KeyboardShortcut } from "@/utils/types";

type CommandLinksProps = {
  children: React.ReactNode;
};

const PageLinks = ({ children }: CommandLinksProps) => {
  return <div className="mt-2">{children}</div>;
};

type LinkProps = {
  children: React.ReactNode;
  shortcut: KeyboardShortcut;
};

const Link = ({ children, shortcut }: LinkProps) => {
  return (
    <dl className="text-sm table-row h-6">
      <dt className="table-cell text-right pr-1 align-middle">
        <a href="#">{children}</a>
      </dt>
      <dd className="table-cell text-left">
        <KBD shortcut={shortcut} />
      </dd>
    </dl>
  );
};

PageLinks.Link = Link;

export default PageLinks;
