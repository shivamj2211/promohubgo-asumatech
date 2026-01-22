ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS contact_requests (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  handled_by TEXT REFERENCES users(id),
  handled_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_threads (
  id TEXT PRIMARY KEY,
  user_a_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS contact_threads_pair_idx
ON contact_threads (user_a_id, user_b_id);

CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES contact_threads(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
