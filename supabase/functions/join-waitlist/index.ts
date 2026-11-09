// Deployed to the live project (wiowzwkowbilpjgbemsq) via the Supabase MCP
// tools on 2026-08-07, verify_jwt: false — this is a public endpoint called
// by anonymous visitors on the Shopify marketing site (my-bodyweight.com),
// not by signed-in app users, so it can't require a Supabase JWT. It
// implements its own validation (email format) instead of relying on auth.
//
// Requires the RESEND_API_KEY secret set on the project:
//   supabase secrets set RESEND_API_KEY=re_XXXX --project-ref wiowzwkowbilpjgbemsq
// (no MCP tool exposes secret-setting — this has to be done via the CLI or
// dashboard, not from here).
//
// Abuse limits (2026-11-02): per-IP (hashed, never stored raw) and global
// hourly caps via public.waitlist_attempts, a honeypot field ("website" —
// keep it hidden and empty in the form), and optional Cloudflare Turnstile:
// set TURNSTILE_SECRET_KEY and send the widget token as "turnstileToken" to
// make it mandatory. Without the secret the form keeps working as before.
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TURNSTILE_SECRET_KEY = Deno.env.get("TURNSTILE_SECRET_KEY");
const MAX_PER_IP_PER_HOUR = 3;
const MAX_GLOBAL_PER_HOUR = 40;

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://my-bodyweight.com",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function isValidEmail(email: string): boolean {
  // Also rejects HTML-significant characters, since the address is echoed into the email body.
  return /^[^\s@<>"'&]+@[^\s@<>"'&]+\.[^\s@<>"'&]+$/.test(email) && email.length <= 254;
}

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`${SUPABASE_URL}|${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function passesTurnstile(token: unknown, ip: string): Promise<boolean> {
  if (!TURNSTILE_SECRET_KEY) return true;
  if (typeof token !== "string" || !token) return false;
  const form = new FormData();
  form.append("secret", TURNSTILE_SECRET_KEY);
  form.append("response", token);
  form.append("remoteip", ip);
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const outcome = await res.json().catch(() => ({ success: false }));
  return outcome.success === true;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  let email: string;
  let honeypot: string;
  let turnstileToken: unknown;
  try {
    const body = await req.json();
    email = String(body.email || "").trim().toLowerCase();
    honeypot = String(body.website || "");
    turnstileToken = body.turnstileToken;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (!isValidEmail(email)) {
    return new Response(JSON.stringify({ error: "Please enter a valid email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Bots fill every field; report success so they don't adapt.
  if (honeypot) return json({ ok: true }, 200);

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!(await passesTurnstile(turnstileToken, ip))) {
    return json({ error: "Verification failed, please try again" }, 403);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const ipHash = await hashIp(ip);
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const [{ count: ipCount }, { count: globalCount }] = await Promise.all([
    supabase.from("waitlist_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", hourAgo),
    supabase.from("waitlist_attempts").select("id", { count: "exact", head: true }).gte("created_at", hourAgo),
  ]);
  if ((ipCount ?? 0) >= MAX_PER_IP_PER_HOUR || (globalCount ?? 0) >= MAX_GLOBAL_PER_HOUR) {
    return json({ error: "Too many sign-ups right now, please try again later" }, 429);
  }
  await supabase.from("waitlist_attempts").insert({ ip_hash: ipHash });

  // Insert (unique constraint handles duplicates). No cap: since 2026-11-09 this is a
  // plain "notify me at launch" list; the 200-spot Founding Member offer has ended.
  const { data: inserted, error: insertError } = await supabase
    .from("waitlist_emails")
    .insert({ email })
    .select("position")
    .single();

  if (insertError) {
    // Duplicate = already signed up; treat as success (idempotent) but skip email
    if (insertError.code === "23505") {
      return new Response(JSON.stringify({ ok: true, alreadySignedUp: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    console.error("Insert error:", insertError);
    return new Response(JSON.stringify({ error: "Server error, try again" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Fire Email 1 via Resend
  const position = inserted.position;
  const emailHtml = `
<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#0b0d08;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#eef2e6;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
    <div style="text-align:center;font-weight:700;font-size:20px;margin-bottom:32px;color:#eef2e6;">My<span style="color:#cdf53c;">Body</span>Weight</div>
    <div style="background:#151910;border:1px solid rgba(205,245,60,0.25);border-radius:20px;padding:40px 32px;">
      <h1 style="margin:0 0 20px;font-size:30px;line-height:1.15;color:#eef2e6;">You're on the list.</h1>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#c9cebf;">The day MyBodyWeight goes live on Google Play, we'll send one email to ${email} with the download link.</p>
      <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.25em;font-weight:700;color:#cdf53c;">LAUNCH OFFER</p>
      <p style="margin:0 0 8px;font-size:16px;line-height:1.6;color:#eef2e6;"><strong>Annual:</strong> 7 days free.</p>
      <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#eef2e6;"><strong>Monthly:</strong> 20% off your first 3 months.</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#a4aa9a;">For new subscribers through Google Play. Prices are shown in the app in your local currency. Until launch: shuffle a real deck and start drawing.</p>
    </div>
    <div style="text-align:center;margin-top:32px;font-size:12px;color:#7d8274;">Vasil &amp; Daan · my-bodyweight.com</div>
  </div>
</body></html>`;

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MyBodyWeight <noreply@my-bodyweight.com>",
        to: [email],
        subject: "You're on the list: MyBodyWeight is coming to Google Play",
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      console.error("Resend send failed:", errText);
      // Do NOT return error to user — they're on the list, just log
    }
  } catch (e) {
    console.error("Resend fetch error:", e);
  }

  return new Response(JSON.stringify({ ok: true, position }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
