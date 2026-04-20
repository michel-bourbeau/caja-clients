-- Supabase schema for POS and inventory

create extension if not exists "pgcrypto";

-- Products table
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  sku text,
  price numeric not null default 0,
  quantity integer not null default 0,
  category text,
  description text,
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Transactions table
create table if not exists transactions (
  id text primary key,
  tenant_id uuid not null,
  cashier_id text,
  items jsonb not null,
  subtotal numeric not null,
  tax numeric not null,
  total numeric not null,
  payment_method text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tenant settings table
create table if not exists tenant_settings (
  tenant_id uuid primary key,
  tax_rate numeric not null default 0.21,
  currency text not null default 'USD',
  timezone text not null default 'America/New_York',
  language text not null default 'en',
  company_name text,
  updated_at timestamptz not null default now()
);

-- Add indexes for tenant filtering
create index if not exists idx_products_tenant on products (tenant_id);
create index if not exists idx_transactions_tenant on transactions (tenant_id);
