import { AddParkSheet } from "@/components/AddParkSheet";
import { LocationPermissionSheet } from "@/components/LocationPermissionSheet";
import { Logo } from "@/components/Logo";
import { ParkDetailSheet } from "@/components/ParkDetailSheet";
import { hasSeenLocationPrompt, useLocation } from "@/hooks/use-location";
import { openAppSettings } from "@/lib/appSettings";
import {
  COUNTRY_CAPITAL_ZOOM,
  EU_CENTROID,
  EU_CENTROID_ZOOM,
  resolveCountryCenter,
} from "@/lib/countryCapitals";
import { geocodePlace, zoomForRadiusKm } from "@/lib/geocoding";
import {
  PARK_ICON,
  TILE_ATTRIBUTION,
  TILE_URL,
  USER_LOCATION_ICON,
} from "@/lib/mapTiles";
import {
  ensureSupabaseSession,
  isSupabaseConfigured,
  supabase,
} from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { ArrowLeft, LocateFixed, Plus, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { toast } from "sonner";

export interface Park {
  id: string;
  name: string;
  lat: number;
  lng: number;
  equipment: string[];
}

const USER_LOCATION_ZOOM = 14;

// Matches nearby_parks()'s own default radius on the server — kept in sync
// manually since the RPC call always passes this explicitly. Used for
// proximity-based searches (locate-me, initial load, "search this area");
// a place-name search (geocodePlace) supplies its own radius instead, since
// "Netherlands" and "Wageningen" obviously shouldn't use the same one.
const DEFAULT_SEARCH_RADIUS_KM = 25;
// Floor for how far the map has to be panned from the last-searched center
// before "Search this area" appears — scales up with the active search
// radius (a country-sized search shouldn't prompt after a trivial drag),
// see MapPanTracker below.
const MIN_SIGNIFICANT_PAN_KM = 8;

function clusterIcon(cluster: L.MarkerCluster) {
  const count = cluster.getChildCount();
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 38px; height: 38px; border-radius: 9999px;
      background: oklch(0.68 0.25 180 / 0.92); border: 2px solid oklch(0.08 0.005 260);
      box-shadow: 0 2px 12px oklch(0 0 0 / 0.45);
      display: flex; align-items: center; justify-content: center;
      font-family: inherit; font-weight: 800; font-size: 13px; color: oklch(0.08 0.005 260);
    ">${count}</div>`,
    iconSize: [38, 38],
  });
}

// Radius-scoped via the nearby_parks() Postgres function instead of a plain
// table select — the parks table has ~43k rows, so loading it unfiltered
// would ship the entire table to every device on every map visit. The RPC
// already filters to approved = true and orders by distance server-side.
async function fetchNearbyParks(
  center: [number, number],
  radiusKm: number,
): Promise<Park[]> {
  const { data, error } = await supabase
    .rpc("nearby_parks", {
      in_lat: center[0],
      in_lng: center[1],
      radius_km: radiusKm,
    })
    .select("id, name, lat, lng, equipment");
  if (error) throw error;
  return data ?? [];
}

/**
 * Fallback center used whenever the device's real position isn't available
 * (permission denied, or the position fetch itself failed) — the user's
 * account country if known, else the EU-wide centroid. Never throws: any
 * failure (no session, network hiccup, or — currently — `country` not yet
 * existing as a column on this project's `profiles` table) just falls
 * through to the EU centroid.
 */
async function resolveFallbackCenter(): Promise<{
  center: [number, number];
  zoom: number;
}> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (userId) {
      // `country` isn't a column on `profiles` yet as of this build — this
      // is written defensively (any query error just falls through below)
      // so it activates automatically once that column is added, without
      // needing a code change here. See the task's verification notes.
      const result = (await supabase
        .from("profiles")
        .select("country")
        .eq("id", userId)
        .single()) as unknown as {
        data: { country: string | null } | null;
        error: unknown;
      };
      const center = result.error
        ? null
        : resolveCountryCenter(result.data?.country);
      if (center) return { center, zoom: COUNTRY_CAPITAL_ZOOM };
    }
  } catch {
    // No session / network failure — fall through to the EU centroid.
  }
  return { center: EU_CENTROID, zoom: EU_CENTROID_ZOOM };
}

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

/** Imperatively flies the map to a new center/zoom — MapContainer's own center/zoom props only apply on first mount. */
function FlyToCenter({
  center,
  zoom,
}: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8 });
  }, [center, zoom, map]);
  return null;
}

/**
 * Tracks manual panning away from the last-searched center. Fires once per
 * completed drag/zoom gesture (moveend), not continuously, so this is
 * naturally debounced without extra plumbing. Reports the live center back
 * up only once it's past SIGNIFICANT_PAN_KM from searchCenter — the parent
 * uses that to show/hide "Search this area" rather than auto-refetching,
 * so panning around never fires a query against a 43k-row table by itself.
 */
function MapPanTracker({
  searchCenter,
  searchRadiusKm,
  onPanChange,
}: {
  searchCenter: [number, number];
  searchRadiusKm: number;
  onPanChange: (pendingCenter: [number, number] | null) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      const live = map.getCenter();
      const distanceKm = haversineKm([live.lat, live.lng], searchCenter);
      const threshold = Math.max(MIN_SIGNIFICANT_PAN_KM, searchRadiusKm / 3);
      onPanChange(distanceKm > threshold ? [live.lat, live.lng] : null);
    },
  });
  return null;
}

export default function MapPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    getCurrentPosition,
    watchedPosition,
    startWatching,
    refreshPermission,
  } = useLocation();

  // EU centroid is just the *initial* paint — never blocks rendering while
  // the real permission/position/fallback-country flow resolves below (see
  // runLocationFlow). Whichever center wins swaps in once it's known.
  const [mapCenter, setMapCenter] = useState<[number, number]>(EU_CENTROID);
  const [mapZoom, setMapZoom] = useState(EU_CENTROID_ZOOM);
  // Center the parks query is actually scoped to — distinct from mapCenter
  // because mapCenter also drives fly-to-position, and we don't want every
  // fly (e.g. tapping a pin) to imply a new search.
  const [searchCenter, setSearchCenter] =
    useState<[number, number]>(EU_CENTROID);
  const [searchRadiusKm, setSearchRadiusKm] = useState(
    DEFAULT_SEARCH_RADIUS_KM,
  );
  const [pendingSearchCenter, setPendingSearchCenter] = useState<
    [number, number] | null
  >(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  // Persistent, non-blocking banner for an actual OS-level denial — never
  // re-triggers the native prompt (see runLocationFlow); only a tap on the
  // banner or the crosshair FAB deep-links to system settings.
  const [showLocationDeniedBanner, setShowLocationDeniedBanner] =
    useState(false);
  const [selectedParkId, setSelectedParkId] = useState<string | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const {
    data: parks,
    isError,
    isLoading,
  } = useQuery({
    queryKey: [
      "parks",
      "nearby",
      searchCenter[0].toFixed(2),
      searchCenter[1].toFixed(2),
      searchRadiusKm,
    ],
    queryFn: () => fetchNearbyParks(searchCenter, searchRadiusKm),
    enabled: isSupabaseConfigured,
  });

  /** One-shot fetch + center on the device's real position. Returns whether
   * it actually succeeded, so callers can fall back to the country/EU
   * center when it doesn't (permission race, GPS timeout, etc). */
  const centerOnUser = useCallback(async (): Promise<boolean> => {
    const position = await getCurrentPosition();
    if (!position) return false;
    const next: [number, number] = [position.latitude, position.longitude];
    setMapCenter(next);
    setMapZoom(USER_LOCATION_ZOOM);
    setSearchCenter(next);
    setSearchRadiusKm(DEFAULT_SEARCH_RADIUS_KM);
    setPendingSearchCenter(null);
    setSearchError(null);
    // Starts the live "you are here" marker watch — separate from the
    // one-shot fetch above, which only drives centering/search. No-ops if
    // already watching; the watch is torn down automatically when this
    // hook/screen unmounts.
    startWatching();
    return true;
  }, [getCurrentPosition, startWatching]);

  const applyFallbackCenter = useCallback(async () => {
    const { center, zoom } = await resolveFallbackCenter();
    setMapCenter(center);
    setMapZoom(zoom);
  }, []);

  /**
   * The full permission → position → fallback flow (steps 1-3 of the
   * design). Runs on every mount and is re-run by the crosshair FAB.
   * Never shows the native/rationale prompt more than once per install on
   * its own (hasSeenLocationPrompt) — only an explicit tap on the FAB
   * re-asks for a "prompt"-state user (see handleLocateButtonTap below).
   */
  const runLocationFlow = useCallback(async () => {
    const state = await refreshPermission();
    if (state === "granted") {
      setShowLocationDeniedBanner(false);
      const centered = await centerOnUser();
      if (!centered) await applyFallbackCenter();
      return;
    }
    if (state === "denied") {
      setShowLocationDeniedBanner(true);
      await applyFallbackCenter();
      return;
    }
    // "prompt" / "prompt-with-rationale"
    setShowLocationDeniedBanner(false);
    if (!hasSeenLocationPrompt()) {
      setShowLocationPrompt(true);
    } else {
      await applyFallbackCenter();
    }
  }, [refreshPermission, centerOnUser, applyFallbackCenter]);

  /** Crosshair FAB — unlike the passive mount flow, a tap here is an
   * explicit ask, so a "prompt" state re-shows the rationale sheet even if
   * it was already dismissed once before. */
  const handleLocateButtonTap = useCallback(async () => {
    const state = await refreshPermission();
    if (state === "granted") {
      setShowLocationDeniedBanner(false);
      const centered = await centerOnUser();
      if (!centered) await applyFallbackCenter();
      return;
    }
    if (state === "denied") {
      setShowLocationDeniedBanner(true);
      return;
    }
    setShowLocationPrompt(true);
  }, [refreshPermission, centerOnUser, applyFallbackCenter]);

  const handleSearchThisArea = () => {
    if (!pendingSearchCenter) return;
    setSearchCenter(pendingSearchCenter);
    setSearchRadiusKm(DEFAULT_SEARCH_RADIUS_KM);
    setPendingSearchCenter(null);
  };

  // Free-text place search — deliberately independent of the device's real
  // position (searchCenter already is, this just adds a second way to set
  // it), so searching "Netherlands" while physically in Sofia still shows
  // Dutch parks, not a "no results near you" dead end. The radius comes
  // from the place itself: a town search stays tight, a country search
  // actually covers the country, instead of both using the same 25km.
  const handleSearchSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query || isGeocoding) return;
    setIsGeocoding(true);
    setSearchError(null);
    try {
      const result = await geocodePlace(query);
      if (!result) {
        setSearchError(`No results for "${query}"`);
        return;
      }
      const next: [number, number] = [result.lat, result.lng];
      setMapCenter(next);
      setMapZoom(zoomForRadiusKm(result.radiusKm));
      setSearchCenter(next);
      setSearchRadiusKm(result.radiusKm);
      setPendingSearchCenter(null);
    } catch {
      setSearchError("Search failed — try again");
    } finally {
      setIsGeocoding(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount only — re-running on runLocationFlow's identity would re-trigger the whole permission flow every render
  useEffect(() => {
    runLocationFlow();
  }, []);

  const handleLocationSheetClose = (granted: boolean) => {
    setShowLocationPrompt(false);
    if (granted) {
      setShowLocationDeniedBanner(false);
      centerOnUser();
      return;
    }
    // requestPermission() ran (Allow → denied by the OS) or the user just
    // tapped "Not now" without it ever firing — check the real state
    // either way, so the persistent banner only shows for an actual
    // OS-level denial, not a soft in-app dismissal.
    refreshPermission().then((state) => {
      if (state === "denied") setShowLocationDeniedBanner(true);
      applyFallbackCenter();
    });
  };

  const handleAddParkTap = async () => {
    // No account required — this transparently starts an anonymous Supabase
    // session (or reuses a real one, if signed in) so anyone can contribute
    // a park. See ensureSupabaseSession() in supabaseClient.ts.
    const userId = await ensureSupabaseSession();
    if (!userId) {
      toast("Couldn't start a session", {
        description: "Check your connection and try again in a moment.",
        duration: 3500,
      });
      return;
    }
    setShowAddSheet(true);
  };

  const handleParkCreated = () => {
    setShowAddSheet(false);
    queryClient.invalidateQueries({ queryKey: ["parks", "nearby"] });
    toast("Thanks!", {
      description: "Your park was submitted and will appear once reviewed.",
      duration: 4000,
    });
  };

  return (
    <div
      className="min-h-dvh bg-background flex flex-col max-w-[430px] mx-auto relative"
      data-ocid="map.page"
    >
      <div
        className="absolute inset-0 pointer-events-none max-w-[430px] mx-auto"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% 0%, oklch(0.22 0.04 180 / 0.22) 0%, transparent 60%)",
        }}
      />

      <header className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4">
        <button
          type="button"
          className="w-9 h-9 rounded-xl bg-card/80 border border-border/60 flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-smooth"
          onClick={() => navigate({ to: "/home" })}
          data-ocid="map.back_button"
          aria-label="Go back to home"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <Logo size="sm" showIcon />
        <div className="w-9" />
      </header>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col flex-1 px-5 pb-5 min-h-0"
      >
        <div className="mb-3">
          <h1 className="font-display font-black text-xl text-foreground">
            Nearby Parks
          </h1>
          <p className="text-xs text-muted-foreground font-body">
            Outdoor calisthenics spots near you
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="mb-3">
          <div
            className="w-full h-11 rounded-xl flex items-center px-3 gap-2 transition-smooth focus-within:border-primary/60"
            style={{
              background: "oklch(0.17 0.012 260)",
              border: "1px solid oklch(0.28 0.01 260)",
            }}
          >
            <button
              type="submit"
              disabled={isGeocoding || !searchQuery.trim()}
              className="shrink-0 disabled:opacity-40 transition-smooth"
              aria-label="Search"
              data-ocid="map.search_submit_button"
            >
              {isGeocoding ? (
                <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              ) : (
                <Search className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search a city, town, or country…"
              className="flex-1 min-w-0 bg-transparent font-body text-sm text-white placeholder:text-white/30 outline-none"
              data-ocid="map.search_input"
            />
          </div>
          {searchError && (
            <p
              className="text-[11px] mt-1.5 px-1 font-body"
              style={{ color: "oklch(0.65 0.2 25)" }}
              data-ocid="map.search_error"
            >
              {searchError}
            </p>
          )}
        </form>

        <div
          className="relative flex-1 rounded-2xl overflow-hidden"
          style={{
            minHeight: 420,
            border: "1px solid oklch(0.26 0.01 260 / 0.6)",
            background: "oklch(0.13 0.01 260)",
          }}
          data-ocid="map.container"
        >
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="absolute inset-0"
            scrollWheelZoom
          >
            <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
            <FlyToCenter center={mapCenter} zoom={mapZoom} />
            <MapPanTracker
              searchCenter={searchCenter}
              searchRadiusKm={searchRadiusKm}
              onPanChange={setPendingSearchCenter}
            />
            <MarkerClusterGroup
              chunkedLoading
              maxClusterRadius={60}
              disableClusteringAtZoom={16}
              iconCreateFunction={clusterIcon}
            >
              {(parks ?? []).map((park) => (
                <Marker
                  key={park.id}
                  position={[park.lat, park.lng]}
                  icon={PARK_ICON}
                  eventHandlers={{ click: () => setSelectedParkId(park.id) }}
                />
              ))}
            </MarkerClusterGroup>

            {/* "You are here" — rendered as a sibling of MarkerClusterGroup,
                never a child of it, so it's never eligible for clustering.
                Omitted entirely until a real watched position exists (no
                permission yet, denied, or still awaiting the first fix) —
                same "don't fake it" fallback convention as the map's own
                default-center behavior. */}
            {watchedPosition && (
              <>
                {watchedPosition.accuracy && (
                  <Circle
                    center={[
                      watchedPosition.latitude,
                      watchedPosition.longitude,
                    ]}
                    radius={watchedPosition.accuracy}
                    pathOptions={{
                      color: "oklch(0.62 0.19 255)",
                      weight: 1,
                      opacity: 0.25,
                      fillColor: "oklch(0.62 0.19 255)",
                      fillOpacity: 0.08,
                    }}
                  />
                )}
                <Marker
                  position={[
                    watchedPosition.latitude,
                    watchedPosition.longitude,
                  ]}
                  icon={USER_LOCATION_ICON}
                  zIndexOffset={1000}
                  interactive={false}
                  keyboard={false}
                />
              </>
            )}
          </MapContainer>

          {!isSupabaseConfigured && (
            <div
              className="absolute inset-x-3 bottom-3 rounded-xl px-3 py-2.5 text-center text-xs font-body z-[500]"
              style={{
                background: "oklch(0.1 0.008 260 / 0.92)",
                border: "1px solid oklch(0.26 0.01 260 / 0.6)",
                color: "oklch(0.7 0.01 260)",
              }}
              data-ocid="map.unconfigured_notice"
            >
              Connect Supabase to load nearby parks — see .env.example.
            </div>
          )}
          {isSupabaseConfigured && isError && (
            <div
              className="absolute inset-x-3 bottom-3 rounded-xl px-3 py-2.5 text-center text-xs font-body z-[500]"
              style={{
                background: "oklch(0.1 0.008 260 / 0.92)",
                border: "1px solid oklch(0.26 0.01 260 / 0.6)",
                color: "oklch(0.7 0.01 260)",
              }}
              data-ocid="map.error_notice"
            >
              Couldn't load parks right now. Try again shortly.
            </div>
          )}
          {isSupabaseConfigured && isLoading && (
            <div className="absolute top-3 right-3 z-[500]">
              <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          )}

          {showLocationDeniedBanner && (
            <button
              type="button"
              onClick={() => openAppSettings()}
              className="absolute top-3 inset-x-3 rounded-xl px-3 py-2.5 text-center text-xs font-body font-medium transition-smooth hover:opacity-90 z-[500]"
              style={{
                background: "oklch(0.1 0.008 260 / 0.92)",
                border: "1px solid oklch(0.75 0.16 60 / 0.5)",
                color: "oklch(0.85 0.14 60)",
                boxShadow: "0 4px 16px oklch(0 0 0 / 0.4)",
              }}
              data-ocid="map.location_denied_banner"
            >
              Location is off. Search or pan to explore. Tap here to enable.
            </button>
          )}

          {pendingSearchCenter && (
            <button
              type="button"
              onClick={handleSearchThisArea}
              className={cn(
                "absolute left-1/2 -translate-x-1/2 rounded-full px-4 py-2 flex items-center gap-1.5 text-xs font-display font-bold transition-smooth hover:opacity-90 active:scale-[0.97] z-[500]",
                showLocationDeniedBanner ? "top-14" : "top-3",
              )}
              style={{
                background: "oklch(0.13 0.01 260 / 0.95)",
                color: "oklch(0.68 0.25 180)",
                border: "1px solid oklch(0.68 0.25 180 / 0.4)",
                boxShadow: "0 4px 16px oklch(0 0 0 / 0.4)",
              }}
              data-ocid="map.search_area_button"
            >
              <Search className="w-3.5 h-3.5" />
              Search this area
            </button>
          )}

          <button
            type="button"
            onClick={handleLocateButtonTap}
            className="absolute bottom-4 left-4 w-12 h-12 rounded-full flex items-center justify-center transition-smooth hover:opacity-90 active:scale-[0.96] z-[500]"
            style={{
              background: "oklch(0.18 0.012 260 / 0.92)",
              color: "oklch(0.68 0.25 180)",
              border: "1px solid oklch(0.28 0.01 260)",
            }}
            data-ocid="map.locate_button"
            aria-label="Center on my location"
          >
            <LocateFixed className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={handleAddParkTap}
            className="absolute bottom-4 right-4 w-14 h-14 rounded-full flex items-center justify-center transition-smooth hover:opacity-90 active:scale-[0.96] z-[500]"
            style={{
              background: "oklch(0.68 0.25 180)",
              color: "oklch(0.08 0.005 260)",
              boxShadow: "0 4px 20px oklch(0.68 0.25 180 / 0.4)",
            }}
            data-ocid="map.add_park_button"
            aria-label="Add a park"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {showLocationPrompt && (
          <LocationPermissionSheet onClose={handleLocationSheetClose} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedParkId && (
          <ParkDetailSheet
            parkId={selectedParkId}
            onClose={() => setSelectedParkId(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddSheet && (
          <AddParkSheet
            initialCenter={mapCenter}
            onClose={() => setShowAddSheet(false)}
            onCreated={handleParkCreated}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
