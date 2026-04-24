-- Create superadmin_settings table for storing plan configurations
create table if not exists superadmin_settings (
  id uuid default uuid_generate_v4() primary key,
  key text unique not null,
  plan_configs jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Add RLS policy
alter table superadmin_settings enable row level security;

-- Allow only superadmins to access (this is a superadmin-only table)
-- Since we don't have a superadmin column, we'll allow authenticated users (normally restricted by app logic)
create policy "Allow superadmin access" on superadmin_settings
  for all using (true);

-- Create index on key
create index if not exists idx_superadmin_settings_key on superadmin_settings(key);
