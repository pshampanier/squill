import TableView from "@/components/dataset/table-view";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import { Collection, MemoryDataset } from "@/utils/dataset";
import { DatasetAttribute as Attribute } from "@/models/dataset-attribute";
import { DatasetSchema } from "@/models/dataset-schema";
import previewDataset from "../../assets/datasets/table-view.preview.json";

const ROWS: Collection<Array<string>> = previewDataset.data;
const SCHEMA = new DatasetSchema({
  name: "query",
  type: "array",
  items: previewDataset.attributes.map((attr) => new Attribute(attr as Partial<Attribute>)),
});

export default function TableViewPreview() {
  const dataset = new MemoryDataset<string[]>(SCHEMA, ROWS);
  return (
    <>
      {/*
       * SQL code
       */}
      <Preview>
        <Preview.Title>Table View</Preview.Title>
        <Preview.Description>
          Dataset can be displayed by the <code className="text-xs">TableView</code> compponent that will initiate the
          loading of the data as needed.
        </Preview.Description>
        <PreviewBox>
          <div className="flex w-full h-96">
            <TableView dataset={dataset} fetchSize={1000} />
          </div>
        </PreviewBox>
      </Preview>
    </>
  );
}
