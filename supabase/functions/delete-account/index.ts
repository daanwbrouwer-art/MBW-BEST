// Permanently deletes the calling user's account. Required by Google Play
// (and Apple) for any app that lets users create an account: deletion must
// be available both in-app (ProfilePage → Delete account) and on the web
// (public/delete-account/index.html) — both call this one function.
//
// Deployed with verify_jwt: true — the caller must send their own Supabase
// access token, and the user deleted is always the one that token belongs
// to. There is no way to name a different user in the request.
//
// Deleting the auth.users row cascades to every table keyed on it (profiles,
// workout_history, chat threads/messages, blocks, reports, Train Together
// sessions/participants/requests — see the `on delete cascade` FKs in
// supabase/migrations). The only things that do NOT cascade, and are
// cleaned up explicitly here first:
//   - park_photos rows (FK is `on delete set null`) and their files in the
//     park-photos storage bucket
//   - the Founding Member waitlist row, which is keyed by email, not user id
// Parks the user submitted are kept (FK `set null`): they are shared
// community map listings, and after this they carry no link to the person.
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Called from the Capacitor app (https://localhost), local dev servers, and
// the GitHub Pages deletion page. Safe to allow any origin: every request
// must carry the user's own JWT, which a third-party site can't obtain.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const BUCKET_PATH_MARKER = "/storage/v1/object/public/park-photos/";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Not signed in" }, 401);

  // Resolve the caller from their own token — never from the request body.
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Not signed in" }, 401);
  const user = userData.user;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Park photos: storage files first, then the rows.
  const { data: photos, error: photosError } = await admin
    .from("park_photos")
    .select("id, photo_url")
    .eq("uploaded_by", user.id);
  if (photosError) {
    console.error("park_photos select failed:", photosError);
    return json({ error: "Server error, try again" }, 500);
  }
  if (photos && photos.length > 0) {
    const paths = photos
      .map((p) => {
        const i = p.photo_url.indexOf(BUCKET_PATH_MARKER);
        return i === -1 ? null : decodeURIComponent(p.photo_url.slice(i + BUCKET_PATH_MARKER.length));
      })
      .filter((p): p is string => p !== null);
    if (paths.length > 0) {
      const { error: removeError } = await admin.storage.from("park-photos").remove(paths);
      if (removeError) {
        console.error("storage remove failed:", removeError);
        return json({ error: "Server error, try again" }, 500);
      }
    }
    const { error: rowsError } = await admin.from("park_photos").delete().eq("uploaded_by", user.id);
    if (rowsError) {
      console.error("park_photos delete failed:", rowsError);
      return json({ error: "Server error, try again" }, 500);
    }
  }

  // 2. Waitlist entry (keyed by email).
  if (user.email) {
    const { error: waitlistError } = await admin
      .from("waitlist_emails")
      .delete()
      .eq("email", user.email.toLowerCase());
    if (waitlistError) console.error("waitlist delete failed (continuing):", waitlistError);
  }

  // 3. The account itself — cascades to everything else.
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("auth deleteUser failed:", deleteError);
    return json({ error: "Server error, try again" }, 500);
  }

  return json({ ok: true }, 200);
});
