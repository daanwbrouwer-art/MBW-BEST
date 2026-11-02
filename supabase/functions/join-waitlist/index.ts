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

const FOUNDING_MEMBER_CAP = 200;
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

  // Check cap
  const { count, error: countError } = await supabase
    .from("waitlist_emails")
    .select("*", { count: "exact", head: true });

  if (countError) {
    console.error("Count error:", countError);
    return new Response(JSON.stringify({ error: "Server error, try again" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if ((count ?? 0) >= FOUNDING_MEMBER_CAP) {
    return new Response(JSON.stringify({ error: "full", message: "Founding Member spots are full. We will open a standard waitlist soon." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Insert (unique constraint handles duplicates)
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
<html><body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#f5f5f5;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px;">
    <div style="text-align:center;font-weight:700;letter-spacing:0.15em;color:#1AD6A0;font-size:14px;margin-bottom:32px;">MYBODYWEIGHT</div>
    <div style="background:#171717;border-radius:16px;padding:40px 32px;">
      <h1 style="margin:0 0 24px;font-size:28px;line-height:1.2;color:#fff;">Congrats, you're a Founding Member.</h1>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#d4d4d4;">Your Founding Member price of <strong style="color:#1AD6A0;">€4.79/month</strong> is now reserved to this email address (${email}).</p>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#d4d4d4;">When the MyBodyWeight app launches, sign up in-app using this <strong>same email</strong>. Your price will be automatically detected and locked in for life, for as long as you stay subscribed. No codes to remember, nothing to paste.</p>
      <p style="margin:0 0 32px;font-size:16px;line-height:1.6;color:#d4d4d4;">Just sign up with <strong style="color:#1AD6A0;">${email}</strong> and you're done.</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#a3a3a3;">Watch for another email from us the moment the app is live. Until then, shuffle a real deck and start drawing.</p>
    </div>
    <div style="text-align:center;margin-top:32px;font-size:12px;color:#737373;">— Vasil & Daan · my-bodyweight.com</div>
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
        subject: "Congrats, you're a Founding Member",
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
