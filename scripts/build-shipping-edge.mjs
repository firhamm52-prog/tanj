import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
await mkdir('supabase/dashboard', { recursive: true });
await build({
  entryPoints: ['supabase/functions/shipping/index.ts'],
  outfile: 'supabase/dashboard/shipping.ts',
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  target: 'es2022',
  legalComments: 'none',
});
console.log(
  'Built supabase/dashboard/shipping.ts for the Supabase Dashboard editor. No secrets embedded.',
);
