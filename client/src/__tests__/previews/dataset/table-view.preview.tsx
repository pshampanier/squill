import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tableFromIPC } from "apache-arrow";
import { ArrowDataFrame } from "@/utils/dataframe";
import Switch from "@/components/core/Switch";
import Dropdown from "@/components/core/Dropdown";
import ArrowTableView, { ArrowTableViewComponent } from "@/components/dataset/arrow-table-view";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import { NullValues, TableDensity, TableDividers, TableSettings } from "@/models/user-settings";
import DATASET_URL from "@/assets/datasets/persons.arrow?url";

export default function TableViewPreview() {
  const refTableViewComponent = useRef<ArrowTableViewComponent>(null);
  const [settings, setSettings] = useState<TableSettings>(
    new TableSettings({
      density: "compact",
      dividers: "grid",
      showRowNumbers: true,
      nullValues: "dash",
      overscan: "medium",
      maxLength: 250,
    }),
  );

  useEffect(() => {
    fetch(DATASET_URL)
      .then((response) => response.arrayBuffer())
      .then((arrayBuffer) => {
        const rows = new ArrowDataFrame(tableFromIPC(new Uint8Array(arrayBuffer)));
        refTableViewComponent.current?.setSchema(rows.schema);
        refTableViewComponent.current?.setRows(rows);
      });
  }, []);

  const onMount = useCallback((component: ArrowTableViewComponent) => {
    refTableViewComponent.current = component;
  }, []);

  useMemo(() => {
    if (refTableViewComponent.current) {
      refTableViewComponent.current.setSettings(settings);
    }
  }, [settings]);

  return (
    <>
      {/*
       * No dataset
       */}
      <Preview>
        <Preview.Title>No Dataset</Preview.Title>
        <Preview.Description>
          <div>
            Dataset can be displayed by the <code className="text-xs">TableView</code> component that will initiate the
            loading of the data as needed.
          </div>
          <div className="flex flex-col m-4 space-y-0.5 w-[500px]">
            <Setting title="Fetching">
              <Switch
                size="sm"
                defaultChecked={false}
                onChange={(e) => {
                  refTableViewComponent.current?.setFetching(e.target.checked);
                }}
              />
            </Setting>
            <Setting title="Show row numbers">
              <Switch
                size="sm"
                defaultChecked={settings.showRowNumbers}
                onChange={(e) => {
                  setSettings((prev) => ({ ...prev, showRowNumbers: e.target.checked }));
                }}
              />
            </Setting>
            <Setting title="Density">
              <Dropdown
                defaultValue={settings.density}
                onChange={(value) => {
                  setSettings((prev) => ({ ...prev, density: value as TableDensity }));
                }}
              >
                <Dropdown.Option label="Comfortable" value="comfortable" />
                <Dropdown.Option label="Compact" value="compact" />
              </Dropdown>
            </Setting>
            <Setting title="Dividers">
              <Dropdown
                defaultValue={settings.dividers}
                onChange={(value) => {
                  setSettings((prev) => ({ ...prev, dividers: value as TableDividers }));
                }}
              >
                <Dropdown.Option label="None" value="none" />
                <Dropdown.Option label="Rows" value="rows" />
                <Dropdown.Option label="Grid" value="grid" />
              </Dropdown>
            </Setting>
            <Setting title="Null values">
              <Dropdown
                defaultValue={settings.nullValues}
                onChange={(value) => {
                  setSettings((prev) => ({ ...prev, nullValues: value as NullValues }));
                }}
              >
                <Dropdown.Option label="null (lowercase)" value="null_lowercase" />
                <Dropdown.Option label="NULL (uppercase)" value="null_uppercase" />
                <Dropdown.Option label="(empty)" value="empty_string" />
                <Dropdown.Option label="N/A (lowercase)" value="not_available_lowercase" />
                <Dropdown.Option label="n/a (uppercase)" value="not_available_uppercase" />
                <Dropdown.Option label="- (dash)" value="dash" />
              </Dropdown>
            </Setting>
          </div>
        </Preview.Description>
        <PreviewBox>
          <div className="flex w-full h-[500px] overflow-hidden">
            <ArrowTableView onMount={onMount} settings={settings} />
          </div>
        </PreviewBox>
      </Preview>
    </>
  );
}

function Setting({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-row items-center h-9">
      <div className="flex w-60 font-semibold">{title}</div>
      <div className="ml-auto">{children}</div>
    </div>
  );
}
