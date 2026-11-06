// Where an unnamed park is ("Near Hoofdstraat, Wageningen"), from its
// coordinates via Nominatim (OpenStreetMap's public reverse geocoder).
//
// Only asked for when someone opens a park, never for every pin. Nominatim's
// usage policy allows at most 1 request a second, so requests are queued
// 1.1 s apart, and answers (including "nothing found") are cached on the
// device. The cache key is an mbw_* account key, so it is wiped with the
// rest of the account's data on an account switch.
import { type PlaceAddress, formatParkPlace } from "@/lib/parkLabels";

const CACHE_KEY = "mbw_park_places";
const MAX_ENTRIES = 300;
const MIN_GAP_MS = 1100;

type Cache = Record<string, string | null>;

function coordKey(lat: number, lng: number): string {
  // ~10 m: the same park always hits the same entry.
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

function readCache(): Cache {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return parsed && typeof parsed === "object" ? (parsed as Cache) : {};
  } catch {
    return {};
  }
}

function writeCache(key: string, value: string | null): void {
  try {
    const cache = readCache();
    delete cache[key];
    cache[key] = value;
    // Insertion order: drop the oldest entries past the cap.
    const keys = Object.keys(cache);
    for (const old of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) {
      delete cache[old];
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Storage full or unavailable: just don't cache.
  }
}

/** A cached answer: string, null (nothing there), or undefined (not asked yet). */
export function cachedParkPlace(lat: number, lng: number): string | null | undefined {
  const cache = readCache();
  const key = coordKey(lat, lng);
  return key in cache ? cache[key] : undefined;
}

let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;
const inFlight = new Map<string, Promise<string | null>>();

async function fetchPlace(lat: number, lng: number): Promise<string | null> {
  const wait = lastRequestAt + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
  const lang = typeof navigator !== "undefined" ? navigator.language : "en";
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&addressdetails=1&lat=${lat}&lon=${lng}&accept-language=${encodeURIComponent(lang)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Reverse geocoding failed (${response.status})`);
  const body = (await response.json()) as { address?: PlaceAddress };
  return formatParkPlace(body.address);
}

/**
 * The street or area of a park's coordinates, cached. Resolves to null when
 * OSM knows nothing useful there; rejects on network errors (not cached,
 * so a later open retries).
 */
export function reverseGeocodePark(lat: number, lng: number): Promise<string | null> {
  const key = coordKey(lat, lng);
  const cached = cachedParkPlace(lat, lng);
  if (cached !== undefined) return Promise.resolve(cached);
  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = queue
    .catch(() => undefined)
    .then(() => fetchPlace(lat, lng))
    .then((place) => {
      writeCache(key, place);
      return place;
    })
    .finally(() => inFlight.delete(key));
  queue = request.catch(() => undefined);
  inFlight.set(key, request);
  return request;
}
