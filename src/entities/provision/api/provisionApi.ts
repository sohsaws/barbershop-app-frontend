
import { api } from "../../../shared/api/apiClient";
import type { Category, ProvisionResponse, CreateProvisionRequest, UpdateProvisionRequest, CreateProvisionSlotRequest } from "../model/types";
import { mockApi, useApiMocks } from '@/shared/api/mockApi';

export const provisionService = {
    getAll: () => useApiMocks ? Promise.resolve(mockApi.provisions()) : api.get<ProvisionResponse[]>('/api/provisions').then((res) => res.data),
    getById: (id: number) => useApiMocks ? Promise.resolve(mockApi.provision(id)) : api.get<ProvisionResponse>(`/api/provisions/${id}`).then((res) => res.data),
    getTopProvisions: (profileId: number) => useApiMocks ? Promise.resolve(mockApi.topProvisions()) : api.get<ProvisionResponse[]>(`/api/provisions/top-five/${profileId}`).then((res) => res.data),
    like: (id: number) => useApiMocks ? Promise.resolve(mockApi.toggleLike(id)) : api.post(`/api/provisions/${id}/like`).then((res) => res.data),
    update: (request: UpdateProvisionRequest) => {
        const form = new FormData();
        form.append('id', String(request.id));
        if (request.title !== undefined) form.append('title', request.title);
        if (request.description !== undefined) form.append('description', request.description);
        if (request.provisionCategoryId !== undefined) form.append('provisionCategoryId', String(request.provisionCategoryId));
        if (request.avatar) form.append('avatar', request.avatar);
        request.images?.forEach((file) => form.append('images', file));
        return useApiMocks ? Promise.resolve(mockApi.updateProvision(request))
            : api.put<ProvisionResponse>('/api/provisions/update', form).then((res) => res.data);
    },
    addSlot: (slot: CreateProvisionSlotRequest) => useApiMocks ? Promise.resolve(mockApi.addSlot(slot))
        : api.post('/api/provisions/add-slot', slot).then(() => undefined),
    removeSlot: (slotId: number) => useApiMocks ? Promise.resolve(mockApi.removeSlot(slotId))
        : api.post('/api/provisions/remove-slot', { slotId }).then(() => undefined),
    provisionCreate: (newProvision: CreateProvisionRequest) => {

        const form = new FormData();

        form.append('title', newProvision.title);
        form.append('description', newProvision.description);
        form.append('categoryId', String(newProvision.categoryId));
        form.append('avatar', newProvision.avatar);
        form.append('slots', new Blob([JSON.stringify(newProvision.slots)], { type: 'application/json' }));
        newProvision.images.forEach((file) => form.append('images', file));

        return useApiMocks
            ? Promise.resolve(mockApi.createProvision(newProvision))
            : api.post<ProvisionResponse>('/api/provisions/create', form).then((res) => res.data)
    },
}

export const categoryService = {
    getAll: () => useApiMocks ? Promise.resolve(mockApi.categories()) : api.get<Category[]>('/api/provision-categories').then((res) => res.data),
}
