import { TableDensity, TableDividers, TableOverscan, TableSettings } from "@/models/user-settings";
import { Setting } from "./SettingsPage";
import Switch from "@/components/core/Switch";
import Dropdown from "@/components/core/Dropdown";
import Input from "@/components/core/Input";
import { DeepPartial } from "@/utils/types";

type TableSettingsInputsProps = {
  mode: "history" | "table";
  tableSettings: TableSettings;
  onSettingsChanged: (settings: DeepPartial<TableSettings>) => void;
};

export default function TableSettingsInputs({ tableSettings, mode, onSettingsChanged }: TableSettingsInputsProps) {
  return (
    <>
      <Setting title="Show row numbers" description="Show the row numbers as the first column in result sets.">
        <Switch
          size="md"
          defaultChecked={tableSettings.showRowNumbers}
          onChange={(e) => {
            onSettingsChanged({ showRowNumbers: e.target.checked });
          }}
        />
      </Setting>
      <Setting title="Density" description="Controls the spacing between the rows.">
        <Dropdown
          defaultValue={tableSettings.density}
          onChange={(value) => {
            onSettingsChanged({ density: value as TableDensity });
          }}
        >
          <Dropdown.Option label="Comfortable" value="comfortable" />
          <Dropdown.Option label="Compact" value="compact" />
        </Dropdown>
      </Setting>
      <Setting title="Dividers" description="Controls rows and cells borders.">
        <Dropdown
          defaultValue={tableSettings.dividers}
          onChange={(value) => {
            onSettingsChanged({ dividers: value as TableDividers });
          }}
        >
          <Dropdown.Option label="None" value="none" />
          <Dropdown.Option label="Rows" value="rows" />
          <Dropdown.Option label="Grid" value="grid" />
        </Dropdown>
      </Setting>
      {mode === "table" && (
        <Setting title="Text columns" description="The default maximum of characters to be displayed in a text column.">
          <Input
            defaultValue={tableSettings.maxLength}
            type="number"
            min={10}
            max={1000}
            required
            onChange={(e) => {
              onSettingsChanged({ maxLength: parseInt(e.target.value) });
            }}
          />
        </Setting>
      )}
      {mode === "table" && (
        <Setting
          title="Overscan"
          description="Controls how a table will pre-render rows not yet visible to provide a better experience when scrolling."
        >
          <Dropdown
            defaultValue={tableSettings.overscan}
            onChange={(value) => {
              onSettingsChanged({ overscan: value as TableOverscan });
            }}
          >
            <Dropdown.Option label="Small" value="small" />
            <Dropdown.Option label="Medium" value="medium" />
            <Dropdown.Option label="Large" value="large" />
          </Dropdown>
        </Setting>
      )}
    </>
  );
}
