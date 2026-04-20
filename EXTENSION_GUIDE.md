# 🔧 Guía de Extensión y Contribución

Cómo extender y personalizar el sistema de roles para tus necesidades específicas.

---

## 🎯 Agregar Nuevos Permisos

### Paso 1: Definir Permisos en `roles.ts`

```typescript
// src/lib/types/roles.ts

export const DEFAULT_PERMISSIONS: Permission[] = [
  // ... permisos existentes ...

  // ✨ TUS NUEVOS PERMISOS
  {
    id: "reports.generate",
    name: "Generar reportes",
    description: "Crear nuevos reportes de ventas",
    category: "REPORTS",
  },
  {
    id: "reports.export",
    name: "Exportar reportes",
    description: "Exportar reportes a Excel/PDF",
    category: "REPORTS",
  },
];
```

### Paso 2: Usar en Componentes

```typescript
// src/app/dashboard/reports/page.tsx

"use client";
import { useAuth } from "@/context/AuthContext";

export default function ReportsPage() {
  const { hasPermission } = useAuth();

  if (!hasPermission("reports.generate")) {
    return <p>No tienes permiso para generar reportes</p>;
  }

  return (
    <ProtectedComponent permission="reports.export" fallback={<button disabled>Exportar</button>}>
      <button>Exportar Reporte</button>
    </ProtectedComponent>
  );
}
```

---

## 👤 Crear un Nuevo Tipo de Usuario

### Paso 1: Extender User

```typescript
// src/lib/types/index.ts

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  permissions: string[];

  // ✨ TUS NUEVOS CAMPOS
  department?: string;
  manager?: string;
  hireDate?: Date;
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE";
}
```

### Paso 2: Actualizar Mock Data

```typescript
// src/lib/utils/mockData.ts

const mockUser: User = {
  id: "1",
  email: "admin@caja.com",
  firstName: "Admin",
  lastName: "User",
  roleId: "admin",
  permissions: [...],

  // ✨ TUS NUEVOS DATOS
  department: "Management",
  hireDate: new Date("2024-01-01"),
  status: "ACTIVE",
};
```

---

## 🔀 Crear una Categoría de Permisos Nueva

### Ejemplo: REPORTS

```typescript
// src/lib/types/roles.ts

export const DEFAULT_PERMISSIONS: Permission[] = [
  // Categoría existente
  {
    id: "pos.create",
    name: "Crear venta",
    category: "POS",
  },

  // ✨ NUEVA CATEGORÍA
  {
    id: "reports.generate",
    name: "Generar reportes",
    category: "REPORTS",  // ← Nueva categoría
  },
  {
    id: "reports.export",
    name: "Exportar reportes",
    category: "REPORTS",
  },
  {
    id: "reports.schedule",
    name: "Programar reportes",
    category: "REPORTS",
  },
];
```

### Actualizar Sidebar

```typescript
// src/components/Sidebar.tsx

{hasPermission("reports.generate") && (
  <NavLink href={ROUTES.REPORTS} label="Reportes" icon="📊" />
)}
```

---

## 🎨 Crear un Nuevo Módulo Completo

### Estructura
```
src/
├── app/dashboard/reports/
│   └── page.tsx
├── features/reports/
│   └── services.ts
└── lib/
    └── types/
        └── reports.ts
```

### Paso 1: Tipos

```typescript
// src/lib/types/reports.ts

export interface Report {
  id: string;
  name: string;
  type: "SALES" | "INVENTORY" | "PAYROLL";
  generatedAt: Date;
  generatedBy: string;
}

export interface ReportFilter {
  startDate?: Date;
  endDate?: Date;
  category?: string;
}
```

### Paso 2: Servicio

```typescript
// src/features/reports/services.ts

export class ReportService {
  static async generateReport(
    type: Report["type"],
    filters: ReportFilter
  ): Promise<Report> {
    // TODO: Implement API call
    return {
      id: "1",
      name: `${type} Report`,
      type,
      generatedAt: new Date(),
      generatedBy: "user123",
    };
  }

  static async exportReport(
    reportId: string,
    format: "PDF" | "EXCEL"
  ): Promise<Blob> {
    // TODO: Implement export
    return new Blob();
  }
}
```

### Paso 3: Página

```typescript
// src/app/dashboard/reports/page.tsx

"use client";
import { ProtectedComponent } from "@/components/ProtectedComponent";
import { ReportService } from "@/features/reports/services";

export default function ReportsPage() {
  const { hasPermission } = useAuth();

  const handleGenerateReport = async () => {
    if (!hasPermission("reports.generate")) {
      alert("No tienes permiso");
      return;
    }

    const report = await ReportService.generateReport("SALES", {});
    // Mostrar reporte...
  };

  return (
    <ProtectedComponent permission="reports.generate">
      <button onClick={handleGenerateReport}>Generar Reporte</button>
    </ProtectedComponent>
  );
}
```

---

## 🏗️ Crear un Rol Complejo

### Ejemplo: Supervisor Regional

```typescript
// src/features/roles/services.ts

const supervisorRegionalRole: Omit<Role, "createdAt" | "updatedAt"> = {
  id: "supervisor-regional",
  name: "Supervisor Regional",
  description: "Supervisa múltiples tiendas en una región",
  isSystem: false,
  permissions: [
    // POS
    "pos.view",

    // Inventario
    "inventory.view",
    "inventory.edit",

    // Empleados
    "employees.view",
    "employees.create",
    "employees.edit",

    // Horarios
    "schedules.view",
    "schedules.edit",

    // Nómina
    "payroll.view",
    "payroll.approve",

    // Reportes (si existen)
    "reports.generate",
    "reports.export",
  ],
};
```

---

## 🔗 Integrar Terceros (APIs)

### Ejemplo: Integración con Contabilidad

```typescript
// src/features/accounting/services.ts

export class AccountingService {
  // Verificar permisos antes de integrar
  static async syncPayroll(userId: string, permissions: string[]) {
    if (!permissions.includes("payroll.approve")) {
      throw new Error("Unauthorized");
    }

    // Integración con API de contabilidad
    const response = await fetch("/api/accounting/sync-payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    return response.json();
  }
}
```

### Usar en Componente

```typescript
"use client";
import { useAuth } from "@/context/AuthContext";
import { AccountingService } from "@/features/accounting/services";

export function SyncButton() {
  const { user, hasPermission } = useAuth();

  const handleSync = async () => {
    if (!hasPermission("payroll.approve")) {
      alert("No tienes permiso");
      return;
    }

    await AccountingService.syncPayroll(user!.id, user!.permissions);
  };

  return (
    <button onClick={handleSync}>
      Sincronizar con Contabilidad
    </button>
  );
}
```

---

## 🧪 Testear Permisos

### Test Unitario

```typescript
// src/context/__tests__/AuthContext.test.ts

describe("AuthContext - Permission Checks", () => {
  it("should check single permission", () => {
    const { hasPermission } = useAuth();
    expect(hasPermission("pos.create")).toBe(true);
    expect(hasPermission("payroll.pay")).toBe(true);
  });

  it("should check multiple permissions (any)", () => {
    const { hasAnyPermission } = useAuth();
    expect(
      hasAnyPermission(["inventory.delete", "payroll.pay"])
    ).toBe(true);
    expect(hasAnyPermission(["fake.permission"])).toBe(false);
  });

  it("should check multiple permissions (all)", () => {
    const { hasAllPermissions } = useAuth();
    expect(
      hasAllPermissions(["pos.create", "inventory.view"])
    ).toBe(true);
    expect(
      hasAllPermissions(["pos.create", "fake.permission"])
    ).toBe(false);
  });
});
```

### Test de Integración

```typescript
// src/app/dashboard/admin/roles/__tests__/page.test.ts

describe("Roles Page", () => {
  it("should create a custom role", async () => {
    const page = await render(<RolesPage />);

    await page.click('button:has-text("Crear Nuevo Rol")');
    await page.fill('input[name="name"]', "Custom Role");
    await page.click('input[name="permissions.pos.create"]');
    await page.click('button:has-text("Crear Rol")');

    expect(await page.textContent()).toContain("Custom Role");
  });
});
```

---

## 🔐 Proteger Rutas

### Middleware (Próximamente)

```typescript
// src/middleware.ts

import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Rutas que requieren permisos específicos
  if (pathname.startsWith("/dashboard/admin")) {
    // Verificar admin (próximamente con JWT)
    // Por ahora solo redirige al login
    const token = request.cookies.get("token");
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

---

## 📊 Datos de Auditoría

### Registrar Cambios de Rol

```typescript
// src/features/audit/services.ts

export interface AuditLog {
  id: string;
  userId: string;
  action: "CREATE_ROLE" | "UPDATE_ROLE" | "DELETE_ROLE";
  roleId?: string;
  changes?: Record<string, any>;
  timestamp: Date;
}

export class AuditService {
  static async logRoleChange(
    userId: string,
    action: AuditLog["action"],
    roleId?: string,
    changes?: Record<string, any>
  ) {
    const log: AuditLog = {
      id: crypto.randomUUID(),
      userId,
      action,
      roleId,
      changes,
      timestamp: new Date(),
    };

    // TODO: Guardar en BD
    console.log("Audit Log:", log);
  }
}
```

### Usar en RoleService

```typescript
export class RoleService {
  static async createRole(name: string, description: string, permissions: string[]) {
    // Crear rol...
    const role = { id: "123", name, description, permissions };

    // Registrar auditoría
    await AuditService.logRoleChange(
      currentUser.id,
      "CREATE_ROLE",
      role.id,
      { name, description }
    );

    return role;
  }
}
```

---

## 🚀 Deployment

### Preparar para Producción

```bash
# 1. Build
npm run build

# 2. Tests
npm run test

# 3. Lint
npm run lint

# 4. Deploy a producción
npm start
```

### Variables de Entorno (.env.local)

```
NEXT_PUBLIC_API_URL=https://api.tuempresa.com
NEXT_PUBLIC_APP_NAME=Caja
NODE_ENV=production
```

---

## 📚 Recursos

- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

## 💡 Consejos

1. **Siempre verifica permisos** antes de acciones sensibles
2. **Agrupa permisos** por categoría lógica
3. **Protege roles del sistema** de edición
4. **Documenta nuevos permisos** en ROLES_GUIDE.md
5. **Testa cambios** antes de desplegar
6. **Usa TypeScript** para mayor seguridad

---

## 🤝 Contribuir

Para agregar cambios al proyecto:

1. Crea una rama (`git checkout -b feature/mi-cambio`)
2. Haz commit (`git commit -am 'Agrega mi cambio'`)
3. Sube cambios (`git push origin feature/mi-cambio`)
4. Abre un Pull Request

---

**¡Gracias por extender el sistema!** 🚀
