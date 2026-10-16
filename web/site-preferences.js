import { defaultSiteSettings } from '../shared/site-settings.js';
let current = { ...defaultSiteSettings };
export const sitePreferences = () => ({ ...current });
export function applySitePreferences(settings) {
  current = { ...defaultSiteSettings, ...settings };
  const put = (selector, text) => {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
  };
  put('.moving-intro h2', current.lookbookTitle);
  put('#story p', current.storyText);
  const title = document.querySelector('#story h2');
  if (title) {
    title.replaceChildren();
    current.storyTitle.split('\n').forEach((line, i) => {
      if (i) title.append(document.createElement('br'));
      const part = document.createElement(i ? 'em' : 'span');
      part.textContent = line;
      title.append(part);
    });
  }
  document.body.dataset.showStock = String(current.showStock);
  document.body.dataset.showSold = String(current.showSold);
  document.body.dataset.storyTheme = current.storyTheme;
  document.documentElement.style.setProperty(
    '--editorial-heading-font',
    current.headingFont === 'times' ? '"Times New Roman",Times,serif' : 'Manrope,Arial,sans-serif',
  );
  document.documentElement.style.setProperty('--qris-width', current.qrisWidth + 'px');
  document
    .querySelectorAll('a[href*="instagram.com"]')
    .forEach((a) => (a.href = current.instagram));
  document.querySelectorAll('a[href*="tiktok.com"]').forEach((a) => (a.href = current.tiktok));
  const chat = document.querySelector('.tanj-chat');
  if (chat) chat.href = 'https://wa.me/' + current.whatsapp;
  window.dispatchEvent(new Event('tanj-site-preferences'));
}
