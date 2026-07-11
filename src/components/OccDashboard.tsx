'use client';
import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, BellRing, CalendarDays, CheckCircle2, Clock3, CloudSun, Mail, MapPin, Navigation, RefreshCw, ShieldCheck, TrainFront, Wifi, WifiOff } from 'lucide-react';
import type { OpsSnapshot } from '@/lib/types';

function StatusBadge({ value }: { value: string }) { const key = value.toLowerCase().replaceAll(' ', '-'); return <span className={`status-badge ${key}`}>{value}</span>; }
function formatDistance(meters: number) { return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`; }

export default function OccDashboard() {
  const [snapshot, setSnapshot] = useState<OpsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function reload() {
    setLoading(true);
    try { const response = await fetch('/api/ops', { cache: 'no-store' }); if (!response.ok) throw new Error(`Operations API ${response.status}`); setSnapshot(await response.json()); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load operations data'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void reload(); const timer = window.setInterval(() => void reload(), 5 * 60 * 1000); return () => window.clearInterval(timer); }, []);
  const timeline = useMemo(() => !snapshot ? [] : [
    { time: `-${snapshot.walking.outboundHome.durationMinutes}m`, event: `Walk ${snapshot.walking.outboundHome.from} → ${snapshot.walking.outboundHome.to}`, state: 'planned' },
    { time: snapshot.train.departure, event: `${snapshot.train.direct ? 'Direct' : 'Connecting'} train to Utrecht Centraal${snapshot.train.platform ? ` · platform ${snapshot.train.platform}` : ''}`, state: snapshot.train.cancelled ? 'risk' : 'current' },
    { time: snapshot.train.arrival, event: 'Arrive Utrecht Centraal', state: 'target' },
    { time: `+${snapshot.walking.outboundWork.durationMinutes}m`, event: `Walk to ${snapshot.walking.outboundWork.to}`, state: 'planned' },
  ], [snapshot]);
  if (!snapshot && loading) return <main className="shell"><div className="panel full"><RefreshCw className="spin"/> Loading Emma OCC live operations…</div></main>;
  if (!snapshot) return <main className="shell"><div className="panel full"><AlertTriangle/> {error || 'No operations data available.'}<button onClick={() => void reload()}>Retry</button></div></main>;
  const shift = snapshot.currentShift;
  return <main className="shell">
    <header className="topbar"><div><p className="eyebrow">Emma OCC v4.2</p><h1>Personal Operations Control Center</h1><p className="subtitle">Live roster, walking, rail, weather, email, and decision intelligence.</p></div><div className="mission-cluster"><StatusBadge value={snapshot.risk}/><StatusBadge value={snapshot.mission}/><button className="refresh" onClick={() => void reload()} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''}/> Reload</button></div></header>
    {error && <div className="notice"><AlertTriangle size={16}/>{error}; showing the last successful snapshot.</div>}
    <section className="summary-grid">
      <article className="panel metric"><div className="panel-title"><CalendarDays size={18}/> Mission</div><h2>{shift ? `${shift.label} ${shift.code}` : 'No duty'}</h2><p>{shift?.start ? `${shift.start}–${shift.end}` : 'No commute required'} · {shift?.detail ?? 'OFF / Vacation'}</p></article>
      <article className="panel metric"><div className="panel-title"><TrainFront size={18}/> Train</div><h2>{snapshot.train.cancelled ? 'Cancelled' : `${snapshot.train.departure} → ${snapshot.train.arrival}`}</h2><p>{snapshot.train.direct ? 'Direct preferred' : 'Transfer required'}{snapshot.train.platform ? ` · platform ${snapshot.train.platform}` : ''}</p></article>
      <article className="panel metric"><div className="panel-title"><Clock3 size={18}/> Protected buffer</div><h2>{snapshot.bufferMinutes} min</h2><p>Target: 10–15 min · confidence {snapshot.confidence}%</p></article>
      <article className="panel metric"><div className="panel-title"><ShieldCheck size={18}/> Decision</div><h2>{snapshot.risk === 'RED' ? 'Recover now' : snapshot.risk === 'AMBER' ? 'Monitor closely' : 'Proceed'}</h2><p>{snapshot.decision}</p></article>
    </section>
    <section className="content-grid">
      <article className="panel wide"><div className="panel-title"><Navigation size={18}/> Door-to-door timeline</div><div className="timeline">{timeline.map((item) => <div className={`timeline-row ${item.state}`} key={`${item.time}-${item.event}`}><time>{item.time}</time><span>{item.event}</span><b>{item.state.toUpperCase()}</b></div>)}</div></article>
      <article className="panel"><div className="panel-title"><Activity size={18}/> Mission confidence</div><div className={`confidence ${snapshot.risk.toLowerCase()}`}>{snapshot.confidence}%</div><p>{snapshot.train.delayedMinutes} min train delay · {snapshot.weather.addedWalkingMinutes} min weather penalty</p></article>
      <article className="panel wide"><div className="panel-title"><CalendarDays size={18}/> Smart roster</div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Label</th><th>Code</th><th>Detail</th><th>Time</th><th>Commute</th></tr></thead><tbody>{snapshot.roster.map((item) => <tr key={`${item.date}-${item.code}`}><td>{item.date}</td><td>{item.label}</td><td>{item.code}</td><td>{item.detail}</td><td>{item.start ? `${item.start}–${item.end}` : 'All day'}</td><td>{item.commuteRequired ? 'Active' : 'Skipped'}</td></tr>)}</tbody></table></div></article>
      <article className="panel"><div className="panel-title"><MapPin size={18}/> Google walking</div><h2>{snapshot.walking.outboundHome.durationMinutes + snapshot.walking.outboundWork.durationMinutes} min total</h2><p>Home leg: {snapshot.walking.outboundHome.durationMinutes} min · {formatDistance(snapshot.walking.outboundHome.distanceMeters)}</p><p>Work leg: {snapshot.walking.outboundWork.durationMinutes} min · {formatDistance(snapshot.walking.outboundWork.distanceMeters)}</p></article>
      <article className="panel"><div className="panel-title"><CloudSun size={18}/> Weather</div><h2>{snapshot.weather.severe ? 'Severe impact' : 'Normal / minor impact'}</h2><p>{snapshot.weather.precipitationMm} mm rain · {Math.round(snapshot.weather.windKph)} km/h wind · +{snapshot.weather.addedWalkingMinutes} min</p></article>
      <article className="panel"><div className="panel-title"><Mail size={18}/> Action center</div><h2>{snapshot.emails.length ? `${snapshot.emails.length} item(s)` : 'No critical blockers'}</h2>{snapshot.emails.slice(0,3).map((email) => <p key={`${email.sender}-${email.subject}`}><b>{email.subject}</b><br/>{email.sender}</p>)}</article>
      <article className="panel"><div className="panel-title"><BellRing size={18}/> Operational watch</div><ul className="watch-list"><li><CheckCircle2 size={16}/> Delay or cancellation</li><li><CheckCircle2 size={16}/> Platform change</li><li><CheckCircle2 size={16}/> Weather walking penalty</li><li><CheckCircle2 size={16}/> Buffer under 10 min</li></ul></article>
      <article className="panel wide"><div className="panel-title"><Wifi size={18}/> Integration control</div><div className="integration-list">{snapshot.integrations.map((item) => <div className="integration-row" key={item.name}>{item.source === 'live' ? <Wifi size={16}/> : <WifiOff size={16}/>}<span><b>{item.name}</b><small>{item.message}</small>{item.name === 'Google Calendar' && item.source !== 'live' && <a className="connect-google" href="/api/auth/google/start">Connect Google</a>}</span><StatusBadge value={item.source.toUpperCase()}/></div>)}</div></article>
      <article className="panel"><div className="panel-title"><BarChart3 size={18}/> Mission KPIs</div><div className="kpi-list"><span>Target buffer<b>10–15m</b></span><span>Projected buffer<b>{snapshot.bufferMinutes}m</b></span><span>Confidence<b>{snapshot.confidence}%</b></span><span>Data refresh<b>5 min</b></span></div></article>
      <article className="panel full"><div className="panel-title"><MapPin size={18}/> Emma decision engine</div><h2>{snapshot.decision}</h2><p>Generated {new Date(snapshot.generatedAt).toLocaleString('en-GB', { timeZone: 'Europe/Amsterdam' })}. Live services are used when configured; explicit fallback data keeps the dashboard operational when credentials or providers are unavailable.</p></article>
    </section>
  </main>;
}
