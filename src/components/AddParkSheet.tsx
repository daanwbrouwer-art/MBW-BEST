import { PARK_ICON, TILE_ATTRIBUTION, TILE_URL } from "@/lib/mapTiles";
import { PARK_EQUIPMENT_OPTIONS } from "@/lib/parkEquipment";
import { ensureSupabaseSession, supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { Camera } from "@capacitor/camera";
import type L from "leaflet";
import { Camera as CameraIcon, Images, X } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import { toast } from "sonner";

interface PendingPhoto {
  id: string;
  webPath: string;
  blob: Blob;
}

const MAX_PHOTOS = 6;

async function addPhotoFromWebPath(
  webPath: string | undefined,
): Promise<PendingPhoto | null> {
  if (!webPath) return null;
  const response = await fetch(webPath);
  const blob = await response.blob();
  return { id: crypto.randomUUID(), webPath, blob };
}

interface AddParkSheetProps {
  initialCenter: [number, number];
  onClose: () => void;
  onCreated: () => void;
}

/**
 * "Add a park" flow: drag-a-pin location, name, equipment checklist, and 1+
 * photos (camera or library, via @capacitor/camera — its web implementation
 * covers plain browser dev too, no platform branching needed). Submits a
 * `parks` row with approved = false plus one `park_photos` row per uploaded
 * image; a human reviews and flips `approved` before it's public.
 */
export function AddParkSheet({
  initialCenter,
  onClose,
  onCreated,
}: AddParkSheetProps) {
  const [position, setPosition] = useState<[number, number]>(initialCenter);
  const [name, setName] = useState("");
  const [equipment, setEquipment] = useState<string[]>([]);
  const [photos, setPhotos] = useState<PendingPhoto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleEquipment = (item: string) => {
    setEquipment((prev) =>
      prev.includes(item)
        ? prev.filter((existing) => existing !== item)
        : [...prev, item],
    );
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((photo) => photo.id !== id));
  };

  const handleTakePhoto = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    try {
      const result = await Camera.takePhoto({ quality: 80 });
      const photo = await addPhotoFromWebPath(result.webPath);
      if (photo) setPhotos((prev) => [...prev, photo]);
    } catch {
      // User cancelled or denied the camera prompt — nothing to do.
    }
  };

  const handleChooseFromLibrary = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    try {
      const result = await Camera.pickImages({
        quality: 80,
        limit: MAX_PHOTOS - photos.length,
      });
      const picked = await Promise.all(
        result.photos.map((photo) => addPhotoFromWebPath(photo.webPath)),
      );
      setPhotos((prev) => [
        ...prev,
        ...picked.filter((p): p is PendingPhoto => p !== null),
      ]);
    } catch {
      // User cancelled the picker.
    }
  };

  const handleMarkerDragEnd = (event: L.LeafletEvent) => {
    const marker = event.target as L.Marker;
    const { lat, lng } = marker.getLatLng();
    setPosition([lat, lng]);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast("Give it a name", {
        description: "Parks need a name before they can be submitted.",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      // No account required — reuses a real session if signed in, otherwise
      // transparently starts an anonymous one (MapPage already primes this
      // on tapping "Add a park", so this is normally instant).
      const userId = await ensureSupabaseSession();
      if (!userId) {
        toast("Couldn't submit park", {
          description: "Check your connection and try again in a moment.",
        });
        return;
      }

      const { data: park, error: parkError } = await supabase
        .from("parks")
        .insert({
          name: name.trim(),
          lat: position[0],
          lng: position[1],
          equipment,
          submitted_by: userId,
          approved: false,
        })
        .select("id")
        .single();
      if (parkError || !park) {
        throw new Error(parkError?.message ?? "Could not create the park");
      }

      // Best-effort per photo — one failed upload shouldn't sink the whole
      // submission, the park itself is already saved either way.
      for (const photo of photos) {
        const path = `${park.id}/${photo.id}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("park-photos")
          .upload(path, photo.blob, {
            contentType: photo.blob.type || "image/jpeg",
          });
        if (uploadError) continue;
        const { data: publicUrl } = supabase.storage
          .from("park-photos")
          .getPublicUrl(path);
        await supabase.from("park_photos").insert({
          park_id: park.id,
          photo_url: publicUrl.publicUrl,
          uploaded_by: userId,
        });
      }

      onCreated();
    } catch (error) {
      toast("Couldn't submit park", {
        description:
          error instanceof Error ? error.message : "Try again in a moment.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-end justify-center"
      style={{ background: "oklch(0.05 0.005 260 / 0.92)" }}
      data-ocid="add-park.sheet"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
        className="w-full max-w-[430px] rounded-t-3xl overflow-hidden flex flex-col"
        style={{
          background: "oklch(0.13 0.01 260)",
          border: "1px solid oklch(0.68 0.25 180 / 0.3)",
          borderBottom: "none",
          boxShadow: "0 -20px 60px oklch(0 0 0 / 0.6)",
          maxHeight: "88vh",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="w-10 h-1 rounded-full mx-auto mt-3 mb-2 shrink-0"
          style={{ background: "oklch(0.4 0.01 260)" }}
        />

        <div className="px-5 pb-6 overflow-y-auto">
          <h2 className="font-display font-black text-lg text-white mt-2 mb-1">
            Add a park
          </h2>
          <p className="text-xs text-muted-foreground font-body mb-4 leading-relaxed">
            Outdoor spots only — no gyms. Drop a pin at a free public spot with
            calisthenics equipment.
          </p>

          <div
            className="rounded-2xl overflow-hidden mb-1"
            style={{
              height: 200,
              border: "1px solid oklch(0.26 0.01 260 / 0.6)",
            }}
          >
            <MapContainer center={position} zoom={15} className="w-full h-full">
              <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
              <Marker
                position={position}
                icon={PARK_ICON}
                draggable
                eventHandlers={{ dragend: handleMarkerDragEnd }}
              />
            </MapContainer>
          </div>
          <p className="text-[11px] text-muted-foreground font-body mb-4">
            Drag the pin to the exact spot
          </p>

          <div className="mb-4">
            <label
              htmlFor="add-park-name"
              className="font-display text-xs font-bold uppercase tracking-widest text-white/50 mb-2 block"
            >
              Name
            </label>
            <div
              className="w-full h-14 rounded-2xl flex items-center px-4 transition-smooth focus-within:border-primary/60"
              style={{
                background: "oklch(0.17 0.012 260)",
                border: "1px solid oklch(0.28 0.01 260)",
              }}
            >
              <input
                id="add-park-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Riverside Calisthenics Park"
                className="flex-1 bg-transparent font-body text-sm text-white placeholder:text-white/25 outline-none"
                data-ocid="add-park.name_input"
              />
            </div>
          </div>

          <div className="mb-4">
            <p className="font-display text-xs font-bold uppercase tracking-widest text-white/50 mb-2">
              Equipment
            </p>
            <div className="flex flex-wrap gap-2">
              {PARK_EQUIPMENT_OPTIONS.map((item) => {
                const selected = equipment.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleEquipment(item)}
                    className="px-3 py-1.5 rounded-full text-xs font-display font-bold transition-smooth"
                    style={
                      selected
                        ? {
                            background: "oklch(0.68 0.25 180 / 0.18)",
                            color: "oklch(0.68 0.25 180)",
                            border: "1px solid oklch(0.68 0.25 180 / 0.5)",
                          }
                        : {
                            background: "oklch(0.17 0.012 260)",
                            color: "oklch(0.62 0.008 260)",
                            border: "1px solid oklch(0.28 0.01 260)",
                          }
                    }
                    data-ocid={`add-park.equipment.${item.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-6">
            <p className="font-display text-xs font-bold uppercase tracking-widest text-white/50 mb-2">
              Photos
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0"
                >
                  <img
                    src={photo.webPath}
                    alt="Selected park"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: "oklch(0.08 0.005 260 / 0.8)" }}
                    aria-label="Remove photo"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTakePhoto}
                disabled={photos.length >= MAX_PHOTOS}
                className={cn(
                  "flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-display font-bold transition-smooth",
                  photos.length >= MAX_PHOTOS && "opacity-40",
                )}
                style={{
                  background: "oklch(0.17 0.012 260)",
                  border: "1px dashed oklch(0.32 0.01 260)",
                  color: "oklch(0.75 0.01 260)",
                }}
                data-ocid="add-park.take_photo_button"
              >
                <CameraIcon className="w-4 h-4" /> Camera
              </button>
              <button
                type="button"
                onClick={handleChooseFromLibrary}
                disabled={photos.length >= MAX_PHOTOS}
                className={cn(
                  "flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-xs font-display font-bold transition-smooth",
                  photos.length >= MAX_PHOTOS && "opacity-40",
                )}
                style={{
                  background: "oklch(0.17 0.012 260)",
                  border: "1px dashed oklch(0.32 0.01 260)",
                  color: "oklch(0.75 0.01 260)",
                }}
                data-ocid="add-park.choose_library_button"
              >
                <Images className="w-4 h-4" /> Library
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !name.trim()}
              className="w-full h-14 rounded-full flex items-center justify-center font-display font-bold text-sm tracking-wide bg-primary text-background transition-smooth hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              data-ocid="add-park.submit_button"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Submitting...
                </span>
              ) : (
                "Submit for review"
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-smooth"
              data-ocid="add-park.cancel_button"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
