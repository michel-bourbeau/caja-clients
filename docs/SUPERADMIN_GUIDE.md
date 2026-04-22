# 🔐 SuperAdmin Console - Guía de Inicio Rápido

## Acceso a la Consola SuperAdmin

### 1. **Ir a la Página de Login SuperAdmin**
```
http://localhost:3000/superadmin/login
```

### 2. **Credenciales**
- **Contraseña SuperAdmin:** `admin123456`

> ⚠️ **EN PRODUCCIÓN:** Cambiar esta contraseña en `src/context/SuperAdminContext.tsx`

---

## ¿Qué Puedes Hacer en la Consola SuperAdmin?

### ✅ Crear Nuevos Tenants
1. Click en **"➕ Crear un Tenant"**
2. Rellena:
   - **Nombre del Tenant** - Ej: "Mi Negocio S.A."
   - **Slug (URL)** - Ej: "mi-negocio" (sin espacios, solo lowercase)
   - **Plan** - Elige entre: Básico, Profesional, Empresarial
3. **Selecciona los módulos** a activar:
   - 🛒 Point of Sale (POS) - Cajas y ventas
   - 📦 Inventario - Gestión de productos
   - 👥 Empleados - Base de datos de empleados
   - 📅 Horarios - Turnos y disponibilidad
   - 💰 Nómina - Cálculo de salarios
   - 📊 Reportes - Análisis y estadísticas
   - ⚙️ Configuración - Ajustes del sistema

4. Click **"Crear el Tenant"**
5. ✅ Obtendrás el ID del tenant

### 🔧 Modificar Módulos de un Tenant Existente
1. Busca el tenant en la lista
2. Click **"✏️ Modificar Módulos"**
3. Checkbox los módulos que deseas activar/desactivar
4. Click **"✅ Sauvegarder"**

---

## 🌊 Flujo Completo de Configuración

### Paso 1: Crear Tenant (SuperAdmin)
```
SuperAdmin Console → Crear Tenant → Configurar Módulos
```
**Resultado:** ID del Tenant (ej: c1d44fe1-a862-4b6b-afbd-8566f61099a2)

### Paso 2: Crear Admin de Tenant (Admin Console)
```
/admin/users → Seleccionar Tenant → Crear Usuario Admin
```
- Email: admin@minegocio.com
- Contraseña: Segura
- Rol: Admin (opcional por ahora)

**Resultado:** El admin puede acceder a /dashboard

### Paso 3: Admin Configura el Sistema
El admin del tenant puede:
- ✅ Crear productos y categorías (si Inventario está activo)
- ✅ Registrar empleados (si Empleados está activo)
- ✅ Configurar horarios (si Horarios está activo)
- ✅ Procesar nómina (si Nómina está activo)

---

## 📊 Estructura de Datos

### Tenants Table
```sql
{
  id: UUID,                    -- ID único del tenant
  name: "Mi Negocio",          -- Nombre
  slug: "mi-negocio",          -- URL slug
  plan: "basic|professional|enterprise",
  features: {
    pos: true,
    inventory: true,
    employees: false,
    schedules: false,
    payroll: false,
    reports: false,
    settings: true
  },
  created_at: timestamp,
  updated_at: timestamp
}
```

### Modules Disponibles
| ID | Nombre | Descripción |
|---|---|---|
| `pos` | Point of Sale | Ventas y cajas |
| `inventory` | Inventario | Productos y categorías |
| `employees` | Empleados | Gestión de personal |
| `schedules` | Horarios | Turnos y asistencia |
| `payroll` | Nómina | Cálculo de salarios |
| `reports` | Reportes | Análisis de datos |
| `settings` | Configuración | Ajustes generales |

---

## 🔑 Ejemplo: Crear tu Primer Tenant

### En la Console SuperAdmin:

1. **Inicia sesión**
   - URL: `/superadmin/login`
   - Contraseña: `admin123456`

2. **Crea un nuevo tenant**
   - Nombre: "Restaurante Central"
   - Slug: "restaurante-central"
   - Plan: "professional"
   - Módulos: ✅ POS, ✅ Inventario, ✅ Empleados, ✅ Horarios, ✅ Nómina

3. **Copias el ID del nuevo tenant** (por ej: `a1b2c3d4-e5f6-7g8h-9i10`)

### En la Console Admin:

1. **Crea el admin del tenant**
   - URL: `/admin/users`
   - Selecciona: "Restaurante Central"
   - Email: `gerente@restaurante-central.com`
   - Contraseña: `MiContraseña123!`
   - Rol: Admin

2. **El gerente se conecta**
   - URL: `/login`
   - Email: `gerente@restaurante-central.com`
   - Contraseña: `MiContraseña123!`
   - Click "Recuérdame por 30 días" (opcional)

3. **¡Listo!** El gerente está en el dashboard con todos los módulos configurados

---

## 🎯 Multi-Tenant en Acción

Cada tenant tiene sus propios datos **completamente aislados**:

✅ **Usuario A** (Restaurante Central)
- 100 productos
- 15 empleados
- Datos de ventas independientes

✅ **Usuario B** (Panadería del Barrio)
- 50 productos
- 5 empleados
- Datos de ventas completamente separados

**Base de datos única, múltiples negocios seguros** 🔒

---

## 🚀 En Resumen

### SuperAdmin hace:
1. Crear tenants
2. Activar/desactivar módulos
3. Gestionar estructura del sistema

### Admin Tenant hace:
1. Crear usuarios (empleados, vendedores)
2. Configurar datos del negocio
3. Usar los módulos activos

### Vendedor/Empleado hace:
1. Usar los módulos asignados
2. Generar ventas, reportes, etc.

---

## 🔗 Enlaces Rápidos

- **Home:** `/` - Selecciona tu rol
- **SuperAdmin Login:** `/superadmin/login` - Contraseña: `admin123456`
- **SuperAdmin Dashboard:** `/superadmin/dashboard` - Gestionar tenants
- **Admin Users:** `/admin/users` - Crear usuarios
- **User Login:** `/login` - Para vendedores/empleados
- **Dashboard:** `/dashboard` - Área de trabajo

---

## ⚠️ Notas Importantes

1. **Contraseña SuperAdmin:** Cambiar en PRODUCCIÓN
2. **Backup de datos:** Hacer backups regulares de Supabase
3. **Seguridad:** Todo está protegido con multi-tenant isolation
4. **Módulos:** Los usuarios solo ven lo que el SuperAdmin activó
5. **Supabase:** Las políticas RLS aseguran que cada tenant ve solo sus datos
