import type { WeatherRisk } from '../types';
export async function getWeatherRisk(): Promise<WeatherRisk> {
  try {
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=52.16&longitude=5.38&current=precipitation,wind_speed_10m&timezone=Europe%2FAmsterdam';
    const response = await fetch(url, { next: { revalidate: 600 } });
    if (!response.ok) throw new Error(`Weather ${response.status}`);
    const data = await response.json() as { current?: { precipitation?: number; wind_speed_10m?: number } };
    const precipitationMm = data.current?.precipitation ?? 0;
    const windKph = data.current?.wind_speed_10m ?? 0;
    const severe = precipitationMm >= 5 || windKph >= 50;
    const addedWalkingMinutes = severe ? 10 : precipitationMm >= 1 || windKph >= 30 ? 5 : 0;
    return { severe, precipitationMm, windKph, addedWalkingMinutes, source: 'live' };
  } catch { return { severe: false, precipitationMm: 0, windKph: 0, addedWalkingMinutes: 0, source: 'fallback' }; }
}
