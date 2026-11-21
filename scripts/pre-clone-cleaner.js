/**
 * AUDENTI CLOUD PRO (2027) - LIMPIADOR AUTOMATIZADO PRE-CLONACIÓN
 * Uso: node scripts/pre-clone-cleaner.js
 * Inspecciona y limpia variables locales, archivos temporales y datos sensibles
 * antes de empaquetar o clonar para una nueva clínica.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

console.log('================================================================');
console.log(' AUDENTI 2027 - PROTOCOLO DE LIMPIEZA PRE-CLONACIÓN / MARCA BLANCA');
console.log('================================================================\n');

// 1. Archivos temporales de caché y compilación a depurar
const DIRS_TO_PURGE = [
  path.join(ROOT_DIR, '.next'),
  path.join(ROOT_DIR, 'node_modules', '.cache')
];

DIRS_TO_PURGE.forEach((dir) => {
  if (fs.existsSync(dir)) {
    console.log(`[LIMPIEZA] Eliminando caché en: ${path.relative(ROOT_DIR, dir)}`);
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`  ✓ Limpio.`);
    } catch (e) {
      console.warn(`  ! No se pudo purgar ${dir}:`, e.message);
    }
  }
});

// 2. Generar plantilla .env.example segura sin credenciales de producción
const envExampleContent = `# ==============================================================================
# AUDENTI CLOUD PRO - CONFIGURACIÓN DE ENTORNO (PLANTILLA BASE)
# Reemplazar con las credenciales de la nueva clínica / franquicia
# ==============================================================================

# Supabase PostgreSQL
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_tu_clave_anon
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_secreta

# Identidad Clínica
NEXT_PUBLIC_CLINIC_NAME="Clínica Dental Especializada"
NEXT_PUBLIC_DIRECTOR_NAME="Dra. Nombre Apellido"
NEXT_PUBLIC_DIRECTOR_CEDULA="0000000"

# Sedes
NEXT_PUBLIC_BRANCH_MATRIZ="Sede Matriz — Jardín Balbuena"
NEXT_PUBLIC_BRANCH_NORTE="Sede Norte — Chalma de Guadalupe"

# WhatsApp Business / Notificaciones
NEXT_PUBLIC_WA_PHONE="525500000000"
META_WA_TOKEN=""
META_WA_PHONE_NUMBER_ID=""

# IA & Motores de Lenguaje
GEMINI_API_KEY=""
OPENAI_API_KEY=""
ANTHROPIC_API_KEY=""
`;

const envExamplePath = path.join(ROOT_DIR, '.env.example');
fs.writeFileSync(envExamplePath, envExampleContent, 'utf8');
console.log(`[GENERADO] Plantilla de variables de entorno: .env.example`);

console.log('\n----------------------------------------------------------------');
console.log('✓ Proceso de limpieza concluido con éxito.');
console.log('Instrucciones siguientes:');
console.log('1. Ejecutar en Supabase SQL Editor: scripts/sanitize-template.sql');
console.log('2. Configurar el nuevo archivo .env con las credenciales de la clínica');
console.log('3. Ejecutar npm run build para certificar el despliegue');
console.log('----------------------------------------------------------------\n');
