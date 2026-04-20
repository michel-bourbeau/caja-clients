# 🏢 Architecture Multi-Tenant

## Stratégie Recommandée: Une BD Supabase + Isolation par tenant_id

### Avantages
✅ Facile à debugger - Tout dans une DB
✅ Facile à gérer les clients
✅ Moins cher que plusieurs BDs
✅ Meilleure pour petit/moyen volume
✅ Facilement scalable

### Inconvénients
❌ Performance: requêtes filtrées par tenant_id
❌ Moins d'isolation physique

---

## 1️⃣ Structure Supabase

### Tablas Principales

```sql
-- Tenants (Clients)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- "chocorico", "boulangerie-paris"
  plan TEXT DEFAULT 'free',   -- free, pro, enterprise
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users (Belongst to Tenant)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role_id UUID REFERENCES roles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, email)  -- Email unique par tenant
);

-- Roles (Belong to Tenant)
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT[] DEFAULT '{}',
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, name)  -- Nom unique par tenant
);

-- Employees (Belong to Tenant)
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role_id UUID REFERENCES roles(id),
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, email)
);

-- Products (Belong to Tenant)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT NOT NULL,
  price DECIMAL(10,2),
  quantity INTEGER DEFAULT 0,
  category TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, sku)
);

-- Transactions (Belong to Tenant)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  items JSONB,
  subtotal DECIMAL(10,2),
  tax DECIMAL(10,2),
  total DECIMAL(10,2),
  payment_method TEXT,
  cashier_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'COMPLETED',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
```

### Políticas RLS (Row Level Security)

```sql
-- Política para users: Solo ver usuarios del mismo tenant
CREATE POLICY "Users can only see their tenant's users" ON users
  FOR SELECT USING (
    tenant_id = auth.jwt() -> 'tenant_id'::text
  );

-- Política similar para otras tablas...
CREATE POLICY "Users can only see their tenant's roles" ON roles
  FOR SELECT USING (
    tenant_id = auth.jwt() -> 'tenant_id'::text
  );

CREATE POLICY "Users can only see their tenant's employees" ON employees
  FOR SELECT USING (
    tenant_id = auth.jwt() -> 'tenant_id'::text
  );

CREATE POLICY "Users can only see their tenant's products" ON products
  FOR SELECT USING (
    tenant_id = auth.jwt() -> 'tenant_id'::text
  );

CREATE POLICY "Users can only see their tenant's transactions" ON transactions
  FOR SELECT USING (
    tenant_id = auth.jwt() -> 'tenant_id'::text
  );
```

---

## 2️⃣ Tipos TypeScript

```typescript
// src/lib/types/tenant.ts

export interface Tenant {
  id: string;
  name: string;
  slug: string;  // Identificador único y SEO-friendly
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantContext {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  userRole: string;
  permissions: string[];
}
```

---

## 3️⃣ Cómo Acceder por Cliente

### Opción 1: Subdominio
```
chocorico.caja.com
boulangerie.caja.com
pizzeria.caja.com
```

### Opción 2: URL Path
```
caja.com/chocorico
caja.com/boulangerie
caja.com/pizzeria
```

### Opción 3: Query Parameter
```
caja.com?tenant=chocorico
```

---

## 4️⃣ Implementación

### Paso 1: Instalar Supabase
```bash
npm install @supabase/supabase-js
```

### Paso 2: Crear Cliente Supabase
```typescript
// src/lib/supabase.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Cliente admin (lado del servidor solamente)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

### Paso 3: Extraer tenant_id del usuario
```typescript
// src/lib/utils/tenant.ts

import { useSearchParams } from 'next/navigation';

export function useTenantId() {
  const searchParams = useSearchParams();
  
  // Opción 1: Del URL
  const tenantFromUrl = searchParams.get('tenant');
  
  // Opción 2: Del JWT (después de autenticación)
  const tenantFromAuth = localStorage.getItem('tenantId');
  
  return tenantFromUrl || tenantFromAuth;
}

// En queries Supabase
export function withTenantFilter(query, tenantId) {
  return query.eq('tenant_id', tenantId);
}
```

---

## 5️⃣ Ejemplo: Crear Rol para un Cliente

```typescript
// src/features/roles/services.ts

export class RoleService {
  static async createRole(
    tenantId: string,
    name: string,
    description: string,
    permissions: string[]
  ) {
    const { data, error } = await supabase
      .from('roles')
      .insert({
        tenant_id: tenantId,
        name,
        description,
        permissions,
        is_system: false
      })
      .select();

    if (error) throw error;
    return data[0];
  }

  static async getRolesByTenant(tenantId: string) {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}
```

---

## 6️⃣ Debugging Multi-Tenant

### Ver datos de un cliente específico
```sql
SELECT * FROM roles WHERE tenant_id = '123e4567-e89b-12d3-a456-426614174000';
SELECT * FROM users WHERE tenant_id = '123e4567-e89b-12d3-a456-426614174000';
```

### Ver todos los clientes
```sql
SELECT * FROM tenants;
```

### Ver para qué clientes usa un usuario
```sql
SELECT u.id, u.email, t.name 
FROM users u
JOIN tenants t ON u.tenant_id = t.id
WHERE u.email = 'admin@caja.com';
```

---

## 7️⃣ Consideraciones de Performance

### Índices Recomendados
```sql
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_roles_tenant_id ON roles(tenant_id);
CREATE INDEX idx_employees_tenant_id ON employees(tenant_id);
CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_transactions_tenant_id ON transactions(tenant_id);
```

---

## 8️⃣ Escalabilidad Futura

### Si necesitas más adelante:

**Opción A: Múltiples regiones**
- Replicar BD en diferentes regiones
- Router basado en geolocalización

**Opción B: BD por cliente (Enterprise)**
- Cuando un cliente sea muy grande
- Migración de datos automatizada

**Opción C: Sharding**
- Dividir datos por tenant_id ranges
- Para volume muy alto (millones de datos)

---

## 9️⃣ Plan Implementación

### Fase 1: Setup (1-2 días)
1. Crear BD Supabase
2. Crear tablas con RLS
3. Implementar TenantContext

### Fase 2: Migración (2-3 días)
1. Migrar datos mock a Supabase
2. Agregar tenant_id a datos existentes
3. Actualizar servicios

### Fase 3: Testing (1-2 días)
1. Tests de aislamiento de datos
2. Tests de performance
3. Verificar RLS

---

## 🔟 Resumen

**Una BD = Simplicidad + Debuggabilidad**

Para tu caso (Chocorico + futuros clientes):
- ✅ Una sola BD Supabase
- ✅ Cada cliente tiene tenant_id único
- ✅ Fácil ver datos de cada cliente
- ✅ Facil para debugging
- ✅ Escalable para 100+ clientes

Cuando tengas volumen muy alto (millones de transacciones), escalas con sharding o replicas.
