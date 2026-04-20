# 🎓 Ejemplos Multi-Tenant

## Ejemplo 1: Obtener Datos de un Tenant

```typescript
// src/app/dashboard/page.tsx
"use client";

import { useTenant } from "@/context/TenantContext";

export default function DashboardPage() {
  const { tenant, isLoading, error } = useTenant();

  if (isLoading) return <p>Cargando...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h1>Bienvenido a {tenant?.name}</h1>
      <p>Plan: {tenant?.plan}</p>
      <p>Slug: {tenant?.slug}</p>
    </div>
  );
}
```

---

## Ejemplo 2: Query con tenant_id

```typescript
// src/features/roles/services.ts
import { supabase } from "@/lib/supabase";
import { useTenant } from "@/context/TenantContext";

export function getRolesByTenant(tenantId: string) {
  return supabase
    .from("roles")
    .select("*")
    .eq("tenant_id", tenantId)  // ← Filtro importante!
    .order("created_at", { ascending: false });
}

// Usar en componente
export function RolesList() {
  const { tenantId } = useTenant();
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    getRolesByTenant(tenantId).then(({ data }) => setRoles(data || []));
  }, [tenantId]);

  return (
    <ul>
      {roles.map(role => (
        <li key={role.id}>{role.name}</li>
      ))}
    </ul>
  );
}
```

---

## Ejemplo 3: Crear Datos para un Tenant

```typescript
// src/features/roles/services.ts

export async function createRoleForTenant(
  tenantId: string,
  name: string,
  permissions: string[]
) {
  const { data, error } = await supabase
    .from("roles")
    .insert({
      tenant_id: tenantId,  // ← Importante!
      name,
      permissions,
      is_system: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Usar
const { tenantId } = useTenant();
const newRole = await createRoleForTenant(
  tenantId,
  "Mi Rol",
  ["pos.create", "inventory.view"]
);
```

---

## Ejemplo 4: Actualizar Settings de Tenant

```typescript
// Hook personalizado
export function useTenantSettings() {
  const { tenantId } = useTenant();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetch(`/api/tenants/${tenantId}/settings`)
      .then(r => r.json())
      .then(setSettings);
  }, [tenantId]);

  const updateSettings = async (updates) => {
    const response = await fetch(`/api/tenants/${tenantId}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const updated = await response.json();
    setSettings(updated);
    return updated;
  };

  return { settings, updateSettings };
}

// Usar en página
export function SettingsPage() {
  const { settings, updateSettings } = useTenantSettings();

  const handleSave = async () => {
    await updateSettings({
      taxRate: 19.00,
      currency: "EUR",
      language: "fr",
    });
  };

  return (
    <button onClick={handleSave}>
      Guardar Settings ({settings?.currency})
    </button>
  );
}
```

---

## Ejemplo 5: Listar Todos los Tenants (Admin)

```typescript
// src/app/admin/tenants/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Tenant } from "@/lib/types/tenant";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    fetch("/api/tenants")
      .then(r => r.json())
      .then(setTenants);
  }, []);

  return (
    <div>
      <h1>Todos los Tenants</h1>
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Slug</th>
            <th>Plan</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {tenants.map(tenant => (
            <tr key={tenant.id}>
              <td>{tenant.name}</td>
              <td>{tenant.slug}</td>
              <td>{tenant.plan}</td>
              <td>
                <a href={`/admin/tenants/${tenant.id}`}>Editar</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Ejemplo 6: Crear Nuevo Tenant

```typescript
// Usar en admin panel
async function createTenant() {
  const response = await fetch("/api/tenants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Mi Nueva Empresa",
      slug: "mi-empresa",
      plan: "pro",
    }),
  });

  const newTenant = await response.json();
  console.log("Nuevo tenant creado:", newTenant);
}
```

---

## Ejemplo 7: Estadísticas de Tenant

```typescript
export function TenantStats() {
  const { tenantId } = useTenant();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetch(`/api/tenants/${tenantId}/stats`)
      .then(r => r.json())
      .then(setStats);
  }, [tenantId]);

  if (!stats) return <p>Cargando...</p>;

  return (
    <div>
      <p>Usuarios: {stats.totalUsers}</p>
      <p>Productos: {stats.totalProducts}</p>
      <p>Transacciones: {stats.totalTransactions}</p>
    </div>
  );
}
```

---

## Ejemplo 8: Proteger Rutas por Plan

```typescript
// Hook para verificar features
export function useFeature(feature: keyof Tenant["features"]) {
  const { tenant } = useTenant();
  return tenant?.features[feature] ?? false;
}

// Usar
export function PayrollModule() {
  const hasPayroll = useFeature("payroll");

  if (!hasPayroll) {
    return <p>Actualiza a plan Pro para acceder a Nómina</p>;
  }

  return <PayrollContent />;
}
```

---

## Ejemplo 9: Buscar Tenant por Slug

```typescript
// En página pública
"use client";

import { useParams } from "next/navigation";
import { TenantService } from "@/features/tenants/services";

export default function TenantPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    TenantService.getTenantBySlug(slug).then(setTenant);
  }, [slug]);

  if (!tenant) return <p>Tenant no encontrado</p>;

  return <h1>Bienvenido a {tenant.name}</h1>;
}
```

---

## Ejemplo 10: Migrar Datos Existentes

```typescript
// Script de migración
import { getSupabaseAdmin } from "@/lib/supabase";

async function migrateExistingData() {
  const supabaseAdmin = getSupabaseAdmin();

  // 1. Crear tenant
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .insert({
      name: "ChocoRico",
      slug: "chocorico",
      plan: "pro",
    })
    .select()
    .single();

  // 2. Agregar tenant_id a usuarios existentes
  await supabaseAdmin
    .from("users")
    .update({ tenant_id: tenant.id })
    .is("tenant_id", null);

  // 3. Agregar tenant_id a roles existentes
  await supabaseAdmin
    .from("roles")
    .update({ tenant_id: tenant.id })
    .is("tenant_id", null);

  console.log("Migración completada para:", tenant.name);
}
```

---

## Checklist de Debugging

```
✅ Ver qué tenant está en localStorage
localStorage.getItem("tenantId")

✅ Ver URL actual
window.location.href

✅ Ver datos de Supabase
Supabase Dashboard → SQL Editor

✅ Verificar RLS está activo
SELECT * FROM roles;  -- Si no ves nada, RLS funciona

✅ Ver logs de error
F12 → Console → Red
```

---

Estos ejemplos cubren todos los casos de uso comunes en una aplicación multi-tenant! 🚀
