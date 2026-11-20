import type {
  ProvisionResponse,
  ServiceSlotDraft,
  UpdateProvisionRequest,
  CreateProvisionSlotRequest,
} from "../../../entities/provision/model/types";
import type { ServicePhoto, ServicePhotosValue } from "../ui/ServicePhotoField";
import { validateServicePhotoCount } from "./photoPolicy";
import { ErrorHandlingMassage } from "../../../shared/lib/api-error/apiErrorHandling";

export function servicePhotoUrls(provision: ProvisionResponse): string[] {
  return [
    ...new Set([provision.avatar, ...(provision.images ?? [])].filter(Boolean)),
  ];
}

export interface ProvisionChanges {
  title: string;
  description: string;
  categoryId: number;
  photos: ServicePhotosValue;
  slots: ServiceSlotDraft[];
}

interface ProvisionWriter {
  getById: (id: number) => Promise<ProvisionResponse>;
  update: (request: UpdateProvisionRequest) => Promise<ProvisionResponse>;
  addSlot: (request: CreateProvisionSlotRequest) => Promise<unknown>;
  removeSlot: (id: number) => Promise<unknown>;
}

const acceptedTypes = ["image/png", "image/jpeg", "image/webp"];

function validatePhoto(file: File) {
  if (
    !acceptedTypes.includes(file.type) ||
    !file.size ||
    file.size > 5 * 1024 * 1024
  ) {
    throw new Error(
      "Фотографии должны быть PNG, JPEG или WebP размером до 5 МБ.",
    );
  }
  return file;
}

export async function prepareUpdatePhotos(
  original: ProvisionResponse,
  value: ServicePhotosValue,
) {
  validateServicePhotoCount(value.photos.length);
  const avatar = value.photos.find((photo) => photo.url === value.avatarUrl);
  if (!avatar) throw new Error("Выберите аватарку услуги.");
  const originalUrls = servicePhotoUrls(original);
  const imagesChanged =
    originalUrls.length !== value.photos.length ||
    value.photos.some(
      (photo, index) => photo.file || photo.url !== originalUrls[index],
    );
  const files = new Map<string, Promise<File>>();
  const asFile = (photo: ServicePhoto, index: number): Promise<File> => {
    if (photo.file) return Promise.resolve(validatePhoto(photo.file));
    if (!originalUrls.includes(photo.url))
      throw new Error("Фотография отсутствует в исходной услуге.");
    if (!files.has(photo.url))
      files.set(
        photo.url,
        (async () => {
          const response = await fetch(photo.url, {
            signal: AbortSignal.timeout(15000),
          });
          if (!response.ok)
            throw new Error(
              "Не удалось загрузить сохранённую фотографию. Попробуйте ещё раз.",
            );
          const blob = await response.blob();
          const type = blob.type.split(";")[0];
          return validatePhoto(
            new File(
              [blob],
              `service-${index}.${type === "image/jpeg" ? "jpg" : type.split("/")[1]}`,
              { type },
            ),
          );
        })(),
      );
    return files.get(photo.url)!;
  };
  const result: Pick<UpdateProvisionRequest, "images" | "avatar"> = {};
  if (imagesChanged || value.avatarUrl !== original.avatar || avatar.file) {
    result.images = await Promise.all(value.photos.map(asFile));
    result.avatar = await asFile(avatar, value.photos.indexOf(avatar));
  }
  return result;
}

export function sameInterval(
  a: Pick<ServiceSlotDraft, "startTime" | "endTime">,
  b: Pick<ServiceSlotDraft, "startTime" | "endTime">,
) {
  return (
    Date.parse(a.startTime) === Date.parse(b.startTime) &&
    Date.parse(a.endTime) === Date.parse(b.endTime)
  );
}

export function slotChanges(
  original: ProvisionResponse,
  desired: ServiceSlotDraft[],
  current: ProvisionResponse,
) {
  for (const [index, slot] of desired.entries()) {
    const start = Date.parse(slot.startTime),
      end = Date.parse(slot.endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
      throw new Error("Проверьте время начала и окончания слотов.");
    if (
      desired.some(
        (other, otherIndex) =>
          otherIndex !== index &&
          start < Date.parse(other.endTime) &&
          end > Date.parse(other.startTime),
      )
    ) {
      throw new Error("Временные слоты пересекаются.");
    }
  }
  const removed = original.provisionSlots.filter(
    (slot) => !desired.some((entry) => entry.id === slot.id),
  );
  const remove = current.provisionSlots.filter((slot) =>
    removed.some((entry) => entry.id === slot.id),
  );
  if (remove.some((slot) => !slot.available))
    throw new Error("Занятый слот нельзя удалить. Обновите расписание.");
  for (const slot of desired.filter((entry) => entry.id !== undefined)) {
    const existing = current.provisionSlots.find(
      (entry) => entry.id === slot.id,
    );
    if (!existing || !sameInterval(existing, slot))
      throw new Error(
        "Расписание изменилось на сервере. Обновите страницу перед сохранением.",
      );
  }
  const add = desired.filter(
    (slot) =>
      slot.id === undefined &&
      !current.provisionSlots.some((entry) => sameInterval(entry, slot)),
  );
  const remaining = current.provisionSlots.filter(
    (slot) => !remove.some((entry) => entry.id === slot.id),
  );
  if (
    add.some((slot) =>
      remaining.some(
        (entry) =>
          Date.parse(slot.startTime) < Date.parse(entry.endTime) &&
          Date.parse(slot.endTime) > Date.parse(entry.startTime),
      ),
    )
  )
    throw new Error("Новый слот пересекается с расписанием на сервере.");
  return { remove, add };
}

// The backend uses LocalDateTime: send the wall-clock time displayed in the form.
export function serverSlotTime(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

export async function saveProvisionChanges(
  original: ProvisionResponse,
  changes: ProvisionChanges,
  api: ProvisionWriter,
) {
  if (!changes.title.trim()) throw new Error("Введите название услуги.");
  if (!Number.isSafeInteger(changes.categoryId) || changes.categoryId <= 0)
    throw new Error("Выберите категорию услуги.");
  validateServicePhotoCount(changes.photos.photos.length);
  const current = await api.getById(original.id);
  const delta = slotChanges(original, changes.slots, current);
  const photos = await prepareUpdatePhotos(original, changes.photos);
  const request: UpdateProvisionRequest = { id: original.id, ...photos };
  if (changes.title !== original.title && changes.title !== current.title)
    request.title = changes.title.trim();
  if (
    changes.description !== original.description &&
    changes.description !== current.description
  )
    request.description = changes.description;
  if (
    changes.categoryId !== original.provisionCategory.id &&
    changes.categoryId !== current.provisionCategory.id
  )
    request.provisionCategoryId = changes.categoryId;
  try {
    if (Object.keys(request).length > 1) await api.update(request);
    for (const slot of delta.remove) await api.removeSlot(slot.id);
    for (const slot of delta.add)
      await api.addSlot({
        provisionId: original.id,
        startTime: serverSlotTime(slot.startTime),
        endTime: serverSlotTime(slot.endTime),
      });
    return await api.getById(original.id);
  } catch (cause) {
    // Re-read before any retry: an interrupted request may already have succeeded.
    throw new Error(
      `Сохранение не завершено. ${ErrorHandlingMassage(cause)} Часть изменений могла сохраниться. Повторите попытку: расписание будет сверено с сервером.`,
      { cause },
    );
  }
}
