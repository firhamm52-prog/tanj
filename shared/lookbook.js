export function selectLookbookMedia(slides = []) {
  let photos = 0,
    videos = 0;
  return slides.filter((slide) => {
    const video =
      slide.mediaType === 'video' || /\.(mp4|webm|mov|ogv|ogg)(?:[?#]|$)/i.test(slide.media || '');
    return video ? ++videos <= 1 : ++photos <= 5;
  });
}
