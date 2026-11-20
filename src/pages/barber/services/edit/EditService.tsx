import { useRef, useState, type SubmitEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { useUserStore } from "@/entities/account";
import { provisionService } from "@/entities/provision/api/provisionApi";
import type {
  ProvisionResponse,
  ServiceSlotDraft,
} from "@/entities/provision/model/types";
import { ServiceForm } from "@/features/manage-service/ui/ServiceForm";
import type { ServicePhotosValue } from "@/features/manage-service/ui/ServicePhotoField";
import { servicePhotoUrls } from "@/features/manage-service/model/saveProvision";
import { useUpdateProvision } from "@/features/manage-service/model/use-update-provision";
import DefaultError from "@/shared/ui/DefaultError/DefaultError";
import DefaultLoading from "@/shared/ui/DefaultLoading/DefaultLoading";
import { useToastStore } from "@/shared/lib/store/toastStore";
import { ErrorHandlingMassage } from "@/shared/lib/api-error/apiErrorHandling";

function LoadedEditor({ provision }: { provision: ProvisionResponse }) {
  const [original] = useState(provision);
  const [initialValues] = useState(() => ({
    provisionId: original.id,
    title: original.title,
    description: original.description,
    categoryId: original.provisionCategory.id,
    photoUrls: servicePhotoUrls(original),
    avatarUrl: original.avatar || servicePhotoUrls(original)[0],
    slots: original.provisionSlots.map((slot) => ({
      ...slot,
      provisionId: original.id,
    })),
  }));
  const [photos, setPhotos] = useState<ServicePhotosValue>(() => ({
    photos: initialValues.photoUrls.map((url) => ({ url })),
    avatarUrl: initialValues.avatarUrl ?? "",
  }));
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const update = useUpdateProvision(original);
  const navigate = useNavigate();

  const handleSubmit = async (
    event: SubmitEvent<HTMLFormElement>,
    slots: ServiceSlotDraft[],
  ) => {
    event.preventDefault();
    if (submitting.current) return;
    const form = new FormData(event.currentTarget);
    submitting.current = true;
    setError("");
    try {
      await update.mutateAsync({
        title: String(form.get("title") ?? "").trim(),
        description: String(form.get("description") ?? "").trim(),
        categoryId: Number(form.get("categoryId")),
        photos,
        slots,
      });
      useToastStore.getState().showToast("Изменения услуги сохранены");
      navigate("/barber-services", { replace: true });
    } catch (cause) {
      setError(ErrorHandlingMassage(cause));
    } finally {
      submitting.current = false;
    }
  };

  return (
    <ServiceForm
      initialValues={initialValues}
      submitText={update.isPending ? "Сохранение…" : "Сохранить изменения"}
      isSubmitting={update.isPending}
      onSubmit={handleSubmit}
      onPhotosChange={setPhotos}
      error={error}
    />
  );
}

export default function EditService() {
  const { id } = useParams();
  const provisionId = Number(id);
  const validId =
    /^\d+$/.test(id ?? "") &&
    Number.isSafeInteger(provisionId) &&
    provisionId > 0;
  const user = useUserStore((state) => state.user);
  const { data, isPending } = useQuery({
    queryKey: ["provisions", String(provisionId)],
    queryFn: () => provisionService.getById(provisionId),
    enabled: validId && Boolean(user),
    retry: false,
  });
  if (!validId) return <DefaultError text="Некорректный ID услуги." />;
  if (!user)
    return (
      <DefaultError text="Откройте приложение из Telegram для редактирования услуги." />
    );
  if (isPending) return <DefaultLoading />;
  if (!data)
    return (
      <DefaultError text="Услуга не найдена или недоступна. Вернитесь в список и попробуйте ещё раз." />
    );
  if (
    user.role !== "ADMIN" &&
    (user.role !== "BARBER" || user.id !== data.user.id)
  ) {
    return (
      <DefaultError text="Недостаточно прав для редактирования этой услуги." />
    );
  }
  return <LoadedEditor key={provisionId} provision={data} />;
}
