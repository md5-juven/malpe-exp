import { useCallback, useEffect, useRef, useState } from "react";
import type { TabId } from "../types";
import {
  buildAppHash,
  locationsEqual,
  parseAppLocation,
  type AppLocation,
} from "../utils/navigation";

/**
 * Keeps in-app screens in the browser history stack so Back / swipe-back
 * moves between tabs (and overlays) instead of leaving the SPA.
 */
export function useAppHistory(enabled: boolean) {
  const [location, setLocation] = useState<AppLocation>(() => parseAppLocation());
  const locationRef = useRef(location);
  locationRef.current = location;

  const applyLocation = useCallback((next: AppLocation, mode: "push" | "replace") => {
    const current = locationRef.current;
    if (locationsEqual(current, next)) {
      // Still normalize the URL on first boot
      const hash = buildAppHash(next);
      if (window.location.hash !== hash) {
        window.history.replaceState({ tabcheck: true, ...next }, "", hash);
      }
      return;
    }

    setLocation(next);
    const hash = buildAppHash(next);
    if (mode === "replace") {
      window.history.replaceState({ tabcheck: true, ...next }, "", hash);
    } else {
      window.history.pushState({ tabcheck: true, ...next }, "", hash);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Seed a history entry so the first Back stays inside the app when possible
    const initial = parseAppLocation();
    const hash = buildAppHash(initial);
    window.history.replaceState({ tabcheck: true, ...initial }, "", hash);
    setLocation(initial);

    const onPopState = () => {
      setLocation(parseAppLocation());
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [enabled]);

  const goToTab = useCallback(
    (tab: TabId, options?: { replace?: boolean }) => {
      if (!enabled) {
        setLocation((prev) => ({ ...prev, tab, focusExpenseId: null, account: false }));
        return;
      }
      applyLocation(
        { tab, focusExpenseId: null, account: false },
        options?.replace ? "replace" : "push"
      );
    },
    [applyLocation, enabled]
  );

  const openSettle = useCallback(
    (focusExpenseId: string | null = null) => {
      if (!enabled) {
        setLocation({ tab: "settle", focusExpenseId, account: false });
        return;
      }
      applyLocation({ tab: "settle", focusExpenseId, account: false }, "push");
    },
    [applyLocation, enabled]
  );

  const clearSettleFocus = useCallback(() => {
    if (!enabled) {
      setLocation((prev) => ({ ...prev, focusExpenseId: null, tab: "home" }));
      return;
    }

    // Prefer true browser Back so the previous tab restores naturally
    const state = window.history.state as { tabcheck?: boolean } | null;
    if (state?.tabcheck) {
      window.history.back();
      return;
    }

    applyLocation(
      { tab: "home", focusExpenseId: null, account: false },
      "replace"
    );
  }, [applyLocation, enabled]);

  const openAccount = useCallback(() => {
    if (!enabled) {
      setLocation((prev) => ({ ...prev, account: true }));
      return;
    }
    if (locationRef.current.account) return;
    const next = { ...locationRef.current, account: true };
    applyLocation(next, "push");
  }, [applyLocation, enabled]);

  const closeAccount = useCallback(() => {
    if (!enabled) {
      setLocation((prev) => ({ ...prev, account: false }));
      return;
    }

    const state = window.history.state as { tabcheck?: boolean } | null;
    if (locationRef.current.account && state?.tabcheck) {
      window.history.back();
      return;
    }

    applyLocation({ ...locationRef.current, account: false }, "replace");
  }, [applyLocation, enabled]);

  return {
    tab: location.tab,
    focusExpenseId: location.focusExpenseId,
    showAccount: location.account,
    goToTab,
    openSettle,
    clearSettleFocus,
    openAccount,
    closeAccount,
  };
}
