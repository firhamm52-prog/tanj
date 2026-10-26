import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uploadCmsImage, uploadCmsVideo } from '../web/cms-upload.js';

test('video uploads enforce types and 50 MB limit before network, use separate immutable storage', async () => {
  let calls = 0;
  const paths = [];
  const getClient = async () => ({
    storage: {
      from(bucket) {
        calls++;
        assert.equal(bucket, 'cms-videos');
        return {
          async upload(path, file, options) {
            assert.match(path, /^content\/[a-f0-9-]{36}\.(mp4|webm|mov)$/);
            assert.equal(options.upsert, false);
            assert.equal(
              options.contentType,
              !file.type || file.type === 'application/octet-stream'
                ? 'video/quicktime'
                : file.type,
            );
            paths.push(path);
            return { error: null };
          },
          getPublicUrl(path) {
            return {
              data: { publicUrl: 'https://db.test/storage/v1/object/public/cms-videos/' + path },
            };
          },
        };
      },
    },
  });
  await assert.rejects(uploadCmsVideo({ type: 'video/avi', size: 5 }, { getClient }), /MP4/);
  await assert.rejects(
    uploadCmsVideo({ type: 'video/mp4', size: 50 * 1024 * 1024 + 1 }, { getClient }),
    /50 MB/,
  );
  assert.equal(calls, 0);
  for (const type of ['video/mp4', 'video/webm', 'video/quicktime'])
    assert.match(
      await uploadCmsVideo(new File(['test'], 'private-name', { type }), { getClient }),
      /^https:/,
    );
  assert.notEqual(paths[0], paths[1]);
  for (const type of ['', 'application/octet-stream'])
    assert.match(
      await uploadCmsVideo(new File(['test'], 'camera.MOV', { type }), { getClient }),
      /\.mov$/,
    );
  await assert.rejects(
    uploadCmsVideo(new File(['test'], 'video.mp4', { type: 'video/mp4' }), {
      getClient: async () => ({
        storage: { from: () => ({ upload: async () => ({ error: { message: 'Denied' } }) }) },
      }),
    }),
    /SQL 026/,
  );
});

test('photo upload validates files before network and uses immutable paths', async () => {
  let calls = 0;
  const paths = [];
  const getClient = async () => {
    calls++;
    return {
      storage: {
        from(bucket) {
          assert.equal(bucket, 'cms-media');
          return {
            async upload(path, file, options) {
              assert.equal(options.upsert, false);
              assert.equal(options.contentType, file.type);
              assert.match(path, /^products\/[a-f0-9-]{36}\.png$/);
              paths.push(path);
              return { error: null };
            },
            getPublicUrl(path) {
              return {
                data: { publicUrl: 'https://db.test/storage/v1/object/public/cms-media/' + path },
              };
            },
          };
        },
      },
    };
  };
  await assert.rejects(uploadCmsImage({ type: 'image/svg+xml', size: 30 }, { getClient }), /JPG/);
  await assert.rejects(uploadCmsImage({ type: 'image/png', size: 5242881 }, { getClient }), /5 MB/);
  assert.equal(calls, 0);
  const file = new File(['photo'], 'private-device-name.png', { type: 'image/png' });
  assert.match(await uploadCmsImage(file, { getClient }), /^https:/);
  await uploadCmsImage(file, { getClient });
  assert.notEqual(paths[0], paths[1]);
  await assert.rejects(
    uploadCmsImage(file, {
      getClient: async () => ({
        storage: { from: () => ({ upload: async () => ({ error: { message: 'Denied' } }) }) },
      }),
    }),
    /gagal diunggah/,
  );
});
