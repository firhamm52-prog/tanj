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
  const collections = state.collections.map((c) => {
    const update = updates[c.name];
    if (!update) return c;
    return { ...c, ...update };
  });
  // Keep product copy untouched. Product descriptions can be customized independently in CMS.
  return { ...state, collections };
}
