export const MIN_SERVICE_PHOTOS = 1;

export function validateServicePhotoCount(count: number) {
  if (count < MIN_SERVICE_PHOTOS) {
    throw new Error('Добавьте хотя бы одну фотографию услуги.');
  }
}
