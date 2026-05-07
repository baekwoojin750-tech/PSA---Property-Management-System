alter table public.users
  add column if not exists department varchar,
  add column if not exists avatar_url text;

alter table public.authorization_requests
  add column if not exists expires_at timestamp;
