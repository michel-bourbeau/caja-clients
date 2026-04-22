# 🏗️ Arquitectura - Caja POS System

## Visión General

Caja es una aplicación web empresarial construida con una arquitectura modular y escalable siguiendo los principios de **Clean Architecture** y **Domain-Driven Design**.

```
┌─────────────────────────────────────────┐
│       Presentación (UI/React)           │
│   (Páginas, Componentes, Layouts)       │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│        Context API (Estado Global)      │
│         (Auth, Notificaciones)          │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│      Features (Lógica de Negocio)       │
│  (POSService, InventoryService, etc)    │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│         Utilities & Helpers             │
│  (Formatters, Validators, Calculations) │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│           API/Datos                     │
│ (Próximamente: REST API, Base Datos)    │
└─────────────────────────────────────────┘
```

## Capas de la Arquitectura

### 1. **Capa de Presentación** (`src/app`, `src/components`)

**Responsabilidades:**
- Mostrar la interfaz de usuario
- Capturar interacción del usuario
- Renderizar datos

**Características:**
- Componentes reutilizables (Button, Card, Input, DataTable)
- Layouts (Sidebar, Dashboard)
- Páginas por módulo
- Uso de "use client" solo donde es necesario

**Ejemplo:**
```tsx
// src/app/dashboard/page.tsx
export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Card title="Estadísticas">
        {/* Contenido */}
      </Card>
    </div>
  );
}
```

### 2. **Capa de Estado Global** (`src/context`)

**Responsabilidades:**
- Mantener estado compartido entre componentes
- Autenticación y autorización
- Notificaciones globales (próximamente)

**Patrón:** React Context API

**Ejemplo:**
```typescript
// src/context/AuthContext.tsx
export const useAuth = () => {
  const context = useContext(AuthContext);
  return context; // { user, login, logout, isLoading }
};
```

### 3. **Capa de Características** (`src/features`)

**Responsabilidades:**
- Lógica de negocio específica de cada módulo
- Operaciones complejas
- Transformación de datos

**Patrón:** Service Pattern con métodos estáticos

**Módulos:**
- **POS Service** - Crear transacciones, calcular totales
- **Inventory Service** - Gestionar stock, movimientos
- **Payroll Service** - Calcular nóminas
- **Schedule Service** - Gestionar horarios

**Ejemplo:**
```typescript
// src/features/pos/services.ts
export class POSService {
  static async createTransaction(
    items: CartItem[],
    paymentMethod: string,
    cashierId: string
  ): Promise<Transaction> {
    // Lógica de negocio
  }
}
```

### 4. **Capa de Utilidades** (`src/lib`)

**Responsabilidades:**
- Funciones reutilizables
- Validación de datos
- Formateo de datos
- Constantes y tipos

**Sub-capas:**
- **Types** - Interfaces TypeScript
- **Utils** - Funciones auxiliares
- **Constants** - Constantes de aplicación

**Ejemplo:**
```typescript
// src/lib/utils/formatters.ts
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value);
};
```

### 5. **Capa de Datos** (Por implementar)

**Responsabilidades:**
- Comunicación con API
- Operaciones de base de datos
- Caché de datos

**Será:**
- API REST (Node.js/Express)
- Base de datos (PostgreSQL)
- ORM (Prisma)

## Patrones de Diseño

### Service Pattern

Clases estáticas con métodos para operaciones complejas:

```typescript
export class InventoryService {
  static async updateStock(productId: string, quantity: number): Promise<void> {
    // Implementación
  }

  static isLowStock(product: Product): boolean {
    return product.quantity <= 10;
  }
}
```

### Hook Pattern

Custom hooks para lógica reutilizable:

```typescript
export function useAsync<T>(
  asyncFunction: () => Promise<T>
): UseAsyncReturn<T> {
  // Implementación
}
```

### Context Pattern

Para estado global:

```typescript
export const AuthProvider = ({ children }) => {
  // Estado global
  return <AuthContext.Provider value={...}>{children}</AuthContext.Provider>;
};
```

### Component Pattern

Componentes reutilizables con props bien tipados:

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button: React.FC<ButtonProps> = ({ variant = "primary", ... }) => {
  // Implementación
};
```

## Flujos de Datos

### Flujo de una Venta (POS)

```
Usuario selecciona productos
        ↓
Componente agrega al carrito
        ↓
Componente calcula total (POSService.calculateCartTotal)
        ↓
Usuario confirma pago
        ↓
POSService.createTransaction() -> API
        ↓
Transaction guardada
        ↓
UI actualiza (resetear carrito)
```

### Flujo de Autenticación

```
Login page
        ↓
useAuth().login(email, password)
        ↓
AuthContext hace request a API
        ↓
Si exitoso: guarda user en state
        ↓
Redirige a /dashboard
        ↓
Componentes pueden acceder a user con useAuth()
```

## Decisiones Arquitectónicas

### 1. **Usar Next.js App Router**
- ✅ Más moderno que Pages Router
- ✅ Soporte para Server Components
- ✅ File-based routing más intuitivo

### 2. **React Context en lugar de Redux**
- ✅ Simpler para esta escala
- ✅ Menos boilerplate
- ✅ Suficiente para estado global
- 🔄 Migrar a Redux/Zustand si crece

### 3. **Service Pattern para lógica**
- ✅ Fácil de testear
- ✅ Reutilizable
- ✅ Separación de concerns

### 4. **TypeScript strict**
- ✅ Type safety
- ✅ Mejor DX con autocompletado
- ✅ Menos bugs en producción

### 5. **Tailwind CSS**
- ✅ Utility-first approach
- ✅ Pequeño tamaño de bundle
- ✅ Temas fáciles de mantener

## Escalabilidad

### Cuando crezca la app:

1. **Estado más complejo**
   ```typescript
   // Migrar de Context a Zustand o Redux
   import { create } from 'zustand';
   ```

2. **Más servicios**
   ```typescript
   // Crear carpeta src/services/api
   // Implementar cliente HTTP (axios, fetch)
   ```

3. **Testing**
   ```bash
   npm install vitest @testing-library/react
   ```

4. **Internacionalización**
   ```bash
   npm install next-intl
   ```

5. **Monitoreo y Logging**
   ```bash
   npm install sentry
   ```

## Estructura de Carpetas Escalada

```
src/
├── app/
├── components/
│   ├── shared/
│   ├── layout/
│   ├── forms/
│   └── tables/
├── context/
├── features/
│   ├── pos/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── services.ts
│   ├── inventory/
│   └── ...
├── lib/
│   ├── api/           (Nuevo)
│   ├── db/            (Nuevo)
│   ├── types/
│   ├── utils/
│   └── constants/
├── middleware.ts      (Nuevo - Autenticación)
└── hooks/             (Nuevo - Custom hooks globales)
```

## Seguridad

Consideraciones de seguridad implementadas:

```typescript
// ✅ Tipos TypeScript estrictos
// ✅ Validación de entrada
// ✅ Headers de seguridad en next.config
// ✅ No exponer datos sensibles en client
// ✅ Usar "use client" solo cuando sea necesario
```

Próximas mejoras:
- [ ] CSRF tokens
- [ ] Rate limiting
- [ ] Sanitización de inputs
- [ ] Autenticación JWT
- [ ] HTTPS obligatorio

## Performance

Optimizaciones:

```typescript
// ✅ Next.js App Router (streaming, etc)
// ✅ Tree-shaking (módulos ES6)
// ✅ Code splitting automático
// ✅ Image optimization
// ✅ SWC para compilación rápida
```

Próximas mejoras:
- [ ] Caching con SWR
- [ ] Lazy loading de módulos
- [ ] Service Workers (offline)
- [ ] Database connection pooling

## Testing

Propuesta de estructura de tests:

```typescript
// services/__tests__/pos.service.test.ts
describe("POSService", () => {
  it("debe crear una transacción válida", () => {
    // Test
  });
});

// components/__tests__/Button.test.tsx
describe("Button Component", () => {
  it("debe renderizar con texto", () => {
    // Test
  });
});
```

## DevOps

Consideraciones para deployment:

```bash
# Build
npm run build

# Start
npm run start

# Environment variables
.env.production (en servidor)
```

Plataformas recomendadas:
- Vercel (Next.js óptimo)
- Netlify
- AWS Amplify
- Railway

## Documentación

- `README.md` - Información general
- `PROJECT_STRUCTURE.md` - Estructura detallada
- `DEVELOPMENT.md` - Guía de desarrollo
- `ARCHITECTURE.md` - Este documento

---

**Principios guía:**
- 🎯 Mantener código limpio y legible
- 📦 Componentes pequeños y reutilizables
- 🔄 Separación de concerns
- 🧪 Fácil de testear
- 📈 Escalable y mantenible
