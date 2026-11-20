import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useToastStore } from '@/shared/lib/store/toastStore';
import styles from './styles/Toast.module.css';

interface ToastProps {
  message: string;
  isOpen: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, isOpen, onClose, duration = 2400 }: ToastProps) {
  useEffect(() => {
    if (!isOpen) return;
    const timeout = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timeout);
  }, [duration, isOpen, onClose]);

  if (!isOpen) return null;
  return createPortal(<div className={styles.toast} role="status" aria-live="polite">{message}</div>, document.body);
}

export function ToastHost() {
  const { message, id, closeToast } = useToastStore();
  return <Toast key={id} message={message ?? ''} isOpen={message !== null} onClose={closeToast} />;
}
