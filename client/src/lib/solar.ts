/**
 * Simple solar curve mapped to the user's local clock time.
 * No geolocation, no astronomical library — just a cosine peaking at solar noon.
 * Sunrise ~6:30am, sunset ~7:30pm, with a 1-hour twilight buffer on each side.
 *
 * Returns a brightness value 0–100 to feed into computePalette.
 */

const SUNRISE = 6.5;
const SUNSET = 19.5;
const SOLAR_NOON = (SUNRISE + SUNSET) / 2;
const HALF_DAY = (SUNSET - SUNRISE) / 2 + 1.0;

export function solarBrightness(date: Date = new Date()): number {
  const hour = date.getHours() + date.getMinutes() / 60;
  const minDay = SUNRISE - 1.0;
  const maxDay = SUNSET + 1.0;

  if (hour < minDay || hour > maxDay) return 0;

  const angle = ((hour - SOLAR_NOON) / HALF_DAY) * (Math.PI / 2);
  return Math.max(0, Math.min(100, Math.round(Math.cos(angle) * 100)));
}

export function phaseLabel(date: Date = new Date()): string {
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour < SUNRISE - 0.5 || hour > SUNSET + 0.5) return 'NIGHT';
  if (hour < SUNRISE + 1.0) return 'DAWN';
  if (hour > SUNSET - 1.0) return 'DUSK';
  if (Math.abs(hour - SOLAR_NOON) < 1.5) return 'NOON';
  return 'DAY';
}
