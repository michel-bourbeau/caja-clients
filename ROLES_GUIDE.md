# 🔐 Sistema de Roles - Guía de Implementación

## ¿Qué es el Sistema de Roles?

Un sistema flexible que permite a los clientes (empresas) crear roles personalizados según sus necesidades. En lugar de roles fijos (Admin, Manager, Cashier), ahora pueden:

- **Crear roles personalizados** (Vendedor, Fabricante, Supervisor, etc.)
- **Asignar permisos específicos** a cada rol
- **Modificar roles** en cualquier momento
- **Proteger roles del sistema** (Admin, Manager, Cashier)

## Ejemplo: Chocorico 🍫

Chocorico podría tener:
- **Patron** (Admin) - Control total
- **Vendedor Magasin** (Cashier + Inventory) - POS + Gestión de stock
- **Fabricant Chocolat** (Employee + Inventory) - Fabricación + Stock
- **Gerente Fabrique** (Manager) - Supervisión + Nómina

## Estructura Técnica

### 1. **Tipos de Datos** (`src/lib/types/roles.ts`)

```typescript
interface Role {
  id: string;                    // role-123456789
  name: string;                  // "Vendedor"
  description?: string;
  permissions: string[];         // ["pos.create", "inventory.view"]
  isSystem?: boolean;            // true para roles protegidos
  createdAt: Date;
  updatedAt: Date;
}

interface Permission {
  id: string;                    // "pos.create"
  name: string;                  // "Crear venta"
  description?: string;
  category: string;              // "POS", "INVENTORY", etc
}
```

### 2. **Servicio de Roles** (`src/features/roles/services.ts`)

```typescript
export class RoleService {
  static async createRole(name, description, permissions)
  static async updateRole(roleId, name, description, permissions)
  static async deleteRole(roleId)
  static getAllRoles()
  static hasPermission(userPermissions, requiredPermission)
  static validatePermissions(permissions)
}
```

### 3. **Autenticación Actualizada** (`src/context/AuthContext.tsx`)

```typescript
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;              // ID del rol personalizado
  permissions: string[];       // Array de permisos del usuario
}

export interface AuthContextType {
  user: User | null;
  hasPermission(permission: string): boolean
  hasAnyPermission(permissions: string[]): boolean
}
```

## Permisos Disponibles

### 📦 Inventario
- `inventory.view` - Ver inventario
- `inventory.create` - Agregar productos
- `inventory.edit` - Editar productos
- `inventory.delete` - Eliminar productos
- `inventory.adjust` - Ajustar stock

### 🛒 POS
- `pos.create` - Crear venta
- `pos.view` - Ver transacciones
- `pos.void` - Anular venta
- `pos.configure` - Configurar POS

### 👥 Empleados
- `employees.view` - Ver empleados
- `employees.create` - Agregar empleado
- `employees.edit` - Editar empleado
- `employees.delete` - Eliminar empleado

### 📅 Horarios
- `schedules.view` - Ver horarios
- `schedules.edit` - Editar horarios
- `schedules.checkin` - Check-in/out

### 💰 Nómina
- `payroll.view` - Ver nómina
- `payroll.create` - Crear nómina
- `payroll.approve` - Aprobar nómina
- `payroll.pay` - Procesar pago

### ⚙️ Configuración
- `settings.view` - Ver configuración
- `settings.edit` - Editar configuración
- `settings.manage_roles` - Gestionar roles

## Cómo Usar

### 1. **Verificar Permisos en Componentes**

```tsx
"use client";
import { useAuth } from "@/context/AuthContext";

export function MiComponente() {
  const { user, hasPermission, hasAnyPermission } = useAuth();

  // Un solo permiso
  if (!hasPermission("pos.create")) {
    return <p>No tienes acceso al POS</p>;
  }

  // Múltiples permisos (cualquiera)
  if (!hasAnyPermission(["pos.create", "inventory.view"])) {
    return <p>Acceso denegado</p>;
  }

  return <div>Contenido permitido</div>;
}
```

### 2. **Crear un Rol Personalizado**

```typescript
const newRole = await RoleService.createRole(
  "Vendedor Tienda",              // name
  "Vende productos en la tienda",  // description
  [
    "pos.create",
    "pos.view",
    "inventory.view",
    "schedules.checkin"
  ]  // permissions
);
```

### 3. **Verificar Permisos en el Backend** (cuando sea implementado)

```typescript
// En middleware o rutas protegidas
const user = await getUser(req);
const hasPermission = RoleService.hasPermission(
  user.permissions,
  "inventory.edit"
);

if (!hasPermission) {
  throw new UnauthorizedException();
}
```

## Páginas Relacionadas

### 🔑 `/dashboard/admin/roles`
- Listar todos los roles
- Crear nuevos roles
- Editar roles personalizados
- Eliminar roles personalizados
- Ver permisos por categoría

### 👥 `/dashboard/employees`
- Asignar roles a empleados
- Ver rol actual del empleado
- Cambiar rol dinámicamente

### 🔐 `/dashboard/admin`
- Panel principal de administración
- Acceso a gestión de roles
- Información del sistema

## Roles Protegidos del Sistema

No se pueden editar ni eliminar:

```typescript
- admin       → Administrador (todos los permisos)
- manager     → Gerente (empleados, nómina, reportes)
- cashier     → Vendedor (POS, inventario)
```

## Flujo de Login

1. Usuario hace login con email/contraseña
2. Sistema verifica credenciales
3. Obtiene el rol del usuario (roleId)
4. Carga los permisos asociados al rol
5. Usuario accede con sus permisos específicos
6. Sidebar se adapta según permisos
7. Componentes se ocultan si no tiene permiso

## Ejemplo Real: Chocorico 🍫

### Crear rol "Vendedor Magasin"

```typescript
await RoleService.createRole(
  "Vendedor Magasin",
  "Vende chocolates en la tienda",
  [
    // POS (Venta)
    "pos.create",      // ✅ Puede crear ventas
    "pos.view",        // ✅ Puede ver transacciones
    
    // Inventario
    "inventory.view",  // ✅ Puede ver stock
    
    // Horarios
    "schedules.checkin" // ✅ Puede registrar asistencia
  ]
);
```

### Crear rol "Fabricant"

```typescript
await RoleService.createRole(
  "Fabricant Chocolat",
  "Fabrica chocolates",
  [
    // Inventario
    "inventory.view",   // ✅ Puede ver stock
    "inventory.adjust", // ✅ Puede ajustar stock
    
    // Horarios
    "schedules.checkin" // ✅ Puede registrar asistencia
  ]
);
```

### Crear rol "Gerente Fabrique"

```typescript
await RoleService.createRole(
  "Gerente Fabrique",
  "Supervisa la fabricación",
  [
    // Empleados
    "employees.view",   // ✅ Ver empleados
    "employees.edit",   // ✅ Editar empleados
    
    // Nómina
    "payroll.view",     // ✅ Ver nóminas
    "payroll.approve",  // ✅ Aprobar nóminas
    
    // Horarios
    "schedules.view",   // ✅ Ver horarios
    "schedules.edit"    // ✅ Editar horarios
  ]
);
```

## Próximas Mejoras

- [ ] Interfaz visual para crear roles con drag & drop
- [ ] Templates de roles predefinidos
- [ ] Exportar/Importar configuración de roles
- [ ] Auditoría de cambios de roles
- [ ] Validaciones avanzadas de permisos
- [ ] API REST completa para roles
- [ ] Base de datos para persistencia

## Troubleshooting

### "No tienes permiso para..."

Verifica que:
1. El usuario esté autenticado
2. El rol esté correctamente asignado
3. El permiso esté en la lista del rol
4. Estés usando `hasPermission()` correctamente

### Rol no aparece en la lista

1. Verifica que no sea un rol del sistema
2. Recarga la página
3. Revisa la consola para errores
4. Verifica que el role_id sea válido

---

¡El sistema de roles está listo! 🚀

Ahora cada empresa puede personalizar completamente su estructura organizacional.
