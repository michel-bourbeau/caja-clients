# 🚀 Quick Start - Caja POS System

## 1️⃣ Instalación

```bash
cd caja-clients
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 2️⃣ Credenciales de Prueba

- Email: `admin@caja.com`
- Contraseña: `123456`

## 3️⃣ Navega por los Módulos

### 📊 Dashboard
Vista principal con estadísticas

### 🛒 POS (Punto de Venta)
- Registrar ventas
- Múltiples métodos de pago
- Cálculo automático de IVA

### 📦 Inventario
- Gestión de productos
- Control de stock
- Categorías

### 👥 Empleados
- Registro de personal
- Asignación de roles

### 📅 Horarios
- Programación semanal
- Turnos de empleados

### 💰 Nómina
- Cálculo de salarios
- Períodos de pago

### 📋 Transacciones
- Historial de ventas
- Búsqueda y filtros

## 4️⃣ Estructura de Carpetas

```
src/
├── app/dashboard/          # 📄 Páginas
│   ├── page.tsx           # Dashboard
│   ├── pos/               # Cajas
│   ├── inventory/         # Inventario
│   ├── employees/         # Empleados
│   ├── schedules/         # Horarios
│   ├── payroll/           # Nómina
│   ├── transactions/      # Transacciones
│   └── settings/          # Configuración
├── components/            # 🎨 Componentes UI
├── context/              # 🔐 Autenticación
├── features/             # ⚙️ Lógica de negocio
└── lib/
    ├── types/            # 📝 Interfaces
    ├── utils/            # 🛠️ Helpers
    └── constants/        # ⚡ Constantes
```

## 5️⃣ Agregar Funcionalidad

### Crear Nueva Página
```bash
mkdir -p src/app/dashboard/mi-pagina
# Crear src/app/dashboard/mi-pagina/page.tsx
```

### Crear Componente
```typescript
// src/components/MiComponente.tsx
export const MiComponente = () => <div>Mi Componente</div>;

// Exportar en src/components/index.ts
export { MiComponente } from "./MiComponente";

// Usar
import { MiComponente } from "@/components";
```

### Agregar Servicio
```typescript
// src/features/modulo/services.ts
export class MiService {
  static async hacer(): Promise<void> {
    // Implementar
  }
}
```

## 6️⃣ Comandos Útiles

```bash
npm run dev        # Desarrollo
npm run build      # Compilar
npm run start      # Producción
npm run lint       # Revisar código
npm run lint:fix   # Corregir automáticamente
npm run format     # Formatear código
npm run type-check # Verificar tipos
```

## 7️⃣ Componentes Disponibles

### Button
```tsx
<Button variant="primary" size="md" onClick={() => {}}>
  Enviar
</Button>
```

### Card
```tsx
<Card title="Mi Tarjeta">
  Contenido
</Card>
```

### Input
```tsx
<Input 
  label="Email" 
  type="email" 
  placeholder="correo@ejemplo.com"
  error={error}
/>
```

### DataTable
```tsx
<DataTable
  columns={[{ key: "name", label: "Nombre" }]}
  data={productos}
  actions={(item) => <Button>Ver</Button>}
/>
```

## 8️⃣ Utilidades

```typescript
import { 
  formatCurrency,      // Formatear moneda
  formatDate,          // Formatear fecha
  calculateTotal,      // Calcular total
  validateEmail,       // Validar email
  useAsync,            // Hook para datos
  useForm             // Hook para formularios
} from "@/lib/utils";
```

## 9️⃣ Estructura de Tipos

```typescript
// Importar tipos
import type { Product, Employee, Transaction } from "@/lib/types";

// Usar en componentes
const producto: Product = {
  id: "1",
  name: "Laptop",
  price: 1200,
  // ...
};
```

## 🔟 Documentación Completa

- 📖 [README.md](README.md) - Overview del proyecto
- 🏗️ [ARCHITECTURE.md](ARCHITECTURE.md) - Decisiones arquitectónicas
- 📁 [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - Estructura detallada
- 👨‍💻 [DEVELOPMENT.md](DEVELOPMENT.md) - Guía de desarrollo

## 🎯 Próximos Pasos

1. Implementar Backend API
2. Conectar Base de Datos
3. Agregar más validaciones
4. Tests unitarios
5. Reportes avanzados
6. Sistema de permisos avanzado
7. Modo offline

## 💡 Tips

- Usa `"use client"` solo en componentes interactivos
- Define tipos en `src/lib/types/index.ts`
- Crea servicios en `src/features/`
- Utiliza componentes base de `@/components`
- Aprovecha los hooks en `@/lib/utils`

## 🆘 Problemas?

```bash
# Borrar cache
rm -rf .next

# Reinstalar dependencias
rm -rf node_modules
npm install

# Ejecutar nuevamente
npm run dev
```

---

**¡Listo para empezar a desarrollar! 🚀**

Si tienes preguntas, revisa DEVELOPMENT.md o ARCHITECTURE.md
