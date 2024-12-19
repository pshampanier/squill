import cx from "classix";
import prettyBytes from "pretty-bytes";
import { Connection, Datasource } from "@/models/connections";
import { forwardRef } from "react";
import { primary as colors } from "@/utils/colors";
import Dropdown from "@/components/core/Dropdown";
import Switch from "@/components/core/Switch";

type DatasourcesFormProps = {
  name?: string;
  className?: string;
  onChange: (connection: Partial<Connection>) => void;
  datasources: Datasource[];
  defaultDatasource: string;
};

/**
 * A form to edit datasources.
 */
const DatasourcesForm = forwardRef<HTMLFormElement, DatasourcesFormProps>((props, ref) => {
  const { name, className, onChange, defaultDatasource, datasources } = props;
  console.debug("Rendering DatasourcesForm", {
    name,
    className,
    onChange,
    defaultDatasource,
    datasources,
  });
  // [...connection.datasources].sort((a, b) => a.name.localeCompare(b.name))
  const classes = cx("mx-1 w-full flex flex-col divide space-y-4", colors("divide"), className);
  return (
    <form ref={ref} name={name} className={cx("w-full h-full", classes)}>
      <div className="flex flex-col w-full gap-2 h-full overflow-hidden">
        {/*
         * Default datasource
         */}
        <div className={cx("flex flex-row flex-none w-full py-2", colors("border"))}>
          <div className="flex flex-col space-y-1">
            <label htmlFor="default_datasource">Default</label>
            <label htmlFor="default_datasource" className="text-xs">
              Choose the datasource to be used when opening this connection.
            </label>
          </div>
          <div className="flex flex-col ml-auto justify-center">
            <Dropdown
              defaultValue={defaultDatasource}
              values={datasources?.map((ds) => ({ value: ds.name, label: ds.name }))}
              onChange={(value) => onChange({ defaultDatasource: value as string })}
            />
          </div>
        </div>
        {/*
         * Show / Hide Datasources
         */}
        <div className={cx("flex flex-row  flex-none w-full py-2 border-t", colors("border"))}>
          <div className="flex flex-col space-y-1">
            <label>User Interface</label>
            <label className="text-xs">Uncheck datasources that should not be shown in the user interface.</label>
          </div>
        </div>
        <div className="flex grow overflow-y-scroll">
          <div className="flex flex-col w-full h-full gap-1">
            {datasources?.map((ds) => (
              <div
                key={ds.name}
                className={cx(
                  "flex flex-row items-center justify-between h-11 select:none rounded p-2 space-x-2",
                  colors("hover:ghost-background"),
                )}
              >
                <label htmlFor={ds.name} className="grow min-w-0 flex-col space-y-1">
                  <div className="select-none cursor-default">{ds.name}</div>
                  <div className="text-xs select-none cursor-default whitespace-nowrap text-ellipsis overflow-hidden">
                    {ds.description}
                  </div>
                </label>
                <span
                  className={cx("select-none cursor-default rounded  px-2 py-1 shrink-0", colors("message:background"))}
                >
                  {prettyBytes(ds.sizeInBytes)}
                </span>
                <Switch
                  defaultChecked={!ds.hidden}
                  id={ds.name}
                  onChange={(e) => {
                    onChange({
                      datasources: datasources.map((d) =>
                        d.name === ds.name ? { ...d, hidden: !e.target.checked } : d,
                      ),
                    });
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </form>
  );
});

DatasourcesForm.displayName = "DatasourcesForm";
export default DatasourcesForm;