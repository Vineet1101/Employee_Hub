import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  candidateIds: z.array(z.string().uuid()).min(1).max(500),
  message: z.string().trim().min(1).max(4000),
});

interface SendResult {
  candidate_id: string;
  name: string;
  phone: string | null;
  status: "sent" | "failed" | "skipped";
  error?: string;
}

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (!cleaned) return null;
  return cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
}

function renderTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => vars[k] ?? "");
}

async function sendOne(
  settings: Record<string, unknown>,
  to: string,
  message: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const provider = String(settings.provider ?? "meta_cloud");
  try {
    if (provider === "meta_cloud") {
      const token = String(settings.access_token ?? "");
      const phoneId = String(settings.phone_number_id ?? "");
      if (!token || !phoneId) return { ok: false, error: "Missing Meta Cloud credentials" };
      const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: message, preview_url: false },
        }),
      });
      if (!res.ok) return { ok: false, error: `Meta API ${res.status}: ${(await res.text()).slice(0, 250)}` };
      return { ok: true };
    }
    if (provider === "twilio") {
      const sid = String(settings.account_sid ?? "");
      const authToken = String(settings.auth_token ?? "");
      const from = normalizePhone(String(settings.from_number ?? ""));
      if (!sid || !authToken || !from) return { ok: false, error: "Missing Twilio credentials" };
      const body = new URLSearchParams({
        From: `whatsapp:+${from}`,
        To: `whatsapp:+${to}`,
        Body: message,
      });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${sid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
      if (!res.ok) return { ok: false, error: `Twilio ${res.status}: ${(await res.text()).slice(0, 250)}` };
      return { ok: true };
    }
    if (provider === "custom") {
      const url = String(settings.webhook_url ?? "");
      if (!url) return { ok: false, error: "Missing webhook URL" };
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(settings.webhook_headers as Record<string, string> | null ?? {}),
      };
      const tpl = String(settings.webhook_body_template ?? "") || '{"to":"{{to}}","message":"{{message}}"}';
      const rendered = renderTemplate(tpl, { to, message: JSON.stringify(message).slice(1, -1) });
      const res = await fetch(url, { method: "POST", headers, body: rendered });
      if (!res.ok) return { ok: false, error: `Webhook ${res.status}: ${(await res.text()).slice(0, 250)}` };
      return { ok: true };
    }
    return { ok: false, error: `Unknown provider: ${provider}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export const sendBulkWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { candidateIds: string[]; message: string }) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: settings, error: sErr } = await supabase
      .from("whatsapp_settings")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!settings) throw new Error("WhatsApp not configured. Open Settings and add your API credentials first.");

    const { data: candidates, error: cErr } = await supabase
      .from("candidates")
      .select("id, full_name, phone")
      .in("id", data.candidateIds);
    if (cErr) throw new Error(cErr.message);

    const results: SendResult[] = [];
    for (const c of candidates ?? []) {
      const phone = normalizePhone(c.phone);
      if (!phone) {
        results.push({ candidate_id: c.id, name: c.full_name, phone: null, status: "skipped", error: "No phone number" });
        continue;
      }
      const r = await sendOne(settings as Record<string, unknown>, phone, data.message);
      results.push(
        r.ok
          ? { candidate_id: c.id, name: c.full_name, phone, status: "sent" }
          : { candidate_id: c.id, name: c.full_name, phone, status: "failed", error: r.error },
      );
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const failed = results.filter((r) => r.status === "failed").length;
    const skipped = results.filter((r) => r.status === "skipped").length;
    return { sent, failed, skipped, results };
  });
