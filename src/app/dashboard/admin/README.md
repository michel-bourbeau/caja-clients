# 🛡️ Panel Administrativo

Este es el hub central para la administración del sistema de Caja & Inventarios.

## 📂 Estructura

```
src/app/dashboard/admin/
├── page.tsx              # Dashboard principal del admin
└── roles/
    ├── page.tsx          # Gestión completa de roles
    └── README.md         # (este archivo)
```

## 🎯 Características Principales

### 1. **Dashboard Admin** (`/dashboard/admin`)
Panel de control centralizado con acceso rápido a:
- 🔑 Gestión de Roles
- ⚙️ Configuración del Sistema
- 📜 Auditoría (próximamente)
- 📊 Estadísticas (próximamente)
- ℹ️ Información del Sistema

### 2. **Gestión de Roles** (`/dashboard/admin/roles`)
Interfaz completa para administrar roles:

#### ✨ Funcionalidades
- **Crear roles personalizados** - Añade roles según necesidades
- **Editar roles** - Modifica permisos en cualquier momento
- **Eliminar roles** - Borra roles personalizados
- **Proteger roles del sistema** - Admin, Manager, Cashier no se pueden modificar
- **Permisos por categoría** - Selecciona permisos agrupados
- **Vista previa** - Ve los permisos de cada rol

#### 📋 Interfaz
```
┌─────────────────────────────────────────┐
│ Lista de Roles                          │
├─────────────────────────────────────────┤
│ Admin (Sistema)           [Ver permisos]│
│ Manager (Sistema)         [Ver permisos]│
│ Cashier (Sistema)         [Ver permisos]│
│ Vendedor Tienda    [Editar] [Eliminar] │
│ Fabricante         [Editar] [Eliminar] │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Crear Nuevo Rol                         │
├─────────────────────────────────────────┤
│ Nombre: [________________]              │
│ Descripción: [________________________] │
│                                        │
│ Permisos por Módulo:                   │
│ ☑ POS                                   │
│   ☑ Crear venta                         │
│   ☑ Ver transacciones                   │
│   ☐ Anular venta                        │
│ ☑ Inventario                            │
│   ☑ Ver inventario                      │
│   ☐ Editar productos                    │
│ ... (más categorías)                    │
│                                        │
│ [Crear Rol]  [Cancelar]                │
└─────────────────────────────────────────┘
```

## 🔐 Permisos Requeridos

Para acceder a la sección de admin necesitas:
```typescript
hasPermission("settings.manage_roles")
```

## 👥 Roles del Sistema (Protegidos)

### 👑 Admin
- **Acceso:** Completo
- **Permisos:** Todos (25+)
- **Protegido:** ✅ No se puede modificar

### 🎯 Manager
- **Acceso:** Gestión de empleados y nómina
- **Permisos:**
  - Empleados: view, create, edit, delete
  - Nómina: view, approve, pay
  - Horarios: view, edit
  - Inventario: view
  - POS: view
- **Protegido:** ✅ No se puede modificar

### 🛒 Cashier
- **Acceso:** Punto de venta
- **Permisos:**
  - POS: create, view
  - Inventario: view
  - Horarios: checkin
- **Protegido:** ✅ No se puede modificar

## 🆕 Crear un Rol Personalizado

### Pasos
1. Ir a `/dashboard/admin/roles`
2. Hacer clic en "Crear Nuevo Rol"
3. Llenar formulario:
   - **Nombre:** Nombre único del rol
   - **Descripción:** Para qué sirve este rol
   - **Permisos:** Seleccionar permisos requeridos
4. Hacer clic en "Crear Rol"

### Ejemplo: "Vendedor de Tienda"
```typescript
Nombre: "Vendedor Tienda"
Descripción: "Vende productos en la tienda"

Permisos:
├── POS
│   ├── ✓ Crear venta
│   └── ✓ Ver transacciones
├── Inventario
│   └── ✓ Ver inventario
└── Horarios
    └── ✓ Check-in
```

## ✏️ Editar un Rol

1. En la lista de roles, hacer clic en "Editar"
2. Modificar permisos según sea necesario
3. Hacer clic en "Guardar Cambios"

**Nota:** No puedes editar roles del sistema (Admin, Manager, Cashier)

## 🗑️ Eliminar un Rol

1. En la lista de roles, hacer clic en "Eliminar"
2. Confirmar eliminación
3. El rol se elimina (empleados conservan rol anterior)

**Nota:** No puedes eliminar roles del sistema

## 📊 Asignar Rol a Empleado

1. Ir a `/dashboard/employees`
2. Seleccionar empleado
3. Cambiar rol en el dropdown
4. El cambio se aplica inmediatamente

## 🔄 Flujo Completo

```
Admin Panel
    ↓
Crear/Editar Roles
    ↓
Definir Permisos
    ↓
Asignar a Empleados
    ↓
Empleados acceden con nuevos permisos
    ↓
Sidebar se adapta
    ↓
Componentes se ocultan/muestran
```

## 🚀 Próximas Mejoras

- [ ] Interfaz drag & drop para permisos
- [ ] Templates de roles predefinidos
- [ ] Clonar rol existente
- [ ] Exportar/Importar roles en CSV/JSON
- [ ] Historial de cambios por rol
- [ ] Búsqueda y filtros
- [ ] Permisos temporales
- [ ] Grupos de permisos

## 💾 Persistencia

**Actual:** Mock data en memoria (se pierde al recargar)

**Próximamente:**
- Base de datos PostgreSQL + Prisma
- API REST para CRUD de roles
- Sincronización en tiempo real

## 🆘 Troubleshooting

### "No veo la sección de Admin"
- Verifica que tengas el rol Admin
- Verifica que seas el creador del sistema

### "No puedo crear un rol"
- Verifica tener permiso `settings.manage_roles`
- Revisa la consola para errores

### "El rol se perdió al recargar"
- Los datos actualmente se guardan en memoria
- Se implementará persistencia en BD próximamente

### "¿Cómo asigno múltiples roles?"
- Actualmente cada empleado tiene un rol
- Para múltiples roles, crea un rol combinado

## 📚 Documentación Relacionada

- [ROLES_GUIDE.md](../../ROLES_GUIDE.md) - Guía completa de roles
- [CUSTOM_ROLES_SUMMARY.md](../../CUSTOM_ROLES_SUMMARY.md) - Resumen del sistema

## 🎓 Ejemplos de Uso

### Caso 1: ChocoRico - Estructura Simple
```
Patron (Admin) → Control total
  ↓
Vendedor Tienda → POS + Inventario
Fabricante → Fabricación + Stock
Gerente → Supervisión
```

### Caso 2: Empresa Mediana
```
CEO (Admin) → Control total
  ↓
Manager Tienda → Empleados + Nómina + POS
Manager Fabrica → Producción + Inventario
Contador → Nómina + Reportes
Vendedor → POS
Operario → Inventario
```

### Caso 3: Cadena de Tiendas
```
Admin Central → Control total
  ↓
Manager Regional → Múltiples tiendas
Manager Tienda → Una tienda
Cajero → POS
Dependiente → Inventario
```

---

**¡El sistema de roles está completamente funcional!** 🎉

Para cualquier pregunta, consulta la documentación o los ejemplos.
