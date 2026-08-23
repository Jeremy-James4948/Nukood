# Nukood Theme System Specification

This document serves as the permanent source of truth for the implementation of the global theme system in Nukood. It outlines the current architecture, identifies hardcoded elements that require refactoring, and details the planned architecture for supporting multiple exclusive themes.

## 1. Current Architecture

At present, Nukood does not have a functional global theme system.

- **ThemeProvider:** None exists globally.
- **Theme State:** Unmanaged.
- **Theme Persistence:** None.
- **Theme Selector:** None.
- **CSS/Theme Files:** `src/styles/theme.css` contains `:root` and `.dark` definitions but is not dynamically controlled.
- **Tailwind Integration:** Tailwind v4 is integrated via `@theme inline` in `src/styles/theme.css`.
- **CSS Variables:** Variables (e.g., `--background`, `--foreground`) exist but are heavily underutilized.
- **Document-Level Theme Application:** The app implicitly uses the `:root` variables. `next-themes` is installed but only utilized locally within the `sonner.tsx` toast component.

## 2. Current Design Tokens

Nukood has two disjointed sets of tokens:

### Semantic CSS Variables (`src/styles/theme.css`)
- **Surfaces:** `background`, `card`, `popover`, `input`, `input-background`
- **Text:** `foreground`, `muted-foreground`, `card-foreground`
- **Brand:** `primary`, `secondary`, `accent`
- **Structure:** `border`, `ring`, `sidebar-*`
- **State:** `destructive`
- **Charts:** `chart-1` through `chart-5`

### Hardcoded Brand Constants (`src/constants/index.ts`)
- **Surfaces/Background:** `COLORS.sand` (`#F5F2EC`)
- **Text:** `COLORS.textPrimary` (`#6A6356`), `COLORS.textSecondary` (`#9B968B`)
- **Categories:** `coralRed`, `brightOrange`, `emeraldGreen`, `skyBlue`, `amethystPurple`, etc.

## 3. Hardcoded Styling

Core UI components bypass semantic tokens in favor of hardcoded values, primarily to achieve the current "Sand" Neumorphic design. These are the highest priority areas for refactoring:

### 1. App Shell & Layout
- **Component:** `src/app/App.tsx`
- **Hardcoded:** Backgrounds (`bg-[#F5F2EC]`) and complex shadows (`sm:shadow-[16px_16px_32px_#dfddd6,-16px_-16px_32px_#ffffff]`).
- **Refactor Target:** Standardize to `bg-background` and a custom semantic shadow token like `shadow-neumorphic-outer`.

### 2. Dashboard Cards
- **Component:** `src/features/dashboard/DailyCardCarousel.tsx`
- **Hardcoded:** Backgrounds (`bg-[#F3F1EA]`), primary text (`text-[#6A6356]`), and various extruded/indented shadows (`shadow-[12px_12px_24px_#e3e0d8,-12px_-12px_24px_#ffffff]`).
- **Refactor Target:** Map to `bg-card`, `text-foreground`, and new custom shadow variables like `shadow-neumorphic-card` and `shadow-neumorphic-inset`.

### 3. Transaction Forms
- **Component:** `src/features/transactions/AddTransactionDrawer.tsx`
- **Hardcoded:** Text colors (`text-[#355C7D]`), gradient backgrounds (`bg-gradient-to-r from-[#355C7D] to-[#2A4A65]`), and overlay background opacities (`bg-[#355C7D]/20`).
- **Refactor Target:** Use standard `text-primary`, `bg-primary`, and `bg-primary/20`.

### 4. Snapshot & Health
- **Component:** `src/features/snapshot/SnapshotWidget.tsx`
- **Hardcoded:** Secondary text labeling (`text-[#9B968B]`).
- **Refactor Target:** Replace with `text-muted-foreground`.

## 4. Animation Architecture

- **Library:** `motion/react` (Framer Motion).
- **Current State:** There is no centralized motion configuration. Animation variants and transitions are hardcoded directly into the JSX elements across various files (e.g., drawers, page transitions, onboarding slides).
- **Required Change:** To support expressive themes (e.g., "Awesome Mode"), animation variants must be extracted into a centralized registry or custom hook (e.g., `useMotionTheme()`). Components will retrieve variants from this hook rather than defining them inline, preventing scattered `if (theme === 'awesome')` logic throughout the app.

## 5. Planned Theme Architecture

The planned architecture will decouple the visual styling from the application logic and component structure. 

- **Theme ID Selection:** The user selects a single `theme ID` (e.g., `normal`, `awesome`).
- **Active Theme:** A global `ThemeProvider` (likely powered by `next-themes` configured for custom themes) holds the active theme state.
- **Theme Definition/Tokens:** The active theme injects a specific CSS class onto the document `<html>` or `<body>` element.
- **Global CSS/Tailwind:** `theme.css` maps the active class to specific CSS variables (e.g., `--background`, `--shadow-neumorphic-outer`). Tailwind picks these up automatically.
- **Existing Components:** Components strictly use Tailwind semantic classes (e.g., `bg-background`, `shadow-neumorphic-outer`). They do not change their structure, and they do not require separate thematic versions.

## 6. Theme Definitions

The system will strictly support one active theme at a time from the following initial list:

- **normal:** Preserves the exact current Nukood appearance. This is the baseline "Sand" Neumorphic theme.
- **light:** A clean, flat, or subtly styled light theme tailored for high contrast and readability, moving away from heavy neumorphism.
- **dark:** A deep, low-light theme suitable for nighttime usage, mapping semantic colors to appropriate dark values.
- **awesome:** A highly expressive, dynamic theme featuring vibrant accents, glowing shadows, and theme-specific bouncy/playful animations.

## 7. Theme Rules

Future implementation must strictly adhere to the following architectural rules:

- **Single Active Theme:** Only one theme can be active at a time.
- **Stable Theme IDs:** Theme identifiers must remain consistent (e.g., `normal`, `dark`).
- **No Combinations:** Themes cannot be stacked or combined.
- **No Duplicated Components:** The application components must NOT have separate versions for different themes.
- **Semantic Priority:** Always prefer semantic tokens (`bg-background`) over hardcoded visual values (`bg-[#...]`).
- **No Scattered Logic:** Avoid writing `if (theme === 'awesome')` inside UI components. Abstractions like `useMotionTheme()` should handle variations.
- **Logic Separation:** Themes must not affect or interact with business or financial data logic.
- **Centralized Definitions:** New themes must be centrally defined in global CSS and constants, not localized to features.
- **Isolated State:** Theme state must remain entirely separate from financial and user data persistence.

## 8. Implementation Roadmap

Based on the Phase 0 findings, the recommended sequence for implementation is:

1. **Phase 1: Foundation & The `normal` Theme (IMPLEMENTED)**
   - ✅ Created and integrated the global `ThemeProvider` into `src/main.tsx`.
   - ✅ Updated `src/styles/theme.css` to define the baseline `.normal` theme and initial `.light`, `.dark`, and `.awesome` variants.
   - ✅ Established a temporary theme selector in `SettingsDrawer` to prove persistence and CSS variable swapping works correctly globally.
   - *Note on Hardcoding:* Components like the Dashboard and Transactions still contain hardcoded styling that overrides semantic tokens. These will be refactored in Phase 2.

2. **Phase 2: Semantic Refactoring & The Light/Dark Themes (IMPLEMENTED)**
   - ✅ Expanded the CSS variables for `.light`, `.dark`, and `.awesome` inside `theme.css`.
   - ✅ Injected custom neumorphic semantic shadow variables to accurately map the unique shadowing system without hardcoded hexes.
   - ✅ Methodically refactored the hardcoded hex codes across the core layout, dashboard, history, archive, and transactions to use semantic Tailwind classes (`bg-background`, `bg-card`, custom neumorphic shadows), ensuring the app dynamically responds to the active theme.

3. **Phase 3: Animation Abstraction (IMPLEMENTED)**
   - ✅ Created a central `useThemeMotion()` hook.
   - ✅ Ensured Framer Motion `transition` physics change based on the active theme (e.g., normal is subtle, awesome is bouncy).
   - ✅ Introduced `<ThemeEffectsLayer />` to act as the global canvas for background effects.
   - ✅ Implemented `prefers-reduced-motion` to immediately flatten/disable all effects for accessibility.
   - ✅ Removed hardcoded transition configurations from primary navigation and dashboard buttons.

4. **Phase 4: Final Theme Designs (IMPLEMENTED)**
   - ✅ Finalized Light mode variables using the locked `#F8F9FA` and `#2F4B7C` palette.
   - ✅ Finalized Dark mode variables using the locked `#0B0C0F` and `#1A1F2E` palette.
   - ✅ Refined Dark Theme Hierarchy: Re-calibrated Dark mode to push **Deep Navy** (`#1A1F2E` and `#26314A`) as the structural surface for all cards and buttons, pushing **Maroon** and **Blush** strictly to interaction-based accents and glows.
   - ✅ Phase 4 Correction completed: Swept `Archive`, `Settings`, `Transactions`, `Snapshot`, and `Onboarding` to aggressively replace hardcoded `bg-white`, `border-gray`, and inline `rgba` shadows with semantic tokens.
   - ✅ Abstracted decorative module gradients into `--accent-warm`, `--accent-soft`, and `--accent-deep` allowing them to natively shift colors across themes.
   - ✅ Maintained strict domain color boundaries (Category colors and rings remain untouched).
   - ✅ `awesome` mode remains reserved for future visual expansion.
