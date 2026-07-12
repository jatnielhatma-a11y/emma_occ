import Link from 'next/link';
import { foundationSummary } from '@/lib/nova/foundation';

function Badge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: 'blue' | 'green' | 'amber' }) {
  const value = tone === 'green' ? 'GREEN' : tone === 'amber' ? 'AMBER' : 'LIVE';
  return <span className={`status-badge ${value.toLowerCase()}`}>{children}</span>;
}

export default function PlatformPage() {
  const summary = foundationSummary();
  const ready = summary.emmaOccPreserved && summary.missing.length === 0;

  return (
    <main className="shell">
      <section className="panel full">
        <div className="mission-cluster" style={{ justifyContent: 'flex-start', marginBottom: 16 }}>
          <Badge tone={ready ? 'green' : 'amber'}>{ready ? 'Foundation ready' : 'Needs review'}</Badge>
          <Badge>Release 1-2 active</Badge>
          <Badge tone="green">Emma OCC preserved</Badge>
        </div>
        <p className="eyebrow">NOVA operating system</p>
        <h1>Foundation and Personal Core</h1>
        <p>
          Releases 1 and 2 keep Emma OCC as the active mission-control module while establishing the roadmap, privacy guardrails,
          provider boundaries, identity layer, and opt-in memory controls for the larger NOVA personal operating system.
        </p>
        <p style={{ marginTop: 16 }}>
          <Link className="connect-google" href="/">Return to Mission Control</Link>
          <Link className="connect-google" href="/personal-core" style={{ marginLeft: 10 }}>Open Personal Core</Link>
        </p>
      </section>

      <section className="summary-grid" style={{ marginTop: 16 }}>
        <article className="panel metric">
          <div className="panel-title">Active modules</div>
          <h2>{summary.activeModules.length}</h2>
          <p>Emma OCC plus foundation services.</p>
        </article>
        <article className="panel metric">
          <div className="panel-title">Capability coverage</div>
          <h2>{summary.coveredCapabilityCount}/{summary.requiredCapabilityCount}</h2>
          <p>Release 1 and 2 architecture requirements represented.</p>
        </article>
        <article className="panel metric">
          <div className="panel-title">Planned modules</div>
          <h2>{summary.plannedModules.length}</h2>
          <p>Future releases are not activated in this phase.</p>
        </article>
        <article className="panel metric">
          <div className="panel-title">Memory status</div>
          <h2>Opt-in</h2>
          <p>Privacy-first memory is represented but disabled by default.</p>
        </article>
      </section>

      <section className="content-grid" style={{ marginTop: 16 }}>
        {summary.activeModules.map((module) => (
          <article className="panel wide" key={module.id}>
            <div className="panel-title">{module.status}</div>
            <h2>{module.name}</h2>
            <p>{module.summary}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
              {module.capabilities.map((capability) => <span className="status-badge" key={capability}>{capability}</span>)}
            </div>
            {module.privacyNotes?.map((note) => <p style={{ borderLeft: '3px solid var(--amber)', marginTop: 14, paddingLeft: 12 }} key={note}>{note}</p>)}
          </article>
        ))}
      </section>

      <section className="content-grid" style={{ marginTop: 16 }}>
        {summary.futureReleases.map((release) => (
          <article className="panel" key={release.id}>
            <div className="panel-title">{release.name}</div>
            <h2>{release.title}</h2>
            <p>{release.goal}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
