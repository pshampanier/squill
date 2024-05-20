import Code from "@/components/core/Code";
import Preview from "../Preview";
import PreviewBox from "../PreviewBox";

const SQL_CODE = `SELECT 
    hotels.name, 
    hotels.address, 
    hotels.telephone_number, 
    hotels.email, 
    hotels.standard_room_price + ' USD' AS price, 
    (SELECT MIN(availability_date) FROM hotel_availabilities 
     WHERE hotel_availabilities.hotel_id = hotels.id 
     AND availability_date > NOW()) AS next_availability
FROM 
    hotels;`;

export default function CodePreview() {
  return (
    <>
      {/*
       * SQL code
       */}
      <Preview>
        <Preview.Title>SQL</Preview.Title>
        <Preview.Description>Syntax Highlighting for sql.</Preview.Description>
        <PreviewBox>
          <Code language="sql" showLineNumbers={true}>
            {SQL_CODE}
          </Code>
        </PreviewBox>
      </Preview>
    </>
  );
}
