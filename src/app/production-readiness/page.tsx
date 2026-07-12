import Link from 'next/link';
import { buildProductionReadinessSummary, productionGateGuardrail, release6SeedRecords } from '@/lib/nova/production-readiness';

function Badge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: 'blue' | 'green' | 'amber' | 'red' }) {
  const value = tone === 'green' ? 'GREEN' : tone === 'amber' ? 'AMBER' : tone === 'red' ? 'RED' : 'LIVE';
  return <span className={`status-badge ${value.toLowerCase()}`}>{children}</span>;
}

export default function ProductionReadinessPage() {
  const records = release6SeedRecords();
  const summary = buildProductionReadinessSummary(records);

  return (
    <main className="shell">
      <section className="panel full">
        <div className="mission-cluster" style={{ justifyContent: 'flex-start', marginBottom: 16 }}>
          <Badge tone="green">Release 6 active</Badge>
          <Badge tone={summary.launchStatus === 'launch-ready' ? 'green' : summary.launchStatus === 'blocked' ? 'red' : 'amber'}>
            {summary.launchStatus.replaceAll('-', ' ')}
          </Badge>
          <Badge>Emma OCC preserved</Badge>
        </div>
        <p className="eyebrow">NOVA production readiness</p>
        <h1>Release Gates, Monitoring, Rollback, Privacy, and Commute Accuracy</h1>
        <p>
          Release 6 hardens NOVA for daily operational use. Automated gates can pass while manual proof points like rollback rehearsal,
          installed PWA behavior, and commute accuracy remain clearly labeled as follow-up before v1.0.
        </p>
        <p style={{ marginTop: 16 }}>
          <Link className="connect-google" href="/">Return to Mission Control</Link>
          <Link className="connect-google" href="/platform" style={{ marginLeft: 10 }}>Open Platform</Link>
          <Link className="connect-google" href="/nova-intelligence" style={{ marginLeft: 10 }}>Open NOVA</Link>
        </p>
      </section>

      <section className="summary-grid" style={{ marginTop: 16 }}>
        <article className="panel metric">
          <div className="panel-title">Gates covered</div>
          <h2>{summary.coveredGateCount}/{summary.requiredGateCount}</h2>
          <p>Production readiness gates represented.</p>
        </article>
        <article className="panel metric">
          <div className="panel-title">Records</div>
          <h2>{summary.totalRecords}</h2>
          <p>Seed records define the Release 6 launch boundary.</p>
        </article>
        <article className="panel metric">
          <div className="panel-title">Blockers</div>
          <h2>{summary.blockers}</h2>
          <p>No high or critical blocker is allowed before launch.</p>
        </article>
        <article className="panel metric">
          <div className="panel-title">Critical gates</div>
          <h2>{summary.criticalPassed ? 'Passed' : 'Review'}</h2>
          <p>Critical checks must pass before daily-use approval.</p>
        </article>
      </section>

      <section className="content-grid" style={{ marginTop: 16 }}>
        {records.map((record) => {
          const guardrail = productionGateGuardrail(record);
          return (
            <article className="panel" key={record.gate}>
              <div className="panel-title">{record.gate.replaceAll('_', ' ')}</div>
              <h2>{record.title}</h2>
              <p>{record.detail}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                <Badge tone={record.status === 'passed' ? 'green' : record.status === 'blocked' ? 'red' : 'amber'}>{record.status}</Badge>
                <Badge tone={guardrail === 'ready' ? 'green' : 'amber'}>{guardrail.replaceAll('-', ' ')}</Badge>
                <Badge>{record.sourceFreshness}</Badge>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
