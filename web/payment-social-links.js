import { sitePreferences } from './site-preferences.js';
export function mountPaymentSocialLinks(whatsapp, email) {
  const settings = sitePreferences();
  if (!whatsapp || !email) return;
  const row = whatsapp.parentElement;
  row.classList.add('payment-social-links');
  for (const [link, label] of [
    [whatsapp, 'Hubungi TANJ di WhatsApp'],
    [email, 'Hubungi TANJ lewat Gmail'],
  ]) {
    link.setAttribute('aria-label', label);
    link.title = label;
    for (const node of [...link.childNodes]) if (node.nodeType === Node.TEXT_NODE) node.remove();
  }
  const icons = {
    tiktok:
      '<path fill="currentColor" stroke="none" d="M16.6 2H13v13.3a3 3 0 1 1-2.6-3V8.6a6.7 6.7 0 1 0 6.2 6.7V8.5A9 9 0 0 0 22 10V6.4A5.4 5.4 0 0 1 16.6 2Z"/>',
    instagram:
      '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>',
  };
  for (const [name, label, url] of [
    ['tiktok', 'TikTok TANJ', settings.tiktok],
    ['instagram', 'Instagram TANJ', settings.instagram],
  ]) {
    const link = document.createElement('a');
    link.id = 'order-social-' + name;
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'shop-outline';
    link.title = label;
    link.setAttribute('aria-label', label);
    link.innerHTML = `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">${icons[name]}</svg>`;
    row.append(link);
  }
}
