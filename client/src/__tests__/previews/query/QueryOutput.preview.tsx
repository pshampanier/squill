import QueryOutput from "@/components/query/QueryOutput";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import { QueryExecution } from "@/models/query-execution";
import { MICROSECONDS_IN_A_SECOND, addTime } from "@/utils/time";

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
  status: "error",
  errorMessage: 'ERROR:  relation "hotels" does not exist\nLINE 11:     hotels;\n             ^',
  errorLine: 11,
  errorColumn: 5,
});

const QUERY_CANCELLED = new QueryExecution({
  query: `SELECT name, address FROM hotels ORDER BY name;`,
  executedAt: addTime(new Date(), -2, "hour"),
  status: "cancelled",
});

const QUERY_SUCCESS = new QueryExecution({
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
  executedAt: addTime(new Date(), -5, "minute"),
  status: "success",
  executionTime: 32.365002 * MICROSECONDS_IN_A_SECOND,
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
