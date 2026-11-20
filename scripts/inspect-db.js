const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const k = line.substring(0, idx).trim();
    const v = line.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    env[k] = v;
  }
});

const { createClient } = require('@supabase/supabase-js');
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: p } = await admin.from('patients').select('id, user_id, full_name, phone, email, branch_name');
  console.log('--- PATIENTS IN DB ---');
  console.log(JSON.stringify(p, null, 2));

  const { data: u } = await admin.from('users').select('id, name, full_name, email, role');
  console.log('--- USERS IN DB ---');
  console.log(JSON.stringify(u, null, 2));

  const { data: a } = await admin.auth.admin.listUsers();
  console.log('--- AUTH USERS ---');
  console.log(JSON.stringify(a?.users?.map(x => ({ id: x.id, email: x.email, metadata: x.user_metadata })), null, 2));
}

main().catch(console.error);
