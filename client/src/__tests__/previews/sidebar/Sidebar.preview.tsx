import Sidebar from "@/components/sidebar/Sidebar";
import PreviewBox from "../PreviewBox";
import SidebarSection from "@/components/sidebar/SidebarSection";
import SidebarItem from "@/components/sidebar/SidebarItem";

import FolderIcon from "@/icons/folder.svg?react";
import UserIcon from "@/icons/user.svg?react";

export default function SidebarPreview() {
  const loaderfn = () => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        resolve();
      }, 5000);
    });
  };

  const loaderfn2 = () => {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        reject();
      }, 1500);
    });
  };

  return (
    <PreviewBox title="Sidebar" className="">
      <Sidebar>
        <SidebarSection label="Characters">
          <SidebarItem icon={FolderIcon} label="McFly" loaderfn={loaderfn} collapsible>
            <SidebarItem icon={UserIcon} label="Marty McFly" loaderfn={loaderfn} />
            <SidebarItem icon={UserIcon} label="George McFly" loaderfn={loaderfn} />
            <SidebarItem icon={UserIcon} label="Lorraine McFly" loaderfn={loaderfn} />
            <SidebarItem icon={UserIcon} label="Dave McFly" loaderfn={loaderfn} />
            <SidebarItem icon={UserIcon} label="Linda McFly" loaderfn={loaderfn} />
            <SidebarItem icon={UserIcon} label="Seamus McFly" loaderfn={loaderfn} />
          </SidebarItem>
          <SidebarItem icon={UserIcon} label="Doc Brown" selected loaderfn={loaderfn} />
          <SidebarItem icon={UserIcon} label="Biff Tannen" locked loaderfn={loaderfn} />
          <SidebarItem icon={UserIcon} label="Jennifer Parker" loaderfn={loaderfn} />
          <SidebarItem icon={UserIcon} label="Einstein" loaderfn={loaderfn} />
          <SidebarItem icon={UserIcon} label="Clara Clayton" loaderfn={loaderfn} />
        </SidebarSection>
        <SidebarSection label="Bonnus">
          <SidebarItem label="DeLorean" loaderfn={loaderfn2} />
          <SidebarItem label="Flux capacitor" locked loaderfn={loaderfn2} />
          <SidebarItem label="Time circuits" />
          <SidebarItem label="Plutonium" />
          <SidebarItem label="Hoverboard" />
          <SidebarItem label="Qui nimium properat, serius ab solvit" locked loaderfn={loaderfn2} />
        </SidebarSection>
      </Sidebar>
    </PreviewBox>
  );
}
