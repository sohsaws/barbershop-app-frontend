import axios from 'axios';

export function ErrorHandlingMassage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
        ? 'Сервер не ответил вовремя. Проверьте результат перед повторной отправкой.'
        : 'Не удалось связаться с сервером. Проверьте подключение и попробуйте снова.';
    }

    const { status, data } = error.response;
    if (status === 401) return 'Сессия истекла. Откройте Mini App заново из Telegram.';
    if (status === 403) return 'Недостаточно прав для выполнения этого действия.';

    const body = data && typeof data === 'object' ? data as Record<string, unknown> : {};
    const message = [body.messages, body.message, body.error]
      .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
    if (body.error === 'Storage error') {
      return message && message !== 'Storage error'
        ? message
        : 'Не удалось сохранить фотографию в хранилище. Попробуйте позже.';
    }
    if (status >= 500) return 'Сервис временно недоступен. Попробуйте позже.';
    if (message) return message;
    if (status === 404) return 'Запрошенные данные не найдены.';
    if (status === 400 || status === 409 || status === 422) return 'Проверьте введённые данные.';
    return 'Не удалось выполнить запрос. Попробуйте снова.';
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Не удалось выполнить действие. Попробуйте снова.';
}
