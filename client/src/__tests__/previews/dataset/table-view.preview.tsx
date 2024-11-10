import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Table, tableFromIPC } from "apache-arrow";
import { ArrowDataFrame, DataFrame } from "@/utils/dataframe";
import { NullValues, TableDensity, TableDividers, TableSettings } from "@/models/user-settings";
import { TableViewComponent } from "@/components/dataset/table-view";
import Switch from "@/components/core/Switch";
import Dropdown from "@/components/core/Dropdown";
import ArrowTableView from "@/components/dataset/arrow-table-view";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import DATASET_URL from "@/assets/datasets/persons.arrow?url";

export default function TableViewPreview() {
  const refTableViewComponents = useRef<TableViewComponent[]>([]);
  const [rows, setRows] = useState<ArrowDataFrame | null>(null);
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
        setRows(new ArrowDataFrame(tableFromIPC(new Uint8Array(arrayBuffer))));
      });
  }, []);

  const emptyDataFrame = useMemo(() => {
    if (!rows) {
      return null;
    } else {
      return new ArrowDataFrame(new Table(rows.schema));
    }
  }, [rows]);

  const fetchingDataFrame: DataFrame = useMemo(() => {
    return {
      getSizeHint() {
        return 5;
      },
      get(_index) {
        return null;
      },
    };
  }, [rows]);

  const onMount = useCallback((component: TableViewComponent) => {
    refTableViewComponents.current.push(component);
  }, []);

  useMemo(() => {
    refTableViewComponents.current.forEach((component) => {
      component.setSettings(settings);
    });
  }, [settings]);

  return (
    <>
      <div className="flex flex-col m-4 space-y-0.5 w-[500px]">
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
      {/*
       * With rows
       */}
      <Preview>
        <Preview.Title>With Rows</Preview.Title>
        <Preview.Description>
          <div>
            Dataset can be displayed by the <code className="text-xs">TableView</code> component that will initiate the
            loading of the data as needed.
          </div>
        </Preview.Description>
        <PreviewBox>
          <div className="flex w-full h-[400px]">
            {rows && <ArrowTableView schema={rows.schema} rows={rows} onMount={onMount} settings={settings} />}
          </div>
        </PreviewBox>
        <Preview.Description>
          <div>
            Using the property <code className="text-xs">maxRows=&quot;5&quot;</code> you can limit the number of rows
            displayed.
          </div>
        </Preview.Description>
        <PreviewBox>
          {rows && (
            <ArrowTableView schema={rows.schema} rows={rows} onMount={onMount} settings={settings} maxRows={5} />
          )}
        </PreviewBox>
      </Preview>
      {/*
       * No row
       */}
      <Preview>
        <Preview.Title>No Row</Preview.Title>
        <Preview.Description>
          If the dataset is empty, the table will display a message indicating that there is no data to display.
        </Preview.Description>
        <PreviewBox>
          <div className="flex w-full overflow-hidden">
            {rows && (
              <ArrowTableView schema={rows.schema} rows={emptyDataFrame} onMount={onMount} settings={settings} />
            )}
          </div>
        </PreviewBox>
      </Preview>
      {/*
       * Fetching
       */}
      <Preview>
        <Preview.Title>Fetching...</Preview.Title>
        <Preview.Description>
          While fetching the data are displayed by a skeleton representative of each cell.
        </Preview.Description>
        <PreviewBox>
          <div className="flex w-full">
            {rows && (
              <ArrowTableView
                schema={rows.schema}
                rows={fetchingDataFrame}
                onMount={onMount}
                settings={settings}
                fetching={true}
              />
            )}
          </div>
        </PreviewBox>
        <Preview.Description>
          If the number of rows is unknow at the time fetching, only one line is displayed without using the skeleton
          since we don&apos;t know yet if there will be actually rows to display.
        </Preview.Description>
        <PreviewBox>
          <div className="flex w-full">
            {rows && <ArrowTableView schema={rows.schema} onMount={onMount} settings={settings} fetching={true} />}
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
