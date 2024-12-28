import { useCallback, useContext } from "react";
import { TableSettings } from "@/models/user-settings";
import { SettingsContext } from "@/components/spaces/settings/SettingsSpace";
import SettingsPage, { Settings, Setting } from "@/components/spaces/settings/SettingsPage";
import Dropdown from "@/components/core/Dropdown";
import TableSettingsInputs from "./TableSettingsInputs";
import { DeepPartial } from "@/utils/types";
import TableSettingsPreview from "./TableSettingsPreview";
import Switch from "@/components/core/Switch";

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
          title="Use default tables settings"
          description="Use the default tables settings for all tables displaying a preview in the history."
        >
          <Switch
            size="md"
            defaultChecked={userSettings.historySettings.useDefaultTableSettings}
            onChange={(e) => {
              updateUserSettings({ historySettings: { useDefaultTableSettings: e.target.checked } });
            }}
          />
        </Setting>
        {!userSettings.historySettings.useDefaultTableSettings && (
          <TableSettingsInputs
            tableSettings={userSettings.historySettings.tableSettings}
            onSettingsChanged={handleSettingsChanged}
            mode="history"
          />
        )}
      </Settings>
      {!userSettings.historySettings.useDefaultTableSettings && (
        <TableSettingsPreview
          tableSettings={userSettings.historySettings.tableSettings}
          maxRows={userSettings.historySettings.maxRows}
        />
      )}
    </SettingsPage>
  );
}
