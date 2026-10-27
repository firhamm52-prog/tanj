// Normalize MOV uploads to a browser-friendly WebM instead of publishing QuickTime codecs.
export async function prepareCmsVideo(file, crop = null) {
  if (!crop && !/\.mov$/i.test(file.name) && file.type !== 'video/quicktime') return file;
  if (file.size > 50 * 1024 * 1024) throw Error('Ukuran video maksimal 50 MB.');
  const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((value) =>
    globalThis.MediaRecorder?.isTypeSupported(value),
  );
  if (!type)
    throw Error(
      'Browser ini belum bisa mengonversi MOV. Ekspor video sebagai MP4 H.264, lalu upload kembali.',
    );
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  let recorder, stream, frame, timer;
  try {
    await new Promise((resolve, reject) => {
      timer = setTimeout(
        () =>
          reject(Error('MOV tidak dapat dibaca. Ekspor sebagai MP4 H.264, lalu upload kembali.')),
        20000,
      );
      video.onloadeddata = resolve;
      video.onerror = () =>
        reject(
          Error(
            'Codec MOV tidak didukung browser ini. Ekspor sebagai MP4 H.264, lalu upload kembali.',
          ),
        );
      video.src = url;
    });
    clearTimeout(timer);
    const canvas = document.createElement('canvas');
    const ratio = crop?.ratio || video.videoWidth / video.videoHeight;
    const sourceWidth = Math.min(video.videoWidth, video.videoHeight * ratio) / (crop?.zoom || 1);
    const sourceHeight = sourceWidth / ratio;
    const sx = (video.videoWidth - sourceWidth) * (crop?.x ?? 0.5);
    const sy = (video.videoHeight - sourceHeight) * (crop?.y ?? 0.5);
    const scale = Math.min(1, 1080 / Math.max(sourceWidth, sourceHeight));
    canvas.width = Math.max(2, Math.round((sourceWidth * scale) / 2) * 2);
    canvas.height = Math.max(2, Math.round((sourceHeight * scale) / 2) * 2);
    const context = canvas.getContext('2d');
    stream = canvas.captureStream(30);
    const parts = [];
    recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 4000000 });
    const draw = () => {
      context.drawImage(
        video,
        sx,
        sy,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      frame = requestAnimationFrame(draw);
    };
    const result = new Promise((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size) parts.push(event.data);
      };
      recorder.onstop = () => resolve(new Blob(parts, { type: 'video/webm' }));
      recorder.onerror = () => reject(Error('Konversi video gagal. Coba MP4 H.264.'));
      video.onended = () => recorder.stop();
      video.onerror = () => reject(Error('Video berhenti saat konversi. Coba MP4 H.264.'));
      timer = setTimeout(
        () => reject(Error('Konversi terlalu lama. Coba ekspor MP4 H.264.')),
        Number.isFinite(video.duration)
          ? Math.max(60000, (video.duration + 30) * 1000)
          : 10 * 60 * 1000,
      );
    });
    draw();
    recorder.start(1000);
    await video.play();
    const blob = await result;
    if (blob.size < 1024)
      throw Error(
        'Hasil konversi tidak memiliki frame video. Ekspor sebagai MP4 H.264, lalu upload kembali.',
      );
    if (blob.size > 50 * 1024 * 1024)
      throw Error('Hasil konversi melebihi 50 MB. Kompres video terlebih dahulu.');
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webm', { type: 'video/webm' });
  } finally {
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    video.pause();
    if (recorder?.state === 'recording') recorder.stop();
    stream?.getTracks().forEach((track) => track.stop());
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}
