'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CloudSun,
  Mail,
  MapPin,
  Navigation,
  ShieldCheck,
  TrainFront,
} from 'lucide-react';
import { getMissionState, getRisk, roster, timeline } from '@/lib/ops';

function StatusBadge({ value }: { value: string }) {
  const key = value.toLowerCase().replaceAll(' ', '-');
  return <span className={`status-badge ${key}`}>{value}</span>;
}

export default function OccDashboard() {
  const [delay, setDelay] = useState(0);
  const [buffer, setBuffer] = useState(4);
  const [weatherRisk, setWeatherRisk] = useState(false);
  const risk = useMemo(() => getRisk(buffer - (weatherRisk ? 5 : 0), delay), [buffer, delay, weatherRisk]);
  const mission = getMissionState(risk);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Emma OCC v4</p>
          <h1>Personal Operations Control Center</h1>
          <p className="subtitle">Live mission logic for roster, commute, risk, and action.</p>
        </div>
        <div className="mission-cluster">
          <StatusBadge value={risk} />
          <StatusBadge value={mission} />
        </div>
      </header>

      <section className="summary-grid">
        <article className="panel metric">
          <div className="panel-title"><CalendarDays size={18}/> Mission</div>
          <h2>Night Shift 382G</h2>
          <p>23:00–07:05 · Admiraal Helfrichlaan 1</p>
        </article>
        <article className="panel metric">
          <div className="panel-title"><TrainFront size={18}/> Current leg</div>
          <h2>In train</h2>
          <p>21:51 departure → 22:36 Utrecht Centraal</p>
        </article>
        <article className="panel metric">
          <div className="panel-title"><Clock3 size={18}/> Work ETA</div>
          <h2>22:56</h2>
          <p>{buffer} min projected buffer</p>
        </article>
        <article className="panel metric">
          <div className="panel-title"><ShieldCheck size={18}/> Decision</div>
          <h2>Stay on current plan</h2>
          <p>No route change improves arrival right now.</p>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel wide">
          <div className="panel-title"><Navigation size={18}/> Mission timeline</div>
          <div className="timeline">
            {timeline.map((item) => (
              <div className={`timeline-row ${item.state}`} key={`${item.time}-${item.event}`}>
                <time>{item.time}</time>
                <span>{item.event}</span>
                <b>{item.state === 'complete' ? 'DONE' : item.state.toUpperCase()}</b>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-title"><Activity size={18}/> Risk control</div>
          <label>Train delay: {delay} min<input type="range" min="0" max="20" value={delay} onChange={(e) => setDelay(Number(e.target.value))}/></label>
          <label>Arrival buffer: {buffer} min<input type="range" min="0" max="25" value={buffer} onChange={(e) => setBuffer(Number(e.target.value))}/></label>
          <label className="check"><input type="checkbox" checked={weatherRisk} onChange={(e) => setWeatherRisk(e.target.checked)}/> Severe weather walking penalty</label>
          <div className={`risk-readout ${risk.toLowerCase()}`}><AlertTriangle size={18}/>{risk}</div>
        </article>

        <article className="panel wide">
          <div className="panel-title"><CalendarDays size={18}/> Smart roster</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Label</th><th>Code</th><th>Detail</th><th>Time</th><th>Commute</th></tr></thead>
              <tbody>
                {roster.map((item) => (
                  <tr key={`${item.date}-${item.code}`}>
                    <td>{item.date}</td><td>{item.label}</td><td>{item.code}</td><td>{item.detail}</td>
                    <td>{item.start ? `${item.start}–${item.end}` : 'All day'}</td>
                    <td>{item.label === 'OFF Day' || item.label === 'Vacation' ? 'Skipped' : 'Active'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel">
          <div className="panel-title"><BellRing size={18}/> Operational watch</div>
          <ul className="watch-list">
            <li><CheckCircle2 size={16}/> Significant delay only</li>
            <li><CheckCircle2 size={16}/> Platform change</li>
            <li><CheckCircle2 size={16}/> Cancellation</li>
            <li><CheckCircle2 size={16}/> Buffer under 5 min</li>
          </ul>
        </article>

        <article className="panel">
          <div className="panel-title"><CloudSun size={18}/> Weather</div>
          <h2>{weatherRisk ? 'Walking buffer added' : 'Normal walking plan'}</h2>
          <p>Weather impact automatically feeds the risk calculation.</p>
        </article>

        <article className="panel">
          <div className="panel-title"><Mail size={18}/> Action center</div>
          <h2>No critical email blockers</h2>
          <p>Only work, billing, deadlines, and delivery exceptions appear here.</p>
        </article>

        <article className="panel">
          <div className="panel-title"><BarChart3 size={18}/> Mission KPIs</div>
          <div className="kpi-list"><span>Target buffer<b>10–15m</b></span><span>Projected buffer<b>{buffer}m</b></span><span>Commute confidence<b>{risk === 'GREEN' ? 'High' : risk === 'AMBER' ? 'Medium' : 'Low'}</b></span><span>OTP status<b>{mission}</b></span></div>
        </article>

        <article className="panel full">
          <div className="panel-title"><MapPin size={18}/> Emma decision engine</div>
          <h2>{risk === 'RED' ? 'Escalate immediately' : risk === 'AMBER' ? 'Continue, monitor closely' : 'Continue as planned'}</h2>
          <p>{risk === 'RED' ? 'Arrival is threatened. Use the fastest available recovery option and notify work.' : risk === 'AMBER' ? 'Current plan remains viable, but the margin is small. Avoid stops and reassess if delay increases.' : 'No better alternative is available. Maintain the current route.'}</p>
        </article>
      </section>
    </main>
  );
}
