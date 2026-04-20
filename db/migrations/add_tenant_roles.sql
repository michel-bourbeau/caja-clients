-- Migration: Create tenant_roles table
-- Run this in Supabase SQL Editor

create table if not exists tenant_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  slug text not null,                      -- machine-friendly id (e.g. "cashier")
  name text not null,                      -- display name
  description text,
  permissions text[] not null default '{}',
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, slug)
);

create index if not exists idx_tenant_roles_tenant on tenant_roles(tenant_id);

alter table tenant_roles enable row level security;

-- Service role bypasses RLS (used in API routes with getSupabaseAdmin)
