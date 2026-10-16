export const IDLE_LIMIT = 30 * 60 * 1000;
const WARNING = 2 * 60 * 1000;
export function startIdleSession({ getUser, logout, storage = localStorage, now = Date.now }) {
  let dialog,
    ending = false,
    lastWrite = 0;
  const key = () => `tanj-last-activity-${getUser()?.id}`;
  const touch = () => {
    if (!getUser() || ending) return;
    const stamp = now();
    if (stamp - lastWrite < 1000) return;
    lastWrite = stamp;
    storage.setItem(key(), String(stamp));
    dialog?.close();
  };
  const tick = async () => {
    if (!getUser() || ending) {
      dialog?.close();
      return;
    }
    const stamp = Number(storage.getItem(key()));
    if (!stamp) {
      touch();
      return;
    }
    const remaining = IDLE_LIMIT - (now() - stamp);
    if (remaining <= 0) {
      ending = true;
      dialog?.close();
      try {
        await logout();
      } finally {
        location.replace(new URL('../?session=expired', import.meta.url).href);
      }
      return;
    }
    if (remaining > WARNING) dialog?.close();
    if (remaining <= WARNING && !dialog?.open) {
      if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.className = 'manual-dialog';
        dialog.setAttribute('aria-label', 'Sesi akan berakhir');
        dialog.innerHTML =
          '<h2>Masih di sini?</h2><p>Sesi akan berakhir karena tidak ada aktivitas selama 30 menit.</p><button type="button" class="shop-primary">Lanjutkan sesi</button>';
        dialog.querySelector('button').onclick = touch;
        document.body.append(dialog);
      }
      dialog.showModal();
    }
  };
  const activity = () => {
    if (!dialog?.open)
      void tick().then(() => {
        if (!ending) touch();
      });
  };
  for (const event of ['pointerdown', 'keydown', 'scroll'])
    window.addEventListener(event, activity, { passive: true });
  window.addEventListener('focus', () => void tick());
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void tick();
  });
  window.addEventListener('storage', () => void tick());
  window.addEventListener('tanj-customer-change', () => {
    lastWrite = 0;
    void tick();
  });
  const timer = setInterval(() => void tick(), 15000);
  void tick();
  return () => {
    clearInterval(timer);
    for (const event of ['pointerdown', 'keydown', 'scroll'])
      window.removeEventListener(event, activity);
    dialog?.remove();
  };
}
