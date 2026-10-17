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
  mailer_subjects_confirmation: 'Verifikasi email kamu — TANJ INDONESIA',
  mailer_templates_confirmation_content: html,
};
const smtp = {
  smtp_host: process.env.TANJ_SMTP_HOST,
  smtp_port: process.env.TANJ_SMTP_PORT,
  smtp_user: process.env.TANJ_SMTP_USER,
  smtp_pass: process.env.TANJ_SMTP_PASSWORD,
  smtp_admin_email: process.env.TANJ_SMTP_SENDER_EMAIL,
};
const hasSMTP = Object.values(smtp).some(Boolean);
if (hasSMTP && !Object.values(smtp).every(Boolean))
  throw Error('Lengkapi seluruh TANJ_SMTP_* di .env sebelum menerapkan konfigurasi SMTP.');
if (hasSMTP) Object.assign(payload, smtp, { smtp_sender_name: 'TANJ INDONESIA' });
if (!process.argv.includes('--apply')) {
  console.log(
    JSON.stringify({
      mode: 'preview',
      templateReady: true,
      smtpIncluded: hasSMTP,
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
  console.log(JSON.stringify({ templateApplied: true, customSenderApplied: hasSMTP }));
}
