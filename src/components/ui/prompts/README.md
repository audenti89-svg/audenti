# Catálogo de Efectos y Shaders Disponibles en Audenti

Este catálogo documenta los componentes interactivos visuales listos para ser seleccionados o intercambiados en cualquier parte de la aplicación web:

| Nombre | Archivo del Componente | Archivo de Especificación / Prompt | Descripción |
| :--- | :--- | :--- | :--- |
| **Spotlight Card** | `src/components/ui/spotlight-card.tsx` | [`spotlight-card-prompt.md`](./spotlight-card-prompt.md) | Tarjeta con halo luminoso reactivo que sigue la posición del puntero del mouse (`pointermove`) y borde iluminado. |
| **Velaris Shader** | `src/components/ui/velaris.tsx` | [`velaris-shader-prompt.md`](./velaris-shader-prompt.md) | Lienzo WebGL con Simplex Noise fluido, viñeta cinematográfica y grano analógico (film grain). |
| **Shimmer Button** | `src/components/ui/shimmer-button.tsx` | N/A | Botón píldora con destello de luz continuo y variantes (`primary` ámbar, `dark`, `outline`). |

---

### ¿Cómo intercambiarlos o seleccionarlos?
- Para activar el fondo WebGL en cualquier sección:
  ```tsx
  import { Velaris } from '@/components/ui/velaris'
  ```
- Para dotar de resplandor interactivo a cualquier recuadro o tarjeta:
  ```tsx
  import { SpotlightCard } from '@/components/ui/spotlight-card'
  ```
- Para botones de alta conversión:
  ```tsx
  import { ShimmerButton } from '@/components/ui/shimmer-button'
  ```
