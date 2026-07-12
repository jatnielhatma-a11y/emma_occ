import { Blocks, CheckCircle2, Clock3, Layers3, LockKeyhole, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { buildNovaFoundationSummary, getFoundationReadinessLabel } from "@/lib/nova/foundation";

function statusTone(status: "active" | "foundation" | "planned") {
  if (status === "active") return "green";
  if (status === "foundation") return "cyan";
  return "neutral";
}

export default function PlatformPage() {
  const summary = buildNovaFoundationSummary();
  const readiness = getFoundationReadinessLabel();

  return (
    <div className="space-y-5">
      <section className="nova-surface rounded-lg border border-occ-line p-5 shadow-nova">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone={readiness === "Foundation ready" ? "green" : "amber"}>{readiness}</StatusBadge>
          <StatusBadge tone="cyan">Release 1-7 active</StatusBadge>
          <StatusBadge tone="neutral">Emma OCC preserved</StatusBadge>
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.7fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">NOVA operating system</p>
            <h1 className="mt-2 text-3xl font-semibold text-occ-platinum">Foundation, Personal Core, Life Domains, Intelligence, NOVA Intelligence, Launch Readiness, and Production Launch</h1>
            <p className="mt-3 max-w-3xl text-sm text-zinc-400">
              Releases 1 through 7 establish NOVA as a modular personal operating system around the existing Emma OCC command center. The production launch layer adds final certification gates, live deployment status, rollback posture, device validation, accessibility, performance, and backup recovery without bypassing consent.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Blocks size={15} className="text-occ-cyan" />
                Active modules
              </div>
              <strong className="mt-2 block text-2xl text-white">{summary.activeModules.length}</strong>
            </div>
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <CheckCircle2 size={15} className="text-occ-green" />
                Foundation coverage
              </div>
              <strong className="mt-2 block text-2xl text-white">
                {summary.coveredCapabilityCount}/{summary.requiredCapabilityCount}
              </strong>
            </div>
            <div className="rounded-md border border-occ-line bg-occ-ink/80 p-3">
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Clock3 size={15} className="text-occ-gold" />
                Planned modules
              </div>
              <strong className="mt-2 block text-2xl text-white">{summary.plannedModules.length}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-occ-gold">Active releases</p>
          <h2 className="text-2xl font-semibold text-white">Active NOVA Modules</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {summary.activeModules.map((module) => (
            <article key={module.id} className="rounded-lg border border-occ-line bg-occ-panel p-4 shadow-occ">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {module.preservesEmmaOcc ? <ShieldCheck size={18} className="text-occ-green" /> : <Layers3 size={18} className="text-occ-cyan" />}
                  <h3 className="font-semibold text-white">{module.name}</h3>
                </div>
                <StatusBadge tone={statusTone(module.status)}>{module.status}</StatusBadge>
              </div>
              <p className="mt-3 text-sm text-zinc-400">{module.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {module.capabilities.map((capability) => (
                  <span key={capability} className="rounded-md border border-occ-line bg-occ-ink/80 px-2 py-1 text-xs text-zinc-300">
                    {capability}
                  </span>
                ))}
              </div>
              {module.privacyNotes?.length ? (
                <p className="mt-4 border-l-2 border-occ-gold/60 pl-3 text-xs text-zinc-500">{module.privacyNotes.join(" ")}</p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-occ-cyan">Roadmap guardrails</p>
          <h2 className="text-2xl font-semibold text-white">Planned Releases</h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-4">
          {summary.futureReleases.map((release) => (
            <article key={release.id} className="rounded-lg border border-occ-line bg-occ-panel/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-white">{release.name}</h3>
                <LockKeyhole size={17} className="text-zinc-500" />
              </div>
              <p className="mt-1 text-sm text-occ-gold">{release.title}</p>
              <p className="mt-3 text-sm text-zinc-500">{release.goal}</p>
              <div className="mt-4 space-y-2">
                {release.modules.map((module) => (
                  <div key={module.id} className="rounded-md border border-occ-line bg-occ-ink/70 p-3">
                    <p className="text-sm font-medium text-zinc-200">{module.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">{module.summary}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
