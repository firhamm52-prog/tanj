// Crop only the owner's current artwork. Replacement QRIS images stay intact.
const artworkHash = '2b59effc1f91a91147f43c5cbbc9311b2e0b2435fc944d599df7e66d514b8b40';
export async function cropQrisArtwork(image) {
  if (!image?.src.startsWith('data:image/')) return;
  try {
    const bytes = Uint8Array.from(atob(image.src.split(',')[1]), (c) => c.charCodeAt(0));
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');
    if (
      hash !== artworkHash ||
      !image.isConnected ||
      image.parentElement.classList.contains('qris-artwork-crop')
    )
      return;
    const frame = document.createElement('div');
    frame.className = 'qris-artwork-crop';
    image.before(frame);
    frame.append(image);
  } catch {
    /* Keep the complete original visible if cropping cannot be applied. */
  }
}
