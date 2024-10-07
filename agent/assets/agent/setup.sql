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

	-- The connection that was used to execute the query.
	connection_id UUID REFERENCES catalog(catalog_id),

	-- The user that executed the query.
	user_id UUID REFERENCES users(user_id),

	-- The query that was executed.
	query TEXT NOT NULL,

	-- The time when the query was executed.
	executed_at TIMESTAMP,

	-- The time when the query was created.
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

	-- The time taken to execute the query (in seconds with a nanosecond precision).
	execution_time REAL,

	-- The number of rows affected by the query.
	affected_rows INTEGER,

	-- The execution status of the query.	
	status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',

	-- Error details if the status is failed.
	error TEXT DEFAULT NULL,

	-- Metadata associated with the query history item.
	--
	-- This is a JSON string used to capture additional information about the query execution, especially the way they 
	-- should be displayed in the UI.
	metadata TEXT DEFAULT NULL
);

CREATE INDEX query_history_connection_id ON query_history(connection_id);