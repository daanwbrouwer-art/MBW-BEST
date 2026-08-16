export interface GeocodeResult {
  lat: number;
  lng: number;
  /** Derived from the place's own bounding box, not fixed — a town gets a small radius, a country gets a large one. */
  radiusKm: number;
  displayName: string;
}

const MIN_SEARCH_RADIUS_KM = 5;
const MAX_SEARCH_RADIUS_KM = 400;

function haversineKm(a: [number, number], b: [number, number]): number {
  const EARTH_RADIUS_KM = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  boundingbox: [string, string, string, string];
}

/**
 * Free-text place search ("Wageningen", "Netherlands", an address) — the
 * returned radius scales with the place's own bounding box, so a town
 * search stays tight and a country search actually covers the country,
 * instead of both using the same fixed proximity radius. Uses Nominatim
 * (OpenStreetMap's public geocoder): free, no key, no per-app setup — same
 * "unblock now" tradeoff already made for map tiles in mapTiles.ts.
 * Nominatim's usage policy caps this around 1 req/sec and expects a Referer
 * identifying the app (browsers send that automatically); fine for a user
 * typing occasional searches, but swap for a paid/self-hosted geocoder
 * (Mapbox, LocationIQ, MapTiler) before any real production search volume.
 */
export async function geocodePlace(
  query: string,
): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("Geocoding request failed");
  const results = (await response.json()) as NominatimResult[];
  const result = results[0];
  if (!result) return null;

  const lat = Number.parseFloat(result.lat);
  const lng = Number.parseFloat(result.lon);
  const [, north, , east] = result.boundingbox.map(Number.parseFloat);
  const halfDiagonalKm = haversineKm([lat, lng], [north, east]);
  const radiusKm = Math.min(
    Math.max(halfDiagonalKm, MIN_SEARCH_RADIUS_KM),
    MAX_SEARCH_RADIUS_KM,
  );

  return { lat, lng, radiusKm, displayName: result.display_name };
}

/** Rough zoom heuristic from a search radius — a country-sized result should land zoomed out, a town-sized one zoomed in. */
export function zoomForRadiusKm(radiusKm: number): number {
  if (radiusKm > 400) return 5;
  if (radiusKm > 150) return 7;
  if (radiusKm > 60) return 9;
  if (radiusKm > 20) return 11;
  return 13;
}
