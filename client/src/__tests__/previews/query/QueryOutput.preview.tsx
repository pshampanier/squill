import QueryOutput from "@/components/query/QueryOutput";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";
import { QueryExecution } from "@/models/query-execution";

const NOW = new Date().getTime();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _RESULT_EXAMPLE = [
  ["The Grand Hotel", "123 Main St, New York, USA", "+12345678901", "grandhotel@mca.com", 100.0, "2022-12-01"],
  ["Ocean View Resort", "456 Market St, Miami, USA", "+12345678902", "ocean-view@miami-hotel.com", 150.0, "2022-12-02"],
  [
    "Mountain Peak Inn",
    "789 Broadway St, Denver, USA",
    "+12345678903",
    "mountainpeak@example.com",
    200.0,
    "2022-12-03",
  ],
  [
    "City Lights Boutique",
    "123 Main St, San Francisco, USA",
    "+12345678950",
    "citylights@example.com",
    550.0,
    "2023-01-19",
  ],
];

const QUERY_ERROR = new QueryExecution({
  id: "5",
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
  executedAt: new Date(NOW - 86400),
  status: "error",
  errorMessage: 'ERROR:  relation "hotels" does not exist\nLINE 11:     hotels;\n             ^',
  errorLine: 11,
  errorColumn: 5,
});

export default function QueryOutputPreview() {
  return (
    <>
      {/*
       * Execution in progress
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
    </>
  );
}
