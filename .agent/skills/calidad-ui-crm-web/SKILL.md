---
name: calidad-ui-crm-web
description: Audita, repara y mejora la interfaz de una app web tipo CRM (por ejemplo audenti, CRM odontológico). Úsala cuando se pida revisar, pulir, corregir o mejorar diseño, responsive, formularios, textos de interfaz, accesibilidad, rendimiento o pruebas de la app. No la uses para landing pages con video, generación de imágenes con IA ni publicación en hosting.
---

# Calidad de interfaz para una app web tipo CRM

Esta skill aplica a una app de trabajo diario (agenda, pacientes, tratamientos, pagos), no a un sitio de marketing. Prioridad: que funcione, que se entienda en un vistazo y que se vea cuidada. El movimiento solo sirve para dar respuesta al usuario, nunca para lucirse.

## Reglas de trabajo

1. Respeta el stack que ya usa la app. No agregues frameworks, compiladores ni dependencias sin pedir permiso y explicar por qué.
2. Antes de cambiar nada, crea un respaldo (commit de git o copia de la carpeta fuera del proyecto).
3. Trabaja un paso a la vez: examinar, informar, corregir una cosa, comprobar, continuar. No marques nada como terminado hasta verlo funcionar tú mismo. Que el usuario diga "listo" es la señal para revisar, no la comprobación.
4. No inventes datos ni funciones. Si algo no se puede comprobar, dilo.
5. Habla con palabras sencillas. Informa qué hallaste, qué cambiaste y qué quedó pendiente.

## Fase 1: reconocer

- Lista la estructura de archivos, el stack, las páginas o vistas y cómo se guardan los datos.
- Corre la app y abre cada vista en escritorio y en ancho de teléfono (360 a 390 px).
- Anota el flujo principal del recepcionista o doctor: crear paciente, agendar cita, registrar tratamiento, cobrar.

## Fase 2: auditoría (informe antes de reparar)

Entrega una tabla con: hallazgo, dónde está, severidad (alta, media, baja), qué funciona bien y qué no. Cubre:

- **Funcionalidad:** botones muertos, rutas rotas, formularios que no guardan, filtros y búsquedas que fallan, errores en la consola.
- **Datos:** persistencia real, validación de campos (teléfono, correo, fechas), qué pasa con campos vacíos o muy largos.
- **Responsive:** desplazamiento horizontal, tablas que se desbordan, botones menores de 44 px en teléfono, menús que no se pueden usar.
- **Diseño:** inconsistencias de color, espaciado y tipografía, jerarquía visual, estados vacíos, de carga y de error.
- **Accesibilidad:** contraste, foco visible con teclado, etiquetas en campos, `prefers-reduced-motion`.
- **Rendimiento:** peso de archivos, imágenes sin optimizar, tiempo de carga medido.
- **Privacidad:** esta app maneja datos de salud de pacientes. Revisa que no se impriman en la consola, que no se guarden sin protección en el navegador y que no queden datos reales en capturas o archivos de prueba. Recomienda revisión con un profesional sobre las obligaciones legales de datos personales.

## Fase 3: dirección de diseño (solo si el usuario la aprueba)

- Una sola dirección visual comprometida, no un conjunto de estilos mezclados.
- Paleta de 3 a 5 colores con variables CSS. Acento en pocas dosis. Fondos que nunca sean negro ni blanco puros.
- Tipografía con personalidad: una para títulos, una para texto y, si hace falta, una monoespaciada para cifras y etiquetas. No uses Inter ni Roboto para títulos.
- Un elemento característico que haga reconocible a la marca (por ejemplo una forma o un detalle inspirado en lo dental).
- Evita la apariencia genérica de plantilla hecha por IA.
- Presenta la propuesta con 2 o 3 opciones y recomienda una. Espera aprobación antes de aplicarla.

## Fase 4: reparar por rondas

Primero lo que rompe el uso (severidad alta), luego estructura, luego acabados, al final movimiento. Aplica cada ronda en una sola pasada y vuelve a comprobar.

## Textos de interfaz

- Etiquetas, botones y mensajes cortos, claros y en español natural. Sin relleno.
- Evita palabras corporativas vacías (potenciar, soluciones, sin fricciones, robusto, basado en datos, empoderar) y construcciones del tipo "no es solo X, es Y".
- Los mensajes de error dicen qué pasó y qué hacer.
- Busca estas palabras en todo el código de la interfaz y reescribe cada aparición.

## Formularios honestos

Un mensaje de éxito debe decir la verdad. Si el formulario no guarda de verdad, no muestres "Guardado". Cada acción que cambia datos confirma el resultado real y muestra el error real si falla.

## Movimiento

- Solo transiciones breves (150 a 250 ms) para dar retroalimentación: hover, foco, abrir y cerrar, guardado.
- Respeta `prefers-reduced-motion`.
- Sin animaciones largas, partículas ni efectos que retrasen el trabajo.

## Fase 5: probar de forma adversarial antes de mostrar

- Captura cada vista en escritorio y teléfono.
- Prueba cada botón y cada formulario, con datos válidos, vacíos y absurdos.
- Revisa la consola: debe quedar sin errores.
- Intenta provocar desplazamiento horizontal en anchos de 320, 360, 390 y 768 px.
- Activa movimiento reducido.
- Simula que falla un recurso (imagen, fuente, red) y comprueba que la app sigue usable.
- Mide y reporta tiempos de carga antes y después.

## Entregable

1. Informe de auditoría inicial (Fase 2).
2. Lista de cambios hechos por ronda, con antes y después.
3. Resultado de las pruebas de la Fase 5.
4. Pendientes y recomendaciones, ordenados por prioridad.

## Límites

- No toques archivos fuera de la carpeta del proyecto.
- No borres datos existentes sin respaldo y sin confirmar.
- No uses servicios de pago ni conectores externos que el usuario no haya pedido.
