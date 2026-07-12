import Link from 'next/link';
import {
  buildNovaIntelligenceReadiness,
  capabilityGuardrail,
  emptyNovaCapabilityCounts,
  release5SeedRecords,
} from '@/lib/nova/nova-intelligence';

function Badge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: 'blue' | 'green' | 'amber' | 'red' }) {
  const value = tone === 'green' ? 'GREEN' : tone === 'amber' ? 'AMBER' : tone === 'red' ? 'RED' : 'LIVE';
  return <span className={`status-badge ${value.toLowerCase()}`}>{children}</span>;
}

export default function NovaIntelligencePage() {
  const records = release5SeedRecords();
  const counts = records.reduce(
    (next, record) => ({ ...next, [record.capability]: next[record.capability] + 1 }),
    { ...emptyNovaCapabilityCounts }
  );
  const readiness = buildNovaIntelligenceReadiness(counts);

  return (
    <main className="shell">
      <section className="panel full">
        <div className="mission-cluster" style={{ justifyContent: 'flex-start', marginBottom: 16 }}>
          <Badge tone="green">Release 5 active</Badge>
          <Badge tone="amber">{readiness.assistantStatus}</Badge>
          <Badge>Emma OCC preserved</Badge>
        </div>
        <p className="eyebrow">NOVA Intelligence</p>
        <h1>Multi-device Sync, Voice, Vision, Collaboration, Developer Platform, and NOVA</h1>
        <p>
          Release 5 completes the roadmap by preparing NOVA for phone, desktop, installed PWA, voice, vision, shared planning,
          developer extensions, and unified intelligence. Privacy boundaries stay visible, consent-gated, and reviewable.
        </p>
        <p style={{ marginTop: 16 }}>
          <Link className="connect-google" href="/">Return to Mission Control</Link>
          <Link className="connect-google" href="/platform" style={{ marginLeft: 10 }}>Open Platform</Link>
          <Link className="connect-google" href="/intelligence" style={{ marginLeft: 10 }}>Open Intelligence</Link>
        </p>
      </section>

      <section className="summary-grid" style={{ marginTop: 16 }}>
        <article className="panel metric">
          <div className="panel-title">Capabilities</div>
          <h2>{readiness.activeCapabilityCount}/{readiness.requiredCapabilityCount}</h2>
          <p>Release 5 capability families are represented.</p>
        </article>
        <article className="panel metric">
          <div className="panel-title">Records</div>
          <h2>{readiness.totalRecords}</h2>
          <p>Seed records define the Release 5 operating boundary.</p>
        </article>
        <article className="panel metric">
          <div className="panel-title">Sync</div>
          <h2>{readiness.syncStatus}</h2>
          <p>Private sync is ready while local-only records remain protected.</p>
        </article>
        <article className="panel metric">
          <div className="panel-title">Platform</div>
          <h2>{readiness.platformStatus}</h2>
          <p>Extensions require explicit developer-scoped boundaries.</p>
        </article>
      </section>

      <section className="content-grid" style={{ marginTop: 16 }}>
        {records.map((record) => {
          const guardrail = capabilityGuardrail(record);
          return (
            <article className="panel" key={record.title}>
              <div className="panel-title">{record.capability.replaceAll('_', ' ')}</div>
              <h2>{record.title}</h2>
              <p>{record.detail}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                <Badge tone={record.risk === 'green' ? 'green' : record.risk === 'red' ? 'red' : 'amber'}>{record.risk}</Badge>
                <Badge tone={guardrail === 'ready-with-guardrails' ? 'green' : 'amber'}>{guardrail.replaceAll('-', ' ')}</Badge>
                <Badge>{record.privacyMode.replaceAll('_', ' ')}</Badge>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
