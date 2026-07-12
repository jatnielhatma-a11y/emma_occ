import Link from 'next/link';
import { buildLifeDomainReadiness, domainPrivacyNote, emptyLifeDomainCounts, type LifeDomain } from '@/lib/nova/life-domains';

function Badge({ children, tone = 'blue' }: { children: React.ReactNode; tone?: 'blue' | 'green' | 'amber' }) {
  const value = tone === 'green' ? 'GREEN' : tone === 'amber' ? 'AMBER' : 'LIVE';
  return <span className={`status-badge ${value.toLowerCase()}`}>{children}</span>;
}

const domains: Array<{ value: LifeDomain; label: string }> = [
  { value: 'finance', label: 'Finance' },
  { value: 'home', label: 'Home' },
  { value: 'travel', label: 'Travel' },
  { value: 'health', label: 'Health' },
  { value: 'learning', label: 'Learning' },
];

export default function LifeDomainsPage() {
  const readiness = buildLifeDomainReadiness(emptyLifeDomainCounts);

  return (
    <main className="shell">
      <section className="panel full">
        <div className="mission-cluster" style={{ justifyContent: 'flex-start', marginBottom: 16 }}>
          <Badge tone="green">Release 3 active</Badge>
          <Badge tone="amber">{readiness.recommendationStatus}</Badge>
          <Badge>Emma OCC preserved</Badge>
        </div>
        <p className="eyebrow">NOVA life domains</p>
        <h1>Finance, Home, Travel, Health, and Learning</h1>
        <p>
          Release 3 structures personal life-domain context for future recommendations. It does not connect banks,
          diagnose health, or change Emma OCC commute, roster, calendar, Gmail, NS, weather, or notification behavior.
        </p>
        <p style={{ marginTop: 16 }}>
          <Link className="connect-google" href="/">Return to Mission Control</Link>
          <Link className="connect-google" href="/platform" style={{ marginLeft: 10 }}>Open Platform</Link>
        </p>
      </section>

      <section className="summary-grid" style={{ marginTop: 16 }}>
        <article className="panel metric">
          <div className="panel-title">Domain coverage</div>
          <h2>{readiness.activeDomainCount}/5</h2>
          <p>Domains can be started manually as context is added.</p>
        </article>
        <article className="panel metric">
          <div className="panel-title">Records</div>
          <h2>{readiness.totalRecords}</h2>
          <p>Release 3 starts with no inferred records.</p>
        </article>
        <article className="panel metric">
          <div className="panel-title">Automation</div>
          <h2>Planned</h2>
          <p>Recommendations and automation remain Release 4.</p>
        </article>
        <article className="panel metric">
          <div className="panel-title">Boundary</div>
          <h2>Manual</h2>
          <p>No bank, diagnosis, or commute-behavior changes.</p>
        </article>
      </section>

      <section className="content-grid" style={{ marginTop: 16 }}>
        {domains.map((domain) => (
          <article className="panel" key={domain.value}>
            <div className="panel-title">Life domain</div>
            <h2>{domain.label}</h2>
            <p>{domainPrivacyNote(domain.value)}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
