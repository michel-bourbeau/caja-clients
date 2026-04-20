# 📁 Caja - Estructura del Proyecto

## Descripción General

```
caja-clients/
├── src/
│   ├── app/                    # Next.js App Router (páginas y layouts)
│   ├── components/             # Componentes UI reutilizables
│   ├── context/                # Context API para estado global
│   ├── features/               # Lógica de características por módulo
│   ├── lib/
│   │   ├── types/              # TypeScript interfaces y tipos
│   │   ├── utils/              # Utilidades y helpers
│   │   └── constants/          # Constantes de la app
│   └── styles/                 # Estilos globales
├── public/                     # Assets estáticos
├── .env.example                # Variables de entorno (plantilla)
├── eslint.config.mjs           # Configuración de ESLint
├── next.config.ts             # Configuración de Next.js
├── tailwind.config.ts         # Configuración de Tailwind
├── tsconfig.json              # Configuración de TypeScript
└── package.json               # Dependencias y scripts
```

## Estructura Detallada

### `src/app` - Páginas y Layouts

```
app/
├── layout.tsx                 # Layout raíz
├── page.tsx                   # Home (redirecciona a login/dashboard)
├── login/
│   └── page.tsx              # Página de autenticación
└── dashboard/
    ├── layout.tsx             # Layout con sidebar
    ├── page.tsx               # Dashboard principal
    ├── pos/
    │   └── page.tsx           # Módulo de cajas
    ├── inventory/
    │   └── page.tsx           # Módulo de inventario
    ├── employees/
    │   └── page.tsx           # Módulo de empleados
    ├── schedules/
    │   └── page.tsx           # Módulo de horarios
    ├── payroll/
    │   └── page.tsx           # Módulo de nómina
    ├── transactions/
    │   └── page.tsx           # Historial de transacciones
    └── settings/
        └── page.tsx           # Configuración
```

### `src/components` - Componentes UI

```
components/
├── Sidebar.tsx               # Navegación lateral
├── ui.tsx                    # Componentes base (Button, Card, Input, Select)
├── DataTable.tsx             # Tabla de datos genérica
└── index.ts                  # Barrel export
```

**Componentes disponibles:**
- `Button` - Botón con variantes (primary, secondary, danger, ghost)
- `Card` - Tarjeta/contenedor
- `Input` - Campo de entrada con validación
- `Select` - Selector/dropdown
- `DataTable` - Tabla dinámica con datos
- `Sidebar` - Navegación lateral

### `src/context` - Estado Global

```
context/
└── AuthContext.tsx           # Contexto de autenticación y usuario
```

**Hook disponible:**
- `useAuth()` - Acceder a usuario, login, logout

### `src/features` - Lógica de Negocio

```
features/
├── pos/
│   └── services.ts           # POSService (generar transacciones, etc)
├── inventory/
│   └── services.ts           # InventoryService (gestionar stock, etc)
├── payroll/
│   └── services.ts           # PayrollService (calcular nómina, etc)
├── schedules/
│   └── services.ts           # ScheduleService (horarios, asistencia, etc)
└── index.ts                  # Barrel export
```

**Servicios disponibles:**
- `POSService` - Crear transacciones, calcular totales, generar recibos
- `InventoryService` - Gestionar stock, movimientos, alertas
- `PayrollService` - Calcular salarios, generar nóminas
- `ScheduleService` - Gestionar turnos, check-in/out

### `src/lib/types` - Interfaces TypeScript

```
types/
└── index.ts                  # Todas las interfaces del dominio
```

**Tipos principales:**
- `Product` - Producto del inventario
- `Category` - Categoría de productos
- `InventoryMovement` - Movimiento de stock
- `CartItem` - Artículo del carrito
- `Transaction` - Transacción de venta
- `Employee` - Empleado
- `EmployeeSchedule` - Horario del empleado
- `TimeEntry` - Registro de asistencia
- `PayrollPeriod` - Período de nómina
- `Payroll` - Nómina del empleado
- `User` - Usuario autenticado

### `src/lib/utils` - Utilidades

```
utils/
├── formatters.ts             # Formateo de datos (moneda, fecha, etc)
├── calculations.ts           # Cálculos de negocio
├── validators.ts             # Validación de datos
├── hooks.ts                  # Custom hooks (useAsync, useForm, useModal)
├── mockData.ts               # Datos simulados para desarrollo
└── index.ts                  # Barrel export
```

**Funciones principales:**
- `formatCurrency()` - Formatear a moneda (ARS)
- `formatDate()`, `formatTime()`, `formatDateTime()`
- `calculateTax()`, `calculateTotal()`
- `calculateHoursWorked()`, `calculatePayrollAmount()`
- `validateEmail()`, `validatePhone()`, `validateCUIT()`
- `useAsync()`, `useForm()`, `useModal()` - Custom hooks

### `src/lib/constants` - Constantes

```
constants/
└── index.ts                  # Rutas, roles, estados, etc.
```

**Constantes disponibles:**
- `ROUTES` - Todas las rutas de la app
- `EMPLOYEE_ROLES` - Roles de empleados
- `PAYMENT_METHODS` - Métodos de pago
- `TRANSACTION_STATUS` - Estados de transacción
- `PAYROLL_STATUS` - Estados de nómina
- `TAX_RATE` - Tasa de IVA por defecto

## Flujos de Trabajo

### Agregar una Página

1. Crear carpeta en `src/app/dashboard/nueva-pagina`
2. Crear `page.tsx` dentro
3. Importar componentes necesarios
4. Agregar ruta en `ROUTES` (constants)
5. Actualizar `Sidebar.tsx` si es necesario

### Crear un Nuevo Componente

1. Crear archivo en `src/components/`
2. Exportar en `src/components/index.ts`
3. Usar en páginas: `import { MiComponente } from "@/components"`

### Agregar Lógica de Negocio

1. Crear `services.ts` en `src/features/modulo/`
2. Crear clase Service con métodos estáticos
3. Exportar en `src/features/index.ts`
4. Usar en componentes: `import { MiService } from "@/features"`

### Usar State Global

```tsx
"use client";
import { useAuth } from "@/context/AuthContext";

export function MiComponente() {
  const { user, login, logout } = useAuth();
  // ...
}
```

## Convenciones

- **Nombres**: PascalCase para componentes y clases, camelCase para funciones
- **Archivos**: Usar nombres descriptivos en minúsculas
- **Componentes**: "use client" en componentes interactivos
- **Tipos**: Definir en `src/lib/types/index.ts`
- **Colores**: Usar clases Tailwind (slate, blue, red, green, amber, purple)
- **Responsive**: Mobile-first approach

## Próximas Adiciones

- [ ] Implementar API REST
- [ ] Conectar a base de datos
- [ ] Agregar más validaciones
- [ ] Tests unitarios
- [ ] Documentación de API
- [ ] Internacionalización (i18n)
- [ ] Tema oscuro
- [ ] Exportación a PDF/Excel
- [ ] Notificaciones en tiempo real
