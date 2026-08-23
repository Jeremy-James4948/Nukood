# NUKOOD — THEME DESIGN SPECIFICATION

This document outlines the final visual design implementation details for the active themes, as verified during Phase 4.

## 1. NORMAL THEME (Baseline)
- The baseline Nukood aesthetic.
- Surfaces: `#F5F2EC` (Background), `#F3F1EA` (Card).
- Text: `#6A6356` (Foreground), `#9B968B` (Muted).
- Primary Element: `#355C7D`.
- Decorative Accents: `--accent-warm` (`#F67280`), `--accent-soft` (`#F8B195`), `--accent-deep` (`#C06C84`) used for module-specific glowing highlights like in the Archive.
- Aesthetic: Warm, organic, deeply neumorphic with pronounced drop shadows and insets.

## 2. LIGHT THEME
- Clean, airy, premium, and soft blue/white hierarchy.
- Surfaces: `#F8F9FA` (Background), `#FFFFFF` (Card).
- Text: `#1E2A3A` (Foreground), `#6B778C` (Muted).
- Primary Element: `#2F4B7C`.
- Accent Elements: `#6EA8E6`.
- Decorative Accents: `--accent-warm` (`#A7C6E8`), `--accent-soft` (`#D7E7F7`), `--accent-deep` (`#2F4B7C`) swapping the warm coral glows for airy blue glows.
- Shadows: Soft, tinted, cool drops (e.g. `rgba(47, 75, 124, 0.08)`) and high-luminance insets to simulate frosted airiness.
- Notes: No generic fintech greys. Retains neumorphism but dramatically reduced depth intensity.

## 3. DARK THEME
- Deep, sophisticated, layered, and slightly warm atmospheric black.
- Surfaces: `#0B0C0F` (Background), `#121316` (Card).
- Text: `#E6E8EF` (Foreground), `#A1A6B3` (Muted).
- Primary Element: `#1A1F2E`.
- Accent Element: `#7A1F2D` (Maroon) reserved for strict active states.
- Decorative Accents: `--accent-warm` (`#FFC9D1`), `--accent-soft` (`#9B2C3C`), `--accent-deep` (`#7A1F2D`) swapping the bright peach glows for moody blush/maroon highlights.
- Shadows: Ambient occlusion depth (e.g. `rgba(0, 0, 0, 0.4)`) with minimal rim lighting (`rgba(255, 255, 255, 0.05)`) instead of bright bevels.
- Notes: Does not use solid `#000000` for surfaces, preferring deep navy/blacks. Does not flood the UI with pink/maroon.

## 4. DOMAIN COLOURS
Domain colours (Category colours, Budget health indicators, Income/Expense semantics) are intentionally divorced from this theme system and remain hard-coded to preserve financial data readability.
