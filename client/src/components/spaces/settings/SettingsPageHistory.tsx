import { useCallback, useContext } from "react";
import { TableSettings } from "@/models/user-settings";
import { DeepPartial } from "@/utils/types";
import { SettingsContext } from "@/components/spaces/settings/SettingsSpace";
import Dropdown from "@/components/core/Dropdown";
import ButtonGroup from "@/components/core/ButtonGroup";
import SettingsPage, { Settings, Setting, SubSettings } from "@/components/spaces/settings/SettingsPage";
import TableSettingsInputs from "@/components/spaces/settings/TableSettingsInputs";
import TableSettingsPreview from "@/components/spaces/settings/TableSettingsPreview";

export default function SettingsPageHistory() {
  const { userSettings, updateUserSettings } = useContext(SettingsContext);

  const handleSettingsChanged = useCallback((settings: DeepPartial<TableSettings>) => {
    updateUserSettings({ historySettings: { tableSettings: { ...settings } } });
  }, []);

  return (
    <SettingsPage title="History settings">
      <Settings>
        <Setting
          title="Number of rows to preview"
          description="The maximum number of rows to display in the history for the result set preview."
        >
          <Dropdown
            size="sm"
            defaultValue={userSettings.historySettings.maxRows}
            onChange={(value) => {
              updateUserSettings({ historySettings: { maxRows: Number(value) } });
            }}
          >
            <Dropdown.Option value={10} />
            <Dropdown.Option value={20} />
            <Dropdown.Option value={50} />
            <Dropdown.Option value={80} />
            <Dropdown.Option value={100} />
          </Dropdown>
        </Setting>
        <Setting
          title="Preview tables settings"
          description="Use the default or customize the tables settings for all tables displaying a preview in the history."
        >
          <ButtonGroup
            defaultValue={userSettings.historySettings.useDefaultTableSettings ? "default" : "custom"}
            onChange={(name) => {
              updateUserSettings({ historySettings: { useDefaultTableSettings: name === "default" } });
            }}
          >
            <ButtonGroup.Option name="default" label="Default" />
            <ButtonGroup.Option name="custom" label="Customize" />
          </ButtonGroup>
        </Setting>
        {!userSettings.historySettings.useDefaultTableSettings && (
          <SubSettings>
            <TableSettingsInputs
              tableSettings={userSettings.historySettings.tableSettings}
              onSettingsChanged={handleSettingsChanged}
              mode="history"
            />
            <TableSettingsPreview
              tableSettings={userSettings.historySettings.tableSettings}
              maxRows={userSettings.historySettings.maxRows}
            />
          </SubSettings>
        )}
      </Settings>
    </SettingsPage>
  );
}
