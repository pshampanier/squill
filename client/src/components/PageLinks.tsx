import React from "react";
import { KeyboardShortcut } from "@/utils/types";
import Kbd from "@/components/core/Kbd";

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
        <Kbd shortcut={shortcut} />
      </dd>
    </dl>
  );
};

PageLinks.Link = Link;

export default PageLinks;
