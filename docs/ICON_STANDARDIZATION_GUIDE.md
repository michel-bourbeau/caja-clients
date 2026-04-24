# Icon Standardization Guide

## Overview

The `PageIcon` component standardizes icon usage throughout the application. It provides consistent sizing and appearance for all page-level icons (headers, titles, navigation, etc.).

## Component Location

- File: `src/components/PageIcon.tsx`
- Export: `src/components/index.ts`

## Available Icon Types

```typescript
type PageIconType = 
  | "transactions"      // 📋
  | "inventory"         // 📦
  | "pos"               // 🛒
  | "cierre"            // 🔒
  | "employees"         // 👥
  | "schedules"         // 🕐
  | "payroll"           // 💰
  | "loyalty"           // 💳
  | "reports"           // 📈
  | "dashboard"         // 📊
  | "settings"          // ⚙️
  | "admin"             // 🔑
```

## Display Types

The component supports two display modes:

### 1. Emoji Mode (default)
Uses emoji characters for a casual, friendly appearance.

```tsx
import { PageIcon } from "@/components";

<PageIcon type="transactions" size="md" />
<PageIcon type="inventory" size="lg" />
```

**Pros:**
- Friendly, approachable appearance
- Familiar to end users
- No additional dependencies

**Cons:**
- Emoji rendering varies across platforms
- Harder to customize color/style

### 2. Lucide Mode (recommended)
Uses Lucide React icons for pixel-perfect consistency.

```tsx
import { PageIcon } from "@/components";

<PageIcon type="transactions" size="md" displayType="lucide" />
<PageIcon type="inventory" size="lg" displayType="lucide" />
```

**Pros:**
- Consistent appearance across all platforms
- Easily customizable (color, size, stroke-width)
- Professional appearance
- Better for accessibility

**Cons:**
- Requires Lucide React package

## Size Options

Three standardized sizes are available:

- **sm** (small): 18px / `text-lg`
  - Use for: Inline text, compact layouts
  - Example: `<PageIcon type="transactions" size="sm" />`

- **md** (medium): 24px / `text-2xl`
  - Use for: Standard page headers, default choice
  - Example: `<PageIcon type="transactions" size="md" />`

- **lg** (large): 32px / `text-4xl`
  - Use for: Hero sections, emphasized titles
  - Example: `<PageIcon type="transactions" size="lg" />`

## Usage Examples

### Page Header with Icon
```tsx
import { PageIcon } from "@/components";

export default function TransactionsPage() {
  return (
    <div className="flex items-center gap-3 mb-6">
      <PageIcon type="transactions" size="lg" displayType="lucide" />
      <h1 className="text-3xl font-bold text-slate-900">Transacciones</h1>
    </div>
  );
}
```

### Section Title with Icon
```tsx
<div className="flex items-center gap-2 mb-4">
  <PageIcon type="inventory" size="md" displayType="lucide" />
  <h2 className="text-xl font-semibold">Gestión de Productos</h2>
</div>
```

### Navigation Link (Inline)
```tsx
<button className="flex items-center gap-2 px-4 py-2">
  <PageIcon type="dashboard" size="sm" displayType="lucide" />
  <span>Dashboard</span>
</button>
```

### Custom Styling
```tsx
// With Lucide display type, you can pass color class
<PageIcon 
  type="transactions" 
  size="md" 
  displayType="lucide"
  className="text-blue-600" 
/>

// With emoji display type, using margin or other utilities
<PageIcon 
  type="transactions" 
  size="md" 
  className="mr-2" 
/>
```

## Migration Path

### Current State
- Sidebar: Uses emoji strings directly
- Pages: Some use SVG inline, some use no icon at all
- Actions: Use IconButton component (Lucide React)

### Recommended Migration
1. ✅ Keep `IconButton` component for action buttons
2. ✅ Add `PageIcon` component for page headers and titles
3. 🔄 Gradually replace inline SVG icons with `PageIcon`
4. 🔄 Standardize sidebar to use `PageIcon` (future improvement)

## Props

```typescript
interface PageIconProps {
  type: PageIconType;           // Icon identifier (required)
  size?: "sm" | "md" | "lg";   // Size variant (default: "md")
  displayType?: "emoji" | "lucide"; // Display mode (default: "emoji")
  className?: string;           // Additional CSS classes
}
```

## Accessibility

The component includes accessibility features:
- `aria-label` attribute with icon type
- Semantic `role="img"` for emoji mode
- Proper alt text for icons

## Adding New Icons

To add a new icon type:

1. Add type to `PageIconType`:
```typescript
type PageIconType = 
  | "transactions" 
  | "new_icon_type"  // ← Add here
```

2. Add emoji to `emojiMap`:
```typescript
const emojiMap: Record<PageIconType, string> = {
  transactions: "📋",
  new_icon_type: "🆕",  // ← Add here
}
```

3. Add Lucide component to `lucideMap`:
```typescript
import { YourIcon } from "lucide-react";

const lucideMap: Record<PageIconType, React.FC<{ size: number }>> = {
  transactions: Clipboard,
  new_icon_type: YourIcon,  // ← Add here
}
```

## Best Practices

1. **Use `displayType="lucide"` for new code** - It provides better consistency and customization
2. **Keep icons close to text** - Use consistent spacing (gap-2 to gap-4)
3. **Match icon size to text size** - Use `size="lg"` with large headers, `size="md"` with h2/h3
4. **Don't mix icon systems** - Use either PageIcon or IconButton, not both in the same area
5. **Consider context** - Use professional look (lucide) for admin areas, friendly look (emoji) for user-facing features

## Related Components

- **IconButton**: For action buttons with icons (eye, delete, edit, etc.)
- **Badge**: For status indicators with optional icons
- **Button**: For primary actions (may include icons)

## See Also

- [IconButton Component](./src/components/ui.tsx)
- [Lucide React Icons](https://lucide.dev/)
- [Tailwind CSS Text Size](https://tailwindcss.com/docs/font-size)
