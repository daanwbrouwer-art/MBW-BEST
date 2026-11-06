import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  UNNAMED_PARK_LABEL,
  isUnnamedPark,
  parkDisplayName,
  parkEquipmentLabels,
} from "@/lib/parkLabels";
import { reverseGeocodePark } from "@/lib/parkPlace";
import { supabase } from "@/lib/supabaseClient";
import { Browser } from "@capacitor/browser";
import { useQuery } from "@tanstack/react-query";
import { ImageOff, Navigation, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";

interface ParkPhoto {
  id: string;
  photo_url: string;
}

interface ParkDetail {
  id: string;
  name: string;
  equipment: string[];
  lat: number;
  lng: number;
}

async function fetchPark(parkId: string): Promise<ParkDetail | null> {
  const { data, error } = await supabase
    .from("parks")
    .select("id, name, equipment, lat, lng")
    .eq("id", parkId)
    .single();
  if (error || !data) return null;
  return data;
}

/** Opens Google Maps turn-by-turn directions to this park via Capacitor's Browser plugin — hands off to the native Maps app when installed, falls back to the browser otherwise. Destination only; the "from" side is whatever Google Maps resolves as the device's current location once it opens. */
async function openDirections(park: ParkDetail): Promise<void> {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${park.lat},${park.lng}`;
  await Browser.open({ url });
}

async function fetchParkPhotos(parkId: string): Promise<ParkPhoto[]> {
  const { data, error } = await supabase
    .from("park_photos")
    .select("id, photo_url")
    .eq("park_id", parkId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return data ?? [];
}

interface ParkDetailSheetProps {
  parkId: string;
  onClose: () => void;
}

/** Tap-a-pin bottom sheet: park name, equipment tags, swipeable photo gallery from park_photos. */
export function ParkDetailSheet({ parkId, onClose }: ParkDetailSheetProps) {
  const { data: park } = useQuery({
    queryKey: ["park", parkId],
    queryFn: () => fetchPark(parkId),
  });
  const { data: photos } = useQuery({
    queryKey: ["park-photos", parkId],
    queryFn: () => fetchParkPhotos(parkId),
  });
  const equipmentLabels = parkEquipmentLabels(park?.equipment);
  // Most imported parks have no name: say where they are instead.
  const unnamed = !!park && isUnnamedPark(park.name);
  const { data: place } = useQuery({
    queryKey: ["park-place", park?.lat, park?.lng],
    queryFn: () => reverseGeocodePark(park!.lat, park!.lng),
    enabled: unnamed,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
  const title = park ? (unnamed && place) || parkDisplayName(park.name) : "Loading…";

  // Escape closes; focus starts on the Close button and returns to the pin.
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const opener =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end justify-center"
      style={{ background: "oklch(0.05 0.005 var(--neutral-hue) / 0.92)" }}
      data-ocid="park-detail.sheet"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
        className="w-full max-w-[430px] rounded-t-3xl overflow-hidden"
        style={{
          background: "oklch(var(--background))",
          border: "1px solid oklch(var(--pulse) / 0.3)",
          borderBottom: "none",
          boxShadow: "0 -20px 60px oklch(0 0 0 / 0.6)",
        }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="park-detail-title"
      >
        <div className="px-5 pt-3 pb-8">
          <div
            className="w-10 h-1 rounded-full mx-auto mb-4"
            style={{ background: "oklch(0.4 0.01 var(--neutral-hue))" }}
          />

          <div className="relative">
            {photos && photos.length > 0 ? (
              <Carousel className="w-full" data-ocid="park-detail.gallery">
                <CarouselContent className="-ml-0">
                  {photos.map((photo) => (
                    <CarouselItem key={photo.id} className="pl-0">
                      <div
                        className="w-full aspect-[4/3] rounded-2xl overflow-hidden"
                        style={{
                          background: "oklch(0.16 0.01 var(--neutral-hue))",
                        }}
                      >
                        <img
                          src={photo.photo_url}
                          alt={park ? title : "Park"}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            ) : (
              <div
                className="w-full aspect-[4/3] rounded-2xl flex flex-col items-center justify-center gap-2"
                style={{
                  background: "oklch(0.16 0.01 var(--neutral-hue))",
                  border: "1px dashed oklch(0.32 0.01 var(--neutral-hue))",
                }}
                data-ocid="park-detail.no_photos"
              >
                <ImageOff className="w-8 h-8 text-muted-foreground" />
                <p className="text-xs text-muted-foreground font-body">
                  No photos yet
                </p>
              </div>
            )}
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: "oklch(0.08 0.005 var(--neutral-hue) / 0.7)",
              }}
              data-ocid="park-detail.close_button"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="pt-4">
            {unnamed && place && (
              <p
                className="text-xs font-display font-bold tracking-[0.18em] uppercase mb-0.5"
                style={{ color: "oklch(var(--pulse))" }}
              >
                {UNNAMED_PARK_LABEL}
              </p>
            )}
            <h2
              id="park-detail-title"
              className="font-display font-black text-lg text-white mb-2"
            >
              {title}
            </h2>
            {park && equipmentLabels.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {equipmentLabels.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-display font-bold px-3 py-1 rounded-full"
                    style={{
                      background: "oklch(var(--pulse) / 0.12)",
                      color: "oklch(var(--pulse))",
                      border: "1px solid oklch(var(--pulse) / 0.25)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground font-body">
                No equipment listed yet.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => park && openDirections(park)}
            disabled={!park}
            className="w-full h-12 rounded-xl flex items-center justify-center gap-2 mt-4 text-sm font-display font-bold transition-smooth hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            style={{
              background: "oklch(var(--pulse))",
              color: "oklch(0.08 0.005 var(--neutral-hue))",
            }}
            data-ocid="park-detail.navigate_button"
            aria-label="Get directions to this park"
          >
            <Navigation className="w-4 h-4" />
            Navigate
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
