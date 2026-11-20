import mockData from './mocks/barbershop.json';
import type { TelegramAuthResponse, UserProfile } from '@/entities/account/model/types';
import type { Category, CreateProvisionRequest, ProvisionResponse, UpdateProvisionRequest, CreateProvisionSlotRequest } from '@/entities/provision/model/types';

const mockUser = structuredClone(mockData.user) as UserProfile;
const mockCategories = structuredClone(mockData.categories) as Category[];
let mockProvisions = structuredClone(mockData.provisions) as ProvisionResponse[];

export const mockApi = {
  auth(): TelegramAuthResponse {
    return { user: structuredClone(mockUser), token: 'mock-jwt-token' };
  },
  profile(id: number | undefined): UserProfile {
    if (id !== mockUser.id) throw new Error('Mock profile was not found');
    return structuredClone(mockUser);
  },
  updateProfile(changes: Partial<UserProfile>) {
    Object.assign(mockUser, changes);
    return structuredClone(mockUser);
  },
  categories: () => structuredClone(mockCategories),
  provisions: () => structuredClone(mockProvisions),
  provision(id: number) {
    const provision = mockProvisions.find((item) => item.id === id);
    if (!provision) throw new Error('Mock provision was not found');
    return structuredClone(provision);
  },
  topProvisions: () => structuredClone(mockProvisions.slice(0, 5)),
  updateProvision(request: UpdateProvisionRequest) {
    const provision = mockProvisions.find((item) => item.id === request.id);
    if (!provision) throw new Error('Mock provision was not found');
    const category = request.provisionCategoryId === undefined ? undefined
      : mockCategories.find((item) => item.id === request.provisionCategoryId);
    if (request.provisionCategoryId !== undefined && !category) throw new Error('Category was not found');
    if (request.images?.length === 0) throw new Error('Добавьте хотя бы одну фотографию.');
    if (request.title !== undefined) provision.title = request.title;
    if (request.description !== undefined) provision.description = request.description;
    if (category) provision.provisionCategory = structuredClone(category);
    if (request.avatar) provision.avatar = URL.createObjectURL(request.avatar);
    if (request.images) provision.images = request.images.map((file) => URL.createObjectURL(file));
    return structuredClone(provision);
  },
  addSlot(slot: CreateProvisionSlotRequest) {
    const provision = mockProvisions.find((item) => item.id === slot.provisionId);
    if (!provision) throw new Error('Mock provision was not found');
    if (provision.provisionSlots.some((entry) => Date.parse(entry.startTime) < Date.parse(slot.endTime)
      && Date.parse(entry.endTime) > Date.parse(slot.startTime))) throw new Error('Слот уже существует.');
    const id = Math.max(0, ...mockProvisions.flatMap((item) => item.provisionSlots.map((entry) => entry.id))) + 1;
    provision.provisionSlots.push({ id, startTime: slot.startTime, endTime: slot.endTime, available: true });
  },
  removeSlot(slotId: number) {
    const provision = mockProvisions.find((item) => item.provisionSlots.some((slot) => slot.id === slotId));
    const slot = provision?.provisionSlots.find((entry) => entry.id === slotId);
    if (!provision || !slot) throw new Error('Slot was not found');
    if (!slot.available) throw new Error('Занятый слот нельзя удалить.');
    provision.provisionSlots = provision.provisionSlots.filter((entry) => entry.id !== slotId);
  },
  toggleLike(id: number) {
    const provision = mockProvisions.find((item) => item.id === id);
    if (!provision) throw new Error('Mock provision was not found');
    provision.likedByMe = !provision.likedByMe;
    provision.likesCount += provision.likedByMe ? 1 : -1;
    return structuredClone(provision);
  },
  createProvision(request: CreateProvisionRequest) {
    const category = mockCategories.find((item) => item.id === request.categoryId) ?? mockCategories[0];
    const created: ProvisionResponse = {
      id: Math.max(...mockProvisions.map((item) => item.id)) + 1,
      title: request.title,
      description: request.description,
      rating: 0,
      avatar: URL.createObjectURL(request.avatar),
      images: request.images.map((file) => URL.createObjectURL(file)),
      likesCount: 0,
      likedByMe: false,
      provisionCategory: structuredClone(category),
      user: structuredClone(mockUser),
      provisionSlots: request.slots.map((slot, index) => ({ ...slot, id: 2000 + index, available: true })),
    };
    mockProvisions = [created, ...mockProvisions];
    return structuredClone(created);
  },
};

export const useApiMocks = import.meta.env.VITE_USE_API_MOCKS === 'true';
