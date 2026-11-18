// Keep decorative hero playback separate from the native controls used by gallery videos.
export function mountHeroVideo(video) {
  const source = video.querySelector('source');
  const container = video.parentElement;
  const poster = container.querySelector('.hero-video-poster') || document.createElement('img');
  poster.className = 'hero-video-poster';
  poster.src = video.poster;
  poster.alt = '';
  poster.setAttribute('aria-hidden', 'true');
  if (!poster.isConnected) container.append(poster);
  let pending = null,
    generation = 0;
  function inline() {
    video.controls = false;
    video.removeAttribute('controls');
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.disablePictureInPicture = true;
  }
  function fallback() {
    inline();
    poster.hidden = false;
  }
  function revealFrame() {
    if (poster.hidden) return;
    const version = generation;
    if (video.requestVideoFrameCallback)
      video.requestVideoFrameCallback(() => {
        if (version === generation && !video.paused) poster.hidden = true;
      });
    else if (video.readyState >= 2) poster.hidden = true;
  }
  async function play() {
    inline();
    if (document.hidden) {
      video.pause();
      return;
    }
    if (!video.isConnected || !source.getAttribute('src')) return;
    const r = video.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom <= 0 || r.top >= innerHeight) return;
    if (!video.paused) {
      revealFrame();
      return;
    }
    if (pending) return pending;
    const version = generation;
    let attempt;
    try {
      attempt = video.play();
    } catch (error) {
      fallback();
      return;
    }
    const task = Promise.resolve(attempt)
      .catch((error) => {
        if (version === generation && error.name !== 'AbortError') fallback();
      })
      .finally(() => {
        if (pending === task) pending = null;
      });
    pending = task;
    return task;
  }
  function setSource(src) {
    if (!src) return;
    const absolute = new URL(src, location.href).href;
    inline();
    if (source.src === absolute) {
      play();
      return;
    }
    generation++;
    pending = null;
    video.pause();
    poster.hidden = false;
    source.src = absolute;
    source.type = /\.mp4(?:[?#]|$)/i.test(absolute) ? 'video/mp4' : '';
    video.load();
    play();
  }
  video.addEventListener('playing', () => {
    inline();
    revealFrame();
  });
  video.addEventListener('canplay', () => play());
  video.addEventListener('error', () => fallback());
  source.addEventListener('error', () => fallback());
  document.addEventListener('visibilitychange', () => play());
  window.addEventListener('pageshow', () => play());
  // Retry within the next ordinary page interaction if Safari deferred autoplay.
  document.addEventListener('touchstart', () => play(), { passive: true });
  document.addEventListener('pointerdown', () => play(), { passive: true });
  inline();
  video.autoplay = true;
  video.loop = true;
  video.preload = 'auto';
  play();
  return { play, setSource };
}
export const heroPlayback =
  typeof document !== 'undefined' && document.querySelector('.brand-video')
    ? mountHeroVideo(document.querySelector('.brand-video'))
    : null;
