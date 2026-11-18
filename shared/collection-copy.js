// Upgrade legacy collection labels without overriding later CMS edits.
const updates = {
  'Embroidered Outer': {
    name: 'TANJ Lira',
    description:
      'Dress panjang dengan siluet mengalir dan belt yang dapat disesuaikan di pinggang. Dikenakan longgar atau dengan belt, keduanya memberi tampilan yang anggun dan nyaman.',
  },
  'Everyday Drape Outer': {
    name: 'TANJ Runa',
    description:
      'Outer dengan potongan ringan dan tepian bergelombang yang memberi bentuk khas saat dikenakan. Mudah dipadukan dengan busana dalam untuk tampilan yang effortless dan tertata.',
  },
  'Flow Dress Belted': {
    name: 'TANJ Sera',
    description:
      'Outer panjang dengan siluet bersih dan detail bordir pada kedua ujung lengan. Dirancang untuk melengkapi tampilan sehari-hari maupun momen yang lebih istimewa, tanpa terasa berlebihan.',
  },
};
export function collectionCopy(state) {
  if (!state?.collections) return state;
  const changed = new Map();
  const collections = state.collections.map((c) => {
    const update = updates[c.name];
    if (!update) return c;
    changed.set(c.id, update);
    return { ...c, ...update };
  });
  const products = state.products?.map((p) => {
    const update = changed.get(p.collectionId);
    if (!update) return p;
    let name = p.name;
    for (const [old, next] of Object.entries(updates))
      if (name === old || name?.startsWith(old + ' ? ')) name = next.name + name.slice(old.length);
    return { ...p, name, description: update.description };
  });
  return { ...state, collections, ...(products ? { products } : {}) };
}
