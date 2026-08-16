import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { supabase } from "@/lib/supabaseClient";
import { Browser } from "@capacitor/browser";
import { useQuery } from "@tanstack/react-query";
import { ImageOff, Navigation, X } from "lucide-react";
import { motion } from "motion/react";

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-end justify-center"
      style={{ background: "oklch(0.05 0.005 260 / 0.92)" }}
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
          background: "oklch(0.13 0.01 260)",
          border: "1px solid oklch(0.68 0.25 180 / 0.3)",
          borderBottom: "none",
          boxShadow: "0 -20px 60px oklch(0 0 0 / 0.6)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-5 pt-3 pb-8">
          <div
            className="w-10 h-1 rounded-full mx-auto mb-4"
            style={{ background: "oklch(0.4 0.01 260)" }}
          />

          <div className="relative">
            {photos && photos.length > 0 ? (
              <Carousel className="w-full" data-ocid="park-detail.gallery">
                <CarouselContent className="-ml-0">
                  {photos.map((photo) => (
                    <CarouselItem key={photo.id} className="pl-0">
                      <div
                        className="w-full aspect-[4/3] rounded-2xl overflow-hidden"
                        style={{ background: "oklch(0.16 0.01 260)" }}
                      >
                        <img
                          src={photo.photo_url}
                          alt={park?.name ?? "Park"}
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
                  background: "oklch(0.16 0.01 260)",
                  border: "1px dashed oklch(0.32 0.01 260)",
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
              type="button"
              onClick={onClose}
              className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "oklch(0.08 0.005 260 / 0.7)" }}
              data-ocid="park-detail.close_button"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="pt-4">
            <h2 className="font-display font-black text-lg text-white mb-2">
              {park?.name ?? "Loading…"}
            </h2>
            {park && park.equipment.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {park.equipment.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-display font-bold px-3 py-1 rounded-full"
                    style={{
                      background: "oklch(0.68 0.25 180 / 0.12)",
                      color: "oklch(0.68 0.25 180)",
                      border: "1px solid oklch(0.68 0.25 180 / 0.25)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground font-body">
                No equipment tags yet.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => park && openDirections(park)}
            disabled={!park}
            className="w-full h-12 rounded-xl flex items-center justify-center gap-2 mt-4 text-sm font-display font-bold transition-smooth hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            style={{
              background: "oklch(0.68 0.25 180)",
              color: "oklch(0.08 0.005 260)",
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
