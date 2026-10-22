import { createMidtransHandler } from '../_shared/midtrans-handler.js';
Deno.serve(createMidtransHandler({ env: (name: string) => Deno.env.get(name) }));
