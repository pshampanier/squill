import QueryOutput from "@/components/query/QueryOutput";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import { QueryExecution } from "@/models/queries";
import { addTime } from "@/utils/time";
import { useUserStore } from "@/stores/UserStore";

const QUERY_ERROR = new QueryExecution({
  text: `SELECT 
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
  text: `SELECT name, address FROM hotels ORDER BY name;`,
  executedAt: addTime(new Date(), -2, "hour"),
  status: "cancelled",
});

const QUERY_SUCCESS = new QueryExecution({
  text: `SELECT productid, name, productnumber, makeflag, finishedgoodsflag, color, listprice, weight, weightunitmeasurecode
  FROM production.product
 WHERE listprice > 0 AND weight IS NOT NULL
 LIMIT 10;`,
  executedAt: addTime(new Date(), -5, "minute"),
  status: "completed",
  withResultSet: true,
  executionTime: 32.365002,
});

const QUERY_RUNNING = new QueryExecution({
  text: `SELECT * FROM hotels;`,
  executedAt: addTime(new Date(), -30, "second"),
  status: "running",
  withResultSet: true,
});

const QUERY_PENDING = new QueryExecution({
  text: `SELECT name, address FROM hotels ORDER BY name;`,
  executedAt: new Date(),
  status: "pending",
  withResultSet: true,
});

export default function QueryOutputPreview() {
  const settings = useUserStore((state) => state.settings?.historySettings.tableSettings);

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
          <QueryOutput className="w-full" query={QUERY_ERROR} settings={settings} />
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
          <QueryOutput className="w-full" query={QUERY_CANCELLED} settings={settings} />
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
          <QueryOutput className="w-full" query={QUERY_SUCCESS} settings={settings} />
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
          <QueryOutput className="w-full" query={QUERY_RUNNING} settings={settings} />
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
          <QueryOutput className="w-full" query={QUERY_PENDING} settings={settings} />
        </PreviewBox>
      </Preview>
    </>
  );
}
