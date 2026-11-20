import styles from './styles/BarberServicesList.module.css';
import { useQuery } from '@tanstack/react-query';
import { useUserStore } from '@/entities/account';
import { provisionService } from '@/entities/provision/api/provisionApi';
import { provisionQueryKeys } from '@/entities/provision/api/provisionQueryKeys';
import { ProvisionShortCard } from '@/widgets/provision-short-card/ProvisionShortCard';
import DefaultError from '@/shared/ui/DefaultError/DefaultError';
import { ProfilePageDefaultButton } from '@/shared/ui/Buttons/profile-page-button';
import { useProvisionStore } from '@/entities/provision/store/provisionStore';
import { useEffect } from 'react';

const fallbackPrice = 45;
const fallbackDuration = 20;

export function BarberServicesList() {
  const profileId = useUserStore((state) => state.user?.id);
  const setProvisions = useProvisionStore((state) => state.setBarberProvisions);

  const {
    data: provisions,
    isPending,
    error,
  } = useQuery({
    queryKey: provisionQueryKeys.topFive(profileId),
    queryFn: () => {
      if (!profileId) {
        throw new Error('Profile is not available');
      }

      return provisionService.getTopProvisions(profileId);
    },
    enabled: Boolean(profileId),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => { if (provisions) setProvisions(provisions); }, [provisions, setProvisions]);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          Список услуг
        </h2>
        <ProfilePageDefaultButton
          variant="compact"
          ariaLabel="Sort services"
        >
          Сортировать
        </ProfilePageDefaultButton>
      </div>

      {!profileId ? (
        <DefaultError text="Profile is not available" />
      ) : isPending ? (
        <div className={styles.list} aria-label="Loading services">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className={styles.skeleton}
            />
          ))}
        </div>
      ) : error ? (
        <DefaultError text="Failed to load services" />
      ) : !provisions?.length ? (
        <p className={styles.empty}>
          No services yet
        </p>
      ) : (
        <div className={styles.list}>
          {provisions.map((provision) => (
            <ProvisionShortCard
              key={provision.id}
              provision={provision}
              price={fallbackPrice}
              time={fallbackDuration}
              iconPurpose='detailes'
            />
          ))}
        </div>
      )}
    </section>
  );
}
