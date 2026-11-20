import { Clock, Pencil, SquareArrowOutUpRight } from 'lucide-react';
import { Link } from 'react-router';
import type { ProvisionResponse } from '@/entities/provision/model/types';
import { useUserStore } from '@/entities/account';
import { useState } from 'react';
import { CloudAlert } from 'lucide-react';
import styles from './styles/ProvisionShortCard.module.css';

interface ProvisionShortCardProps {
  provision: ProvisionResponse;
  price: number;
  time: number;
  iconPurpose: 'profile' | 'detailes';
  className?: object;
}

export function ProvisionShortCard({
  provision,
  price,
  time,
  iconPurpose,
  className,
}: ProvisionShortCardProps) {

  const iconClass = { size: 17, strokeWidth: 1.8, ...className };
  const user = useUserStore((state) => state.user);
  const canEdit = user?.role === 'ADMIN' || (user?.role === 'BARBER' && user.id === provision.user.id);
  const image = provision.avatar || provision.images?.find(Boolean);
  const [failedImage, setFailedImage] = useState<string>();
  const { id: provisionId, title, description } = provision;

  return (
    <Link
      to={canEdit ? `/barber-services/edit/${provisionId}` : `/provisions/${provisionId}`}
      aria-label={`${canEdit ? 'Edit' : 'Open'} ${title}`}
      className={styles.cardLink}
    >
      <article className={styles.card}>
        <div className={styles.header}>
          <div className={styles.headerContainer}>
            <div className={styles.photo}>
              {image && failedImage !== image
                ? <img src={image} alt={title} onError={() => setFailedImage(image)} draggable={false} />
                : <CloudAlert size={26} aria-label="Фото услуги недоступно" />}
            </div>
            <div className={styles.content}>
              <h3 className={styles.title}>{title}</h3>
              {description && <p className={styles.description}>{description}</p>}

              <div className={styles.duration}>
                <Clock size={12} strokeWidth={1.8} />
                <span>{time} min</span>
              </div>
            </div>
          </div>

          <div className={styles.details}>
            <span className={styles.price}>${price}</span>
            <span className={styles.link} aria-hidden="true">
              {iconPurpose === 'profile' ? <SquareArrowOutUpRight {...iconClass} /> 
              : iconPurpose=== 'detailes' ? <Pencil {...iconClass} /> 
              : null} 
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
