# PROMPT: Spotlight Card Glow Component (21st.dev / EaseMize UI)

## Contexto y Objetivo
Integrar el componente de tarjeta interactiva con resplandor que sigue al puntero del mouse ("Spotlight Card" / "GlowCard") basado en 21st.dev:
https://21st.dev/@jahed/components/spotlight-card

## Especificaciones Técnicas
- Usa CSS custom properties `--spotlight-x`, `--spotlight-y`, `--spotlight-hue`, `--spotlight-size`.
- Actualización dinámica con eventos de puntero (`pointermove`, `pointerenter`, `pointerleave`).
- Hue configurable (ej. dorado/ámbar 40-45 para Audenti).
- Borde iluminado con máscara CSS radial (`maskComposite: 'exclude'`).
- Compatible con touch, móvil, PC, Mac y respeta `prefers-reduced-motion`.

## Archivo en el proyecto
`src/components/ui/spotlight-card.tsx`

## Uso rápido
```tsx
import { SpotlightCard } from '@/components/ui/spotlight-card'

<SpotlightCard hue={43} size={320} spotlightOpacity={0.4} className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
  <h3>Título de la tarjeta</h3>
  <p>Contenido interactivo con resplandor al cursor.</p>
</SpotlightCard>
```
