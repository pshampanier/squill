import { useCallback, useContext } from "react";
import { TableSettings } from "@/models/user-settings";
import { SettingsContext } from "@/components/spaces/settings/SettingsSpace";
import SettingsPage, { Settings } from "@/components/spaces/settings/SettingsPage";
import { DeepPartial } from "@/utils/types";
import TableSettingsInputs from "@/components/spaces/settings/TableSettingsInputs";
import TableSettingsPreview from "@/components/spaces/settings/TableSettingsPreview";

export default function SettingsPageTable() {
  const { userSettings, updateUserSettings } = useContext(SettingsContext);
  const handleSettingsChanged = useCallback((settings: DeepPartial<TableSettings>) => {
    updateUserSettings({ tableSettings: { ...settings } });
  }, []);

  return (
    <SettingsPage title="Tables settings">
      <Settings>
        <TableSettingsInputs
          tableSettings={userSettings.tableSettings}
          onSettingsChanged={handleSettingsChanged}
          mode="table"
        />
      </Settings>
      <TableSettingsPreview tableSettings={userSettings.tableSettings} />
    </SettingsPage>
  );
}
