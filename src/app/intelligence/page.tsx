import Link from 'next/link';
import { automationGuardrail, buildIntelligenceReadiness, emptyIntelligenceCounts, release4SeedRecords } from '@/lib/nova/intelligence';

function Badge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: 'blue' | 'green' | 'amber' }) {
  const value = tone === 'green' ? 'GREEN' : tone === 'amber' ? 'AMBER' : 'LIVE';
  return <span className={`status-badge ${value.toLowerCase()}`}>{children}</span>;
}

export default function IntelligencePage() {
  const records = release4SeedRecords();
  const counts = records.reduce(
    (next, record) => ({ ...next, [record.kind]: next[record.kind] + 1 }),
    { ...emptyIntelligenceCounts }
  );
  const readiness = buildIntelligenceReadiness(counts);

  return (
    <main className="shell">
      <section className="panel full">
        <div className="mission-cluster" style={{ justifyContent: 'flex-start', marginBottom: 16 }}>
          <Badge tone="green">Release 4 active</Badge>
          <Badge tone="amber">{readiness.automationStatus}</Badge>
          <Badge>Emma OCC preserved</Badge>
        </div>
        <p className="eyebrow">NOVA intelligence</p>
        <h1>Prediction, Recommendations, Context, Automation, and Daily AI</h1>
        <p>
          Release 4 turns verified operational context into advisory intelligence records. Automation stays disabled by default
          and requires confirmation before it can affect calendar, commute, email, notification, or memory workflows.
        </p>
        <p style={{ marginTop: 16 }}>
          <Link className="connect-google" href="/">Return to Mission Control</Link>
          <Link className="connect-google" href="/platform" style={{ marginLeft: 10 }}>Open Platform</Link>
        </p>
      </section>

      <section className="summary-grid" style={{ marginTop: 16 }}>
        <article className="panel metric">
          <div className="panel-title">Intelligence layers</div>
          <h2>{readiness.activeLayerCount}/5</h2>
          <p>Prediction, recommendation, context, automation, and Daily AI readiness.</p>
        </article>
        <article className="panel metric">
          <div className="panel-title">Records</div>
          <h2>{readiness.totalRecords}</h2>
          <p>Seed records define the Release 4 operating boundary.</p>
        </article>
        <article className="panel metric">
          <div className="panel-title">Recommendations</div>
          <h2>{readiness.recommendationStatus}</h2>
          <p>Advisory only until reviewed by the user.</p>
        </article>
        <article className="panel metric">
          <div className="panel-title">Automation</div>
          <h2>Manual</h2>
          <p>No silent operational writes.</p>
        </article>
      </section>

      <section className="content-grid" style={{ marginTop: 16 }}>
        {records.map((record) => (
          <article className="panel" key={record.title}>
            <div className="panel-title">{record.kind.replaceAll('_', ' ')}</div>
            <h2>{record.title}</h2>
            <p>{record.detail}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              <Badge tone={record.risk === 'green' ? 'green' : 'amber'}>{record.risk}</Badge>
              <Badge tone="amber">{automationGuardrail(record).replaceAll('-', ' ')}</Badge>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
