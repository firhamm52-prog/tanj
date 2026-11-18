// Keep decorative hero playback separate from the native controls used by gallery videos.
export function mountHeroVideo(video) {
  const source = video.querySelector('source');
  const container = video.parentElement;
  const poster = container.querySelector('.hero-video-poster') || document.createElement('img');
  poster.className = 'hero-video-poster';
  poster.src = video.poster;
  poster.alt = '';
  poster.setAttribute('aria-hidden', 'true');
  const button = document.createElement('button');
  button.className = 'hero-video-play';
  button.type = 'button';
  button.hidden = true;
  button.setAttribute('aria-label', 'Putar video TANJ');
  button.innerHTML =
    '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="m9 5 11 7-11 7V5Z"/></svg><span>Putar video</span>';
  if (!poster.isConnected) container.append(poster);
  container.append(button);
  let pending = null,
    generation = 0,
    manualRequested = false,
    fallbackTimer;
  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  function fallback(failed = false) {
    inline();
    poster.hidden = false;
    button.hidden = false;
    button.querySelector('span').textContent = failed ? 'Coba putar video' : 'Putar video';
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
  async function play(userGesture = false) {
    if (userGesture) manualRequested = true;
    inline();
    if (document.hidden) {
      video.pause();
      return;
    }
    if (!video.isConnected || !source.getAttribute('src')) return;
    const r = video.getBoundingClientRect();
    if (!r.width || !r.height || r.bottom <= 0 || r.top >= innerHeight) return;
    if (reduceMotion() && !manualRequested) {
      video.pause();
      fallback();
      return;
    }
    if (!video.paused) {
      revealFrame();
      return;
    }
    if (pending && !userGesture) return pending;
    const version = generation;
    clearTimeout(fallbackTimer);
    fallbackTimer = setTimeout(() => {
      if (version === generation && !document.hidden && (video.paused || video.readyState < 2))
        fallback(Boolean(video.error));
    }, 6000);
    let attempt;
    try {
      attempt = video.play();
    } catch (error) {
      fallback(Boolean(video.error));
      return;
    }
    const task = Promise.resolve(attempt)
      .catch((error) => {
        if (version === generation && error.name !== 'AbortError') fallback(Boolean(video.error));
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
    button.hidden = true;
    source.src = absolute;
    source.type = /\.mp4(?:[?#]|$)/i.test(absolute) ? 'video/mp4' : '';
    video.load();
    play();
  }
  video.addEventListener('playing', () => {
    clearTimeout(fallbackTimer);
    inline();
    button.hidden = true;
    revealFrame();
  });
  video.addEventListener('canplay', () => play());
  video.addEventListener('error', () => fallback(true));
  source.addEventListener('error', () => fallback(true));
  button.onclick = () => {
    if (video.error || video.networkState === 3) {
      video.load();
    }
    play(true);
  };
  inline();
  video.autoplay = !reduceMotion();
  play();
  return { play, setSource };
}
export const heroPlayback =
  typeof document !== 'undefined' && document.querySelector('.brand-video')
    ? mountHeroVideo(document.querySelector('.brand-video'))
    : null;
