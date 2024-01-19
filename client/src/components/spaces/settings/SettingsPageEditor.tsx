import { useContext } from "react";
import { SettingsContext } from "@/components/spaces/settings/SettingsSpace";
import SettingsPage from "@/components/spaces/settings/SettingsPage";
import ButtonGroup from "@/components/core/ButtonGroup";
import { MinimapValue } from "@/resources/user/user-settings";

export default function SettingsPageEditor() {
  const { userSettings, updateUserSettings } = useContext(SettingsContext);

  return (
    <SettingsPage title="Editor settings">
      <SettingsPage.Setting title="Minimap" description="Controls whether the minimap is displayed or not.">
        <ButtonGroup
          defaultValue={userSettings.editor.minimap}
          onChange={(value) => {
            updateUserSettings({ editor: { minimap: value as MinimapValue } });
          }}
        >
          <ButtonGroup.Item label="show" name="show" />
          <ButtonGroup.Item label="hide" name="hide" />
          <ButtonGroup.Item label="auto" name="auto" />
        </ButtonGroup>
      </SettingsPage.Setting>
    </SettingsPage>
  );
}