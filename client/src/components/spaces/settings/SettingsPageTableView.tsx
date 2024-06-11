import { useContext, useEffect, useState } from "react";
import { SettingsContext } from "@/components/spaces/settings/SettingsSpace";
import { Density, Dividers } from "@/models/users";
import { TableDataFrame, TableDataFrameFactory } from "@/utils/dataframe";
import SettingsPage, { Settings, Setting, SettingsPanel } from "@/components/spaces/settings/SettingsPage";
import Switch from "@/components/core/Switch";
import Dropdown from "@/components/core/Dropdown";
import TableView from "@/components/dataset/table-view";
import cx from "classix";
import { primary as colors } from "@/utils/colors";

export default function SettingsPageTableView() {
  const [previewData, setPreviewData] = useState<TableDataFrame>(null);
  const { userSettings, updateUserSettings } = useContext(SettingsContext);
  useEffect(() => {
    console.debug("SettingsPageTableView mounted");
    TableDataFrameFactory.fetch("/datasets/simpsons.csv").then((data) => {
      setPreviewData(data);
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
              updateUserSettings({ tableSettings: { density: value as Density } });
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
              updateUserSettings({ tableSettings: { dividers: value as Dividers } });
            }}
          >
            <Dropdown.Option label="None" value="none" />
            <Dropdown.Option label="Rows" value="rows" />
            <Dropdown.Option label="Grid" value="grid" />
          </Dropdown>
        </Setting>
      </Settings>
      <SettingsPanel className={cx("h-96 border", colors("border"))}>
        {previewData && <TableView dataframe={previewData} settings={userSettings.tableSettings} />}
      </SettingsPanel>
    </SettingsPage>
  );
}
