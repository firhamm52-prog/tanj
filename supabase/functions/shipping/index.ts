import { createShippingHandler } from '../_shared/shipping-handler.js';

Deno.serve(createShippingHandler({ env: (name: string) => Deno.env.get(name) }));
