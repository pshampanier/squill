import DATASET_URL from "@/assets/datasets/persons.arrow?url";
import { TableSettings } from "@/models/user-settings";
import { SettingsPanel } from "./SettingsPage";
import ArrowTableView from "@/components/dataset/arrow-table-view";
import { useEffect, useMemo, useState } from "react";
import { tableFromIPC } from "apache-arrow";
import { ArrowDataFrame } from "@/utils/dataframe";

type TableSettingsPreviewProps = {
  tableSettings: TableSettings;
  maxRows?: number;
};

export default function TableSettingsPreview({ tableSettings, maxRows }: TableSettingsPreviewProps) {
  const [dataframe, setDataframe] = useState<ArrowDataFrame | null>(null);
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
    return maxRows ? dataframe.slice(0, maxRows) : dataframe;
  }, [dataframe, maxRows]);

  return (
    <SettingsPanel>
      <ArrowTableView settings={tableSettings} rows={rows} schema={dataframe?.schema} />
    </SettingsPanel>
  );
}
