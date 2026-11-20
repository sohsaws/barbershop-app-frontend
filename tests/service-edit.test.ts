// @vitest-environment node
import assert from 'node:assert/strict';
import { test, vi } from 'vitest';
import type { ProvisionResponse } from '../src/entities/provision/model/types';
import { prepareUpdatePhotos, saveProvisionChanges } from '../src/features/manage-service/model/saveProvision.ts';

const first = 'https://example.test/first.jpg';
const second = 'https://example.test/second.jpg';
const original: ProvisionResponse = { id: 1, title: 'Haircut', description: '', rating: 0, user: { id: 1, firstName: '', lastName: '', username: '', photoUrl: '', description: '', tiktok: '', instagram: '', number: '', role: 'BARBER' }, provisionSlots: [], avatar: first, images: [first, second], provisionCategory: { id: 1, name: '', description: '' }, likesCount: 0, likedByMe: false };

test('empty gallery is rejected before any API request', async () => {
  let requests = 0;
  await assert.rejects(saveProvisionChanges(original, {
    title: 'Haircut', description: '', categoryId: 1, photos: { photos: [], avatarUrl: '' }, slots: [],
  }, { getById: async () => { requests += 1; return original; }, update: async () => original, addSlot: async () => {}, removeSlot: async () => {} }), /Добавьте хотя бы одну фотографию/);
  assert.equal(requests, 0);
});

test('failed saving preserves the reason and partial-save warning', async () => {
  const saved = { ...original, id: 1, title: 'Haircut', description: '',
    provisionCategory: { id: 1, name: '', description: '' }, provisionSlots: [] };
  const cause = new Error('Не удалось сохранить расписание');
  await assert.rejects(saveProvisionChanges(saved, {
    title: 'New title', description: '', categoryId: 1,
    photos: { avatarUrl: first, photos: [{ url: first }, { url: second }] }, slots: [],
  }, { getById: async () => saved, update: async () => { throw cause; }, addSlot: async () => {}, removeSlot: async () => {} }), (error) => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /Не удалось сохранить расписание/);
    assert.match(error.message, /Часть изменений могла сохраниться/);
    assert.equal(error.cause, cause);
    return true;
  });
});

test('rejects an invalid photo format', async () => {
  const file = new File(['data'], 'photo.txt', { type: 'text/plain' });
  await assert.rejects(prepareUpdatePhotos(original, {
    avatarUrl: 'blob:new', photos: [{ url: 'blob:new', file }],
  }), /PNG, JPEG или WebP/);
});

test('text-only changes do not download or replace photos', async () => {
  const result = await prepareUpdatePhotos(original, {
    avatarUrl: first,
    photos: [{ url: first }, { url: second }],
  });
  assert.deepEqual(result, {});
});

test('changing the cover sends the full gallery and downloads each file once', async () => {
  const requests: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    requests.push(url);
    return new Response(url, { headers: { 'Content-Type': 'image/jpeg' } });
  });
  const result = await prepareUpdatePhotos(original, {
    avatarUrl: second,
    photos: [{ url: first }, { url: second }],
  });
  assert.deepEqual(requests.sort(), [first, second].sort());
  assert.equal(result.images?.length, 2);
  assert.equal(result.avatar, result.images?.[1]);
});

test('removing a gallery photo also sends the selected cover', async () => {
  vi.stubGlobal('fetch', async () => new Response('image', {
    headers: { 'Content-Type': 'image/jpeg' },
  }));
  const result = await prepareUpdatePhotos(original, {
    avatarUrl: first,
    photos: [{ url: first }],
  });
  assert.equal(result.images?.length, 1);
  assert.equal(result.avatar, result.images?.[0]);
});

test('new local photos preserve the selected File object', async () => {
  const file = new File(['image'], 'new.webp', { type: 'image/webp' });
  const result = await prepareUpdatePhotos(original, {
    avatarUrl: 'blob:new',
    photos: [{ url: 'blob:new', file }],
  });
  assert.deepEqual(result.images, [file]);
  assert.equal(result.avatar, file);
});

test('a failed photo download aborts the update', async () => {
  vi.stubGlobal('fetch', async () => new Response('', { status: 404 }));
  await assert.rejects(prepareUpdatePhotos(original, {
    avatarUrl: second,
    photos: [{ url: first }, { url: second }],
  }), /Не удалось загрузить/);
});
