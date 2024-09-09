import QueryOutput from "@/components/query/QueryOutput";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import { QueryExecution } from "@/models/query-execution";
import { MICROSECONDS_IN_A_SECOND, addTime } from "@/utils/time";
import { DataFrameSchema } from "@/models/dataframe-schema";
import { DatasetAttribute } from "@/models/dataset-attribute";
import { MemoryDataFrame } from "@/utils/dataframe";
import TableView from "@/components/dataset/table-view";

const QUERY_ERROR = new QueryExecution({
  query: `SELECT 
    hotels.name, 
    hotels.address, 
    hotels.telephone_number, 
    hotels.email, 
    hotels.standard_room_price, 
    (SELECT MIN(availability_date) FROM hotel_availabilities 
     WHERE hotel_availabilities.hotel_id = hotels.id 
     AND availability_date > NOW()) AS next_availability
FROM 
    hotels;`,
  executedAt: addTime(new Date(), -1, "day"),
  status: "failed",
  error: {
    message: 'ERROR:  relation "hotels" does not exist\nLINE 11:     hotels;\n             ^',
    line: 11,
    column: 5,
  },
});

const QUERY_CANCELLED = new QueryExecution({
  query: `SELECT name, address FROM hotels ORDER BY name;`,
  executedAt: addTime(new Date(), -2, "hour"),
  status: "cancelled",
});

const QUERY_SUCCESS = new QueryExecution({
  query: `SELECT productid, name, productnumber, makeflag, finishedgoodsflag, color, listprice, weight, weightunitmeasurecode
  FROM production.product
 WHERE listprice > 0 AND weight IS NOT NULL
 LIMIT 10;`,
  executedAt: addTime(new Date(), -5, "minute"),
  status: "completed",
  executionTime: 32.365002 * MICROSECONDS_IN_A_SECOND,
});

const QUERY_SUCCESS_RESULT = `
  "680","HL Road Frame - Black, 58","FR-R92B-58","True","True","Black","1431.50","2.24","LB "
  "706","HL Road Frame - Green, 58","FR-R92G-58","True","True","Green","1431.50","2.24","LB "
  "717","HL Road Frame - Red, 62","FR-R92R-62","True","True","Red","1431.50","2.30","LB "
  "718","HL Road Frame - Red, 44","FR-R92R-44","True","True","Red","1431.50","2.12","LB "
  "719","HL Road Frame - Red, 48","FR-R92R-48","True","True","Red","1431.50","2.16","LB "
  "720","HL Road Frame - Red, 52","FR-R92R-52","True","True","Red","1431.50","2.20","LB "
  "721","HL Road Frame - Red, 56","FR-R92R-56","True","True","Red","1431.50","2.24","LB "
  "722","LL Road Frame - Black, 58","FR-R38B-58","True","True","Black","337.22","2.46","LB "
  "723","LL Road Frame - Black, 60","FR-R38B-60","True","True","Black","337.22","2.48","LB "
  "724","LL Road Frame - Black, 62","FR-R38B-62","True","True","Black","337.22","2.50","LB "`
  .split("\n")
  .filter((line) => line.trim() !== "")
  .map((line) =>
    JSON.parse(
      `[${line
        .replace(/,"True",/g, ',"true",')
        .replace(/,"False",/g, ',"false",')
        .replace(/"NULL"/g, "null")}]`,
    ),
  );

const QUERY_SUCCESS_DATASET_SCHEMA = new DataFrameSchema({
  name: "query",
  type: "array",
  items: [
    new DatasetAttribute({ name: "productid", type: "text", format: { name: "text" } }),
    new DatasetAttribute({ name: "name", type: "text", format: { name: "text" } }),
    new DatasetAttribute({ name: "productnumber", type: "text", format: { name: "text" } }),
    new DatasetAttribute({ name: "makeflag", type: "boolean", format: { name: "boolean" } }),
    new DatasetAttribute({ name: "finishedgoodsflag", type: "boolean", format: { name: "boolean" } }),
    new DatasetAttribute({ name: "color", type: "text", format: { name: "color" } }),
    new DatasetAttribute({ name: "listprice", type: "float32", format: { name: "money" } }),
    new DatasetAttribute({ name: "weight", type: "float32", format: { name: "float" } }),
    new DatasetAttribute({ name: "weightunitmeasurecode", type: "text", format: { name: "text" } }),
  ],
});

const QUERY_RUNNING = new QueryExecution({
  query: `SELECT * FROM hotels;`,
  executedAt: addTime(new Date(), -30, "second"),
  status: "running",
});

const QUERY_PENDING = new QueryExecution({
  query: `SELECT name, address FROM hotels ORDER BY name;`,
  executedAt: new Date(),
  status: "pending",
});

export default function QueryOutputPreview() {
  const successDataFrame = new MemoryDataFrame("products", QUERY_SUCCESS_DATASET_SCHEMA, QUERY_SUCCESS_RESULT);
  return (
    <>
      {/*
       * Execution failed
       */}
      <Preview>
        <Preview.Title>Error</Preview.Title>
        <Preview.Description>
          When a error occurred during the execution, line numbers are displayed along to the error message.
        </Preview.Description>
        <PreviewBox className="items-center">
          <QueryOutput className="w-full" queryExecution={QUERY_ERROR} />
        </PreviewBox>
      </Preview>
      {/*
       * Cancelled
       */}
      <Preview>
        <Preview.Title>Cancelled</Preview.Title>
        <Preview.Description>
          When a error occurred during the execution, line numbers are displayed along to the error message.
        </Preview.Description>
        <PreviewBox className="items-center">
          <QueryOutput className="w-full" queryExecution={QUERY_CANCELLED} />
        </PreviewBox>
      </Preview>

      {/*
       * Success
       */}
      <Preview>
        <Preview.Title>Success</Preview.Title>
        <Preview.Description>
          When the query is executed successfully, the execution time is displayed along with the query.
        </Preview.Description>
        <PreviewBox className="items-center">
          <QueryOutput className="w-full" queryExecution={QUERY_SUCCESS} />
          <TableView className="h-56" dataframe={successDataFrame} />
        </PreviewBox>
      </Preview>
      {/*
       * Running
       */}
      <Preview>
        <Preview.Title>Running</Preview.Title>
        <Preview.Description>
          When the query is running, the query is displayed with a loading indicator and the execution time is updated
          every second.
        </Preview.Description>
        <PreviewBox className="items-center">
          <QueryOutput className="w-full" queryExecution={QUERY_RUNNING} />
        </PreviewBox>
      </Preview>
      {/*
       * Pending
       */}
      <Preview>
        <Preview.Title>Pending</Preview.Title>
        <Preview.Description>
          When the query is running, the query is displayed with a loading indicator and the execution time is updated
          every second.
        </Preview.Description>
        <PreviewBox className="items-center">
          <QueryOutput className="w-full" queryExecution={QUERY_PENDING} />
        </PreviewBox>
      </Preview>
    </>
  );
}
