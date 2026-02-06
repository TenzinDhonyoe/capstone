# UI Design System

This document describes the **front-end design language** of the app so any agent can replicate the same look and feel without copying domain logic or copy. Use it as a single source of truth for layout, typography, color, and component patterns.

---

## 1. Design Philosophy

- **Soft organic light theme**: Creamy whites, warm grays, no harsh blacks.
- **Liquid glass**: Semi-transparent surfaces, light blur, subtle borders.
- **Dual accent**: Primary (coral/salmon) + secondary (mint/seafoam) for hierarchy and status.
- **Gentle depth**: Very soft shadows and gradients; no heavy skeuomorphism.
- **Consistent spacing and radius**: Use the scale below everywhere.

---

## 2. Color Palette

### Backgrounds
| Token | Hex | Usage |
|-------|-----|--------|
| `background` | `#FFFDFB` | Main screen background (soft cream) |
| `backgroundElevated` | `#FBF9F7` | Slightly elevated areas |
| `surface` | `#FFFFFF` | Cards, modals, inputs |
| `surfaceElevated` | `#F8F5F2` | Raised panels |

### Glass
| Token | Value | Usage |
|-------|--------|--------|
| `glass` | `rgba(255, 255, 255, 0.75)` | Blur overlay fill |
| `glassBorder` | `rgba(0, 0, 0, 0.06)` | Glass edges |
| `glassHighlight` | `rgba(255, 255, 255, 0.9)` | Top highlight on glass |

### Primary (accent)
| Token | Hex | Usage |
|-------|-----|--------|
| `accent` | `#E8856C` | Primary actions, active states, key CTAs |
| `accentDark` | `#D4736A` | Pressed/hover |
| `accentLight` | `#F4A68C` | Highlights |
| `accentMuted` | `rgba(232, 133, 108, 0.15)` | Soft accent backgrounds |
| `accentSoft` | `rgba(232, 133, 108, 0.08)` | Very subtle tint |

### Secondary
| Token | Hex | Usage |
|-------|-----|--------|
| `secondary` | `#7BBFB8` | Secondary actions, success, positive |
| `secondaryLight` | `#A5D9D0` | Lighter variant |
| `secondaryMuted` | `rgba(123, 191, 184, 0.15)` | Soft secondary backgrounds |

### Status
| Token | Hex | Usage |
|-------|-----|--------|
| `success` | `#7BBFB8` | Success, connected, good |
| `warning` | `#F4C68C` | Warning, caution |
| `danger` | `#E88B8B` | Error, destructive, alert |
| `*Muted` | Same with ~0.15 alpha | Soft status backgrounds |

### Text
| Token | Hex | Usage |
|-------|-----|--------|
| `textPrimary` | `#2D3436` | Headings, primary content |
| `textSecondary` | `#636E72` | Body, subtitles |
| `textTertiary` | `#95A5A6` | Hints |
| `textMuted` | `#B2BEC3` | Placeholders, disabled |
| `textAccent` | `#E8856C` | Links, accent text |

### Borders
| Token | Value |
|-------|--------|
| `border` | `rgba(0, 0, 0, 0.08)` |
| `borderSubtle` | `rgba(0, 0, 0, 0.04)` |

### Overlay
| Token | Value |
|-------|--------|
| `overlay` | `rgba(45, 52, 54, 0.4)` |

---

## 3. Typography

### Scale (font sizes in px)
| Name | Size | Use |
|------|------|-----|
| `caption` | 11 | Tiny labels |
| `footnote` | 12 | Captions, meta |
| `subhead` | 14 | Secondary text |
| `body` | 16 | Default body |
| `callout` | 17 | Emphasized body |
| `headline` | 18 | Section titles |
| `title3` | 20 | Card titles |
| `title2` | 24 | Screen subtitles |
| `title1` | 32 | Screen titles |
| `largeTitle` | 38 | Hero titles |
| `display` | 52 | Big numbers / hero |

### Weights
- `light`: 300  
- `regular`: 400  
- `medium`: 500  
- `semibold`: 600  
- `bold`: 700  

### Conventions
- **Screen title**: `title1` or `title2`, semibold, `textPrimary`.
- **Section title**: `headline` or `title3`, semibold, `textPrimary`.
- **Card/label**: `callout` or `body`, medium, `textPrimary`.
- **Subtitle / meta**: `subhead` or `footnote`, regular, `textSecondary`.
- **Empty state title**: `title3`, semibold; **empty state body**: `body`, `textSecondary`.

---

## 4. Spacing

Use a single scale everywhere:

| Token | Value (px) |
|-------|------------|
| `xs` | 4 |
| `sm` | 8 |
| `md` | 16 |
| `lg` | 24 |
| `xl` | 32 |
| `xxl` | 48 |
| `xxxl` | 72 |

### Layout conventions
- **Screen horizontal padding**: `md` (16) or `lg` (24).
- **Section spacing**: `lg` (24) between sections.
- **Card internal padding**: `md` (16).
- **Bottom tab safe area**: Reserve ~100–120px at bottom for floating tab bar.
- **Scroll content bottom**: Add ~100–120px so content doesn’t sit under tab bar.

---

## 5. Border Radius

| Token | Value (px) |
|-------|------------|
| `xs` | 6 |
| `sm` | 10 |
| `md` | 14 |
| `lg` | 20 |
| `xl` | 28 |
| `xxl` | 40 |
| `full` | 9999 (pill) |

- **Cards**: `md` (14) or `lg` (16–20).
- **Pills / chips**: `full` or large fixed radius (e.g. 20–24).
- **Buttons**: `sm`–`md` (10–14).
- **Tab bar**: ~24px.

---

## 6. Shadows

Keep shadows soft and low:

| Name | shadowColor | shadowOffset | shadowOpacity | shadowRadius |
|------|-------------|--------------|---------------|--------------|
| **card** | `#2D3436` | (0, 2) | 0.04 | 8 |
| **soft** | `#2D3436` | (0, 4) | 0.06 | 12 |
| **medium** | `#2D3436` | (0, 8) | 0.08 | 20 |
| **glow** | accent | (0, 0) | 0.2 | 16 |

Use **card** for list cards and default surfaces; **glow** only for accent-highlighted elements.

---

## 7. Gradients (Ambient Glow)

Use **LinearGradient** for soft ceiling glows, not for buttons.

- **Hero / top of screen**:  
  Colors: `[primary tint, secondary tint, transparent]`  
  Example: `['rgba(224, 123, 92, 0.2)', 'rgba(123, 191, 184, 0.15)', 'transparent']`  
  Start: `(0.3, 0)` → End: `(0.7, 0.7)`  
  Container: top of screen, ~35–40% of viewport height, full width; bottom corners rounded (e.g. 200px).

- **Card glow (optional)**:  
  Colors: `['rgba(224, 123, 92, 0.08)', 'transparent']`  
  Vertical, top to bottom, inside card.

---

## 8. Component Patterns

### 8.1 Screen shell
- Root: `View` with `flex: 1`, `backgroundColor: background`.
- Optional: full-width **background** `View` with `backgroundColor: '#FAFAFA'` or `background`.
- Optional: **glow container** (absolute, top) with gradient as in §7.
- Main content: `ScrollView` with `contentContainerStyle` padding (e.g. `paddingTop: 70`), `showsVerticalScrollIndicator: false`.

### 8.2 Hero / page header
- **Greeting / label**: small caps or footnote, `textSecondary`, letter-spacing optional.
- **Title**: `title1` or `title2`, semibold, `textPrimary`.
- Padding: e.g. 24 horizontal, 20 top, 24 bottom.

### 8.3 Cards
- **Container**: `surface`, `borderRadius: 14–16`, `borderWidth: 1`, `borderColor: borderSubtle`, **card** shadow.
- **Inner**: padding `md`.
- Optional **glow** variant: accent-tinted border and/or soft gradient overlay at top.

### 8.4 List / row (e.g. settings)
- **Row**: flex row, align center, justify space-between, padding horizontal `md`, vertical 14.
- **Left**: title (e.g. callout/body, medium) + optional subtitle (subhead, `textSecondary`).
- **Right**: arrow `›` (e.g. 22px, `textMuted`) or custom control.
- **Divider**: `height: hairline`, `backgroundColor: rgba(0,0,0,0.08)`, marginLeft `md`.

### 8.5 Pills / filter chips
- **Default**: `surface`, border `border`, padding H 16 V 10, borderRadius 20 (or full).
- **Active**: background `accentMuted` or dark `textPrimary`, border and text adjusted (e.g. white text when dark).
- Horizontal list with gap 8.

### 8.6 Buttons
- **Primary CTA**: background `accent`, text white, semibold, padding e.g. 14–28 H, 14 V, borderRadius 12; `activeOpacity` 0.8.
- **Secondary / ghost**: background `accentMuted` or transparent, text/icon `accent`, border optional.
- **Destructive**: text or background `danger`; reserve for destructive actions only.

### 8.7 Empty state
- Centered block, padding horizontal ~40.
- **Icon**: large emoji or icon, muted.
- **Title**: `title3`, semibold, `textPrimary`.
- **Subtitle**: `body`, `textSecondary`, center-aligned, margin below.
- **CTA**: primary button as in §8.6.

### 8.8 Stat / value cards (e.g. dashboard)
- Grid of small cards: `surface`, borderRadius 14, padding ~14, **card** shadow, border subtle.
- **Value**: large (e.g. 22–28px), bold, `textPrimary`.
- **Label**: footnote/subhead, `textSecondary`.

### 8.9 Tab bar (floating pill)
- **Position**: absolute, bottom 24, left/right 24, height ~70, borderRadius 24.
- **Background**: BlurView, `intensity` ~80, `tint` light, `backgroundColor: 'rgba(255,255,255,0.85)'`, border 1px light.
- **Shadow**: (0, 4), opacity 0.08, radius 16.
- **Active tint**: accent; **inactive**: e.g. `#8E8E93`.
- **Label**: small (e.g. 10px), medium weight.

### 8.10 Status badges
- Small circle or pill: **success** (e.g. `#7BBFB8`), **warning**, **danger**, or neutral gray.
- Use for “connected”, “pending”, “error” etc., with optional short label.

---

## 9. Animation

- **Duration**: fast 200ms, default 350ms, slow 500ms.
- **Spring**: damping 20, stiffness 300; or gentler: damping 25, stiffness 200.
- **Touch feedback**: `activeOpacity` 0.7–0.8 on pressables; optional scale 0.98 on press.

---

## 10. Iconography

- Prefer **Ionicons** (outline + filled for active).
- Size: 18–24 for list/tabs, 20–28 for cards, 48+ for empty states.
- Color: `textSecondary` or `textMuted` for inactive; `accent` for primary actions; status colors for status.

---

## 11. Quick reference (copy-paste)

```ts
// Theme constants (use these names in code)
const colors = {
  background: '#FFFDFB',
  surface: '#FFFFFF',
  accent: '#E8856C',
  secondary: '#7BBFB8',
  success: '#7BBFB8',
  warning: '#F4C68C',
  danger: '#E88B8B',
  textPrimary: '#2D3436',
  textSecondary: '#636E72',
  textMuted: '#B2BEC3',
  border: 'rgba(0, 0, 0, 0.08)',
  borderSubtle: 'rgba(0, 0, 0, 0.04)',
};

const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
const borderRadius = { sm: 10, md: 14, lg: 20, full: 9999 };
const shadowCard = {
  shadowColor: '#2D3436',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 8,
};
```

---

**Use this document to implement or generate UI that matches this design system. Do not copy domain-specific copy, flows, or business logic—only the visual and layout patterns above.**
