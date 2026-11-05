CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower ON users (lower(email));

CREATE TABLE IF NOT EXISTS spaces (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('Quiet', 'Group')),
  location TEXT NOT NULL,
  total_seats INT NOT NULL CHECK (total_seats > 0),
  open_seats INT NOT NULL,
  wifi BOOLEAN NOT NULL DEFAULT false,
  outlets BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (open_seats BETWEEN 0 AND total_seats)
);

-- Supabase exposes the public schema through its REST API. Turning on Row Level Security
-- with no policies blocks that API completely. This app reaches the data only through its
-- own server (the postgres role), which is not affected by RLS.
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
