import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

type Provider = "meta_cloud" | "twilio" | "custom";
interface Settings {
  provider: Provider;
  access_token: string | null;
  phone_number_id: string | null;
  from_number: string | null;
  account_sid: string | null;
  auth_token: string | null;
  webhook_url: string | null;
  webhook_headers: Record<string, string>;
  webhook_body_template: string | null;
}

const empty: Settings = {
  provider: "meta_cloud",
  access_token: "", phone_number_id: "", from_number: "",
  account_sid: "", auth_token: "",
  webhook_url: "", webhook_headers: {}, webhook_body_template: "",
};

function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["whatsapp_settings"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const owner_id = u.user?.id;
      if (!owner_id) return null;
      const { data, error } = await supabase.from("whatsapp_settings").select("*").eq("owner_id", owner_id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<Settings>(empty);
  const [headersText, setHeadersText] = useState("{}");

  useEffect(() => {
    if (data) {
      setForm({
        provider: (data.provider as Provider) ?? "meta_cloud",
        access_token: data.access_token ?? "",
        phone_number_id: data.phone_number_id ?? "",
        from_number: data.from_number ?? "",
        account_sid: data.account_sid ?? "",
        auth_token: data.auth_token ?? "",
        webhook_url: data.webhook_url ?? "",
        webhook_headers: (data.webhook_headers as Record<string, string>) ?? {},
        webhook_body_template: data.webhook_body_template ?? "",
      });
      setHeadersText(JSON.stringify(data.webhook_headers ?? {}, null, 2));
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const owner_id = u.user?.id;
      if (!owner_id) throw new Error("Not signed in");
      let webhook_headers: Record<string, string> = {};
      if (form.provider === "custom") {
        try { webhook_headers = headersText.trim() ? JSON.parse(headersText) : {}; }
        catch { throw new Error("Webhook headers must be valid JSON"); }
      }
      const payload = { ...form, webhook_headers, owner_id };
      const { error } = await supabase.from("whatsapp_settings").upsert(payload, { onConflict: "owner_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["whatsapp_settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function set<K extends keyof Settings>(k: K, v: Settings[K]) { setForm((f) => ({ ...f, [k]: v })); }

  return (
    <div className="px-6 py-8 md:px-10">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary"><MessageSquare className="h-5 w-5" /></div>
        <div>
          <h1 className="font-display text-3xl font-semibold">WhatsApp settings</h1>
          <p className="text-sm text-muted-foreground">Connect your own WhatsApp API. Credentials are private to your account.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="mt-8 max-w-3xl rounded-2xl border border-border bg-card p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <Field label="Provider">
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.provider}
              onChange={(e) => set("provider", e.target.value as Provider)}
            >
              <option value="meta_cloud">Meta WhatsApp Cloud API (official)</option>
              <option value="twilio">Twilio WhatsApp</option>
              <option value="custom">Custom webhook (Gupshup, Interakt, AiSensy, n8n…)</option>
            </select>
          </Field>

          {form.provider === "meta_cloud" && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Phone number ID">
                <Input value={form.phone_number_id ?? ""} onChange={(e) => set("phone_number_id", e.target.value)} placeholder="From Meta Business → WhatsApp → API setup" />
              </Field>
              <Field label="Permanent access token">
                <Input type="password" value={form.access_token ?? ""} onChange={(e) => set("access_token", e.target.value)} />
              </Field>
              <p className="sm:col-span-2 text-xs text-muted-foreground">
                Note: Meta requires pre-approved message templates to start new conversations. Free-form text only works within a 24-hour customer service window.
              </p>
            </div>
          )}

          {form.provider === "twilio" && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Account SID"><Input value={form.account_sid ?? ""} onChange={(e) => set("account_sid", e.target.value)} /></Field>
              <Field label="Auth token"><Input type="password" value={form.auth_token ?? ""} onChange={(e) => set("auth_token", e.target.value)} /></Field>
              <Field label="WhatsApp sender number"><Input value={form.from_number ?? ""} onChange={(e) => set("from_number", e.target.value)} placeholder="+14155238886" /></Field>
            </div>
          )}

          {form.provider === "custom" && (
            <div className="mt-4 grid gap-4">
              <Field label="Webhook URL">
                <Input value={form.webhook_url ?? ""} onChange={(e) => set("webhook_url", e.target.value)} placeholder="https://api.your-provider.com/send" />
              </Field>
              <Field label="Headers (JSON)">
                <Textarea rows={4} value={headersText} onChange={(e) => setHeadersText(e.target.value)} placeholder='{"Authorization":"Bearer xxx"}' className="font-mono text-xs" />
              </Field>
              <Field label="Body template (JSON)">
                <Textarea
                  rows={5}
                  value={form.webhook_body_template ?? ""}
                  onChange={(e) => set("webhook_body_template", e.target.value)}
                  placeholder='{"to":"{{to}}","message":"{{message}}"}'
                  className="font-mono text-xs"
                />
              </Field>
              <p className="text-xs text-muted-foreground">Use <code>{"{{to}}"}</code> for the recipient phone (digits only with country code) and <code>{"{{message}}"}</code> for the text.</p>
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
