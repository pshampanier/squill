import { Environment } from "@/models/environments";

import SidebarItem from "../SidebarItem";

import ServerIcon from "@/icons/server.svg?react";

type SidebarEnvironmentItemProps = {
  env: Readonly<Environment>;
};

export default function SidebarEnvironmentItem({ env }: SidebarEnvironmentItemProps) {
  return <SidebarItem icon={ServerIcon} label={env.name} collapsible />;
}
