// Which configured prize tiers belong to a tracked program's judged track.
// A tier labelled with the track's prefix ("Privacy: top prize") belongs to
// that track. A tier with no track prefix ("Zcash ecosystem prize") belongs to
// the program's Ecosystem track. Mirrors client tiersForTrack
// (client/src/lib/programProfiles.ts).

const hasNoTrackPrefix = (label, prefixes) => !Object.values(prefixes).some((p) => label.startsWith(p));

export function tierBelongsToTrack(tier, track, tracked) {
  const prefix = tracked.prizePrefixes[track];
  if (prefix && tier.label.startsWith(prefix)) return true;
  return track === tracked.ecosystem?.track && hasNoTrackPrefix(tier.label, tracked.prizePrefixes);
}

/**
 * How many projects may hold this tier: the configured tierLimits entry, or,
 * for a tier without a track prefix, the number of identical copies saved in
 * the config (two "Zcash ecosystem prize" entries = two winners). Null = no limit.
 */
export function tierLimit(tier, track, tracked, tiers) {
  const configured = tracked.tierLimits?.[track]?.[tier.amount];
  if (configured) return configured;
  if (!hasNoTrackPrefix(tier.label, tracked.prizePrefixes)) return null;
  return tiers.filter((t) => t.label === tier.label && Number(t.amount) === Number(tier.amount) && t.currency === tier.currency).length;
}
