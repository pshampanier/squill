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
	metadata TEXT DEFAULT NULL
);

-- Create a unique index on the catalog table to ensure that the name of a catalog item is unique within the parent
-- catalog.
--
-- Because the root catalog items have a NULL parent_catalog_id, we are using the 
-- [Nil UUID in RFC 9562](https://www.ietf.org/rfc/rfc9562.html#section-5.9) as the parent_catalog_id for the root 
-- catalog items.
CREATE UNIQUE INDEX catalog_parent_catalog_id 
   ON catalog(owner_user_id, COALESCE(parent_catalog_id, '00000000-0000-0000-0000-000000000000'), UPPER(name));

CREATE TABLE query_history (
	
	-- The unique identifier for the query history item.
	query_history_id UUID PRIMARY KEY,

	-- The revision of the query (incremented by 1 every time the record is updated).
	revision INTEGER NOT NULL DEFAULT 0,

	-- The connection that was used to execute the query.
	connection_id UUID NOT NULL REFERENCES catalog(catalog_id),

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
	status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'deleted')) DEFAULT 'pending',

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
	metadata TEXT DEFAULT NULL
);

-- A index used both for fetching the query history but also to speed up updates of a given query.
-- In order to leverage this index, update/delete queries should include the `connection_id`.
CREATE INDEX query_history_connection_id ON query_history(connection_id, query_history_id);