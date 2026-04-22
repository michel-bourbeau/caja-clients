-- Enable necessary extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ========== TENANTS TABLE ==========
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  plan text not null default 'free',
  features jsonb default '{"pos": false, "inventory": true, "employees": true, "payroll": false, "schedules": true, "reports": false, "customRoles": true, "api": false}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- ========== TENANT_SETTINGS TABLE ==========
create table if not exists tenant_settings (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  tax_rate numeric not null default 0.21,
  currency text not null default 'NIO',
  timezone text not null default 'America/Managua',
  language text not null default 'es',
  company_name text,
  company_logo text,
  updated_at timestamptz not null default now()
);

-- ========== USERS TABLE ==========
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  role_id text,
  permissions text[] default '{}',
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, email)
);

-- ========== PRODUCTS TABLE ==========
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
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

-- ========== TRANSACTIONS TABLE ==========
create table if not exists transactions (
  id text primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  cashier_id text,
  cashier_name text default 'Unknown',
  items jsonb not null,
  subtotal numeric not null,
  discount numeric default 0,
  tax numeric not null,
  total numeric not null,
  payment_method text not null,
  amount_received numeric default 0,
  change numeric default 0,
  status text not null default 'COMPLETED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== EMPLOYEES TABLE ==========
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  role_id text,
  hire_date date,
  salary numeric default 0,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, email)
);

-- ========== PAYROLL TABLE ==========
create table if not exists payroll (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  base_salary numeric not null,
  hours_worked integer default 0,
  bonuses numeric default 0,
  deductions numeric default 0,
  total numeric not null,
  status text not null default 'DRAFT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== SCHEDULES TABLE ==========
create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  day_of_week integer not null,
  start_time time not null,
  end_time time not null,
  is_working boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== TIME_ENTRIES TABLE ==========
create table if not exists time_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  check_in_time timestamptz not null,
  check_out_time timestamptz,
  date date not null,
  created_at timestamptz not null default now()
);

-- ========== INDEXES FOR PERFORMANCE ==========
create index idx_users_tenant on users(tenant_id);
create index idx_products_tenant on products(tenant_id);
create index idx_transactions_tenant on transactions(tenant_id);
create index idx_transactions_created on transactions(created_at);
create index idx_employees_tenant on employees(tenant_id);
create index idx_payroll_tenant on payroll(tenant_id);
create index idx_payroll_employee on payroll(employee_id);
create index idx_schedules_tenant on schedules(tenant_id);
create index idx_schedules_employee on schedules(employee_id);
create index idx_time_entries_tenant on time_entries(tenant_id);
create index idx_time_entries_employee on time_entries(employee_id);

-- ========== ROW LEVEL SECURITY (RLS) ==========
-- Enable RLS on all tables
alter table tenants enable row level security;
alter table tenant_settings enable row level security;
alter table users enable row level security;
alter table products enable row level security;
alter table transactions enable row level security;
alter table employees enable row level security;
alter table payroll enable row level security;
alter table schedules enable row level security;
alter table time_entries enable row level security;

-- RLS Policies for PRODUCTS (users see only their tenant's products)
create policy "Users can view products from their tenant" on products
  for select using (
    exists (
      select 1 from users 
      where users.tenant_id = products.tenant_id 
        and users.id = auth.uid()
    )
  );

create policy "Users can insert products in their tenant" on products
  for insert with check (
    exists (
      select 1 from users 
      where users.tenant_id = products.tenant_id 
        and users.id = auth.uid()
        and 'inventory.create' = any(permissions)
    )
  );

-- RLS Policies for TRANSACTIONS
create policy "Users can view transactions from their tenant" on transactions
  for select using (
    exists (
      select 1 from users 
      where users.tenant_id = transactions.tenant_id 
        and users.id = auth.uid()
    )
  );

create policy "Users can create transactions in their tenant" on transactions
  for insert with check (
    exists (
      select 1 from users 
      where users.tenant_id = transactions.tenant_id 
        and users.id = auth.uid()
        and 'pos.create' = any(permissions)
    )
  );

-- RLS Policies for USERS
create policy "Users can view other users in their tenant" on users
  for select using (
    tenant_id = (select tenant_id from users where id = auth.uid())
  );

-- RLS Policies for EMPLOYEES
create policy "Users can view employees from their tenant" on employees
  for select using (
    exists (
      select 1 from users 
      where users.tenant_id = employees.tenant_id 
        and users.id = auth.uid()
    )
  );

-- RLS Policies for PAYROLL
create policy "Users can view payroll from their tenant" on payroll
  for select using (
    exists (
      select 1 from users 
      where users.tenant_id = payroll.tenant_id 
        and users.id = auth.uid()
    )
  );

-- RLS Policies for SCHEDULES
create policy "Users can view schedules from their tenant" on schedules
  for select using (
    exists (
      select 1 from users 
      where users.tenant_id = schedules.tenant_id 
        and users.id = auth.uid()
    )
  );

-- RLS Policies for TIME_ENTRIES
create policy "Users can view time entries from their tenant" on time_entries
  for select using (
    exists (
      select 1 from users 
      where users.tenant_id = time_entries.tenant_id 
        and users.id = auth.uid()
    )
  );

-- ========== SAMPLE DATA ==========
-- Insert a sample tenant
insert into tenants (name, slug, plan) 
values ('Tienda Test', 'tienda-test', 'pro')
on conflict do nothing;

-- Get the tenant ID for sample data
with sample_tenant as (
  select id from tenants where slug = 'tienda-test' limit 1
)
insert into tenant_settings (tenant_id, company_name)
select id, 'Tienda Test' from sample_tenant
on conflict do nothing;

-- Insert sample products
with sample_tenant as (
  select id from tenants where slug = 'tienda-test' limit 1
)
insert into products (tenant_id, name, sku, price, quantity, category)
select st.id, 'Laptop Dell XPS', 'DELL-001', 1299.99, 5, 'Electrónica' from sample_tenant st union all
select st.id, 'Mouse Logitech MX', 'LOG-001', 89.99, 15, 'Accesorios' from sample_tenant st union all
select st.id, 'Teclado Mecánico RGB', 'KEY-001', 149.99, 8, 'Accesorios' from sample_tenant st union all
select st.id, 'Monitor LG 27"', 'MON-001', 299.99, 3, 'Electrónica' from sample_tenant st
on conflict do nothing;
