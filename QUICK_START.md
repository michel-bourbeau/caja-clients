# ⚡ Quick Start - Sistema de Roles Personalizado

Guía rápida para empezar a usar el sistema de roles en 5 minutos.

## 🚀 Inicio Rápido

### 1. Ejecutar la aplicación
```bash
npm install
npm run dev
# Abierto en http://localhost:3000
```

### 2. Login
```
Email: admin@caja.com
Contraseña: 123456
```

### 3. Ir a Gestión de Roles
```
Dashboard → Admin (⚙️) → Roles
```

---

## 📋 Tareas Rápidas

### ✅ Crear tu primer rol personalizado

1. Ve a `/dashboard/admin/roles`
2. Haz clic en "Crear Nuevo Rol"
3. Completa el formulario:
   - **Nombre**: Mi Rol
   - **Descripción**: Descripción
   - **Permisos**: Selecciona los que necesites
4. Haz clic en "Crear Rol"

### ✅ Asignar rol a un empleado

1. Ve a `/dashboard/employees`
2. Selecciona un empleado
3. Cambia el rol en el dropdown
4. ¡Listo! El empleado ahora tiene nuevos permisos

### ✅ Ver mis permisos

En el dashboard, verás una tarjeta "Información de Acceso" que muestra:
- Tu nombre
- Tu rol actual
- Todos tus permisos por módulo

---

## 🎯 Casos de Uso Comunes

### Caso 1: Vendedor de Tienda
```typescript
Nombre: "Vendedor Tienda"
Permisos:
  ☑ POS → Crear venta
  ☑ POS → Ver transacciones
  ☑ Inventario → Ver inventario
  ☑ Horarios → Check-in
```

### Caso 2: Supervisor de Almacén
```typescript
Nombre: "Supervisor Almacén"
Permisos:
  ☑ Inventario → Ver inventario
  ☑ Inventario → Editar productos
  ☑ Inventario → Ajustar stock
  ☑ Empleados → Ver empleados
  ☑ Horarios → Ver horarios
```

### Caso 3: Gerente
```typescript
Nombre: "Gerente Tienda"
Permisos:
  ☑ POS → Ver transacciones
  ☑ Inventario → Ver inventario
  ☑ Empleados → Ver (todos)
  ☑ Empleados → Crear
  ☑ Empleados → Editar
  ☑ Horarios → Ver
  ☑ Horarios → Editar
  ☑ Nómina → Ver
  ☑ Nómina → Aprobar
```

---

## 🔍 Permisos Disponibles (Referencia Rápida)

### 🛒 POS (Punto de Venta)
- `pos.create` - Crear ventas
- `pos.view` - Ver transacciones
- `pos.void` - Anular ventas
- `pos.configure` - Configurar POS

### 📦 Inventario
- `inventory.view` - Ver inventario
- `inventory.create` - Agregar productos
- `inventory.edit` - Editar productos
- `inventory.delete` - Eliminar productos
- `inventory.adjust` - Ajustar stock

### 👥 Empleados
- `employees.view` - Ver empleados
- `employees.create` - Agregar empleados
- `employees.edit` - Editar empleados
- `employees.delete` - Eliminar empleados

### 📅 Horarios
- `schedules.view` - Ver horarios
- `schedules.edit` - Editar horarios
- `schedules.checkin` - Check-in/out

### 💰 Nómina
- `payroll.view` - Ver nóminas
- `payroll.create` - Crear nóminas
- `payroll.approve` - Aprobar nóminas
- `payroll.pay` - Procesar pagos

### ⚙️ Configuración
- `settings.view` - Ver configuración
- `settings.edit` - Editar configuración
- `settings.manage_roles` - Gestionar roles

---

## 💻 Verificar Permisos en Componentes

### En el Componente
```typescript
"use client";
import { useAuth } from "@/context/AuthContext";

export function MiComponente() {
  const { user, hasPermission } = useAuth();

  if (!hasPermission("pos.create")) {
    return <p>No tienes permiso para crear ventas</p>;
  }

  return <button>Crear Venta</button>;
}
```

### Componente Protegido
```typescript
import { ProtectedComponent } from "@/components/ProtectedComponent";

export function MiPagina() {
  return (
    <ProtectedComponent permission="inventory.delete">
      <button>Eliminar Producto</button>
    </ProtectedComponent>
  );
}
```

---

## ⚡ Atajos Útiles

| URL | Función |
|-----|---------|
| `/dashboard` | Dashboard principal |
| `/dashboard/admin` | Panel de administración |
| `/dashboard/admin/roles` | Gestión de roles |
| `/dashboard/employees` | Gestión de empleados |
| `/dashboard/pos` | Punto de venta |
| `/dashboard/inventory` | Inventario |
| `/dashboard/payroll` | Nómina |

---

## 🆘 Preguntas Frecuentes

### P: ¿Puedo modificar los roles del sistema?
**R:** No. Admin, Manager y Cashier están protegidos para evitar cambios accidentales.

### P: ¿Cuántos roles puedo crear?
**R:** Ilimitados. Crea todos los que necesites.

### P: ¿Qué pasa si elimino un rol?
**R:** Se elimina el rol, pero los empleados conservan su rol anterior.

### P: ¿Puede un empleado tener múltiples roles?
**R:** Actualmente no. Cada empleado tiene un rol. (Próximamente: múltiples roles)

### P: ¿Los cambios de rol son inmediatos?
**R:** Sí. El cambio se aplica al instante.

### P: ¿Se guardan los roles al recargar?
**R:** No (actualmente). Los datos están en memoria. Próximamente: base de datos.

---

## 📚 Documentación Completa

Para más detalles, consulta:

- **[ROLES_GUIDE.md](ROLES_GUIDE.md)** - Guía completa del sistema
- **[ADVANCED_EXAMPLES.md](ADVANCED_EXAMPLES.md)** - 15 ejemplos avanzados
- **[src/app/dashboard/admin/README.md](src/app/dashboard/admin/README.md)** - Panel admin

---

## 🎯 Ejemplo Real: ChocoRico

```
Patron (Admin)
├── Vendedor Magasin
│   ├── pos.create, pos.view
│   ├── inventory.view
│   └── schedules.checkin
│
├── Fabricant
│   ├── inventory.view
│   ├── inventory.adjust
│   └── schedules.checkin
│
└── Gerente Fabrique
    ├── employees.view, employees.edit
    ├── payroll.view, payroll.approve
    └── schedules.view, schedules.edit
```

---

## ✅ Checklist Rápido

- [ ] Instalar dependencias (`npm install`)
- [ ] Ejecutar app (`npm run dev`)
- [ ] Login con admin
- [ ] Ir a `/dashboard/admin/roles`
- [ ] Crear un rol personalizado
- [ ] Asignar a un empleado
- [ ] Ver tarjeta de permisos en dashboard
- [ ] ¡Disfrutar! 🎉

---

## 🚀 Próximos Pasos

1. **Explora los módulos** - POS, Inventario, Empleados, etc.
2. **Crea tus roles** - Según tu estructura organizacional
3. **Asigna empleados** - Dale a cada uno su rol
4. **Personaliza** - Ajusta permisos según necesites

---

**¡Listo! Ya estás usando el sistema de roles personalizado.** ⭐

Para dudas, consulta la documentación completa. 📚
