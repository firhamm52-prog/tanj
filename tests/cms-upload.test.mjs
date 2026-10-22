import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uploadCmsImage } from '../web/cms-upload.js';

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
