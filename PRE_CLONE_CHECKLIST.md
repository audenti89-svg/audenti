# Checklist Oficial de Clonación y Marca Blanca | Audenti Cloud Pro 2027

Este documento establece el procedimiento de desinfección, empaquetado y puesta en marcha para clonar la plataforma Audenti Cloud Pro hacia nuevas clínicas dentales o franquicias, asegurando cero filtraciones de datos médicos personales (NOM-004-SSA3 y secreto médico).

---

## 1. Fase de Limpieza de Datos (Sanitización de Pacientes)

- [ ] **Ejecutar Script de Sanitización SQL:**
  - Abrir el editor SQL en la base de datos de Supabase destino y ejecutar:
    `scripts/sanitize-template.sql`
  - Esto vacía las tablas:
    - `patients`
    - `appointments`
    - `chat_messages`
    - `audit_logs`
    - `payments` / `invoices`
    - `odontograms` / `clinical_evolutions`
    - `informed_consents`
  - **Nota:** El Catálogo oficial `Costos 2`, la geometría 3D anatómica (`teeth.glb`), las políticas RLS y la estructura de roles quedan 100% preservadas.

- [ ] **Purgar Caché y Archivos Locales:**
  - Ejecutar en la terminal del proyecto:
    ```bash
    node scripts/pre-clone-cleaner.js
    ```

---

## 2. Configuración de Identidad y Variables de Entorno

- [ ] **Configurar nuevo archivo `.env`:**
  - Copiar `.env.example` a `.env.local` o cargarlo en el panel de Vercel/Cloudflare:
    - Asignar el nuevo `NEXT_PUBLIC_SUPABASE_URL` y llaves de acceso.
    - Cambiar el nombre de la clínica y dirección médica (`NEXT_PUBLIC_CLINIC_NAME`, `NEXT_PUBLIC_DIRECTOR_NAME`, `NEXT_PUBLIC_DIRECTOR_CEDULA`).
    - Configurar los nombres de sedes:
      - `Sede Matriz — [Nombre de Sede]`
      - `Sede Norte — [Nombre de Sede]`

---

## 3. Verificación de Seguridad y Sesión

- [ ] **Comprobación de Sesiones Continuas:**
  - Verificar que no existan timers de inactividad de pantalla que cierren la sesión al cambiar de pestaña.
  - La sesión permanece activa hasta el cierre de sesión explícito (`handleSignOut`).

- [ ] **Portal del Paciente:**
  - Verificar que el portal `/portal-paciente` cargue sin dependencias cíclicas y limpie hashes `#access_token=...` automáticamente.

- [ ] **Semáforo de Alergias (3 Estados):**
  - Verde: Sin alergias confirmadas.
  - Ámbar: Sin registro aún (vacío).
  - Rojo: Alergia real activa confirmada.

---

## 4. Compilación y Despliegue

- [ ] Ejecutar comprobación de tipos y build de producción:
  ```bash
  npm run build
  ```
- [ ] Confirmar salida con código 0 y 58/58 rutas estáticas y dinámicas generadas.
