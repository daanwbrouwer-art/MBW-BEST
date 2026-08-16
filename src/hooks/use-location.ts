import { Capacitor, type PermissionState } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { useCallback, useEffect, useRef, useState } from "react";

// Device-level, not per-account — same rationale as use-notifications.ts's
// NOTIFICATIONS_KEY: OS/browser location permission is scoped to the app
// install, not to whichever MyBodyWeight profile is logged in.
const LOCATION_PROMPTED_KEY = "mbw_location_prompted";

export type LocationPermissionState = "granted" | "denied" | "prompt";

export interface LocationPosition {
  latitude: number;
  longitude: number;
  timestamp: number;
  /** Meters, when the platform reports it. Only ever populated by the watchPosition-backed watchedPosition below — the one-shot getCurrentPosition() calls above don't request it. */
  accuracy?: number;
}

type WatchHandle = { kind: "native"; id: string } | { kind: "web"; id: number };

/** True once the location permission sheet has been shown at least once, regardless of the choice made. */
export function hasSeenLocationPrompt(): boolean {
  return localStorage.getItem(LOCATION_PROMPTED_KEY) !== null;
}

function markPrompted(): void {
  localStorage.setItem(LOCATION_PROMPTED_KEY, "1");
}

// Android can report "prompt-with-rationale" (user denied once, OS wants a
// rationale shown before asking again) — treat it the same as "prompt" here,
// there's nothing UI-relevant this hook does differently for it.
function toLocationPermissionState(
  state: PermissionState,
): LocationPermissionState {
  return state === "granted" || state === "denied" ? state : "prompt";
}

async function checkWebPermission(): Promise<LocationPermissionState> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query)
    return "prompt";
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state as LocationPermissionState;
  } catch {
    return "prompt";
  }
}

function getWebPosition(): Promise<LocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not available in this browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: position.timestamp,
        }),
      (error) => reject(error),
      // High accuracy matters here: this is what centers the map on the
      // user's real position (see getCurrentPosition() below). With
      // enableHighAccuracy false, desktop/laptop browsers with no GPS
      // hardware tend to resolve via a coarse, sometimes stale WiFi/IP
      // geolocation lookup instead of trying harder for a real fix — the
      // symptom is a "fixed" location that's just wrong but doesn't change.
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

/**
 * Non-interactive position fetch for background pings (e.g. the nearby-
 * athletes activity ping on app-open) — checks permission WITHOUT prompting,
 * and only fetches a position if it's already granted. Never surfaces a
 * permission dialog, so it's safe to call from effects that run on every
 * app launch; returns null (silently) if permission isn't granted yet.
 */
export async function getPositionIfPermitted(): Promise<LocationPosition | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      const status = await Geolocation.checkPermissions();
      if (toLocationPermissionState(status.location) !== "granted") return null;
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10000,
      });
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: position.timestamp,
      };
    }
    if ((await checkWebPermission()) !== "granted") return null;
    return await getWebPosition();
  } catch {
    return null;
  }
}

/**
 * Mirrors use-notifications.ts's shape for the location permission.
 * @capacitor/geolocation's `requestPermissions()` isn't available on web —
 * there, calling `getCurrentPosition()` itself triggers the browser's native
 * prompt, so `requestPermission()` below uses that as the request on web.
 */
export function useLocation() {
  const [permission, setPermission] =
    useState<LocationPermissionState>("prompt");
  const [lastPosition, setLastPosition] = useState<LocationPosition | null>(
    null,
  );
  const [isRequesting, setIsRequesting] = useState(false);
  const [watchedPosition, setWatchedPosition] =
    useState<LocationPosition | null>(null);
  const watchHandleRef = useRef<WatchHandle | null>(null);

  const stopWatching = useCallback(() => {
    const handle = watchHandleRef.current;
    if (!handle) return;
    watchHandleRef.current = null;
    setWatchedPosition(null);
    if (handle.kind === "native") {
      Geolocation.clearWatch({ id: handle.id }).catch(() => {});
    } else if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(handle.id);
    }
  }, []);

  /**
   * Starts a live position watch (for a "you are here" map marker, not for
   * one-shot centering — see getCurrentPosition() above for that). No-ops if
   * a watch is already running. Silently does nothing if permission isn't
   * granted — same fail-quiet convention as the rest of this hook, so it
   * never pops its own permission prompt outside the LocationPermissionSheet
   * flow. High accuracy is deliberate here (unlike the one-shot calls, which
   * trade accuracy for speed) since the whole point is to reflect real
   * movement on the map.
   */
  const startWatching = useCallback(async () => {
    if (watchHandleRef.current) return;
    if (Capacitor.isNativePlatform()) {
      try {
        const id = await Geolocation.watchPosition(
          { enableHighAccuracy: true, timeout: 10000 },
          (position, err) => {
            if (err || !position) return;
            setWatchedPosition({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp: position.timestamp,
              accuracy: position.coords.accuracy,
            });
          },
        );
        watchHandleRef.current = { kind: "native", id };
      } catch {
        // Permission denied or location services disabled — leave
        // watchedPosition null, the caller just won't render a marker.
      }
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (position) => {
        setWatchedPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: position.timestamp,
          accuracy: position.coords.accuracy,
        });
      },
      () => {
        // Denied/unavailable on web — same fail-quiet behavior.
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
    watchHandleRef.current = { kind: "web", id };
  }, []);

  // Safety net: tears the watch down when this hook instance unmounts (e.g.
  // navigating off the Map screen) even if the caller forgets to — an
  // abandoned watchPosition keeps the GPS radio active for no reason.
  // No-op for every other screen using this hook, since they never call
  // startWatching() in the first place.
  useEffect(() => stopWatching, [stopWatching]);

  /** Checks the real OS/browser permission state and returns it directly
   * (in addition to updating `permission`) — callers that need to branch
   * immediately (e.g. MapPage's mount flow) don't have to wait for a
   * re-render to see the result. */
  const refreshPermission =
    useCallback(async (): Promise<LocationPermissionState> => {
      let next: LocationPermissionState;
      if (Capacitor.isNativePlatform()) {
        try {
          const status = await Geolocation.checkPermissions();
          next = toLocationPermissionState(status.location);
        } catch {
          // checkPermissions() throws when system location services are
          // disabled entirely — nothing to do but report it as unavailable.
          next = "denied";
        }
      } else {
        next = await checkWebPermission();
      }
      setPermission(next);
      return next;
    }, []);

  const getCurrentPosition =
    useCallback(async (): Promise<LocationPosition | null> => {
      try {
        if (Capacitor.isNativePlatform()) {
          // High accuracy here too — same reasoning as getWebPosition()
          // above. This is the call that centers the map on the user.
          const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 8000,
          });
          const next: LocationPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timestamp: position.timestamp,
          };
          setLastPosition(next);
          return next;
        }
        const next = await getWebPosition();
        setLastPosition(next);
        return next;
      } catch {
        return null;
      }
    }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsRequesting(true);
    try {
      markPrompted();
      if (Capacitor.isNativePlatform()) {
        const status = await Geolocation.requestPermissions();
        setPermission(toLocationPermissionState(status.location));
        return status.location === "granted";
      }
      const position = await getCurrentPosition();
      const granted = position !== null;
      setPermission(granted ? "granted" : "denied");
      return granted;
    } finally {
      setIsRequesting(false);
    }
  }, [getCurrentPosition]);

  return {
    permission,
    isRequesting,
    lastPosition,
    watchedPosition,
    refreshPermission,
    requestPermission,
    getCurrentPosition,
    startWatching,
    stopWatching,
  };
}
