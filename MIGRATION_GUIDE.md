# 🔄 Guide de Migration: Mock Data → Supabase

Étapes pour migrer de mock data en mémoire vers Supabase.

---

## Phase 1: Préparation (1-2 heures)

### Étape 1.1: Identifier données existantes

Les données actuelles sont dans:
```
src/lib/utils/mockData.ts
src/context/AuthContext.tsx  (mock login)
```

### Étape 1.2: Créer compte Supabase

1. Aller à [supabase.com](https://supabase.com)
2. S'inscrire
3. Créer projet "caja-clients"
4. Attendre 2-3 minutes
5. Copier credentials

### Étape 1.3: Configurer .env.local

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxxx
```

---

## Phase 2: Créer Tables (30 minutes)

### Exécuter SQL dans Supabase Dashboard

[SUPABASE_SETUP.md](SUPABASE_SETUP.md) contient tous les scripts SQL.

Copier-coller dans SQL Editor:
1. Table tenants
2. Table tenant_settings
3. Table users
4. Table roles
5. Créer indices
6. Habiliter RLS

---

## Phase 3: Migrations des Données (1-2 heures)

### Créer Script de Migration

```typescript
// scripts/migrate-data.ts

import { getSupabaseAdmin } from "@/lib/supabase";

async function migrateData() {
  const supabaseAdmin = getSupabaseAdmin();

  console.log("1. Migrer tenants...");
  // 1. Créer tenant Chocorico
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .insert({
      name: "ChocoRico",
      slug: "chocorico",
      plan: "pro",
      features: {
        pos: true,
        inventory: true,
        employees: true,
        payroll: true,
        schedules: true,
        reports: false,
        customRoles: true,
        api: false,
      },
    })
    .select()
    .single();

  console.log("2. Migrer users...");
  // 2. Migrer utilisateurs
  const mockUsers = [
    { email: "admin@caja.com", firstName: "Admin", lastName: "User", roleId: "admin" },
    { email: "manager@caja.com", firstName: "Manager", lastName: "User", roleId: "manager" },
  ];

  for (const user of mockUsers) {
    await supabaseAdmin.from("users").insert({
      tenant_id: tenant.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      role_id: user.roleId,
      status: "ACTIVE",
    });
  }

  console.log("3. Migrer roles...");
  // 3. Migrer roles
  const defaultRoles = [
    {
      name: "admin",
      permissions: ["pos.create", "inventory.view", /* ... */],
      isSystem: true,
    },
    {
      name: "manager",
      permissions: ["employees.view", "payroll.approve"],
      isSystem: true,
    },
  ];

  for (const role of defaultRoles) {
    await supabaseAdmin.from("roles").insert({
      tenant_id: tenant.id,
      ...role,
    });
  }

  console.log("✅ Migration complète!");
}

migrateData().catch(console.error);
```

### Ejecutar Script

```bash
npm run ts scripts/migrate-data.ts
```

---

## Phase 4: Actualizar Código (2-3 horas)

### 4.1 AuthContext: Usar Supabase

Antes (Mock):
```typescript
const mockUser: User = {
  id: "1",
  email: "admin@caja.com",
  firstName: "Admin",
  lastName: "User",
  roleId: "admin",
  permissions: [/* mock permisos */],
};
```

Después (Supabase):
```typescript
import { supabase } from "@/lib/supabase";

const login = async (email: string, password: string) => {
  // 1. Autenticar con Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) throw authError;

  // 2. Obtener datos del usuario
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("*, roles(*)")
    .eq("email", email)
    .single();

  if (userError) throw userError;

  // 3. Establecer usuario
  setUser({
    id: userData.id,
    email: userData.email,
    firstName: userData.first_name,
    lastName: userData.last_name,
    roleId: userData.role_id,
    permissions: userData.roles?.permissions || [],
  });
};
```

### 4.2 RoleService: Usar Supabase

Antes (Mock):
```typescript
static getAllRoles() {
  return DEFAULT_ROLES;  // ← Mock data
}
```

Después (Supabase):
```typescript
static async getAllRoles(tenantId: string) {
  const { data, error } = await supabase
    .from("roles")
    .select("*")
    .eq("tenant_id", tenantId);

  if (error) throw error;
  return data;
}
```

### 4.3 Otros Services

Aplicar mismo patrón a:
- POSService → usar supabase
- InventoryService → usar supabase
- EmployeeService → usar supabase
- PayrollService → usar supabase

---

## Phase 5: Testing (1-2 horas)

### Test 1: Autenticación

```typescript
test("User can login", async () => {
  const user = await authService.login("admin@caja.com", "password");
  expect(user.email).toBe("admin@caja.com");
  expect(user.roleId).toBe("admin");
});
```

### Test 2: Aislamiento Multi-Tenant

```typescript
test("User A cannot see User B's data", async () => {
  // Login como tenant A
  const tenant_a_roles = await RoleService.getAllRoles("tenant-a-id");

  // Login como tenant B
  const tenant_b_roles = await RoleService.getAllRoles("tenant-b-id");

  // No deben ver datos del otro
  expect(tenant_a_roles).not.toEqual(tenant_b_roles);
});
```

### Test 3: Permisos

```typescript
test("User has correct permissions", async () => {
  const user = await getUser("admin@caja.com");
  expect(user.permissions).toContain("pos.create");
  expect(user.permissions).toContain("settings.manage_roles");
});
```

---

## Phase 6: Deployment (1 hora)

### Antes de ir a production:

- [ ] Backup de mock data (archivos locales)
- [ ] Tests pasados ✅
- [ ] RLS habilitado en Supabase
- [ ] Variables de entorno correctas
- [ ] Logs limpiados
- [ ] CORS configurado

### Ir a Production:

```bash
npm run build
npm run start

# O en Vercel:
git push origin main
# Vercel auto-deploya
```

---

## Rollback Plan

Si algo falla:

```bash
# 1. Revertir variables de entorno
# 2. Usar mock data de respaldo
# 3. Deshabilitar Supabase en código
# 4. Deploy anterior versión
```

---

## Checklist de Migration

- [ ] Supabase cuenta creada
- [ ] .env.local configurado
- [ ] Tablas SQL creadas
- [ ] RLS habilitado
- [ ] Datos migrados
- [ ] AuthContext actualizado
- [ ] Services actualizados
- [ ] Tests pasados
- [ ] CORS configured
- [ ] Production deployment
- [ ] Monitoreo activado

---

## Tiempo Estimado Total

```
Phase 1: 1-2 horas (Prep)
Phase 2: 0.5 horas (SQL)
Phase 3: 1-2 horas (Data migration)
Phase 4: 2-3 horas (Code update)
Phase 5: 1-2 horas (Testing)
Phase 6: 1 hora (Deploy)

TOTAL: 7-11 horas
= 1-1.5 días de trabajo
```

---

## Después de Migration

### Tareas Post-Migration:

1. **Eliminar mock data**
   ```bash
   rm src/lib/utils/mockData.ts
   ```

2. **Actualizar documentación**
   - Cambiar README
   - Actualizar guías

3. **Monitorear performance**
   - Supabase metrics
   - New Relic / Datadog

4. **Preparar Fase 2**
   - Agregar autenticación JWT
   - Crear admin panel
   - Roles por plan

---

¡Listo para migrar! 🚀

¿Preguntas? Consulta [SUPABASE_SETUP.md](SUPABASE_SETUP.md)
