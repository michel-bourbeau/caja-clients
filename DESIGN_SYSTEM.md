# 🎨 Stripe-Inspired Design System

## Overview

This is a **ultra-professional, minimal design system** inspired by Stripe's world-class design. It features:

✨ **Professional & Trustworthy**
- Clean, minimal aesthetic with generous spacing
- Premium typography with clear hierarchy
- Subtle shadows and smooth transitions
- Enterprise-grade color palette

📱 **Mobile-First & Responsive**
- Optimized for all screen sizes
- Touch-friendly interactive elements
- Readable on any device

🎯 **Developer-Friendly**
- Pre-built, reusable components
- CSS custom properties for easy theming
- TypeScript support with full type safety
- Copy-paste ready examples

---

## 🎨 Design Tokens

### Colors

```css
/* Brand Primary */
--stripe-blue: #0052cc;        /* Main CTA & primary actions */
--stripe-blue-dark: #003a8c;   /* Hover & active states */
--stripe-blue-light: #f6f9fc;  /* Light backgrounds */

/* Semantic Colors */
--success: #10b981;            /* Success, positive actions */
--warning: #f59e0b;            /* Warnings, caution */
--error: #ef4444;              /* Errors, destructive */
--info: #3b82f6;               /* Information, details */

/* Neutral Grays (Professional) */
--gray-900: #0f172a;  /* Darkest - Headlines */
--gray-800: #1e293b;  /* Dark - Primary text */
--gray-700: #334155;  /* Medium-dark - Secondary text */
--gray-600: #475569;  /* Medium - Tertiary text */
--gray-500: #64748b;  /* Medium-light - Placeholders */
--gray-400: #cbd5e1;  /* Light - Borders */
--gray-300: #e2e8f0;  /* Lighter - Dividers */
--gray-200: #f1f5f9;  /* Very light - Backgrounds */
--gray-100: #f8fafc;  /* Ultra light - Subtle bg */
--gray-0: #ffffff;    /* White - Primary background */
```

### Typography

- **Font Family**: System fonts (-apple-system, BlinkMacSystemFont, Segoe UI, etc.)
- **Base Size**: 15px (for better readability)
- **Line Height**: 1.5 (generous spacing)
- **Letter Spacing**: 0.3px (professional touch)

### Spacing & Sizing

- Border Radius: 4px, 6px, 8px, 12px
- Shadows: Subtle xs, sm, md, lg, xl
- Transitions: 150ms, 200ms, 300ms

---

## 🧩 Components

### 1. Buttons

```tsx
import { Button } from '@/components/StripeUIComponents';

// Primary Button (Main action)
<Button variant="primary">Save Changes</Button>

// Secondary Button (Alternative action)
<Button variant="secondary">Cancel</Button>

// Ghost Button (Minimal)
<Button variant="ghost">Learn More</Button>

// Danger Button (Destructive)
<Button variant="danger">Delete</Button>

// With Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium (default)</Button>
<Button size="lg">Large</Button>

// Loading State
<Button loading>Processing...</Button>
```

### 2. Cards

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/StripeUIComponents';

// Simple Card
<Card>
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</Card>

// Card with Structure
<Card>
  <CardHeader>
    <CardTitle>Settings</CardTitle>
    <CardDescription>Manage your account preferences</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Form fields, content, etc. */}
  </CardContent>
  <CardFooter>
    <Button variant="secondary">Cancel</Button>
    <Button variant="primary">Save</Button>
  </CardFooter>
</Card>

// Card Sizes
<Card size="sm">Small Card</Card>
<Card size="md">Medium Card (default)</Card>
<Card size="lg">Large Card</Card>
```

### 3. Input Fields

```tsx
import { Input } from '@/components/StripeUIComponents';

// Basic Input
<Input type="email" placeholder="your@email.com" />

// With Label
<Input 
  label="Email Address" 
  type="email" 
  placeholder="your@email.com"
  helpText="We'll never share your email"
/>

// With Error
<Input 
  label="Password" 
  type="password"
  error="Password must be at least 8 characters"
/>
```

### 4. Badges

```tsx
import { Badge } from '@/components/StripeUIComponents';

<Badge variant="default">Default</Badge>
<Badge variant="primary">Primary</Badge>
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Error</Badge>

// With Icons
<Badge variant="success">✓ Verified</Badge>
<Badge variant="warning">⚠ Warning</Badge>
```

### 5. Status Indicators

```tsx
import { StatusDot } from '@/components/StripeUIComponents';

<StatusDot status="success" label="Online" />
<StatusDot status="warning" label="Pending" />
<StatusDot status="error" label="Failed" />
<StatusDot status="pending" label="In Progress" />
```

### 6. Alerts

```tsx
import { Alert } from '@/components/StripeUIComponents';

<Alert variant="success" title="Success!">
  Your changes have been saved successfully.
</Alert>

<Alert variant="warning" title="Warning">
  This action may have unintended consequences.
</Alert>

<Alert variant="error" title="Error">
  Something went wrong. Please try again.
</Alert>

<Alert variant="info" title="Info">
  New features available! Check them out now.
</Alert>
```

### 7. Stat Cards

```tsx
import { StatCard } from '@/components/StripeUIComponents';

<StatCard 
  label="Total Revenue"
  value="$12,450.00"
  change={{ value: 12.5, direction: 'up' }}
/>

<StatCard 
  label="Active Users"
  value="2,841"
/>
```

### 8. Layout Components

```tsx
import { Container, Section, Grid } from '@/components/StripeUIComponents';

// Container (max-width with padding)
<Container>
  {/* Content */}
</Container>

// Section (with title and description)
<Section 
  title="Billing Settings"
  description="Manage your billing preferences and payment methods"
>
  {/* Content */}
</Section>

// Responsive Grid
<Grid cols={3}>
  <Card>Column 1</Card>
  <Card>Column 2</Card>
  <Card>Column 3</Card>
</Grid>
```

### 9. Utilities

```tsx
import { Divider, Text } from '@/components/StripeUIComponents';

<Divider />

<Text>Regular text</Text>
<Text variant="caption">Small caption text</Text>
<Text variant="muted">Muted/secondary text</Text>
```

---

## 📋 CSS Classes

### Buttons

```html
<!-- Primary Button -->
<button class="btn-primary">Save</button>

<!-- Secondary Button -->
<button class="btn-secondary">Cancel</button>

<!-- Ghost Button -->
<button class="btn-ghost">Learn More</button>

<!-- Danger Button -->
<button class="btn-danger">Delete</button>

<!-- Sizes -->
<button class="btn-primary btn-sm">Small</button>
<button class="btn-primary btn-lg">Large</button>
```

### Cards

```html
<div class="card">
  <div class="card-header">
    <h3 class="card-title">Title</h3>
    <p class="card-description">Description</p>
  </div>
  <div class="card-content">Content</div>
  <div class="card-footer">
    <button>Cancel</button>
    <button>Save</button>
  </div>
</div>
```

### Badges

```html
<span class="badge badge-default">Default</span>
<span class="badge badge-primary">Primary</span>
<span class="badge badge-success">Success</span>
<span class="badge badge-warning">Warning</span>
<span class="badge badge-error">Error</span>
```

### Alerts

```html
<div class="alert alert-success">
  <div class="alert-icon">✓</div>
  <div class="alert-content">
    <div class="alert-title">Success!</div>
    <div class="alert-description">Your changes have been saved.</div>
  </div>
</div>
```

### Utilities

```html
<!-- Container -->
<div class="container-app">Max-width container with padding</div>

<!-- Grid -->
<div class="grid-cols-responsive">Responsive grid (1 col on mobile, 2 on tablet, 3 on desktop)</div>

<!-- Divider -->
<div class="divider"></div>

<!-- Subtle Background -->
<div class="bg-subtle">Light gray background</div>

<!-- Focus Ring (Accessibility) -->
<input class="focus-ring" />

<!-- Truncate Text -->
<p class="truncate-line">Long text that overflows...</p>

<!-- Screen Reader Only -->
<span class="sr-only">Hidden from visual display</span>
```

---

## 🎯 Usage Example: Complete Page

```tsx
'use client';

import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Input,
  Badge,
  Alert,
  Container,
  Section,
  Grid,
  StatCard,
} from '@/components/StripeUIComponents';

export default function PayrollPage() {
  return (
    <Container>
      {/* Header with Alert */}
      <Section title="Payroll Management" description="Manage employee payments and records">
        <Alert variant="info" title="New Feature">
          Partial payments are now available for flexible payroll processing.
        </Alert>
      </Section>

      {/* Statistics Dashboard */}
      <Section title="This Period">
        <Grid cols={3}>
          <StatCard label="Total Paid" value="$45,320.00" change={{ value: 8.2, direction: 'up' }} />
          <StatCard label="Pending" value="$12,450.00" />
          <StatCard label="Employees" value="24" />
        </Grid>
      </Section>

      {/* Employee List with Actions */}
      <Section title="Employees">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Employee list table */}
            <table className="w-full">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Hours</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Juan García</td>
                  <td>40h</td>
                  <td>$400.00</td>
                  <td><Badge variant="success">Paid</Badge></td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      </Section>

      {/* Payment Form */}
      <Section title="New Payment">
        <Card>
          <CardContent>
            <div className="space-y-4">
              <Input label="Employee Name" placeholder="Select employee" />
              <Input label="Amount" type="number" placeholder="0.00" />
              <Input label="Notes" placeholder="Optional notes" />
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="secondary">Cancel</Button>
            <Button variant="primary">Process Payment</Button>
          </CardFooter>
        </Card>
      </Section>
    </Container>
  );
}
```

---

## 🌈 Customization

### Changing Brand Color

Edit CSS variables in `src/app/globals.css`:

```css
:root {
  --stripe-blue: #6366f1;        /* Change primary color */
  --stripe-blue-dark: #4f46e5;   /* Change hover state */
  --stripe-blue-light: #eef2ff;  /* Change light background */
}
```

### Adding New Badge Variant

```css
@layer components {
  .badge-custom {
    @apply bg-purple-100 text-purple-800 font-semibold;
  }
}
```

---

## ♿ Accessibility

All components include:
- ✅ WCAG AAA contrast ratios
- ✅ Focus rings for keyboard navigation
- ✅ Screen reader support (sr-only class)
- ✅ Semantic HTML
- ✅ ARIA labels where needed

---

## 📱 Responsive Design

All components are **mobile-first** and responsive:

- **Mobile**: Single column, full width
- **Tablet** (sm): 2 columns where applicable
- **Desktop** (lg): 3+ columns

Example:
```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- Grid adapts to screen size -->
</div>
```

---

## 🚀 Quick Start

1. **Import components**:
   ```tsx
   import { Button, Card, Input } from '@/components/StripeUIComponents';
   ```

2. **Use in your pages**:
   ```tsx
   export default function MyPage() {
     return (
       <Card>
         <h2>Hello World</h2>
         <Button variant="primary">Click Me</Button>
       </Card>
     );
   }
   ```

3. **Customize via CSS**:
   Edit CSS variables in `src/app/globals.css` for global changes.

---

## 📚 Component Documentation

Each component is fully typed with TypeScript and includes:
- PropTypes documentation
- Usage examples
- TypeScript interfaces
- Accessibility considerations

Browse `src/components/StripeUIComponents.tsx` for the complete component library.

---

## 💡 Design Philosophy

### Minimal
- No unnecessary elements
- Generous whitespace
- Clean typography
- Subtle interactions

### Professional
- Enterprise color palette
- Premium typography
- Trustworthy appearance
- Clear hierarchy

### Accessible
- WCAG compliant
- Keyboard navigable
- Screen reader friendly
- High contrast

### Mobile-First
- Touch-friendly sizes
- Responsive layouts
- Performance optimized
- Fast loading

---

## 🎓 Resources

- **Stripe Design**: https://www.stripe.com
- **Design System Thinking**: https://material.io/design
- **Accessibility**: https://www.w3.org/WAI/fundamentals/

---

**Ready to build beautiful, professional interfaces!** ✨
