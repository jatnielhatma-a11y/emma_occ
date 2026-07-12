import { Mail, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { GoogleConnectionPanel } from "@/components/google/GoogleConnectionPanel";
import { googleServicesFromScope, hasGoogleOAuthConfig } from "@/lib/google/oauth";
import { hasGoogleTokenEncryptionKey } from "@/lib/google/token-crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function EmailPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: connection } = await supabase
    .from("google_calendar_connections")
    .select("connected_at,last_sync_at,scope,granted_scopes,connected_services,disconnected_at,last_error")
    .eq("user_id", user?.id)
    .eq("calendar_id", process.env.GOOGLE_CALENDAR_ID || "primary")
    .maybeSingle();

  const grantedScopes = connection?.granted_scopes || connection?.scope || "";
  const services = connection?.connected_services ?? googleServicesFromScope(grantedScopes);

  return (
    <div className="space-y-5">
      <GoogleConnectionPanel
        configured={hasGoogleOAuthConfig() && hasGoogleTokenEncryptionKey()}
        connected={Boolean(connection && !connection.disconnected_at)}
        services={services}
        connectedAt={connection?.connected_at}
        lastSyncAt={connection?.last_sync_at}
        lastError={connection?.last_error}
      />

      <section className="rounded-lg border border-occ-line bg-occ-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Gmail</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Email triage foundation</h1>
            <p className="mt-3 max-w-2xl text-sm text-zinc-400">
              Phase 2 connects Gmail read-only OAuth and stores connection metadata. Message triage and AI summaries are intentionally deferred until the AI phase.
            </p>
          </div>
          <StatusBadge tone={services.gmail ? "green" : "amber"}>{services.gmail ? "Read-only connected" : "Connect Gmail"}</StatusBadge>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-md border border-occ-line bg-occ-ink p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Mail size={18} className="text-occ-cyan" />
              Gmail scope
            </div>
            <p className="mt-2 text-sm text-zinc-500">
              NOVA requests Gmail read-only access so later phases can identify actionable messages without modifying your mailbox.
            </p>
          </div>
          <div className="rounded-md border border-occ-line bg-occ-ink p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <ShieldCheck size={18} className="text-occ-cyan" />
              Privacy guard
            </div>
            <p className="mt-2 text-sm text-zinc-500">
              Email content is not displayed or sent to AI in Phase 2. Settings control whether later triage may use email context.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
