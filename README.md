# Emma OCC v4

A tested Next.js Operations Control Center dashboard for roster, commute execution, risk monitoring, KPIs, and decision support.

## Included
- Mission Status: On Schedule / At Risk / Delayed
- Green / Amber / Red risk engine
- Interactive delay and arrival-buffer simulation
- Live-style commute timeline
- Smart roster labels: Late Shift, Night Shift, OFF Day, Vacation
- OFF Day and VL commute suppression
- Operational watch list
- Mission KPIs
- Emma Decision Engine
- Installable PWA metadata

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000

## Production build
```bash
npm install
npm run build
npm start
```

## Deploy on Vercel
1. Unzip the package.
2. Upload the folder that directly contains `package.json`.
3. Import it into Vercel.
4. Framework should detect as **Next.js**.
5. Leave Build Command and Output Directory on Vercel defaults.
6. Deploy.

No `vercel.json` is included or required.

## Current data status
The UI and operational logic are functional. Roster, NS, weather, Calendar, and Gmail are currently represented by local/mock data. The next release can connect secure server-side integrations.
