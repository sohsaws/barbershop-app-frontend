import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserStore } from "@/entities/account";
import { provisionService } from "@/entities/provision/api/provisionApi";
import { provisionQueryKeys } from "@/entities/provision/api/provisionQueryKeys";
import type { ProvisionResponse } from "@/entities/provision/model/types";
import { useProvisionStore } from "@/entities/provision/store/provisionStore";
import { saveProvisionChanges, type ProvisionChanges } from "./saveProvision";

export function useUpdateProvision(original: ProvisionResponse) {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);
  return useMutation({
    retry: false,
    mutationFn: (changes: ProvisionChanges) => {
      if (
        !user ||
        (user.role !== "ADMIN" &&
          (user.role !== "BARBER" || user.id !== original.user.id))
      ) {
        throw new Error("Недостаточно прав для редактирования этой услуги.");
      }
      return saveProvisionChanges(original, changes, provisionService);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["provisions", String(updated.id)], updated);
      useProvisionStore.getState().updateProvision(updated);
      if (user)
        queryClient.setQueryData<ProvisionResponse[]>(
          provisionQueryKeys.barberProvisions(user.id),
          (previous) =>
            previous?.map((item) => (item.id === updated.id ? updated : item)),
        );
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["provisions"] }),
        queryClient.invalidateQueries({ queryKey: provisionQueryKeys.all }),
      ]);
    },
  });
}
