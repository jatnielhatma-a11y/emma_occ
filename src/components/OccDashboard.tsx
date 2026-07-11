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
function subtractMinutes(time: string | undefined, minutes: number) {
  if (!time) return 'Check roster';
  const [h, m] = time.split(':').map(Number);
  const total = (h * 60 + m - minutes + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

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
    return { origin: isReturn ? work : home, destination: isReturn ? home : work, label: isReturn ? 'Work → Home' : 'Home → Work' };
  }, [snapshot]);

  const shift = snapshot?.currentShift?.commuteRequired ? snapshot.currentShift : snapshot?.nextDuty;
  const carLeaveTime = snapshot ? subtractMinutes(shift?.start, snapshot.driving.durationMinutes + 12) : '—';

  const timeline = useMemo(() => {
    if (!snapshot) return [];
    if (travelMode === 'car') return [
      { time: carLeaveTime, event: `Leave for ${carRoute.label} · ${formatDistance(snapshot.driving.distanceMeters)}`, state: snapshot.driving.trafficDelayMinutes >= 15 ? 'risk' : 'planned' },
      { time: `${snapshot.driving.durationMinutes}m`, event: `Google traffic-aware drive · ${snapshot.driving.condition.toLowerCase()} traffic`, state: 'current' },
      { time: 'ARRIVE', event: `Destination: ${carRoute.destination} · preserve 10–15m buffer`, state: 'target' },
    ];
    return [
      { time: `-${snapshot.walking.first.durationMinutes}m`, event: `Walk ${snapshot.walking.first.from} → ${snapshot.walking.first.to} · ${formatDistance(snapshot.walking.first.distanceMeters)}`, state: 'planned' },
      { time: snapshot.train.departure, event: `${snapshot.train.direct ? 'Direct' : `${snapshot.train.transfers ?? 1}-transfer`} NS train to ${snapshot.train.to}${snapshot.train.platform ? ` · platform ${snapshot.train.platform}` : ''}`, state: snapshot.train.cancelled ? 'risk' : 'current' },
      { time: snapshot.train.arrival, event: `Arrive ${snapshot.train.to}${snapshot.train.arrivalPlatform ? ` · platform ${snapshot.train.arrivalPlatform}` : ''}${snapshot.train.exitSide ? ` · exit ${snapshot.train.exitSide}` : ''}`, state: 'target' },
      { time: `+${snapshot.walking.last.durationMinutes}m`, event: `Walk ${snapshot.walking.last.from} → ${snapshot.walking.last.to} · ${formatDistance(snapshot.walking.last.distanceMeters)}`, state: 'planned' },
    ];
  }, [snapshot, travelMode, carRoute, carLeaveTime]);

  if (!snapshot && loading) return <main className="shell"><div className="panel full"><RefreshCw className="spin"/> Loading Emma OCC live operations…</div></main>;
  if (!snapshot) return <main className="shell"><div className="panel full"><AlertTriangle/> {error || 'No operations data available.'}<button onClick={() => void reload()}>Retry</button></div></main>;

  const carRisk = snapshot.driving.trafficDelayMinutes >= 15 ? 'RED' : snapshot.driving.trafficDelayMinutes >= 6 ? 'AMBER' : 'GREEN';
  const carDecision = snapshot.driving.trafficDelayMinutes >= 15
    ? 'Leave earlier and open Waze for live rerouting.'
    : snapshot.driving.trafficDelayMinutes >= 6
      ? 'Route is viable, but protect the buffer and monitor Waze.'
      : 'Proceed on the fastest live route.';

  return <main className="shell">
    <header className="topbar"><div><p className="eyebrow">Emma OCC v4.5</p><h1>Personal Operations Control Center</h1><p className="subtitle">Roster-first commute execution with Google traffic intelligence, Waze navigation, NS, weather, and backup routing.</p></div><div className="mission-cluster"><StatusBadge value={travelMode === 'car' ? carRisk : snapshot.risk}/><StatusBadge value={travelMode === 'car' ? 'CAR MODE' : snapshot.direction === 'none' ? 'NO COMMUTE' : snapshot.direction.toUpperCase()}/><button className="refresh" onClick={() => void reload()} disabled={loading}><RefreshCw size={16} className={loading ? 'spin' : ''}/> Reload</button></div></header>
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
        <p>Google Routes calculates the traffic-aware ETA and alternatives. Waze remains the live in-car navigator for incidents, hazards, closures, and rerouting.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a className="connect-google" href={wazeLink(carRoute.destination)} target="_blank" rel="noreferrer"><Navigation size={16}/> Open in Waze</a>
          <a className="connect-google" href={googleDrivingLink(carRoute.origin, carRoute.destination)} target="_blank" rel="noreferrer"><MapPin size={16}/> Google Maps backup</a>
        </div>
      </div>}
    </section>

    <section className="summary-grid">
      <article className="panel metric"><div className="panel-title"><CalendarDays size={18}/> Mission</div><h2>{shift ? `${shift.label} ${shift.code}` : 'No duty'}</h2><p>{shift?.start ? `${shift.start}–${shift.end}` : 'No commute required'} · {shift?.detail ?? 'OFF / Vacation'}</p></article>
      <article className="panel metric"><div className="panel-title">{travelMode === 'car' ? <Car size={18}/> : <TrainFront size={18}/>} {travelMode === 'car' ? 'Road traffic' : 'NS train'}</div><h2>{travelMode === 'car' ? `${snapshot.driving.durationMinutes} min · ${snapshot.driving.condition}` : snapshot.train.cancelled ? 'Cancelled' : `${snapshot.train.departure} → ${snapshot.train.arrival}`}</h2><p>{travelMode === 'car' ? `${formatDistance(snapshot.driving.distanceMeters)} · +${snapshot.driving.trafficDelayMinutes} min traffic` : `${snapshot.train.direct ? 'Direct · 0 transfers' : `${snapshot.train.transfers ?? 1} transfer(s)`}${snapshot.train.platform ? ` · platform ${snapshot.train.platform}` : ''}${snapshot.train.arrivalPlatform ? ` → ${snapshot.train.arrivalPlatform}` : ''}`}</p></article>
      <article className="panel metric"><div className="panel-title"><Clock3 size={18}/> Leave time</div><h2>{travelMode === 'car' ? carLeaveTime : `${snapshot.bufferMinutes} min buffer`}</h2><p>{travelMode === 'car' ? 'Traffic-aware ETA + 12 minute protected buffer' : `Target 10–15 min · confidence ${snapshot.confidence}%`}</p></article>
      <article className="panel metric"><div className="panel-title"><ShieldCheck size={18}/> Decision</div><h2>{travelMode === 'car' ? carRisk === 'RED' ? 'Recover now' : carRisk === 'AMBER' ? 'Monitor closely' : 'Proceed' : snapshot.risk === 'RED' ? 'Recover now' : snapshot.risk === 'AMBER' ? 'Monitor closely' : 'Proceed'}</h2><p>{travelMode === 'car' ? carDecision : snapshot.decision}</p></article>
    </section>

    <section className="content-grid">
      <article className="panel wide"><div className="panel-title"><Navigation size={18}/> Door-to-door timeline</div><div className="timeline">{timeline.map((item) => <div className={`timeline-row ${item.state}`} key={`${item.time}-${item.event}`}><time>{item.time}</time><span>{item.event}</span><b>{item.state.toUpperCase()}</b></div>)}</div></article>
      <article className="panel"><div className="panel-title"><Activity size={18}/> Mission confidence</div><div className={`confidence ${(travelMode === 'car' ? carRisk : snapshot.risk).toLowerCase()}`}>{travelMode === 'car' ? snapshot.driving.source === 'live' ? 'LIVE' : 'FALLBACK' : `${snapshot.confidence}%`}</div><p>{travelMode === 'car' ? `${snapshot.driving.alternateRoutes} alternative route(s) · normal ${snapshot.driving.normalDurationMinutes} min` : `${snapshot.train.delayedMinutes} min train delay · ${snapshot.weather.addedWalkingMinutes} min weather penalty`}</p></article>
      <article className="panel wide"><div className="panel-title"><CalendarDays size={18}/> Smart roster</div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Label</th><th>Code</th><th>Detail</th><th>Time</th><th>Commute</th></tr></thead><tbody>{snapshot.roster.map((item) => <tr key={`${item.date}-${item.code}`}><td>{item.date}</td><td>{item.label}</td><td>{item.code}</td><td>{item.detail}</td><td>{item.start ? `${item.start}–${item.end}` : 'All day'}</td><td>{item.commuteRequired ? travelMode === 'car' ? 'Car' : 'Rail' : 'Skipped'}</td></tr>)}</tbody></table></div></article>
      <article className="panel"><div className="panel-title"><MapPin size={18}/> Route intelligence</div><h2>{travelMode === 'car' ? 'Google traffic-aware' : 'Google walking'}</h2><p>{travelMode === 'car' ? `Current ${snapshot.driving.durationMinutes} min · normal ${snapshot.driving.normalDurationMinutes} min.` : `First leg: ${snapshot.walking.first.durationMinutes} min · ${formatDistance(snapshot.walking.first.distanceMeters)}`}</p><p>{travelMode === 'car' ? `Waze handles in-app incident reports and dynamic rerouting.` : `Last leg: ${snapshot.walking.last.durationMinutes} min · ${formatDistance(snapshot.walking.last.distanceMeters)}`}</p></article>
      <article className="panel"><div className="panel-title"><CloudSun size={18}/> Weather</div><h2>{snapshot.weather.severe ? 'Severe impact' : 'Normal / minor impact'}</h2><p>{snapshot.weather.precipitationMm} mm rain · {Math.round(snapshot.weather.windKph)} km/h wind · +{snapshot.weather.addedWalkingMinutes} min</p></article>
      <article className="panel"><div className="panel-title"><Mail size={18}/> Action center</div><h2>{snapshot.emails.length ? `${snapshot.emails.length} item(s)` : 'No critical blockers'}</h2>{snapshot.emails.slice(0,3).map((email) => <p key={`${email.sender}-${email.subject}`}><b>{email.subject}</b><br/>{email.sender}</p>)}</article>
      <article className="panel"><div className="panel-title"><BellRing size={18}/> Operational watch</div><ul className="watch-list"><li><CheckCircle2 size={16}/> Notify only in the 60–90 minute action window</li><li><CheckCircle2 size={16}/> {travelMode === 'car' ? 'Traffic delay and alternative-route changes' : 'Delay, cancellation, or platform change'}</li><li><CheckCircle2 size={16}/> Weather impact and protected buffer</li><li><CheckCircle2 size={16}/> {travelMode === 'car' ? 'Google intelligence; Waze navigation' : 'NS first; 9292 backup'}</li></ul></article>
      <article className="panel wide"><div className="panel-title"><Wifi size={18}/> Integration control</div><div className="integration-list">{snapshot.integrations.map((item) => <div className="integration-row" key={item.name}>{item.source === 'live' ? <Wifi size={16}/> : <WifiOff size={16}/>}<span><b>{item.name}</b><small>{item.message}</small>{item.name === 'Google Calendar' && item.source !== 'live' && <a className="connect-google" href="/api/auth/google/start">Connect Google</a>}</span><StatusBadge value={item.source.toUpperCase()}/></div>)}</div></article>
      <article className="panel"><div className="panel-title"><BarChart3 size={18}/> Mission KPIs</div><div className="kpi-list"><span>Travel mode<b>{travelMode === 'car' ? 'Car' : 'Train'}</b></span><span>Target buffer<b>10–15m</b></span><span>Traffic delay<b>{travelMode === 'car' ? `${snapshot.driving.trafficDelayMinutes}m` : '—'}</b></span><span>Data refresh<b>5 min</b></span></div></article>
      <article className="panel full"><div className="panel-title"><MapPin size={18}/> Emma decision engine</div><h2>{travelMode === 'car' ? carDecision : snapshot.decision}</h2><p>Generated {new Date(snapshot.generatedAt).toLocaleString('en-GB', { timeZone: 'Europe/Amsterdam' })}. Google provides traffic-aware ETA and alternatives; Waze provides live in-navigation incidents, hazards, closures, and rerouting.</p></article>
    </section>
  </main>;
}
