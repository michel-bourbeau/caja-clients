# 🚀 Setup Multi-Tenant avec Supabase

## Étape 1: Créer un compte Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. S'inscrire (gratuit)
3. Créer un nouveau projet
4. Copier:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (bien sécurisé!)

---

## Étape 2: Installer Supabase

```bash
npm install @supabase/supabase-js
```

---

## Étape 3: Configurer variables d'environnement

### `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optionnel
NEXT_PUBLIC_APP_DOMAIN=caja.com
NEXT_PUBLIC_TENANT_URL_STYLE=path  # ou "subdomain"
```

---

## Étape 4: Créer les tables SQL

### Dans Supabase SQL Editor:

```sql
-- 1. Table Tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free',
  features JSONB DEFAULT '{
    "pos": false,
    "inventory": true,
    "employees": true,
    "payroll": false,
    "schedules": true,
    "reports": false,
    "customRoles": true,
    "api": false
  }',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- 2. Table Tenant Settings
CREATE TABLE tenant_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tax_rate DECIMAL(5,2) DEFAULT 19.00,
  currency TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'en',
  company_name TEXT,
  company_address TEXT,
  company_phone TEXT,
  company_email TEXT,
  logo TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id)
);

-- 3. Table Users (con tenant_id)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role_id UUID,
  status TEXT DEFAULT 'ACTIVE',
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, email)
);

-- 4. Table Roles (con tenant_id)
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT[] DEFAULT '{}',
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, name)
);

-- 5. Agregar tenant_id a roles
ALTER TABLE users ADD CONSTRAINT fk_users_roles 
  FOREIGN KEY (role_id) REFERENCES roles(id);

-- 6. Crear índices para performance
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_roles_tenant_id ON roles(tenant_id);
CREATE INDEX idx_tenant_settings_tenant_id ON tenant_settings(tenant_id);

-- 7. Habilitar Row Level Security
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- 8. Crear políticas RLS
-- Política para usuarios: solo ver su propio tenant
CREATE POLICY "Users can view their tenant" ON tenants
  FOR SELECT USING (
    id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can view their tenant's settings" ON tenant_settings
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can view their tenant's users" ON users
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can view their tenant's roles" ON roles
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );
```

---

## Étape 5: Créer données de test

### Script SQL:

```sql
-- 1. Crear primer tenant (Chocorico)
INSERT INTO tenants (name, slug, plan)
VALUES ('ChocoRico', 'chocorico', 'pro');

-- 2. Obtener el ID
-- SELECT id FROM tenants WHERE slug = 'chocorico';
-- Copiar el ID para usar abajo

-- 3. Crear settings para Chocorico
INSERT INTO tenant_settings (
  tenant_id,
  tax_rate,
  currency,
  company_name,
  company_email
) VALUES (
  '00000000-0000-0000-0000-000000000001', -- Reemplazar con ID real
  19.00,
  'USD',
  'ChocoRico SARL',
  'admin@chocorico.com'
);

-- 4. Crear roles para Chocorico
INSERT INTO roles (tenant_id, name, permissions, is_system)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Admin',
    ARRAY['pos.create', 'pos.view', 'pos.void', 'pos.configure', 'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete', 'inventory.adjust', 'employees.view', 'employees.create', 'employees.edit', 'employees.delete', 'schedules.view', 'schedules.edit', 'schedules.checkin', 'payroll.view', 'payroll.create', 'payroll.approve', 'payroll.pay', 'settings.view', 'settings.edit', 'settings.manage_roles'],
    TRUE
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    'Vendedor Tienda',
    ARRAY['pos.create', 'pos.view', 'inventory.view', 'schedules.checkin'],
    FALSE
  );
```

---

## Étape 6: Utiliser dans Next.js

### Exemple: Obtenir les rôles d'un tenant

```typescript
"use client";

import { useEffect, useState } from "react";
import { useTenantId } from "@/lib/utils/tenant";
import { supabase } from "@/lib/supabase";

export function RolesList() {
  const tenantId = useTenantId();
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    if (!tenantId) return;

    async function fetchRoles() {
      const { data, error } = await supabase
        .from("roles")
        .select("*")
        .eq("tenant_id", tenantId);

      if (error) {
        console.error("Error:", error);
        return;
      }

      setRoles(data);
    }

    fetchRoles();
  }, [tenantId]);

  if (!tenantId) return <p>Tenant no identificado</p>;

  return (
    <div>
      <h2>Roles ({tenantId})</h2>
      {roles.map((role) => (
        <div key={role.id}>
          <h3>{role.name}</h3>
          <p>{role.permissions.join(", ")}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Étape 7: Debugger

### Ver todos los tenants en Supabase:
```
Supabase Dashboard → SQL Editor → SELECT * FROM tenants;
```

### Ver usuarios de un tenant:
```
SELECT * FROM users WHERE tenant_id = 'tenant-id-aqui';
```

### Ver transacciones de un tenant:
```
SELECT * FROM transactions WHERE tenant_id = 'tenant-id-aqui';
```

---

## ✅ Checklist

- [ ] Crear cuenta Supabase
- [ ] Crear proyecto
- [ ] Copiar variables de entorno
- [ ] Instalar `@supabase/supabase-js`
- [ ] Crear `.env.local`
- [ ] Correr scripts SQL
- [ ] Probar conexión
- [ ] Crear primer tenant
- [ ] ¡Listo!

---

## Próximos Pasos

1. Crear API endpoints (`/api/tenants`, `/api/roles`, etc)
2. Integrar autenticación
3. Migrar datos existentes a Supabase
4. Tests de seguridad RLS
