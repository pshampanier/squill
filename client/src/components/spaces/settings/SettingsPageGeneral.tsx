import { env } from "@/utils/env";
import { useContext } from "react";
import { SettingsContext } from "@/components/spaces/settings/SettingsSpace";
import SettingsPage, { Setting } from "@/components/spaces/settings/SettingsPage";
import ButtonGroup from "@/components/core/ButtonGroup";
import Switch from "@/components/core/Switch";

import LightIcon from "@/assets/icons/theme-light.svg?react";
import DarkIcon from "@/assets/icons/theme-dark.svg?react";
import LinuxIcon from "@/assets/icons/linux-logo.svg?react";
import WindowsIcon from "@/assets/icons/windows-logo.svg?react";
import AppleIcon from "@/assets/icons/apple-logo.svg?react";
import { ColorScheme } from "@/models/users";
import Dropdown from "@/components/core/Dropdown";
import { NullValues } from "@/models/user-settings";

const OperatingSystemsIcon =
  env.platform === "macos" ? AppleIcon : env.platform === "windows" ? WindowsIcon : LinuxIcon;

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
          size="md"
        >
          <ButtonGroup.Item label="light" name="light" icon={LightIcon} />
          <ButtonGroup.Item label="dark" name="dark" icon={DarkIcon} />
          <ButtonGroup.Item label="auto" name="auto" icon={OperatingSystemsIcon} />
        </ButtonGroup>
      </SettingsPage.Setting>
      <SettingsPage.Setting title="Show favorites" description="Show favorites in the sidebar.">
        <Switch
          size="md"
          defaultChecked={userSettings.showFavorites}
          onChange={(e) => {
            updateUserSettings({ showFavorites: e.target.checked });
          }}
        />
      </SettingsPage.Setting>
      <Setting title="Null values" description="Controls how null values are displayed.">
        <Dropdown
          defaultValue={userSettings.nullValues}
          onChange={(value) => {
            const nullValues = value as NullValues;
            updateUserSettings({ nullValues });
          }}
        >
          <Dropdown.Option label="null" value="null_lowercase" />
          <Dropdown.Option label="NULL" value="null_uppercase" />
          <Dropdown.Option label="(empty)" value="empty" />
          <Dropdown.Option label="n/a" value="not_available_lowercase" />
          <Dropdown.Option label="N/A" value="not_available_uppercase" />
          <Dropdown.Option label="- (dash)" value="dash" />
        </Dropdown>
      </Setting>
    </SettingsPage>
  );
}
