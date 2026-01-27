CREATE TABLE IF NOT EXISTS saved_searches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT,
  slug TEXT,
  params JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS saved_searches_user_id_idx ON saved_searches (user_id);
CREATE INDEX IF NOT EXISTS saved_searches_type_idx ON saved_searches (type);
