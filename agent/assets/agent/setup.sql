CREATE TABLE settings (
	name TEXT PRIMARY KEY,
	value TEXT
);

CREATE TABLE users (
	user_id UUID PRIMARY KEY,
	username TEXT NOT NULL,
	settings TEXT NOT NULL
);

CREATE UNIQUE INDEX users_username ON users(UPPER(username));

CREATE TABLE catalog (
	-- The unique identifier for the catalog item.
	catalog_id UUID PRIMARY KEY,

	-- The catalog item type.
	type TEXT NOT NULL CHECK (type IN ('collection', 'environment', 'connection')),

	-- The parent catalog item, if any.
	-- NULL if this is a root catalog item.
	parent_catalog_id UUID REFERENCES catalog(catalog_id),

	-- The user that owns the catalog item.
	owner_user_id UUID REFERENCES users(user_id),

	-- The name of the item in the catalog.
	name TEXT NOT NULL,

	-- The data associated with the catalog item.
	data TEXT DEFAULT NULL,

	-- The metadata associated with the catalog item.
	metadata TEXT DEFAULT NULL,

	-- The status of the catalog item.
	status TEXT NOT NULL CHECK (status IN ('active', 'deleted')) DEFAULT 'active'
);

-- Create a unique index on the catalog table to ensure that the name of a catalog item is unique within the parent
-- catalog.
--
-- Because the root catalog items have a NULL parent_catalog_id, we are using the 
-- [Nil UUID in RFC 9562](https://www.ietf.org/rfc/rfc9562.html#section-5.9) as the parent_catalog_id for the root 
-- catalog items.
CREATE UNIQUE INDEX catalog_parent_catalog_id_name 
   ON catalog(owner_user_id, COALESCE(parent_catalog_id, '00000000-0000-0000-0000-000000000000'), UPPER(name));

CREATE TABLE query_history (

	-- The connection used to execute the query.
	connection_id UUID NOT NULL REFERENCES catalog(catalog_id),
	
	-- A unique identifier for the query history item.
	query_history_id UUID,

	-- The revision of the query (incremented by 1 every time the record is updated).
	revision INTEGER NOT NULL DEFAULT 0,

	-- The name of the datasource used to execute the query.
	datasource TEXT NOT NULL,

	-- The user that executed the query.
	user_id UUID NOT_NULL REFERENCES users(user_id),

	-- The query that was executed.
	text TEXT NOT NULL,

	-- The hash of the query text.
	hash INTEGER NOT NULL,

	-- The origin of the query.
	origin TEXT NOT NULL,

	-- The time when the query was created.
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

	-- The time when the query was executed.
	executed_at TIMESTAMP,

	-- The time taken to execute the query (in seconds with a nanosecond precision).
	execution_time REAL,

	-- The number of rows affected by the query.
	affected_rows INTEGER,

	-- The execution status of the query.	
	status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancel_requested', 'cancelled', 'delete_requested', 'deleted')) DEFAULT 'pending',

	-- `true` if the query return a result set (whenever the result set is empty or not).
	with_result_set BOOLEAN DEFAULT FALSE,

	--- The size in bytes of the result set on disk.
	storage_bytes INTEGER NOT NULL DEFAULT 0,

	-- The number of rows stored on disk.
	storage_rows INTEGER NOT NULL DEFAULT 0,

	-- Error details if the status is failed.
	error TEXT DEFAULT NULL,

	-- Metadata associated with the query history item.
	--
	-- This is a JSON string used to capture additional information about the query execution, especially the way they 
	-- should be displayed in the UI.
	metadata TEXT DEFAULT NULL,

	-- The primary key of this table is a composite key of `connection_id` and `query_history_id`.
	-- In order to leverage the index, update/delete queries should include the `connection_id` and `query_history_id`
	-- should never be used alone in the WHERE clause.
	PRIMARY KEY (connection_id, query_history_id)
);

--
-- Scheduled tasks
--
CREATE TABLE scheduled_tasks (
	-- The name of the task (define the action to be taken).
  name TEXT NOT NULL CHECK (name IN ('delete_connection', 'cleanup_history', 'vacuum')),

	-- The unique identifier of the entity that the task is related to (if any).
  entity_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',

	-- The status of the task.
	status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'failed')) DEFAULT 'pending',

	-- The date and time when the task is expected to run.
  scheduled_for TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

	-- The pid of the process that is currently executing the task.
  executed_by_pid INTEGER NOT NULL DEFAULT 0,

	-- The number of retries of the task.
	retries INTEGER NOT NULL DEFAULT 0,

	-- A task must be unique by its name and entity_id.
	-- If a task is not related to a specific entity, the entity_id should be set to the `nil` UUID (i.e., all bits set 
	-- to zero: 00000000-0000-0000-0000-000000000000).
	PRIMARY KEY (name, entity_id)
);

-- Create an index on the `scheduled_for` column to speed up the query that retrieves the tasks that are due to run.
CREATE INDEX scheduled_tasks_scheduled_for ON scheduled_tasks(scheduled_for);