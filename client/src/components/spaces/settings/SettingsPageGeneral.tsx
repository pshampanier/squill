import { env } from "@/utils/env";
import { useContext } from "react";
import { SettingsContext } from "@/components/spaces/settings/SettingsSpace";
import SettingsPage from "@/components/spaces/settings/SettingsPage";
import ButtonGroup from "@/components/core/ButtonGroup";
import Switch from "@/components/core/Switch";

import LightIcon from "@/assets/icons/theme-light.svg?react";
import DarkIcon from "@/assets/icons/theme-dark.svg?react";
import LinuxIcon from "@/assets/icons/linux-logo.svg?react";
import WindowsIcon from "@/assets/icons/windows-logo.svg?react";
import AppleIcon from "@/assets/icons/apple-logo.svg?react";
import { ColorScheme } from "@/resources/user/user-settings";

const OperatingSystemsIcon =
  env.plateform === "macos" ? AppleIcon : env.plateform === "windows" ? WindowsIcon : LinuxIcon;

export default function SettingsPageGeneral() {
  const { userSettings, updateUserSettings } = useContext(SettingsContext);

  return (
    <SettingsPage title="General settings">
      <SettingsPage.Setting
        title="Color scheme"
        description="Choose auto to keep the color scheme in sync with your operating system."
      >
        <ButtonGroup
          defaultValue={userSettings.colorScheme}
          onChange={(value) => {
            updateUserSettings({ colorScheme: value as ColorScheme });
          }}
        >
          <ButtonGroup.Item label="light" name="light" icon={LightIcon} />
          <ButtonGroup.Item label="dark" name="dark" icon={DarkIcon} />
          <ButtonGroup.Item label="auto" name="auto" icon={OperatingSystemsIcon} />
        </ButtonGroup>
      </SettingsPage.Setting>
      <SettingsPage.Setting
        title="Show file extensions"
        description="If not selected, file extensions will be only displayed when editing a file name."
      >
        <Switch
          size="sm"
          defaultChecked={userSettings.showFileExtensions}
          onChange={(value) => {
            updateUserSettings({ showFileExtensions: value });
          }}
        />
      </SettingsPage.Setting>
      <SettingsPage.Setting title="Show recently opened" description="Shows recently opened files in the sidebar.">
        <Switch
          size="sm"
          defaultChecked={userSettings.showRecentlyOpened}
          onChange={(value) => {
            updateUserSettings({ showRecentlyOpened: value });
          }}
        />
      </SettingsPage.Setting>
    </SettingsPage>
  );
}
