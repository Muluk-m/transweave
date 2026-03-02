# Transweave Brand Colors

## Primary Palette

| Role | Name | Hex | HSL |
|------|------|-----|-----|
| Primary brand | Teal | #14b8a6 | hsl(173, 80%, 40%) |
| Secondary brand | Indigo | #6366f1 | hsl(239, 84%, 67%) |
| Teal light (bg) | Teal-50 | #f0fdfa | hsl(166, 76%, 97%) |
| Teal dark | Teal-900 | #134e4a | -- |
| Teal dark (icon) | Teal-600 | #0d9488 | -- |
| Indigo dark | Indigo-700 | #4338ca | -- |

## Gradient

Direction: top-left to bottom-right (x1=0,y1=0 to x2=32,y2=32 in userSpaceOnUse for 32x32)
Start: #14b8a6 (teal-500)
End: #6366f1 (indigo-500)

## Favicon Colors

Light mode background: #0d9488 (teal-600 -- slightly darker for contrast on white browser UI)
Dark mode background: #14b8a6 (teal-500 -- brighter on dark browser chrome)
Icon foreground: white (#ffffff)

## SVG Gradient IDs

Use unique IDs per file to prevent collision when multiple SVGs are on same page:
- logo.svg: tw-icon-gradient
- logo-wordmark.svg: tw-wm-gradient
- Logo.tsx (React component): tw-logo-gradient

## Do Not Modify

The following CSS custom properties in globals.css must NOT be changed:
- --primary (243 75% 59%) -- feeds Radix UI component system
- --accent (199 89% 48%) -- feeds Radix UI component system

Brand tokens (--brand-teal, --brand-indigo) are ADDITIVE -- added alongside, not replacing.
