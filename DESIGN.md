# DESIGN SYSTEM SPECIFICATION (DESIGN.MD)
## Audenti Cloud Pro — High-Performance Medical PWA
*Architecture & Design Lead: Ricardo Sánchez*
*Framework Standard: VoltAgent / Awesome-Design-MD Specification*

---

## 1. Brand Identity & Vision
Audenti Cloud Pro es un **Sistema Nervioso Autónomo para Clínicas Dentales y Negocios de Salud/Servicios**. Su diseño combina la precisión y pulcritud de un instrumental quirúrgico con la elegancia minimalista del ecosistema **Vercel / Linear**.

- **Atributos de Marca**: Confiable, Quirúrgico, Veloz (0 ms), Resiliente, Soberano.
- **Público Objetivo**: Cirujanos dentistas, especialistas médicos, recepcionistas clínicas y directores financieros.

---

## 2. Color Tokens (Vercel Geist & Medical Palette)

### 2.1 Superficies y Neutros
| Token Name | Hex Code | Uso Principal |
| :--- | :--- | :--- |
| `--surface-primary-light` | `#ffffff` | Fondo principal de vistas clínicas en modo día |
| `--surface-secondary-light` | `#f8fafc` | Fondo de tarjetas y barras laterales |
| `--surface-border-light` | `#e2e8f0` | Líneas divisorias, bordes de inputs y tablas |
| `--surface-primary-dark` | `#0a0f1d` | Fondo general en modo noche (Medical Navy) |
| `--surface-card-dark` | `#111827` | Paneles de expedientes y widgets en modo noche |
| `--surface-border-dark` | `#1e293b` | Bordes sutiles en modo noche |

### 2.2 Textos y Tipografía
| Token Name | Hex Code | Uso Principal |
| :--- | :--- | :--- |
| `--text-heading` | `#0f172a` | Títulos principales, folios y cifras grandes |
| `--text-body` | `#334155` | Descripciones clínicas y párrafos de lectura |
| `--text-muted` | `#64748b` | Fechas, horas, etiquetas técnicas y subtítulos |
| `--text-inverse` | `#ffffff` | Textos sobre botones primarios o fondos oscuros |

### 2.3 Acentos Clínicos Semánticos
| Estado / Semántica | Hex Code | Tailwind Equivalent | Aplicación |
| :--- | :--- | :--- | :--- |
| **Brand Identity** | `#0284c7` | `sky-600` / `cyan-600` | Botones primarios, logotipos y enlaces |
| **Confirmado / Pagado** | `#10b981` | `emerald-500` | Citas confirmadas, pagos liquidados |
| **Alerta Bioseguridad** | `#ef4444` | `rose-500` | Alergias a penicilina, urgencias |
| **En Espera / Pendiente**| `#f59e0b` | `amber-500` | Sala de espera, cotización abierta |
| **En Sillón Dental** | `#8b5cf6` | `purple-500` | Paciente en procedimiento activo |

---

## 3. Tipografía & Jerarquía Visual
- **Fuente Principal Sans**: Inter / Geist Sans (`font-sans`) — Legibilidad extrema en pantallas de iPad o celular.
- **Fuente Técnica Mono**: Geist Mono / JetBrains Mono (`font-mono`) — Utilizada en Folios (`AUD-6551`), teléfonos (`5522427769`) y códigos de referidos.

### Escalas Tipográficas Estándar
- **Display 1**: `text-4xl md:text-5xl font-black tracking-tight` (Encabezados de impacto)
- **Heading 1**: `text-2xl md:text-3xl font-extrabold text-slate-900` (Títulos de módulos)
- **Heading 2**: `text-lg md:text-xl font-bold text-slate-800` (Tarjetas y modales)
- **Body**: `text-sm leading-relaxed text-slate-600` (Contenido clínico)
- **Caption / Meta**: `text-xs font-medium text-slate-400` (Horas, estatus, subtítulos)

---

## 4. Componentes Base Estandarizados

### 4.1 Botones (Buttons)
```tsx
// Botón Primario Quirúrgico
<button className="bg-sky-600 hover:bg-sky-500 active:scale-[0.98] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all duration-150 flex items-center gap-2">
  <Icon size={16} /> Acción Primaria
</button>

// Botón Secundario / Outline
<button className="bg-white hover:bg-slate-50 border border-slate-200 active:scale-[0.98] text-slate-700 font-semibold text-xs px-4 py-2.5 rounded-xl transition-all">
  Cancelar / Volver
</button>
```

### 4.2 Tarjetas Clínicas Bento (Cards)
- `rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm hover:border-sky-500/50 transition-all duration-200`
- Esquinas redondeadas suaves y radio amplio (`rounded-2xl` a `rounded-3xl`) para transmitir calidez médica sin rigidez.

### 4.3 Badges de Estado en Cita
```tsx
// Estado En Espera
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> En Espera
</span>

// Estado En Sillón
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span> En Sillón
</span>
```

---

## 5. Directrices Anti-Slop (Taste Guidelines)
1. **No a la monotonía de tarjetas**: Prohibido crear pantallas con 3 tarjetas idénticas una al lado de la otra con el mismo tamaño y un icono circular arriba. Usar composiciones Bento con métricas destacadas y áreas de trabajo asimétricas.
2. **Espaciado rítmico**: Márgenes consistentes en múltiplos de 4 (`p-4`, `p-6`, `gap-4`, `gap-6`).
3. **Optimistic Updates**: Cuando el médico o recepcionista mueva una cita o guarde una alergia, la UI se actualiza inmediatamente sin mostrar pantallas de carga congeladas.
4. **Respeto a la Norma NOM-004**: Los datos clínicos del expediente nunca se ocultan detrás de interfaces confusas; deben ser legibles de inmediato para cualquier auditoría médica.
