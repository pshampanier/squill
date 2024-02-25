import { useContext } from "react";
import { SettingsContext } from "@/components/spaces/settings/SettingsSpace";
import SettingsPage from "@/components/spaces/settings/SettingsPage";
import { MinimapValue, RenderWhitespaceValue } from "@/models/users";
import Dropdown from "@/components/core/Dropdown";

export default function SettingsPageEditor() {
  const { userSettings, updateUserSettings } = useContext(SettingsContext);

  return (
    <SettingsPage title="Editor settings">
      <SettingsPage.Setting title="Minimap" description="Controls whether the minimap is displayed or not.">
        <Dropdown
          defaultValue={userSettings.editorSettings.minimap}
          onChange={(value) => {
            updateUserSettings({ editorSettings: { minimap: value as MinimapValue } });
          }}
        >
          <Dropdown.Option label="Show" value="show" />
          <Dropdown.Option label="Hide" value="hide" />
          <Dropdown.Option label="Auto" value="auto" />
        </Dropdown>
      </SettingsPage.Setting>
      <SettingsPage.Setting title="White spaces" description="Controls how to render the white spaces.">
        <Dropdown
          defaultValue={userSettings.editorSettings.renderWhitespace}
          onChange={(value) => {
            updateUserSettings({ editorSettings: { renderWhitespace: value as RenderWhitespaceValue } });
          }}
        >
          <Dropdown.Option label="All" value="all" />
          <Dropdown.Option label="None" value="none" />
          <Dropdown.Option label="Boundary" value="boundary" />
          <Dropdown.Option label="Selection" value="selection" />
          <Dropdown.Option label="Trailing" value="trailing" />
        </Dropdown>
      </SettingsPage.Setting>
    </SettingsPage>
  );
}

// const RENDER_WHITESPACE = ["all", "none", "boundary", "selection", "trailing"] as const;
