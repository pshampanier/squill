import { serializable } from "@/utils/serializable";
import { immerable } from "immer";

export class Connection {
  [immerable] = true;

  @serializable("string", { required: true, format: "uuid" })
  id!: string;

  @serializable("string", { required: true, format: "identifier" })
  name!: string;

  @serializable("string")
  description?: string;

  /**
   * The connection string to use to connect to the database.
   *
   * 1. MySQL: Connection strings in MySQL typically follow the format
   *    ```
   *    server=localhost;user=myuser;database=mydatabase;port=3306;password=mypassword;
   *    ```
   *
   * 2. PostgreSQL: PostgreSQL connection strings typically follow the format:
   *    ```
   *    host=localhost port=5432 dbname=mydatabase user=myuser password=mypassword
   *    ```
   *
   * 3. SQL Server: Connection strings in SQL Server typically follow the format:
   *    ```
   *    Server=myServerAddress;Database=myDataBase;User Id=myUsername;Password=myPassword;
   *    ```
   *
   * 4. Oracle: Oracle uses a slightly different format, typically something like
   *    ```
   *    username/password@hostname:port/service_name
   *    ```
   */
  @serializable("string")
  connectionString: string;

  constructor(object: Partial<Connection>) {
    Object.assign(this, object);
  }
}
