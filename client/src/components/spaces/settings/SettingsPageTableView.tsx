import { tableFromIPC } from "apache-arrow";
import { useContext, useEffect, useState } from "react";
import { NullValues, TableDensity, TableDividers, TableOverscan } from "@/models/user-settings";
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
  return (
    <SettingsPage title="Tables settings">
      <Settings>
        <Setting title="Show row number" description="Show the row number as the first column if the table.">
          <Switch
            size="sm"
            defaultChecked={userSettings.tableSettings.showRowNumbers}
            onChange={(e) => {
              updateUserSettings({ tableSettings: { showRowNumbers: e.target.checked } });
            }}
          />
        </Setting>
        <Setting title="Density" description="Controls the spacing between the rows.">
          <Dropdown
            defaultValue={userSettings.tableSettings.density}
            onChange={(value) => {
              updateUserSettings({ tableSettings: { density: value as TableDensity } });
            }}
          >
            <Dropdown.Option label="Comfortable" value="comfortable" />
            <Dropdown.Option label="Compact" value="compact" />
          </Dropdown>
        </Setting>
        <Setting title="Dividers" description="Controls rows and cells borders.">
          <Dropdown
            defaultValue={userSettings.tableSettings.dividers}
            onChange={(value) => {
              updateUserSettings({ tableSettings: { dividers: value as TableDividers } });
            }}
          >
            <Dropdown.Option label="None" value="none" />
            <Dropdown.Option label="Rows" value="rows" />
            <Dropdown.Option label="Grid" value="grid" />
          </Dropdown>
        </Setting>
        <Setting title="Null values" description="Controls how null values are displayed.">
          <Dropdown
            defaultValue={userSettings.tableSettings.nullValues}
            onChange={(value) => {
              updateUserSettings({ tableSettings: { nullValues: value as NullValues } });
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
      </Settings>
      <Setting title="Overscan" description="Optimize the rendering of the table.">
        <Dropdown
          defaultValue={userSettings.tableSettings.overscan}
          onChange={(value) => {
            updateUserSettings({ tableSettings: { overscan: value as TableOverscan } });
          }}
        >
          <Dropdown.Option label="Small" value="small" />
          <Dropdown.Option label="Medium" value="medium" />
          <Dropdown.Option label="Large" value="large" />
        </Dropdown>
      </Setting>
      <SettingsPanel className="h-96">
        <ArrowTableView settings={userSettings.tableSettings} rows={dataframe} schema={dataframe?.schema} />
      </SettingsPanel>
    </SettingsPage>
  );
}
