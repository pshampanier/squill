import { primary as colors } from "@/utils/colors";
import cx from "classix";

type SettingsPageProps = {
  title: string;
  children?: React.ReactNode;
};

/**
 * Display a page of settings
 */
function SettingsPage({ title, children }: SettingsPageProps) {
  return (
    <div className="flex flex-col text-sm w-full h-full" data-component="settings-page">
      <div className="text-lg font-bold mb-3">{title}</div>
      <div className="flex flex-col space-y-3 w-full overflow-auto">{children}</div>
    </div>
  );
}

/**
 * Display a collection of settings
 */
function Settings({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col space-y-3 w-full max-h-full" data-component="settings">
      {children}
    </div>
  );
}

/**
 * Display a collection of settings related to a parent setting
 */
function SubSettings({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col pl-8 space-y-3 w-full" data-component="sub-settings">
      {children}
    </div>
  );
}

type SettingProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
};

/**
 * Display a setting with a title and description
 */
function Setting({ title, description, children }: SettingProps) {
  return (
    <div className={cx("flex flex-row border-t py-2", colors("border"))} data-component="setting">
      <div className="flex flex-col space-y-1">
        <div>{title}</div>
        <div className="text-xs">{description}</div>
      </div>
      <div className="flex flex-col ml-auto justify-center items-end space-y-2">{children}</div>
    </div>
  );
}

/**
 * Display a panel (usually a preview of the settings)
 */
function SettingsPanel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cx("flex flex-row w-full overflow-hidden", className)} data-component="settings-panel">
      {children}
    </div>
  );
}

SettingsPage.Settings = Settings;
SettingsPage.Setting = Setting;
SettingsPage.Panel = SettingsPanel;
SettingsPage.SubSettings = SubSettings;
export { Settings, Setting, SubSettings, SettingsPanel };
export default SettingsPage;
