import TableView from "@/components/dataset/table-view";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import { MemoryDataFrame } from "@/utils/dataframe";
import { DatasetAttribute as Attribute } from "@/models/dataset-attribute";
import { DataFrameSchema } from "@/models/dataframe-schema";
import previewDataset from "../../assets/datasets/table-view.preview.json";
import { TableSettings } from "@/models/users";

const ROWS: Array<Array<string>> = previewDataset.data;
const SCHEMA = new DataFrameSchema({
  name: "query",
  type: "array",
  items: previewDataset.attributes.map((attr) => new Attribute(attr as Partial<Attribute>)),
});

export default function TableViewPreview() {
  const dataframe = new MemoryDataFrame<string[]>("preview-data", SCHEMA, ROWS);
  return (
    <>
      {/*
       * No dataset
       */}
      <Preview>
        <Preview.Title>No Dataset</Preview.Title>
        <Preview.Description>
          Dataset can be displayed by the <code className="text-xs">TableView</code> component that will initiate the
          loading of the data as needed.
        </Preview.Description>
        <PreviewBox>
          <div className="flex w-full h-[100px] overflow-hidden">
            <TableView dataframe={undefined} fetchSize={50} />
          </div>
        </PreviewBox>
      </Preview>
      {/*
       * Normal density
       */}
      <Preview>
        <Preview.Title>Normal</Preview.Title>
        <Preview.Description>
          Dataset can be displayed by the <code className="text-xs">TableView</code> component that will initiate the
          loading of the data as needed.
        </Preview.Description>
        <PreviewBox>
          <div className="flex w-full h-[1000px] overflow-hidden">
            <TableView dataframe={dataframe} fetchSize={50} />
          </div>
        </PreviewBox>
      </Preview>
      {/*
       * Compact density
       */}
      <Preview>
        <Preview.Title>Compact</Preview.Title>
        <Preview.Description>
          There is also a compact version of the table view that will display more rows at once.
        </Preview.Description>
        <PreviewBox>
          <div className="flex w-full h-96 overflow-hidden">
            <TableView
              dataframe={dataframe}
              fetchSize={10}
              settings={
                new TableSettings({
                  density: "compact",
                  dividers: "grid",
                  showRowNumbers: true,
                })
              }
            />
          </div>
        </PreviewBox>
      </Preview>
    </>
  );
}
