import L from "leaflet";

// Plain OpenStreetMap standard tiles — keyless, no domain allowlist, no
// account/trial to expire. Deliberately chosen over Stadia Maps (tried
// first): a side-by-side comparison of this style vs. Stadia's
// alidade_smooth_dark showed OSM's fuller-color standard style is more
// detailed and easier to read, and Stadia had been the source of every map
// reliability problem up to this point (an expired trial silently degrading
// the account, and tile requests behaving inconsistently across localhost/
// Vercel/native-Android origins). Fine for this app's traffic volume under
// OSM's tile usage policy: https://operations.osmfoundation.org/policies/tiles/.
// OSM's raster tiles are a light basemap with no dark variant, so MapPage
// applies a CSS invert filter (see the ".map-tiles-osm-dark" class) to
// approximate the app's dark theme.
export const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_CSS_CLASS = "map-tiles-osm-dark";
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

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
