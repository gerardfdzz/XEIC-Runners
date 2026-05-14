import { createInterface } from 'node:readline';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), '.env');
if (!existsSync(envPath)) {
  console.error('❌  No s\'ha trobat .env. Copia .env.example → .env i omple-ho primer.');
  process.exit(1);
}

const env = {};
readFileSync(envPath, 'utf-8').split('\n').forEach((line) => {
  const [key, ...rest] = line.split('=');
  if (key && !key.startsWith('#')) env[key.trim()] = rest.join('=').trim();
});

const CLIENT_ID     = env['STRAVA_CLIENT_ID'];
const CLIENT_SECRET = env['STRAVA_CLIENT_SECRET'];

if (!CLIENT_ID || !CLIENT_SECRET || CLIENT_ID.includes('your_')) {
  console.error('❌  Omple STRAVA_CLIENT_ID i STRAVA_CLIENT_SECRET a .env primer.');
  process.exit(1);
}

const REDIRECT_URI = 'http://localhost';
const SCOPE        = 'read,activity:read';
const authUrl      = `https://www.strava.com/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=${SCOPE}`;

console.log('\n🔑  Autenticació Strava\n');
console.log('1. Obre aquesta URL al navegador:');
console.log(`\n   ${authUrl}\n`);
console.log('2. Accepta els permisos.');
console.log('3. Seràs redirigit a http://localhost/?state=&code=XXXX&...');
console.log('   Copia el valor de "code" de la URL.\n');

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.question('Enganxa el "code" aquí: ', async (code) => {
  rl.close();
  code = code.trim();
  if (!code) { console.error('❌  Codi buit.'); process.exit(1); }

  try {
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    const data = await res.json();

    if (data.errors || !data.refresh_token) {
      console.error('❌  Error de Strava:', JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log('\n✅  Èxit! Afegeix aquestes variables al teu .env i a Netlify:\n');
    console.log(`STRAVA_CLIENT_ID=${CLIENT_ID}`);
    console.log(`STRAVA_CLIENT_SECRET=${CLIENT_SECRET}`);
    console.log(`STRAVA_REFRESH_TOKEN=${data.refresh_token}`);
    console.log(`\n👤  Autenticat com: ${data.athlete.firstname} ${data.athlete.lastname}`);
    console.log(`🏃  Scope: ${data.scope}\n`);
  } catch (err) {
    console.error('❌  Error de xarxa:', err.message);
    process.exit(1);
  }
});
