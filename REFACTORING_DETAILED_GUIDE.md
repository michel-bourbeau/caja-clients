# 📝 GUIDE DE REFACTORISATION DÉTAILLÉ

## Phase 1: Pages HTML Brut (3 pages - 2 jours)

---

## 1. `dashboard/expenses/page.tsx`

### 🔍 Diagnostic actuel
- ❌ Zéro import de composants standardisés
- ❌ Structure entièrement en DIVs brutes
- ❌ Styles Tailwind mélangés avec logique
- ❌ Pas d'Alert, Input, Button composants
- ❌ Chaotic state management with many useState

### ✅ Transformation requise

#### Step 1: Imports
```tsx
// AVANT:
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTenantId } from "@/lib/utils/tenant";
import { useCurrency } from "@/lib/utils/useCurrency";
import { Expense, Supplier, ExpenseCategory } from "@/lib/types";

// APRÈS:
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTenantId } from "@/lib/utils/tenant";
import { useCurrency } from "@/lib/utils/useCurrency";
import { Expense, Supplier, ExpenseCategory } from "@/lib/types";
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Container, 
  Section, 
  Alert, 
  Input 
} from "@/components/StripeUIComponents";
import { PageIcon, SearchInput } from "@/components";
```

#### Step 2: Main layout structure
```tsx
// AVANT:
return (
  <div>
    <div>Header stuff</div>
    <div>Form stuff</div>
    <div>List stuff</div>
  </div>
);

// APRÈS:
return (
  <Container>
    <Section>
      {/* Header avec PageIcon */}
      <div className="flex items-center gap-3 mb-6">
        <PageIcon type="expenses" size="lg" displayType="lucide" />
        <div>
          <h1 className="text-3xl font-bold">Gastos</h1>
          <p className="text-slate-600">Gestión de gastos y proveedores</p>
        </div>
      </div>
    </Section>

    {/* Messages */}
    {error && <Alert variant="error">{error}</Alert>}
    {message && <Alert variant="success">{message}</Alert>}

    {/* Filters & Actions */}
    <Section title="Filtros y Acciones">
      <Card>
        <CardContent className="flex flex-wrap gap-4">
          {/* Filters here */}
        </CardContent>
      </Card>
    </Section>

    {/* Data Display */}
    <Section title="Gastos">
      {isLoading ? (
        <div className="text-center py-8">Cargando...</div>
      ) : (
        <Card>
          <CardContent>
            {/* List here */}
          </CardContent>
        </Card>
      )}
    </Section>
  </Container>
);
```

#### Step 3: Forms - Use Input component
```tsx
// AVANT:
<input 
  type="number" 
  placeholder="Monto"
  style={{ padding: '8px', border: '1px solid...' }}
/>

// APRÈS:
<Input 
  label="Monto" 
  type="number"
  value={formData.amount}
  onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
  error={error ? "Invalid amount" : undefined}
  helpText="Ingresa el monto del gasto"
/>
```

#### Step 4: Buttons - Use Button component
```tsx
// AVANT:
<button 
  className="px-4 py-2 bg-blue-500 text-white rounded..."
  onClick={handleAdd}
>
  Agregar
</button>

// DESPUÉS:
<Button 
  variant="primary" 
  onClick={handleAdd}
>
  Agregar Gasto
</Button>
```

#### Step 5: Modals - Use Card + Button
```tsx
// BEFORE: DIVs brutes con styles inline
{showForm && (
  <div className="fixed inset-0 bg-black bg-opacity-50...">
    <div className="bg-white rounded-lg...">
      <h2>Agregar Gasto</h2>
      {/* form */}
    </div>
  </div>
)}

// AFTER: Use Card
{showForm && (
  <Card>
    <CardHeader>
      <CardTitle>Agregar Gasto</CardTitle>
    </CardHeader>
    <CardContent>
      {/* form here */}
      <div className="flex gap-2 justify-end mt-4">
        <Button variant="ghost" onClick={() => setShowForm(false)}>
          Cancelar
        </Button>
        <Button variant="primary" onClick={handleSaveExpense}>
          Guardar
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

### ⏱️ Temps estimé: 4-5 heures
### 📋 Checklist:
- [ ] Ajouter imports StripeUI
- [ ] Wrapper avec Container
- [ ] Utiliser Section pour grouper
- [ ] Remplacer inputs par Input component
- [ ] Remplacer buttons par Button component
- [ ] Utiliser Card pour sections
- [ ] Utiliser Alert pour messages
- [ ] Tester et vérifier rendu
- [ ] Regarde `dashboard/pos/page.tsx` comme référence (même domaine)

---

## 2. `dashboard/settings/modules/page.tsx`

### 🔍 Diagnostic actuel
- ❌ Aucun import composant
- ❌ Module toggles en DIVs brutes
- ❌ Pas d'Alert pour feedback
- ❌ Pas de Container/Section

### ✅ Transformation

#### Step 1: Imports
```tsx
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  Container, 
  Section, 
  Alert,
  Badge
} from "@/components/StripeUIComponents";
```

#### Step 2: Structure
```tsx
<Container>
  <Section title="Módulos del Sistema">
    {/* Modules grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(modules).map(([key, enabled]) => (
        <Card key={key}>
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              {MODULES[key as ModuleKey].name}
              <Badge variant={enabled ? "success" : "default"}>
                {enabled ? "Activo" : "Inactivo"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600 mb-4">
              {MODULES[key as ModuleKey].description}
            </p>
            <Button 
              variant={enabled ? "danger" : "primary"}
              onClick={() => handleToggleModule(key as ModuleKey)}
            >
              {enabled ? "Desactivar" : "Activar"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  </Section>

  {saving && <Alert variant="info">Guardando cambios...</Alert>}
  {message && (
    <Alert variant={message.type === "success" ? "success" : "error"}>
      {message.text}
    </Alert>
  )}
</Container>
```

### ⏱️ Temps estimé: 2-3 heures
### 📋 Checklist:
- [ ] Ajouter imports
- [ ] Wrapper avec Container
- [ ] Utiliser Section
- [ ] Utiliser Card par module
- [ ] Utiliser Badge pour status
- [ ] Utiliser Alert pour messages
- [ ] Tester toggles

---

## 3. `dashboard/settings/theme/page.tsx`

### 🔍 Diagnostic actuel
- ❌ Aucun import composant
- ❌ Formulaires avec inputs bruts
- ❌ Pas d'Alert pour feedback
- ❌ Styles inline partout

### ✅ Transformation

#### Step 1: Imports
```tsx
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter,
  Container, 
  Section, 
  Alert,
  Input
} from "@/components/StripeUIComponents";
```

#### Step 2: Form structure
```tsx
<Container>
  <Section title="Personalización de Tema">
    
    {/* Theme Color Selection */}
    <Card>
      <CardHeader>
        <CardTitle>Color del Tema</CardTitle>
        <CardDescription>Elige el color principal de la aplicación</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {THEME_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`p-4 rounded-lg border-2 transition ${
                themeColor === opt.value 
                  ? 'border-slate-900 bg-slate-50' 
                  : 'border-slate-200'
              }`}
              onClick={() => handleThemeColorChange(opt.value)}
            >
              <div className="font-medium text-sm">{opt.label}</div>
              <div className="text-xs text-slate-600">{opt.description}</div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Font Size Selection */}
    <Card>
      <CardHeader>
        <CardTitle>Tamaño de Fuente</CardTitle>
        <CardDescription>Ajusta el tamaño para mejor legibilidad</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          {FONT_SIZE_OPTIONS.map(opt => (
            <Button
              key={opt.value}
              variant={fontSize === opt.value ? "primary" : "secondary"}
              onClick={() => handleFontSizeChange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Logo Upload */}
    <Card>
      <CardHeader>
        <CardTitle>Logo de la Empresa</CardTitle>
      </CardHeader>
      <CardContent>
        {logoPreview && (
          <div className="mb-4">
            <img 
              src={logoPreview} 
              alt="Logo preview" 
              className="max-h-32"
            />
          </div>
        )}
        <Input
          type="file"
          label="Selecciona logo"
          onChange={handleLogoSelect}
          accept="image/*"
        />
      </CardContent>
    </Card>

    {/* Messages */}
    {message && (
      <Alert variant={message.type === "success" ? "success" : "error"}>
        {message.text}
      </Alert>
    )}

    {/* Actions */}
    <div className="flex gap-4 justify-end mt-6">
      <Button variant="ghost">Cancelar</Button>
      <Button 
        variant="primary" 
        onClick={handleSaveTheme}
        loading={saving}
      >
        Guardar Cambios
      </Button>
    </div>
  </Section>
</Container>
```

### ⏱️ Temps estimé: 3-4 heures
### 📋 Checklist:
- [ ] Ajouter imports
- [ ] Wrapper avec Container
- [ ] Utiliser Section
- [ ] Utiliser Card par section (Color, Font, Logo)
- [ ] Utiliser Input pour file upload
- [ ] Utiliser Button pour actions
- [ ] Utiliser Alert pour messages
- [ ] Tester sauvegarde

---

## Phase 2: Pages @/components/ui (4 pages - 2 jours)

---

## 4. `dashboard/settings/page.tsx`

### 🔍 Diagnostic
- ❌ Importe de `@/components/ui`
- ❌ Pas de `Container`, `Section`
- ❌ Pas d'`Alert`
- ✅ Déjà utilise `Card` et `Button` - juste remplacer source

### ✅ Fix - Remplacer imports

```tsx
// AVANT:
import { Card, Button } from "@/components/ui";

// APRÈS:
import { 
  Card, 
  CardHeader,
  CardTitle,
  CardContent,
  Button, 
  Container, 
  Section, 
  Alert 
} from "@/components/StripeUIComponents";
```

### Puis ajouter layout:
```tsx
<Container>
  <Section title="Configuración" description="Ajusta la configuración de tu sistema">
    {/* Plan section */}
    <Card>
      <CardHeader>
        <CardTitle>Plan Actual</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Plan info */}
      </CardContent>
    </Card>

    {/* Company settings */}
    <Card>
      <CardHeader>
        <CardTitle>Información de la Empresa</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Company form */}
      </CardContent>
    </Card>

    {/* Messages */}
    {message && (
      <Alert variant={message.type === "success" ? "success" : "error"}>
        {message.text}
      </Alert>
    )}
  </Section>
</Container>
```

### ⏱️ Temps estimé: 1 heure
### 📋 Checklist:
- [ ] Remplacer imports
- [ ] Ajouter Container
- [ ] Ajouter Section
- [ ] Ajouter CardHeader/CardTitle où besoin
- [ ] Ajouter Alert pour messages
- [ ] Tester

---

## 5. `dashboard/admin/page.tsx`

### 🔍 Diagnostic
- ❌ Importe de `@/components/ui`
- ❌ Pas de `Container`, `Section`
- ✅ Utilise Card, Button - juste remplacer

### ✅ Fix - Même pattern que settings/page

```tsx
// ANTES:
import { Card, Button } from "@/components/ui";

// DEPOIS:
import { Card, CardHeader, CardTitle, CardContent, Button, Container, Section } from "@/components/StripeUIComponents";

// Et wrapper:
<Container>
  <Section title="Administración" description="Gestión del sistema">
    <Card>
      <CardHeader>
        <CardTitle>Gestión de Roles</CardTitle>
      </CardHeader>
      <CardContent>
        {/* content */}
      </CardContent>
    </Card>
    {/* ... rest */}
  </Section>
</Container>
```

### ⏱️ Temps estimé: 1 heure

---

## 6. `dashboard/settings/taxes/page.tsx`

### 🔍 Diagnostic
- ❌ Importe `Button`, `Input`, `Card` de `@/components/ui`
- ❌ Pas de `Container`, `Section`, `Alert`
- ❌ Formulaire non standardisé

### ✅ Fix

```tsx
// BEFORE:
import { Button, Input, Card } from "@/components/ui";

// AFTER:
import { 
  Button, 
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Container,
  Section,
  Alert
} from "@/components/StripeUIComponents";

// Structure:
<Container>
  <Section title="Configuración de Impuestos">
    {message && <Alert variant="error">{message}</Alert>}
    
    <Card>
      <CardHeader>
        <CardTitle>Impuestos</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Tax list */}
      </CardContent>
    </Card>

    {/* Add/Edit form */}
    {showAddTax && (
      <Card>
        <CardHeader>
          <CardTitle>Agregar Impuesto</CardTitle>
        </CardHeader>
        <CardContent>
          <Input 
            label="Nombre del impuesto"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
          <Input 
            label="Tasa (%)"
            type="number"
            value={formData.rate}
            onChange={(e) => setFormData({...formData, rate: e.target.value})}
          />
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="ghost" onClick={() => setShowAddTax(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleAddTax}>
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>
    )}
  </Section>
</Container>
```

### ⏱️ Temps estimé: 1.5 heures

---

## 7. `dashboard/settings/loyalty/page.tsx`

### 🔍 Diagnostic
- ❌ Importe `Card`, `Button` de `@/components/ui`
- ❌ Pas de `Container`, `Section`, `Alert`
- ❌ Formulaire non standardisé

### ✅ Fix - Même pattern que taxes

```tsx
import { 
  Card,
  CardHeader, 
  CardTitle,
  CardContent,
  Button,
  Container,
  Section,
  Alert,
  Input
} from "@/components/StripeUIComponents";

// Wrapper:
<Container>
  <Section title="Configuración de Fidelización">
    {message && <Alert variant={message.type}>{message.text}</Alert>}
    
    <Card>
      <CardHeader>
        <CardTitle>Configuración</CardTitle>
      </CardHeader>
      <CardContent>
        <Input
          label="Umbral de Recompensa"
          type="number"
          value={loyaltyConfig.rewardThreshold}
          onChange={(e) => setLoyaltyConfig({...loyaltyConfig, rewardThreshold: parseFloat(e.target.value)})}
        />
        {/* ... rest of form */}
        
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="ghost" onClick={() => {}}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={saveLoyaltyConfig}
            loading={saving}
          >
            Guardar
          </Button>
        </div>
      </CardContent>
    </Card>
  </Section>
</Container>
```

### ⏱️ Temps estimé: 1 heure

---

## Phase 3: Amélioration - Partiellement standardisée (1 page)

---

## 8. `dashboard/loyalty/[customerId]/page.tsx`

### 🔍 Diagnostic
- ⚠️ Utilise `Button` de `@/components/ui`
- ⚠️ Structure en DIVs brutes - pas de Container/Section/Card
- ⚠️ Pas d'Alert
- ⚠️ Styles inline

### ✅ Refactorisation complète

```tsx
// IMPORTS:
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Container,
  Section,
  Alert,
  Badge
} from "@/components/StripeUIComponents";

// STRUCTURE:
<Container>
  <Section>
    <Link href="/dashboard/loyalty" className="text-blue-600 hover:underline text-sm font-medium">
      ← Volver a Clientes
    </Link>
  </Section>

  {/* Customer Header Card */}
  <Section>
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          {customer.name}
          <Badge variant="primary">#{customer.card_number}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-slate-600">Teléfono</p>
            <p className="font-medium">{customer.phone}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Email</p>
            <p className="font-medium">{customer.email}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Total Gastado</p>
            <p className="font-medium">{fmt(customer.total_accumulated)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Visitas</p>
            <p className="font-medium">{customer.visit_count}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="primary" onClick={handleEditClick}>
          Editar Cliente
        </Button>
        <Button variant="secondary" onClick={() => setShowRewardModal(true)}>
          Otorgar Recompensa
        </Button>
      </CardFooter>
    </Card>
  </Section>

  {/* Rewards Section */}
  <Section title="Historial de Recompensas">
    <Card>
      <CardContent>
        {/* Rewards list */}
      </CardContent>
    </Card>
  </Section>

  {/* Purchases Section */}
  <Section title="Historial de Compras">
    <Card>
      <CardContent>
        {/* Purchases list */}
      </CardContent>
    </Card>
  </Section>
</Container>
```

### ⏱️ Temps estimé: 2-3 heures
### 📋 Checklist:
- [ ] Remplacer import Button
- [ ] Ajouter Container wrapper
- [ ] Utiliser Section par section
- [ ] Utiliser Card pour chaque section principale
- [ ] Utiliser Badge pour card number
- [ ] Utiliser Alert pour messages erreur
- [ ] Utiliser CardFooter pour actions boutons
- [ ] Regarde `dashboard/employees/page.tsx` comme référence

---

## ✅ RÉSUMÉ TIMELINE

```
DAY 1 (Today):
├─ 2h: dashboard/expenses/page.tsx
├─ 2h: dashboard/settings/modules/page.tsx
└─ 2h: dashboard/settings/theme/page.tsx

DAY 2 (Tomorrow):
├─ 1h: dashboard/settings/page.tsx
├─ 1h: dashboard/admin/page.tsx
├─ 1.5h: dashboard/settings/taxes/page.tsx
├─ 1h: dashboard/settings/loyalty/page.tsx
└─ 2h: Quality assurance & testing

DAY 3 (Day after):
├─ 2.5h: dashboard/loyalty/[customerId]/page.tsx
├─ 1h: Final testing across all pages
└─ 1.5h: Documentation & cleanup
```

---

## 🚀 VALIDATION CHECKLIST

Pour chaque page refactorisée:
- [ ] ✅ Tous les imports de `StripeUIComponents`
- [ ] ✅ Page wrappée avec `<Container>`
- [ ] ✅ Sections avec `<Section>`
- [ ] ✅ Cards utilisés pour regrouper
- [ ] ✅ Buttons sont `<Button>` component
- [ ] ✅ Inputs sont `<Input>` component
- [ ] ✅ Messages utilisent `<Alert>`
- [ ] ✅ Pas de DIVs inutiles
- [ ] ✅ Pas de styles `style=` inline
- [ ] ✅ Pas de `<button>` brut
- [ ] ✅ Consistent with other pages
- [ ] ✅ Fonctionne correctement
- [ ] ✅ Responsive (mobile-friendly)

---

*Guide créé 24 Avril 2026*
