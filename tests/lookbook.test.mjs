import test from 'node:test';
import assert from 'node:assert/strict';
import { selectLookbookMedia } from '../shared/lookbook.js';
test('lookbook limits to five photos and one video while preserving order', () => {
  const slides = [
    { media: 'first.mp4', mediaType: 'video' },
    ...Array.from({ length: 7 }, (_, i) => ({ media: `${i}.webp`, mediaType: 'image' })),
    { media: 'second.mov' },
  ];
  assert.deepEqual(selectLookbookMedia(slides), slides.slice(0, 6));
  assert.equal(slides.length, 9);
});
test('empty or incomplete lookbooks do not add dummy slides', () => {
  assert.deepEqual(selectLookbookMedia(), []);
  assert.deepEqual(selectLookbookMedia([{ media: 'test.mov?version=2' }]), [
    { media: 'test.mov?version=2' },
  ]);
});
