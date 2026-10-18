import { useSyncExternalStore } from 'react';

/** CSS medya sorgusunu izler (ör. pencere genişliği). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', cb);
      return () => mql.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
  );
}

/** Yan panellerin içerikle yan yana sığdığı genişlik. Altında paneller çekmece olarak açılır. */
export const WIDE_LAYOUT = '(min-width: 1380px)';
