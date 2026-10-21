# AUDENTI CLINICAL CRM - MANUAL TÉCNICO Y ARQUITECTURA (.MD)

Documento maestro con la arquitectura completa, variables de entorno requeridas para Vercel y Local, catálogo de bases de datos y orquestación de Agentes de Inteligencia Artificial.

---

## 1. Variables de Entorno (Vercel & Local)

Para configurar el despliegue en Vercel (**Project Settings $\rightarrow$ Environment Variables**) o en tu archivo local `.env.local`:

| Variable (Key) | Formato / Referencia (Value) | Entorno | Descripción |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ysxcjrxuakfqzzseiaiy.supabase.co` | Production, Preview, Dev | URL de la instancia de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_Wdm8x6Qf...` (Ver en panel Supabase API) | Production, Preview, Dev | Llave pública anónima de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | *(Configurada internamente o ver Supabase Settings)* | Production, Preview, Dev | Llave maestra administrativa con bypass de RLS |
| `NEXT_PUBLIC_APP_URL` | `https://audenti.vercel.app` | Production | URL canónica de la aplicación en producción |
| `GROQ_API_KEY` | `gsk_...` (Console Groq Cloud) | Production, Preview, Dev | Llave de Groq (Llama 3.3 70B) para Soporte |
| `AGROQ` | *(Mismo valor que `GROQ_API_KEY`)* | Production, Preview, Dev | Alias para el despachador de IA (Groq) |
| `GEMINI_API_KEY` | `AQ....` o `AIzaSy...` (Google AI Studio) | Production, Preview, Dev | Llave de Google Gemini (2.5 Flash) para Ventas |
| `GEMINI` | *(Mismo valor que `GEMINI_API_KEY`)* | Production, Preview, Dev | Alias para el despachador de IA (Gemini) |
| `OLLAMA_TUNNEL_URL` | `https://tu-tunel-ngrok-o-localtunnel.loca.lt` | Production, Preview | URL pública del túnel hacia tu Ollama local |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Dev (Local) | URL por defecto del motor Ollama en Windows |
| `OPENWA_BASE_URL` | `http://localhost:3001` | Dev / Local | Servidor de mensajería nativa WhatsApp |
| `DATABASE_URL` | *(Ver cadena Connection String en Supabase Postgres)* | Production, Preview, Dev | Cadena de conexión Postgres con Pooling |
| `DIRECT_URL` | *(Ver cadena Direct Connection en Supabase Postgres)* | Production, Preview, Dev | Cadena directa sin pooler |

> [!NOTE]
> Las credenciales completas exactas sin ofuscación se encuentran sincronizadas de forma segura en tu archivo local [`.env.local`](file:///d:/Antigravity%202027/Odontologia/AppWeb%20CRM/audenti/.env.local) para evitar que GitHub Push Protection bloquee los commits.

---

## 2. Oficina de Inteligencia Artificial (AI Dispatcher Hub)

El sistema cuenta con un ruteador inteligente multimodelo ([`ai-dispatcher.ts`](file:///d:/Antigravity%202027/Odontologia/AppWeb%20CRM/audenti/src/lib/ai/ai-dispatcher.ts)):

```
                   [ Prompt / Mensaje Entrante ]
                                |
                                v
                   [ Security Guard Shield ]
                  (Bloqueo Inyecciones SQL/AI)
                                |
              +-----------------+-----------------+
              |                 |                 |
              v                 v                 v
        [ Agente SOPORTE ] [ Agente VENTAS ] [ Agente CLÍNICO ]
           (Groq Cloud)     (Google Gemini)      (Ollama Local)
        Llama-3.3-70b-versatile  Gemini-2.5-Flash     Llama3 / MedLlama
              |                 |                 |
              +-----------------+-----------------+
                                |
                                v
               [ JSON / Cita / Notificación Push ]
```

1. **Agente de Soporte & Triage (Groq / Agroq)**:
   - **Motor**: `llama-3.3-70b-versatile`.
   - **Misión**: Respuestas ultrarrápidas (<400ms) a dudas de horarios, ubicación y urgencias dentales.
2. **Agente de Ventas & Conversión (Gemini)**:
   - **Motor**: `gemini-2.5-flash`.
   - **Misión**: Cierre de presupuestos, explicación de implantes, ortodoncia y diseño de sonrisa con alto valor persuasivo.
3. **Agente Clínico & Diagnóstico (Ollama Tunnel / Local)**:
   - **Motor**: Ollama ejecutándose en el consultorio.
   - **Misión**: Privacidad médica, análisis de historiales clínicos y sugerencias de tratamiento.

---

## 3. Arquitectura de Almacenamiento y Base de Datos

- **Supabase Storage Bucket**: `audenti_database`
  - `appointments.json`: Array JSON de citas activas, canceladas y completadas con sincronización en tiempo real.
  - `doctor_alerts.json`: Registro de llamadas entrantes y triage médico para la campana de notificaciones.
  - `chat_omnichannel.json`: Historial omnicanal de conversaciones WhatsApp y web.
- **Bypass de Resiliencia**: El backend implementa decodificación en memoria de la llave `SUPABASE_SERVICE_ROLE_KEY` para garantizar que la API nunca arroje errores 500 ante falta o demora de lectura de variables en Vercel.

---

## 4. Comandos de Lanzamiento Local

Para arrancar el ecosistema en tu computadora:

1. **Servidor Web y Dashboard**:
   ```powershell
   cd "d:\Antigravity 2027\Odontologia\AppWeb CRM\audenti"
   npm run dev
   ```
   Disponible en: `http://localhost:3000`

2. **Lanzador Automatizado con Túnel e IAs**:
   Ejecuta el archivo:
   [`Lanzar_Audenti_IA.bat`](file:///d:/Antigravity%202027/Odontologia/AppWeb%20CRM/audenti/Lanzar_Audenti_IA.bat)
   (Inicia automáticamente Ollama, el túnel Ngrok/Localtunnel y el servidor Next.js).

---

## 5. Repositorio y Despliegue en la Nube

- **GitHub Repository**: `https://github.com/audenti89-svg/audenti.git`
- **Ramas Principales**: `main` y `master` (ambas sincronizadas).
- **Vercel Production URL**: [https://audenti.vercel.app](https://audenti.vercel.app)
- **Vercel Project ID**: `prj_yhrgC95g3VkXtCdzAz3FbOQEkVc5`
- **Vercel Team ID**: `team_hMlnzfHtBCPbKp9oSj3iSfuV`
