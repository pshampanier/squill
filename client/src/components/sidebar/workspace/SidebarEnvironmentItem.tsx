import { Environment } from "@/resources/workspace/environment";

import SidebarItem from "../SidebarItem";

import ServerIcon from "@/icons/server.svg?react";

type SidebarEnvironmentItemProps = {
  env: Readonly<Environment>;
};

export default function SidebarEnvironmentItem({ env }: SidebarEnvironmentItemProps) {
  return <SidebarItem icon={ServerIcon} label={env.name} collapsible />;
}
