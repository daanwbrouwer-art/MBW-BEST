import L from "leaflet";

// Stadia Maps' "free without a key" tier only serves tiles when the browser
// sends a Referer header proving the request came from localhost — that
// check passes inconsistently across real browsers (privacy settings,
// extensions, and stricter referrer policies all break it silently, which
// is exactly what happened testing this for real: a blank/black map with a
// 401 on every tile request). So: use Stadia only once a real key is
// configured (production/native builds, per .env.example), and fall back to
// CARTO's public basemap tiles otherwise — no key or referrer dependency,
// verified working with a plain unauthenticated request.
const TILE_API_KEY = import.meta.env.VITE_MAP_TILES_API_KEY;

export const TILE_URL = TILE_API_KEY
  ? `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${TILE_API_KEY}`
  : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

export const TILE_ATTRIBUTION = TILE_API_KEY
  ? '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noreferrer">Stadia Maps</a>, ' +
    '&copy; <a href="https://openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> ' +
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
  : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors ' +
    '&copy; <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';

export const PARK_ICON = L.divIcon({
  className: "",
  html: `<div style="
    width: 30px; height: 30px; border-radius: 9999px;
    background: oklch(0.68 0.25 180); border: 2px solid oklch(0.08 0.005 260);
    box-shadow: 0 2px 10px oklch(0 0 0 / 0.4);
    display: flex; align-items: center; justify-content: center;
  "><div style="width: 8px; height: 8px; border-radius: 9999px; background: oklch(0.08 0.005 260);"></div></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// "You are here" marker — deliberately blue (the Google/Apple Maps
// convention), not the app's teal PARK_ICON accent, so it reads as
// distinct from park pins at a glance rather than looking like one more
// park. Rendered as a plain Marker sibling outside MarkerClusterGroup in
// MapPage.tsx, never inside it, so it can't be swept into a cluster bubble.
export const USER_LOCATION_ICON = L.divIcon({
  className: "",
  html: `<div style="position: relative; width: 22px; height: 22px;">
    <div style="
      position: absolute; inset: -13px; border-radius: 9999px;
      background: radial-gradient(circle, oklch(0.62 0.19 255 / 0.35) 0%, oklch(0.62 0.19 255 / 0) 72%);
    "></div>
    <div class="user-location-pulse-ring" style="
      position: absolute; inset: 0; width: 22px; height: 22px; border-radius: 9999px;
      background: oklch(0.62 0.19 255 / 0.55);
    "></div>
    <div style="
      position: absolute; inset: 0; width: 22px; height: 22px; border-radius: 9999px;
      background: oklch(0.62 0.19 255); border: 3px solid white;
      box-shadow: 0 1px 6px oklch(0 0 0 / 0.5);
    "></div>
  </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});
