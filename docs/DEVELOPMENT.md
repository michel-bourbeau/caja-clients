# 👨‍💻 Guía de Desarrollo - Caja POS System

## Requisitos

- Node.js 18+
- npm o yarn
- VS Code (recomendado)
- Git

## Configuración Inicial

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd caja-clients

# 2. Instalar dependencias
npm install

# 3. Crear .env.local
cp .env.example .env.local

# 4. Iniciar desarrollo
npm run dev

# 5. Abrir en navegador
# http://localhost:3000 -> redirige a /login
```

## Scripts Disponibles

```bash
npm run dev          # Iniciar servidor de desarrollo
npm run build        # Compilar para producción
npm run start        # Iniciar servidor de producción
npm run lint         # Verificar linting
npm run lint:fix     # Corregir errores de linting
npm run type-check   # Verificar tipos TypeScript
npm run format       # Formatear código con Prettier
```

## Estructura de Carpetas

Cada módulo debe tener:
- `page.tsx` - La página principal (en `src/app/dashboard/...`)
- `services.ts` - La lógica de negocio (en `src/features/...`)
- Componentes específicos si es necesario

## Convenciones de Código

### Componentes

```typescript
// ✅ CORRECTO - Componentes server por defecto
export default function MiPagina() {
  return <div>Contenido</div>;
}

// Si necesita interactividad:
"use client";

import { useState } from "react";

export default function MiComponenteInteractivo() {
  const [state, setState] = useState("");
  return <div>{state}</div>;
}
```

### Nombres

- **Componentes**: PascalCase (`Button`, `DataTable`, `Sidebar`)
- **Funciones/variables**: camelCase (`formatCurrency`, `userEmail`)
- **Constantes**: UPPER_SNAKE_CASE (`TAX_RATE`, `MAX_ITEMS`)
- **Archivos**: minúsculas con guión (`my-component.tsx`, `user-service.ts`)

### Imports

```typescript
// ✅ Usar alias de path
import { Button } from "@/components";
import { formatCurrency } from "@/lib/utils";
import { POSService } from "@/features";

// ❌ Evitar rutas relativas
import { Button } from "../../../components";
```

### Tipos

```typescript
// Definir en src/lib/types/index.ts
export interface User {
  id: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "CASHIER";
}

// Usar en componentes
import type { User } from "@/lib/types";
```

### Componentes UI

```tsx
import { Button, Card, Input } from "@/components";

export default function Form() {
  return (
    <Card title="Mi Formulario">
      <Input 
        label="Email" 
        type="email" 
        placeholder="correo@ejemplo.com"
      />
      <Button>Enviar</Button>
    </Card>
  );
}
```

## Agregando Nuevas Páginas

1. **Crear carpeta y archivo**
   ```bash
   mkdir -p src/app/dashboard/nueva-pagina
   touch src/app/dashboard/nueva-pagina/page.tsx
   ```

2. **Implementar página**
   ```tsx
   import { Card, Button } from "@/components";
   
   export default function NuevaPagina() {
     return (
       <div>
         <h1 className="text-3xl font-bold">Nueva Página</h1>
         <Card title="Contenido">
           {/* Tu contenido aquí */}
         </Card>
       </div>
     );
   }
   ```

3. **Agregar ruta en constants**
   ```typescript
   // src/lib/constants/index.ts
   export const ROUTES = {
     NUEVA_PAGINA: "/dashboard/nueva-pagina",
   };
   ```

4. **Actualizar Sidebar si es necesario**
   ```tsx
   // src/components/Sidebar.tsx
   <NavLink href={ROUTES.NUEVA_PAGINA} label="Nueva Página" icon="📌" />
   ```

## Agregando Nuevos Componentes

1. **Crear componente**
   ```tsx
   // src/components/MiComponente.tsx
   interface MiComponenteProps {
     title: string;
     children: React.ReactNode;
   }
   
   export const MiComponente: React.FC<MiComponenteProps> = ({ title, children }) => {
     return <div>{title}: {children}</div>;
   };
   ```

2. **Exportar en barrel**
   ```typescript
   // src/components/index.ts
   export { MiComponente } from "./MiComponente";
   ```

## Agregando Lógica de Negocio

1. **Crear service**
   ```typescript
   // src/features/modulo/services.ts
   export class MiService {
     static async metodo(): Promise<void> {
       // Implementar
     }
   }
   ```

2. **Usar en componentes**
   ```tsx
   import { MiService } from "@/features";
   
   const resultado = await MiService.metodo();
   ```

## Validación de Datos

```typescript
import { validateEmail, validateProductData } from "@/lib/utils";

// Validaciones simples
if (!validateEmail(email)) {
  console.error("Email inválido");
}

// Validaciones complejas
const errors = validateProductData(formData);
if (errors.length > 0) {
  errors.forEach(err => console.error(err.message));
}
```

## Formateo de Datos

```typescript
import { formatCurrency, formatDate } from "@/lib/utils";

const precio = formatCurrency(1250.50); // $1.250,50
const fecha = formatDate(new Date());   // 15 de agosto de 2024
```

## Custom Hooks

```typescript
import { useAsync, useForm, useModal } from "@/lib/utils";

// useAsync - Manejo de datos asincronos
const { data, loading, error, refetch } = useAsync(
  () => fetch('/api/products'),
  true // ejecutar al montar
);

// useForm - Manejo de formularios
const { formData, handleChange, handleSubmit } = useForm(
  { email: "", password: "" },
  async (data) => {
    // Hacer login
  }
);

// useModal - Manejo de modales
const { isOpen, open, close } = useModal();
```

## Autenticación

```typescript
import { useAuth } from "@/context/AuthContext";

export function Header() {
  const { user, login, logout } = useAuth();
  
  if (!user) return <p>No autenticado</p>;
  
  return (
    <div>
      <p>{user.firstName} ({user.role})</p>
      <button onClick={logout}>Salir</button>
    </div>
  );
}
```

## Debugging

### Logs
```typescript
console.log("Variable:", variable);
console.error("Error:", error);
```

### VS Code Debugger
1. Crear `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js debug",
      "type": "node",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "console": "integratedTerminal"
    }
  ]
}
```

## Testing (Próximamente)

```bash
npm install -D vitest @testing-library/react
npm run test
```

## Linting y Formatting

```bash
# Verificar errores
npm run lint

# Corregir automáticamente
npm run lint:fix

# Formatear código
npm run format

# Verificar tipos
npm run type-check
```

## Commits

Usar format convencional:
```bash
git commit -m "feat: agregar módulo de inventario"
git commit -m "fix: corregir cálculo de impuestos"
git commit -m "docs: actualizar README"
```

## Troubleshooting

### Puerto 3000 en uso
```bash
# Usar otro puerto
npm run dev -- -p 3001
```

### Errores de tipos
```bash
npm run type-check
```

### Borrar cache
```bash
rm -rf .next node_modules
npm install
npm run dev
```

## Recursos Útiles

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## Preguntas Frecuentes

**¿Cómo agregar una nueva ruta?**
1. Crear carpeta en `src/app/dashboard/nueva-ruta`
2. Crear `page.tsx` dentro
3. Agregar a `ROUTES` en constants
4. Actualizar sidebar si es visible

**¿Cómo usar Context?**
```typescript
import { useAuth } from "@/context/AuthContext";
const { user } = useAuth();
```

**¿Cómo agregar variables de entorno?**
1. Agregar en `.env.local`
2. Si es pública, prefija con `NEXT_PUBLIC_`
3. Acceder con `process.env.VARIABLE_NAME`

---

¡Contáctame si tienes preguntas! 🚀
