import Page from "@/components/Page";

type SettingsPageProps = {
  title: string;
  children?: React.ReactNode;
};

function SettingsPage({ title, children }: SettingsPageProps) {
  return (
    <Page className="flex flex-col text-sm overflow-scroll w-full">
      <div className="text-lg font-bold mb-3">{title}</div>
      <div className="flex flex-col space-y-3 w-full">{children}</div>
    </Page>
  );
}

type SettingProps = {
  title: string;
  description: string;
  children?: React.ReactNode;
};

function Setting({ title, description, children }: SettingProps) {
  return (
    <div className="flex flex-row border-t py-2">
      <div className="flex flex-col space-y-1">
        <div>{title}</div>
        <div className="text-xs">{description}</div>
      </div>
      <div className="flex flex-col ml-auto justify-center">{children}</div>
    </div>
  );
}

SettingsPage.Setting = Setting;
export default SettingsPage;
