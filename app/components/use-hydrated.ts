import { useSyncExternalStore } from "react";

const noSubscription = () => () => {};

/**
 * False in the server render and until React has hydrated the page, then true. Buttons that only
 * work with JavaScript stay disabled until then, so an early click is not silently lost.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}
