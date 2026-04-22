# 🎨 Guide de Personnalisation du Thème

## Vue d'ensemble

Le système de personnalisation permet de customiser l'apparence visuelle de l'application pour chaque tenant:

- **🎭 Skins de couleur** - 5 thèmes prédéfinis (Gris, Bleu, Vert, Púrpura, Naranja)
- **📸 Logo d'entreprise** - Affichage dans le header et le sidebar
- **📝 Taille de police** - 3 niveaux de lisibilité (Petit, Normal, Grand)

## Architecture

### Fichiers créés

```
src/context/ThemeContext.tsx          # Context React pour gérer les thèmes
src/app/api/tenants/[tenantId]/uploads/route.ts  # Upload de fichiers
src/app/dashboard/settings/theme/page.tsx        # Page de configuration
db/migrations/add_theme_customization.sql        # Migration BD
```

### Modifications existantes

- `src/app/providers.tsx` - Ajout du ThemeProvider
- `src/components/Sidebar.tsx` - Intégration du thème et logo
- `src/app/api/tenants/[tenantId]/settings/route.ts` - Endpoints PATCH/PUT

## Base de Données

### Nouvelle table tenant_settings

```sql
ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS theme_color TEXT NOT NULL DEFAULT 'slate',
ADD COLUMN IF NOT EXISTS font_size TEXT NOT NULL DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS logo_url TEXT;
```

**Colonnes:**
- `theme_color` - 'slate' | 'blue' | 'green' | 'purple' | 'orange'
- `font_size` - 'small' | 'normal' | 'large'
- `logo_url` - URL du logo stocké dans Supabase Storage

## Utilisation

### Pour les utilisateurs

1. Allez à **Configuracion > Tema y Personalización** 🎨
2. Sélectionnez une **Paleta de Colores**
3. Téléchargez votre **Logo de Empresa**
4. Choisissez la **Taille de Letra Global**
5. Cliquez **Guardar Personalización**

### Pour les développeurs

#### Accéder au thème dans un composant

```typescript
import { useTheme, THEME_SCHEMES } from "@/context/ThemeContext";

export function MyComponent() {
  const { settings } = useTheme();
  const theme = THEME_SCHEMES[settings.themeColor];

  return (
    <div className={`${theme.bg} ${theme.text}`}>
      {/* Votre contenu */}
    </div>
  );
}
```

#### Obtenir la taille de police

```typescript
import { useTheme, FONT_SIZE_MAP } from "@/context/ThemeContext";

export function MyComponent() {
  const { settings } = useTheme();
  const fontSize = FONT_SIZE_MAP[settings.fontSize];

  return <p className={fontSize}>Texte redimensionné</p>;
}
```

#### Mettre à jour les préférences

```typescript
const { updateTheme } = useTheme();

// Changer le thème
await updateTheme({
  themeColor: "blue",
  fontSize: "large",
  logoUrl: "https://..."
});
```

## Schémas de couleurs

### Slate (Gris)
```
Background: bg-slate-900
Text: text-slate-900
Accent: bg-slate-800
Border: border-slate-300
Badge: bg-slate-100 text-slate-700
```

### Blue (Bleu)
```
Background: bg-blue-900
Text: text-blue-900
Accent: bg-blue-800
Border: border-blue-300
Badge: bg-blue-100 text-blue-700
```

### Green (Vert)
```
Background: bg-green-900
Text: text-green-900
Accent: bg-green-800
Border: border-green-300
Badge: bg-green-100 text-green-700
```

### Purple (Púrpura)
```
Background: bg-purple-900
Text: text-purple-900
Accent: bg-purple-800
Border: border-purple-300
Badge: bg-purple-100 text-purple-700
```

### Orange (Naranja)
```
Background: bg-orange-900
Text: text-orange-900
Accent: bg-orange-800
Border: border-orange-300
Badge: bg-orange-100 text-orange-700
```

## Tailles de police

- **small** - `text-xs` (Compacte et dense)
- **normal** - `text-sm` (Taille standard, recommandée)
- **large** - `text-base` (Meilleure lisibilité)

## Upload du logo

### Requête

```bash
POST /api/tenants/{tenantId}/uploads

FormData:
- file: Image (PNG, JPG, WebP)
- type: "logo"

Limites:
- Taille max: 5MB
- Formats: PNG, JPG, WebP
- Recommandation: Image carrée (200x200px)
```

### Réponse

```json
{
  "success": true,
  "filename": "tenant-uuid/logo/timestamp.png",
  "url": "https://storage.example.com/tenant-uuid/logo/timestamp.png"
}
```

## Endpoints API

### GET /api/tenants/{tenantId}/settings

Récupère les paramètres actuels incluant le thème

```json
{
  "tenantId": "uuid",
  "themeColor": "slate",
  "fontSize": "normal",
  "logoUrl": "https://...",
  ...
}
```

### PATCH /api/tenants/{tenantId}/settings

Mise à jour partielle (idéale pour le thème)

```json
{
  "theme_color": "blue",
  "font_size": "large",
  "logo_url": "https://..."
}
```

### PUT /api/tenants/{tenantId}/settings

Mise à jour complète

```json
{
  "company_name": "...",
  "theme_color": "blue",
  "font_size": "large",
  "logo_url": "https://...",
  ...
}
```

## Stockage des fichiers

Les logos sont stockés dans Supabase Storage sous:
```
Bucket: tenant-uploads
Chemin: {tenant_id}/logo/{timestamp}.{ext}
Accès: Public (via getPublicUrl)
```

## Performance

- Thème changé en temps réel (dispatch d'événement 'themechange')
- Logo en cache via les headers HTTP (Cache-Control: 3600)
- Pas de rechargement de page requis
- CSS classes générées statiquement par Tailwind

## Limitations actuelles

- Pas de thèmes personnalisés (seulement 5 prédéfinis)
- Logo en en-tête uniquement (pas dans les documents/recibos)
- Couleurs basées sur Tailwind (pas de picker RGB personnalisé)
- Taille de police globale (pas de taille personnalisée par élément)

## Extensions futures

1. **Thèmes personnalisés** - Picker de couleur RGB
2. **Style d'affichage du logo** - Position, taille, fond
3. **Polices personnalisées** - Upload de fichiers de police
4. **Mode sombre** - Toggle dark/light
5. **Export de configuration** - Sauvegarde de profils de thème
