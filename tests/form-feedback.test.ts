// @vitest-environment node
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { ErrorHandlingMassage as formatError } from '../src/shared/lib/api-error/apiErrorHandling.ts';
import { validateServicePhotoCount } from '../src/features/manage-service/model/photoPolicy.ts';
import { useToastStore } from '../src/shared/lib/store/toastStore.ts';
const apiError = (status: number, data: unknown) => ({ isAxiosError: true, response: { status, data } });

test('local validation displays its actual message', () => {
  assert.equal(formatError(new Error('Добавьте хотя бы одну фотографию услуги.')),
    'Добавьте хотя бы одну фотографию услуги.');
});

test('reads messages, message, and error response fields in that order', () => {
  assert.equal(formatError(apiError(400, { messages: 'Первое', message: 'Второе', error: 'Третье' })), 'Первое');
  assert.equal(formatError(apiError(422, { messages: '', message: 'Проверьте поле' })), 'Проверьте поле');
  assert.equal(formatError(apiError(409, { error: 'Контакт уже занят' })), 'Контакт уже занят');
});

test('authorization and permission failures have distinct actionable messages', () => {
  assert.match(formatError(apiError(401, { error: 'Unauthorized' })), /Telegram/);
  assert.match(formatError(apiError(403, {})), /Недостаточно прав/);
});

test('network errors and timeouts explain the next step', () => {
  assert.match(formatError({ isAxiosError: true }), /подключение/);
  assert.match(formatError({ isAxiosError: true, code: 'ECONNABORTED' }), /Проверьте результат/);
});

test('malformed responses and unknown errors have readable fallbacks', () => {
  assert.match(formatError(apiError(400, '<html>Bad Request</html>')), /Проверьте введённые данные/);
  assert.match(formatError(apiError(503, { message: 'Internal stack trace' })), /временно недоступен/);
  assert.match(formatError(null), /Не удалось выполнить действие/);
});

test('shared photo policy requires at least one stored or local photo', () => {
  assert.throws(() => validateServicePhotoCount(0), /Добавьте хотя бы одну фотографию/);
  assert.doesNotThrow(() => validateServicePhotoCount(1));
  assert.doesNotThrow(() => validateServicePhotoCount(3));
});

test('repeated toast messages create a new notification and can be closed', () => {
  const initialId = useToastStore.getState().id;
  useToastStore.getState().showToast('Контакты сохранены');
  assert.equal(useToastStore.getState().message, 'Контакты сохранены');
  useToastStore.getState().showToast('Контакты сохранены');
  assert.equal(useToastStore.getState().id, initialId + 2);
  useToastStore.getState().closeToast();
  assert.equal(useToastStore.getState().message, null);
});
