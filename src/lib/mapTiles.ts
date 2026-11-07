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
// OSM's current address (the old a./b./c. subdomains are deprecated).
// OSM blocks tile requests that arrive without a Referer header (it serves
// an "Access blocked" tile instead), so the tile layer sets an explicit
// referrer policy rather than relying on the WebView's default.
export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_REFERRER_POLICY = "strict-origin-when-cross-origin" as const;
export const TILE_CSS_CLASS = "map-tiles-osm-dark";
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

export const PARK_ICON = L.divIcon({
  className: "",
  html: `<div style="
    width: 30px; height: 30px; border-radius: 9999px;
    background: oklch(var(--pulse)); border: 2px solid oklch(0.08 0.005 var(--neutral-hue));
    box-shadow: 0 2px 10px oklch(0 0 0 / 0.4);
    display: flex; align-items: center; justify-content: center;
  "><div style="width: 8px; height: 8px; border-radius: 9999px; background: oklch(0.08 0.005 var(--neutral-hue));"></div></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

// "You are here" marker — deliberately blue (the Google/Apple Maps
// convention), not the app's teal PARK_ICON accent, so it reads as
// distinct from park pins at a glance rather than looking like one more
// park. Rendered as a plain Marker sibling outside MarkerClusterGroup in
// MapPage.tsx, never inside it, so it can't be swept into a cluster bubble.
// A small 3D athlete flexing both arms, standing exactly on the user's
// position (the anchor is between the feet), with a pulsing ring on the
// ground. Shading comes from white/black gradient overlays on top of the
// theme colour, so it follows every palette.
const FIGURE_LIMB = `stroke="oklch(var(--pulse))" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
const FIGURE_SHADE = `stroke="url(#mbw-me-shade)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
const FIGURE_OUTLINE = `stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
const FIGURE_PATHS = {
  arms: "M11 19 L4 24 L5 13 M29 19 L36 24 L35 13",
  legs: "M16 33 L14 46 M24 33 L26 46",
  torso: "M9 17 Q20 13 31 17 L27 33 Q20 35.5 13 33 Z",
};
export const USER_LOCATION_ICON = L.divIcon({
  className: "",
  html: `<div style="position: relative; width: 44px; height: 60px;">
    <div style="position: absolute; left: 4px; top: 32px; width: 36px; height: 36px; transform: scaleY(0.42);">
      <div class="user-location-pulse-ring" style="
        position: absolute; inset: 0; border-radius: 9999px;
        background: oklch(var(--pulse) / 0.45);
      "></div>
    </div>
    <div style="
      position: absolute; left: 11px; right: 11px; top: 46px; height: 8px; border-radius: 9999px;
      background: radial-gradient(ellipse, oklch(0 0 0 / 0.55) 0%, oklch(0 0 0 / 0) 70%);
    "></div>
    <svg width="44" height="57" viewBox="-2 -1 44 57" style="position: absolute; left: 0; top: 0; overflow: visible; filter: drop-shadow(0 3px 3px oklch(0 0 0 / 0.45));">
      <defs>
        <linearGradient id="mbw-me-shade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="white" stop-opacity="0.55"/>
          <stop offset="0.45" stop-color="white" stop-opacity="0"/>
          <stop offset="1" stop-color="black" stop-opacity="0.45"/>
        </linearGradient>
        <radialGradient id="mbw-me-head" cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stop-color="white" stop-opacity="0.75"/>
          <stop offset="0.35" stop-color="white" stop-opacity="0"/>
          <stop offset="1" stop-color="black" stop-opacity="0.45"/>
        </radialGradient>
      </defs>
      <path d="${FIGURE_PATHS.arms} ${FIGURE_PATHS.legs}" ${FIGURE_OUTLINE}/>
      <path d="${FIGURE_PATHS.torso}" fill="white" stroke="white" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="20" cy="8" r="8" fill="white"/>
      <path d="${FIGURE_PATHS.arms} ${FIGURE_PATHS.legs}" ${FIGURE_LIMB}/>
      <path d="${FIGURE_PATHS.arms} ${FIGURE_PATHS.legs}" ${FIGURE_SHADE}/>
      <path d="${FIGURE_PATHS.torso}" style="fill: oklch(var(--pulse))"/>
      <path d="${FIGURE_PATHS.torso}" fill="url(#mbw-me-shade)"/>
      <circle cx="20" cy="8" r="6.5" style="fill: oklch(var(--pulse))"/>
      <circle cx="20" cy="8" r="6.5" fill="url(#mbw-me-head)"/>
    </svg>
  </div>`,
  iconSize: [44, 60],
  // Between the feet = the exact position.
  iconAnchor: [22, 50],
});
