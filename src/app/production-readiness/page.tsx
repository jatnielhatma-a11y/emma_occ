import Link from 'next/link';
import { buildProductionReadinessSummary, productionGateGuardrail, release6SeedRecords } from '@/lib/nova/production-readiness';
import { buildRelease7LaunchSummary, launchCheckGuardrail, release7LaunchChecks } from '@/lib/nova/production-launch';

function Badge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: 'blue' | 'green' | 'amber' | 'red' }) {
  const value = tone === 'green' ? 'GREEN' : tone === 'amber' ? 'AMBER' : tone === 'red' ? 'RED' : 'LIVE';
  return <span className={`status-badge ${value.toLowerCase()}`}>{children}</span>;
}

export default function ProductionReadinessPage() {
  const records = release6SeedRecords();
  const summary = buildProductionReadinessSummary(records);
  const launchChecks = release7LaunchChecks(process.env.VERCEL_ENV === 'production');
  const launchSummary = buildRelease7LaunchSummary(launchChecks);

  return (
    <main className="shell">
      <section className="panel full">
        <div className="mission-cluster" style={{ justifyContent: 'flex-start', marginBottom: 16 }}>
          <Badge tone="green">Release 7 active</Badge>
          <Badge tone={launchSummary.productionLive ? 'green' : 'amber'}>{launchSummary.status.replaceAll('-', ' ')}</Badge>
          <Badge tone={summary.launchStatus === 'launch-ready' ? 'green' : summary.launchStatus === 'blocked' ? 'red' : 'amber'}>
            {summary.launchStatus.replaceAll('-', ' ')}
          </Badge>
          <Badge>Emma OCC preserved</Badge>
        </div>
        <p className="eyebrow">NOVA production launch</p>
        <h1>Production Hardening, Launch Certification, and v1.0 Release Gates</h1>
        <p>
          Release 7 makes NOVA production-live while keeping final v1.0 approval separate from manual proof points like rollback rehearsal,
          real-device PWA behavior, accessibility, performance, backup recovery, and live integration observation.
        </p>
        <p style={{ marginTop: 16 }}>
          <Link className="connect-google" href="/">Return to Mission Control</Link>
          <Link className="connect-google" href="/platform" style={{ marginLeft: 10 }}>Open Platform</Link>
          <Link className="connect-google" href="/nova-intelligence" style={{ marginLeft: 10 }}>Open NOVA</Link>
        </p>
      </section>

      <section className="summary-grid" style={{ marginTop: 16 }}>
        <article className="panel metric">
          <div className="panel-title">Launch checks</div>
          <h2>{launchSummary.coveredCheckCount}/{launchSummary.requiredCheckCount}</h2>
          <p>Release 7 launch checks represented.</p>
        </article>
        <article className="panel metric">
          <div className="panel-title">Production</div>
          <h2>{launchSummary.productionLive ? 'Live' : 'Ready'}</h2>
          <p>Production-live is allowed before final v1.0 approval.</p>
        </article>
        <article className="panel metric">
          <div className="panel-title">Follow-ups</div>
          <h2>{launchSummary.manualChecks + launchSummary.warnings}</h2>
          <p>Manual gates remain visible until proven.</p>
        </article>
        <article className="panel metric">
          <div className="panel-title">v1.0</div>
          <h2>{launchSummary.v1Ready ? 'Ready' : 'Candidate'}</h2>
          <p>NOVA v1.0 is not declared until every gate is verified.</p>
        </article>
      </section>

      <section className="content-grid" style={{ marginTop: 16 }}>
        {launchChecks.map((record) => {
          const guardrail = launchCheckGuardrail(record);
          return (
            <article className="panel" key={record.check}>
              <div className="panel-title">{record.check.replaceAll('_', ' ')}</div>
              <h2>{record.title}</h2>
              <p>{record.detail}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                <Badge tone={record.status === 'passed' ? 'green' : record.status === 'blocked' ? 'red' : 'amber'}>{record.status}</Badge>
                <Badge tone={guardrail.startsWith('verified') ? 'green' : guardrail === 'launch-blocker' ? 'red' : 'amber'}>{guardrail.replaceAll('-', ' ')}</Badge>
                <Badge>{record.critical ? 'critical' : 'standard'}</Badge>
              </div>
            </article>
          );
        })}
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
