---
name: design-taste-frontend
description: Frontend art direction, visual hierarchy, anti-slop design rules, and Vercel-grade aesthetic polish for Audenti Cloud Pro.
---

# Design Taste & Anti-Slop Guidelines (Audenti Cloud Pro)

Este conjunto de directrices rige la arquitectura visual de la plataforma Audenti Cloud Pro, garantizando un acabado estético de grado médico-empresarial (nivel Stripe, Vercel y Linear).

## 1. Principios Anti-Slop (Lo que NUNCA debe generarse)
- **Cero Gradientes Genéricos Púrpura/Azul**: Evitar fondos morados con gradientes brillantes genéricos que saturan la vista clínica.
- **Cero Tarjetas Uniformes de Tres Columnas**: Variar la densidad visual con cuadrículas asimétricas, métricas grandes (bento grids) y jerarquía intencional.
- **Tipografía Intencional**: Títulos nítidos de alto impacto con pesos contrastantes (`font-black` para cifras clave, `font-mono` para folios e identificadores técnicos, `font-medium` para etiquetas clínicas).
- **Evitar Bordes Sobredimensionados**: Usar bordes sutiles de `border-slate-200/80` en modo claro y `border-slate-800/80` en modo oscuro.

## 2. Sistema de Diseño Vercel (Geist Foundation)
- **Paleta de Base (Grayscale)**:
  - Background Primario: `#ffffff` (Día) / `#0a0f1d` (Medical Navy Noche)
  - Superficies de Tarjetas: `#f8fafc` / `#111827`
  - Bordes y Separadores: `#e2e8f0` / `#1e293b`
  - Texto Principal: `#0f172a` / `#f8fafc`
  - Texto Secundario / Metadatos: `#64748b` / `#94a3b8`
- **Acentos Funcionales**:
  - Azul Médico / Identidad: `#0284c7` (Brand Sky/Cyan)
  - Éxito / Cobrado / Alta Médica: `#10b981` (Emerald)
  - Alerta Médica Crítica / Penicilina / Inyección: `#ef4444` (Rose/Red)
  - En Espera / Cita Pendiente: `#f59e0b` (Amber Gold)
  - Procedimiento en Quirófano: `#8b5cf6` (Purple Indigo)

## 3. Microinteracciones y Estados en Sillón (0 ms)
- Botones de acción con microescalado: `active:scale-[0.98] transition-all duration-150`
- Transiciones de estado de cita sin recarga de pantalla (optimistic updates).
- Badges de estado con punto de pulso en vivo: `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>`

## 4. Accesibilidad Clínica (WCAG AAA)
- Todo dato vital (alergias, costos, fechas y teléfonos) debe superar un ratio de contraste mínimo de 4.5:1.
- Tamaños de toque mínimos de 44x44px para uso cómodo en iPad o tablet en sillón dental con guantes de látex.
