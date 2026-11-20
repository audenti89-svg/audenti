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

async function fixUserData() {
  const userId = '063504f1-2752-4734-9bc4-5174940af6eb'; // rricardos76@gmail.com
  const { data: user, error: getErr } = await admin.auth.admin.getUserById(userId);
  if (getErr) {
    console.error('Error getting user:', getErr);
    return;
  }

  console.log('Current metadata:', user.user.user_metadata);

  const newMetadata = {
    ...user.user.user_metadata,
    full_name: 'Ricardo Ulises Rayón Sánchez',
    name: 'Ricardo Ulises Rayón Sánchez',
    phone: '5522427769'
  };

  const { data: updated, error: updErr } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: newMetadata
  });

  if (updErr) {
    console.error('Error updating user metadata:', updErr);
  } else {
    console.log('User metadata updated successfully:', updated.user.user_metadata);
  }

  // Also verify in patients table
  const { data: patient, error: pErr } = await admin
    .from('patients')
    .select('*')
    .eq('user_id', userId)
    .single();

  console.log('Patient record:', patient?.full_name, patient?.email, patient?.phone);
}

fixUserData().catch(console.error);
