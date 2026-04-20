# Caja - Sistema de Gestión Integral

Un sistema completo y profesional para gestionar cajas, inventarios, nómina y horarios de empleados. Construido con Next.js 16, React 19, TypeScript y Tailwind CSS.

## 🚀 Características

### 📦 Módulos Principales

- **🛒 Punto de Venta (POS)**
  - Interfaz rápida y moderna para registrar ventas
  - Carrito de compras dinámico
  - Múltiples métodos de pago (Efectivo, Tarjeta, Transferencia)
  - Cálculo automático de IVA y totales
  - Historial de transacciones

- **📋 Inventario**
  - Gestión de productos y categorías
  - Control de stock en tiempo real
  - Registro de movimientos de inventario
  - Alertas de stock bajo
  - Búsqueda y filtros avanzados

- **👥 Gestión de Empleados**
  - Registro completo de empleados
  - Asignación de roles (Admin, Manager, Cashier, Employee)
  - Estados de empleado (Activo, Inactivo)
  - Información de contacto

- **📅 Horarios**
  - Programación semanal de turnos
  - Vista de calendario visual
  - Asignación de empleados por día
  - Gestión de jornadas

- **💰 Nómina**
  - Cálculo automático de salarios
  - Períodos de pago
  - Registro de bonificaciones y deducciones
  - Estados de pago (Borrador, Aprobado, Pagado)
  - Reporte de recibos de sueldo

- **⚙️ Configuración**
  - Información de la empresa
  - Tasas de impuestos (IVA)
  - Opciones del POS
  - Respaldo y restauración de datos

## 📁 Estructura del Proyecto

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Layout principal
│   ├── page.tsx                 # Página de inicio (redirecciona a login/dashboard)
│   ├── login/                   # Página de autenticación
│   └── dashboard/               # Area protegida
│       ├── layout.tsx           # Layout con sidebar
│       ├── page.tsx             # Dashboard principal
│       ├── pos/                 # Módulo de ventas
│       ├── inventory/           # Módulo de inventario
│       ├── employees/           # Módulo de empleados
│       ├── schedules/           # Módulo de horarios
│       ├── payroll/             # Módulo de nómina
│       ├── transactions/        # Historial de transacciones
│       └── settings/            # Configuración
├── components/                   # Componentes reutilizables
│   ├── Sidebar.tsx              # Navegación lateral
│   ├── ui.tsx                   # Componentes base (Button, Card, Input, Select)
│   └── DataTable.tsx            # Tabla de datos genérica
├── context/                      # React Context para estado global
│   └── AuthContext.tsx          # Contexto de autenticación
├── features/                     # Módulos de características
│   ├── pos/                     # Lógica del POS
│   ├── inventory/               # Lógica de inventario
│   ├── payroll/                 # Lógica de nómina
│   └── schedules/               # Lógica de horarios
├── lib/
│   ├── types/                   # Interfaces TypeScript
│   ├── utils/
│   │   ├── formatters.ts        # Formateo de datos (moneda, fecha, etc)
│   │   └── calculations.ts      # Cálculos de negocio
│   └── constants/
│       └── index.ts             # Constantes de la aplicación
└── styles/                       # Estilos globales
```

## 🛠️ Instalación

### Requisitos previos
- Node.js 18+ 
- npm o yarn

### Pasos

1. **Clonar el repositorio**
   ```bash
   git clone <repositorio>
   cd caja-clients
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Variables de entorno** (opcional)
   Crea un archivo `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

4. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:3000`

## 📝 Comandos

```bash
# Desarrollo (hot-reload)
npm run dev

# Compilar para producción
npm run build

# Iniciar en producción
npm run start

# Verificar lint
npm run lint
```

## 🔐 Autenticación y Sistema de Roles

La aplicación incluye un sistema flexible de autenticación y control de acceso:

### Roles del Sistema

- **👑 ADMIN**: Acceso completo a todas las funciones
- **🎯 MANAGER**: Gestión de empleados, nómina y horarios
- **🛒 CASHIER**: Punto de venta e inventario
- **👤 EMPLOYEE**: Acceso limitado (check-in, ver datos personales)

### 🎨 Sistema de Roles Personalizados

**¡NUEVO!** Ahora puedes crear roles totalmente personalizados según tus necesidades:

- **Crear roles ilimitados** con cualquier nombre
- **Asignar permisos específicos** a cada rol
- **25+ permisos predefinidos** organizados en 6 categorías
- **Proteger roles del sistema** para evitar cambios accidentales
- **Gestión dinámica** de acceso sin cambiar código

#### Ejemplo: ChocoRico 🍫
```
Patron (Admin)           → Control total del sistema
Vendedor Magasin         → POS + Inventario
Fabricant                → Inventario + Fabricación  
Gerente Fabrique         → Empleados + Nómina + Supervisión
```

#### Categorías de Permisos
- **🛒 POS**: create, view, void, configure
- **📦 INVENTORY**: view, create, edit, delete, adjust
- **👥 EMPLOYEES**: view, create, edit, delete
- **📅 SCHEDULES**: view, edit, checkin
- **💰 PAYROLL**: view, create, approve, pay
- **⚙️ SETTINGS**: view, edit, manage_roles

### Gestionando Roles

1. **Ir a** `/dashboard/admin/roles`
2. **Crear nuevos roles** con permisos personalizados
3. **Editar o eliminar** roles que creaste
4. **Asignar roles** a empleados en `/dashboard/employees`

Ver [ROLES_GUIDE.md](ROLES_GUIDE.md) para documentación completa.

Credenciales de prueba:
- Email: `admin@caja.com`
- Contraseña: `123456`
- Rol: Admin (acceso completo)

## 💻 Stack Tecnológico

- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript 5
- **UI Framework**: React 19
- **Estilos**: Tailwind CSS v4
- **PostCSS**: Tailwind CSS PostCSS
- **Gestión de Estado**: React Context API
- **Linting**: ESLint

## 🎨 Diseño

Interfaz moderna y profesional con:
- Dark mode ready
- Componentes reutilizables
- Responsive design (Mobile-first)
- Accesibilidad WCAG

## 📊 Próximas Características

- [ ] API REST (Node.js/Express)
- [ ] Base de datos (PostgreSQL + Prisma)
- [ ] Reportes avanzados y gráficos
- [ ] Integración con sistemas de pago
- [ ] Auditoría de transacciones
- [ ] Exportación a PDF/Excel
- [ ] WebSockets para actualizaciones en tiempo real
- [ ] Sincronización offline
- [ ] App móvil React Native
- [ ] Autenticación OAuth

## 📄 Licencia

Propietario - Todos los derechos reservados

## 👨‍💻 Autor

Desarrollado como solución empresarial integral.
