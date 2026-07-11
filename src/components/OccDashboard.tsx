'use client';
import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BarChart3, BellRing, CalendarDays, Car, CheckCircle2, Clock3, CloudSun, Mail, MapPin, Navigation, RefreshCw, ShieldCheck, TrainFront, Wifi, WifiOff } from 'lucide-react';
import type { OpsSnapshot } from '@/lib/types';

type TravelMode = 'train' | 'car';

function StatusBadge({ value }: { value: string }) { const key = value.toLowerCase().replaceAll(' ', '-'); return <span className={`status-badge ${key}`}>{value}</span>; }
function formatDistance(meters: number) { return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`; }
function localDateKey() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()); }
function wazeLink(destination: string) { return `https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes&utm_source=emma_occ`; }
function googleDrivingLink(origin: string, destination: string) { return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`; }

export default function OccDashboard() {
  const [snapshot, setSnapshot] = useState<OpsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [travelMode, setTravelMode] = useState<TravelMode>('train');

  async function reload() {
    setLoading(true);
    try { const response = await fetch('/api/ops', { cache: 'no-store' }); if (!response.ok) throw new Error(`Operations API ${response.status}`); setSnapshot(await response.json()); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load operations data'); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    const saved = window.localStorage.getItem('emma-occ-driving-date');
    if (saved === localDateKey()) setTravelMode('car');
    void reload();
    const timer = window.setInterval(() => void reload(), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  function chooseMode(mode: TravelMode) {
    setTravelMode(mode);
    if (mode === 'car') window.localStorage.setItem('emma-occ-driving-date', localDateKey());
    else window.localStorage.removeItem('emma-occ-driving-date');
  }

  const carRoute = useMemo(() => {
    const home = 'Lemmerstraat 18, Almere';
    const work = 'Admiraal Helfrichlaan 1, Utrecht';
    const isReturn = snapshot?.direction === 'return';
    return {
      origin: isReturn ? work : home,
      destination: isReturn ? home : work,
      label: isReturn ? 'Work → Home' : 'Home → Work',
    };
  }, [snapshot]);

  const timeline = useMemo(() => {
    if (!snapshot) return [];
    if (travelMode === 'car') return [
      { time: 'LIVE', event: `Drive ${carRoute.label} with Waze traffic routing`, state: 'current' },
      { time: 'ETA', event: `Destination: ${carRoute.destination}`, state: 'target' },
      { time: '+10–15m', event: 'Protected arrival buffer', state: 'planned' },
    ];
    return [
      { time: `-${snapshot.walking.first.durationMinutes}m`, event: `Walk ${snapshot.walking.first.from} → ${snapshot.walking.first.to} · ${formatDistance(snapshot.walking.first.distanceMeters)}`, state: 'planned' },
      { time: snapshot.train.departure, event: `${snapshot.train.direct ? 'Direct' : `${snapshot.train.transfers ?? 1}-transfer`} NS train to ${snapshot.train.to}${snapshot.train.platform ? ` · platform ${snapshot.train.platform}` : ''}`, state: snapshot.train.cancelled ? 'risk' : 'current' },
      { time: snapshot.train.arrival, event: `Arrive ${snapshot.train.to}${snapshot.train.arrivalPlatform ? ` · platform ${snapshot.train.arrivalPlatform}` : ''}${snapshot.train.exitSide ? ` · exit ${snapshot.train.exitSide}` : ''}`, state: 'target' },
      { time: `+${snapshot.walking.last.durationMinutes}m`, event: `Walk ${snapshot.walking.last.from} → ${snapshot.walking.last.to} · ${formatDistance(snapshot.walking.last.distanceMeters)}`, state: 'planned' },
    ];
  }, [snapshot, travelMode, carRoute]);

  if (!snapshot && loading) return <main className="shell"><div className="panel full"><RefreshCw className="spin"/> Loading Emma OCC live operations…</div></main>;
  if (!snapshot) return <main className="shell"><div className="panel full"><AlertTriangle/> {error || 'No operations data available.'}<button onClick={() => void reload()}>Retry</button></div></main>;

  const shift = snapshot.currentShift?.commuteRequired ? snapshot.currentShift : snapshot.nextDuty;
  return <main className="shell">
    <header className="topbar"><div><p className="eyebrow">Emma OCC v4.4</p><h1>Personal Operations Control Center</h1><p className="subtitle">Roster-first commute execution with NS, Waze, Google Maps, weather, and backup routing.</p></div><div className="mission-cluster"><StatusBadge value={snapshot.risk}/><StatusBadge value={travelMode === 'car' ? 'CAR MODE' : snapshot.direction === 'none' ? 'NO COMMUTE' : snapshot.direction.toUpperCase()}/><button className="refresh" onClick={() => void reload()} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''}/> Reload</button></div></header>
    {error && <div className="notice"><AlertTriangle size={16}/>{error}; showing the last successful snapshot.</div>}
    {snapshot.notificationRelevant && <div className="notice"><BellRing size={16}/> Action window active: commute briefing is now relevant.</div>}

    <section className="panel full" style={{ marginBottom: 16 }}>
      <div className="panel-title"><Navigation size={18}/> Travel mode</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <button onClick={() => chooseMode('train')} aria-pressed={travelMode === 'train'}><TrainFront size={16}/> Train</button>
        <button onClick={() => chooseMode('car')} aria-pressed={travelMode === 'car'}><Car size={16}/> Drive today</button>
      </div>
      {travelMode === 'car' && <div>
        <h2>{carRoute.label}</h2>
        <p>Waze opens with live traffic-aware navigation to {carRoute.destination}. Google Maps remains the backup route.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a className="connect-google" href={wazeLink(carRoute.destination)} target="_blank" rel="noreferrer"><Navigation size={16}/> Open in Waze</a>
          <a className="connect-google" href={googleDrivingLink(carRoute.origin, carRoute.destination)} target="_blank" rel="noreferrer"><MapPin size={16}/> Google Maps backup</a>
        </div>
      </div>}
    </section>

    <section className="summary-grid">
      <article className="panel metric"><div className="panel-title"><CalendarDays size={18}/> Mission</div><h2>{shift ? `${shift.label} ${shift.code}` : 'No duty'}</h2><p>{shift?.start ? `${shift.start}–${shift.end}` : 'No commute required'} · {shift?.detail ?? 'OFF / Vacation'}</p></article>
      <article className="panel metric"><div className="panel-title">{travelMode === 'car' ? <Car size={18}/> : <TrainFront size={18}/>} {travelMode === 'car' ? 'Waze navigation' : 'NS train'}</div><h2>{travelMode === 'car' ? carRoute.label : snapshot.train.cancelled ? 'Cancelled' : `${snapshot.train.departure} → ${snapshot.train.arrival}`}</h2><p>{travelMode === 'car' ? 'Live traffic routing · Google Maps backup' : `${snapshot.train.direct ? 'Direct · 0 transfers' : `${snapshot.train.transfers ?? 1} transfer(s)`}${snapshot.train.platform ? ` · platform ${snapshot.train.platform}` : ''}${snapshot.train.arrivalPlatform ? ` → ${snapshot.train.arrivalPlatform}` : ''}`}</p></article>
      <article className="panel metric"><div className="panel-title"><Clock3 size={18}/> Protected buffer</div><h2>10–15 min</h2><p>{travelMode === 'car' ? 'Leave based on Waze live ETA' : `Projected ${snapshot.bufferMinutes} min · confidence ${snapshot.confidence}%`}</p></article>
      <article className="panel metric"><div className="panel-title"><ShieldCheck size={18}/> Decision</div><h2>{travelMode === 'car' ? 'Follow Waze' : snapshot.risk === 'RED' ? 'Recover now' : snapshot.risk === 'AMBER' ? 'Monitor closely' : 'Proceed'}</h2><p>{travelMode === 'car' ? 'Use the fastest live route and preserve the arrival buffer.' : snapshot.decision}</p></article>
    </section>

    <section className="content-grid">
      <article className="panel wide"><div className="panel-title"><Navigation size={18}/> Door-to-door timeline</div><div className="timeline">{timeline.map((item) => <div className={`timeline-row ${item.state}`} key={`${item.time}-${item.event}`}><time>{item.time}</time><span>{item.event}</span><b>{item.state.toUpperCase()}</b></div>)}</div></article>
      <article className="panel"><div className="panel-title"><Activity size={18}/> Mission confidence</div><div className={`confidence ${snapshot.risk.toLowerCase()}`}>{travelMode === 'car' ? 'LIVE' : `${snapshot.confidence}%`}</div><p>{travelMode === 'car' ? 'Waze supplies current traffic and rerouting inside the navigation session.' : `${snapshot.train.delayedMinutes} min train delay · ${snapshot.weather.addedWalkingMinutes} min weather penalty`}</p></article>
      <article className="panel wide"><div className="panel-title"><CalendarDays size={18}/> Smart roster</div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Label</th><th>Code</th><th>Detail</th><th>Time</th><th>Commute</th></tr></thead><tbody>{snapshot.roster.map((item) => <tr key={`${item.date}-${item.code}`}><td>{item.date}</td><td>{item.label}</td><td>{item.code}</td><td>{item.detail}</td><td>{item.start ? `${item.start}–${item.end}` : 'All day'}</td><td>{item.commuteRequired ? travelMode === 'car' ? 'Car' : 'Rail' : 'Skipped'}</td></tr>)}</tbody></table></div></article>
      <article className="panel"><div className="panel-title"><MapPin size={18}/> Route source</div><h2>{travelMode === 'car' ? 'Waze primary' : 'Google walking'}</h2><p>{travelMode === 'car' ? 'Traffic-aware navigation with automatic rerouting.' : `First leg: ${snapshot.walking.first.durationMinutes} min · ${formatDistance(snapshot.walking.first.distanceMeters)}`}</p><p>{travelMode === 'car' ? 'Google Maps driving directions available as backup.' : `Last leg: ${snapshot.walking.last.durationMinutes} min · ${formatDistance(snapshot.walking.last.distanceMeters)}`}</p></article>
      <article className="panel"><div className="panel-title"><CloudSun size={18}/> Weather</div><h2>{snapshot.weather.severe ? 'Severe impact' : 'Normal / minor impact'}</h2><p>{snapshot.weather.precipitationMm} mm rain · {Math.round(snapshot.weather.windKph)} km/h wind · +{snapshot.weather.addedWalkingMinutes} min</p></article>
      <article className="panel"><div className="panel-title"><Mail size={18}/> Action center</div><h2>{snapshot.emails.length ? `${snapshot.emails.length} item(s)` : 'No critical blockers'}</h2>{snapshot.emails.slice(0,3).map((email) => <p key={`${email.sender}-${email.subject}`}><b>{email.subject}</b><br/>{email.sender}</p>)}</article>
      <article className="panel"><div className="panel-title"><BellRing size={18}/> Operational watch</div><ul className="watch-list"><li><CheckCircle2 size={16}/> Notify only in the 60–90 minute action window</li><li><CheckCircle2 size={16}/> {travelMode === 'car' ? 'Traffic, incidents, closures, and rerouting' : 'Delay, cancellation, or platform change'}</li><li><CheckCircle2 size={16}/> Weather impact and protected buffer</li><li><CheckCircle2 size={16}/> {travelMode === 'car' ? 'Waze first; Google Maps backup' : 'NS first; 9292 backup'}</li></ul></article>
      <article className="panel wide"><div className="panel-title"><Wifi size={18}/> Integration control</div><div className="integration-list">{snapshot.integrations.map((item) => <div className="integration-row" key={item.name}>{item.source === 'live' ? <Wifi size={16}/> : <WifiOff size={16}/>}<span><b>{item.name}</b><small>{item.message}</small>{item.name === 'Google Calendar' && item.source !== 'live' && <a className="connect-google" href="/api/auth/google/start">Connect Google</a>}</span><StatusBadge value={item.source.toUpperCase()}/></div>)}<div className="integration-row"><Navigation size={16}/><span><b>Waze</b><small>Deep-link navigation enabled for car missions.</small></span><StatusBadge value="READY"/></div></div></article>
      <article className="panel"><div className="panel-title"><BarChart3 size={18}/> Mission KPIs</div><div className="kpi-list"><span>Travel mode<b>{travelMode === 'car' ? 'Car' : 'Train'}</b></span><span>Target buffer<b>10–15m</b></span><span>Confidence<b>{travelMode === 'car' ? 'Live' : `${snapshot.confidence}%`}</b></span><span>Data refresh<b>5 min</b></span></div></article>
      <article className="panel full"><div className="panel-title"><MapPin size={18}/> Emma decision engine</div><h2>{travelMode === 'car' ? `Navigate with Waze to ${carRoute.destination}.` : snapshot.decision}</h2><p>Generated {new Date(snapshot.generatedAt).toLocaleString('en-GB', { timeZone: 'Europe/Amsterdam' })}. Car mode persists for the current Amsterdam calendar day and resets automatically tomorrow.</p></article>
    </section>
  </main>;
}
