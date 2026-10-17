import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { supabaseConfig } from '../web/supabase-config.js';
const envPath = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(envPath)) process.loadEnvFile(envPath);

const html = await readFile(
  new URL('../supabase/templates/confirmation.html', import.meta.url),
  'utf8',
);
const payload = {
  mailer_subjects_confirmation: 'Konfirmasi email akun TANJ',
  mailer_templates_confirmation_content: html,
};
if (!process.argv.includes('--apply')) {
  console.log(
    JSON.stringify({
      mode: 'preview',
      templateReady: true,
      smtpIncluded: false,
      managementAccessAvailable: Boolean(process.env.SUPABASE_ACCESS_TOKEN),
    }),
  );
} else {
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!token)
    throw Error(
      'Isi SUPABASE_ACCESS_TOKEN akun di .env. Secret key database bukan token Management API.',
    );
  const ref = new URL(supabaseConfig.url).hostname.split('.')[0];
  const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw Error('Konfigurasi email belum diterapkan. Status Management API: ' + response.status);
  console.log(JSON.stringify({ templateApplied: true, customSenderApplied: false }));
}
