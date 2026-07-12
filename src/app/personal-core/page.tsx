import Link from 'next/link';
import { buildPersonalCoreReadiness, defaultMemorySettings, emptyPersonalCoreCounts } from '@/lib/nova/personal-core';

function Badge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: 'blue' | 'green' | 'amber' }) {
  const value = tone === 'green' ? 'GREEN' : tone === 'amber' ? 'AMBER' : 'LIVE';
  return <span className={`status-badge ${value.toLowerCase()}`}>{children}</span>;
}

export default function PersonalCorePage() {
  const readiness = buildPersonalCoreReadiness(defaultMemorySettings, emptyPersonalCoreCounts);

  return (
    <main className="shell">
      <section className="panel full">
        <div className="mission-cluster" style={{ justifyContent: 'flex-start', marginBottom: 16 }}>
          <Badge tone="green">Release 2 active</Badge>
          <Badge tone="amber">Memory {readiness.memoryStatus}</Badge>
          <Badge>Emma OCC preserved</Badge>
        </div>
        <p className="eyebrow">NOVA personal core</p>
        <h1>Identity, Memory, and Life Graph</h1>
        <p>
          Release 2 adds personal identity, opt-in memory, interests, goals, habits, relationships, and timeline architecture
          without changing Emma OCC commute, roster, calendar, Gmail, NS, weather, or notification behavior.
        </p>
        <p style={{ marginTop: 16 }}>
          <Link className="connect-google" href="/">Return to Mission Control</Link>
        </p>
      </section>

      <section className="summary-grid" style={{ marginTop: 16 }}>
        <article className="panel metric">
          <div className="panel-title">Identity</div>
          <h2>Ready</h2>
          <p>Profile, family context, language, and preferences are represented in the Release 2 architecture.</p>
        </article>
        <article className="panel metric">
          <div className="panel-title">Memory</div>
          <h2>{readiness.memoryStatus}</h2>
          <p>Memory starts disabled and must be explicitly enabled before storage.</p>
        </article>
        <article className="panel metric">
          <div className="panel-title">AI memory</div>
          <h2>{readiness.aiMemorySuggestions}</h2>
          <p>AI-suggested memories require separate permission.</p>
        </article>
        <article className="panel metric">
          <div className="panel-title">Retention</div>
          <h2>{readiness.retentionLabel}</h2>
          <p>Memory retention is explicit and reviewable.</p>
        </article>
      </section>

      <section className="content-grid" style={{ marginTop: 16 }}>
        {['Interests', 'Goals', 'Habits', 'Relationships', 'Timeline'].map((item) => (
          <article className="panel" key={item}>
            <div className="panel-title">Life graph</div>
            <h2>{item}</h2>
            <p>Manual, user-controlled personal context for future recommendations.</p>
          </article>
        ))}
      </section>
    </main>
  );
}
