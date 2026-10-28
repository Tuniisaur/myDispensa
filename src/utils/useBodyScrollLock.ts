import { useEffect } from 'react';

/**
 * Hook che blocca lo scroll del body/pagina sottostante quando un modal o scheda è aperto,
 * ripristinandolo esattamente allo stato originale alla chiusura.
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.position = originalPosition;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isLocked]);
}

