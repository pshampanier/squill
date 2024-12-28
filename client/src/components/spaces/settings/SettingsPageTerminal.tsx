import { useContext } from "react";
import { SettingsContext } from "@/components/spaces/settings/SettingsSpace";
import SettingsPage from "@/components/spaces/settings/SettingsPage";
import Dropdown from "@/components/core/Dropdown";
import { MonacoEditorCursorStyle, MonacoEditorWhitespace } from "@/models/user-settings";
import Input from "@/components/core/Input";
import Switch from "@/components/core/Switch";

export default function SettingsPageTerminal() {
  const { userSettings, updateUserSettings } = useContext(SettingsContext);

  return (
    <SettingsPage title="Terminal settings">
      <SettingsPage.Setting title="Cursor style" description="Controls the style of the cursor in the terminal.">
        <Dropdown
          defaultValue={userSettings.terminalSettings.editorSettings.cursorStyle}
          onChange={(value) => {
            updateUserSettings({
              terminalSettings: { editorSettings: { cursorStyle: value as MonacoEditorCursorStyle } },
            });
          }}
        >
          <Dropdown.Option label="Line" value="line" />
          <Dropdown.Option label="Block" value="block" />
          <Dropdown.Option label="Underline" value="underline" />
          <Dropdown.Option label="Line (thin)" value="line_thin" />
          <Dropdown.Option label="Block (outline)" value="block_outline" />
          <Dropdown.Option label="Underline (thin)" value="underline_thin" />
        </Dropdown>
      </SettingsPage.Setting>
      <SettingsPage.Setting
        title="Use white spaces for TAB"
        description="If enabled, white spaces will be inserted instead of a tabulation when the TAB key is pressed."
      >
        <Switch
          size="md"
          defaultChecked={userSettings.terminalSettings.editorSettings.insertSpaces}
          onChange={(e) => {
            updateUserSettings({ terminalSettings: { editorSettings: { insertSpaces: e.target.checked } } });
          }}
        />
        <Input
          className="w-full"
          type="number"
          defaultValue={userSettings.terminalSettings.editorSettings.tabSize}
          min={1}
          max={8}
          required
          disabled={!userSettings.terminalSettings.editorSettings.insertSpaces}
          onChange={(value) => {
            updateUserSettings({
              terminalSettings: { editorSettings: { tabSize: value.target.valueAsNumber } },
            });
          }}
        />
      </SettingsPage.Setting>
      <SettingsPage.Setting title="White spaces" description="Controls how to render the white spaces.">
        <Dropdown
          defaultValue={userSettings.terminalSettings.editorSettings.whitespace}
          onChange={(value) => {
            updateUserSettings({
              terminalSettings: { editorSettings: { whitespace: value as MonacoEditorWhitespace } },
            });
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
