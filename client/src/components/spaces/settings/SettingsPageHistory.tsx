import { tableFromIPC } from "apache-arrow";
import { useContext, useEffect, useMemo, useState } from "react";
import { TableDensity, TableDividers } from "@/models/user-settings";
import { ArrowDataFrame } from "@/utils/dataframe";
import { SettingsContext } from "@/components/spaces/settings/SettingsSpace";
import SettingsPage, { Settings, Setting, SettingsPanel } from "@/components/spaces/settings/SettingsPage";
import Switch from "@/components/core/Switch";
import Dropdown from "@/components/core/Dropdown";
import ArrowTableView from "@/components/dataset/arrow-table-view";
import DATASET_URL from "@/assets/datasets/persons.arrow?url";

export default function SettingsPageTableView() {
  const [dataframe, setDataframe] = useState<ArrowDataFrame | null>(null);
  const { userSettings, updateUserSettings } = useContext(SettingsContext);
  useEffect(() => {
    fetch(DATASET_URL)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => {
        const table = tableFromIPC(new Uint8Array(arrayBuffer));
        setDataframe(new ArrowDataFrame(table));
      });
  }, []);

  // Get the first few rows to display in the preview
  const rows = useMemo(() => {
    if (!dataframe) {
      return null;
    }
    return dataframe.slice(0, userSettings.historySettings.maxRows);
  }, [dataframe, userSettings.historySettings.maxRows]);

  return (
    <SettingsPage title="History settings">
      <Settings>
        <Setting
          title="Number of rows to preview"
          description="The maximum number of rows to display in the history for a result set."
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
        <Setting title="Show row numbers" description="Show the row numbers as the first column in result sets.">
          <Switch
            size="sm"
            defaultChecked={userSettings.historySettings.tableSettings.showRowNumbers}
            onChange={(e) => {
              updateUserSettings({ historySettings: { tableSettings: { showRowNumbers: e.target.checked } } });
            }}
          />
        </Setting>
        <Setting title="Density" description="Controls the spacing between the rows.">
          <Dropdown
            defaultValue={userSettings.historySettings.tableSettings.density}
            onChange={(value) => {
              updateUserSettings({ historySettings: { tableSettings: { density: value as TableDensity } } });
            }}
          >
            <Dropdown.Option label="Comfortable" value="comfortable" />
            <Dropdown.Option label="Compact" value="compact" />
          </Dropdown>
        </Setting>
        <Setting title="Dividers" description="Controls rows and cells borders.">
          <Dropdown
            defaultValue={userSettings.historySettings.tableSettings.dividers}
            onChange={(value) => {
              updateUserSettings({ historySettings: { tableSettings: { dividers: value as TableDividers } } });
            }}
          >
            <Dropdown.Option label="None" value="none" />
            <Dropdown.Option label="Rows" value="rows" />
            <Dropdown.Option label="Grid" value="grid" />
          </Dropdown>
        </Setting>
      </Settings>
      <SettingsPanel>
        <ArrowTableView settings={userSettings.historySettings.tableSettings} rows={rows} schema={dataframe?.schema} />
      </SettingsPanel>
    </SettingsPage>
  );
}
