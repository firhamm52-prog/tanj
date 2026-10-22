import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
await mkdir('supabase/dashboard', { recursive: true });
await build({
  entryPoints: ['supabase/functions/midtrans/index.ts'],
  outfile: 'supabase/dashboard/midtrans.ts',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  legalComments: 'none',
});
console.log('Built supabase/dashboard/midtrans.ts. No secrets embedded.');
