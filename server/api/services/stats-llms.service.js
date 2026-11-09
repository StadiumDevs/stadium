// llms.txt for the published stats page: everything the page shows, as plain
// text an agent can read and rebuild the page from. Built only from the
// published snapshot (no emails or contact details are in it), versioned and
// timestamped. Mirrored by client/src/lib/statsLlms.ts (the playground and the
// page's DOWNLOAD/COPY buttons); program-stats-parity.test.js checks both agree.

export const STATS_LLMS_FORMAT = 'stats-llms v1';

const TRACKS = [
  { id: 'privacy', label: 'Privacy' },
  { id: 'agentic', label: 'Agentic Commerce' },
];
const SEGMENT_LABELS = { privacy: 'Privacy', both: 'Both tracks', agentic: 'Agentic Commerce only' };
const TABLE_TOOLS = [
  ['noirWallet', 'Noir'],
  ['zcashDevtool', 'devtool'],
  ['zkool', 'zkool'],
  ['zingoCli', 'zingo'],
  ['librustzcash', 'librustzcash'],
  ['pczt', 'PCZT'],
  ['frost', 'FROST'],
];

const list = (projects) => (projects.length ? projects.map((p) => p.title).join(', ') : 'none');
const zipUrl = (zip) => `https://zips.z.cash/zip-${String(zip).padStart(4, '0')}`;
const cell = (v) => String(v ?? '').replace(/\|/g, '/');

/**
 * @param {object} args
 * @param {{ name: string, slug: string }} args.program
 * @param {object} args.stats         the published snapshot
 * @param {string} args.publishedAt   when it was published (ISO)
 * @param {string} args.url           the public stats page URL
 */
export function renderStatsLlms({ program, stats, publishedAt, url }) {
  const out = [];
  const line = (s = '') => {
    out.push(s);
  };
  const review = stats.privacyReview ?? null;

  line(`# ${program.name}: prize winners and submission stats`);
  line();
  line(`Format: ${STATS_LLMS_FORMAT}`);
  line(`Snapshot published: ${publishedAt}`);
  line(`Snapshot generated: ${stats.generatedAt}`);
  if (review) line(`Privacy track tech review: v${review.version.version} (generated ${review.version.generatedDate})`);
  line(`Source: ${url}`);
  line('Public data only: no emails or contact details. Every number is from the published snapshot; a later republish changes the timestamp above.');
  line();

  // Prize winners
  line('## Prize winners');
  for (const t of TRACKS) {
    line();
    line(`### ${t.label}`);
    const winners = stats.winners[t.id] ?? [];
    if (!winners.length) line('No winners announced yet.');
    for (const w of winners) {
      const score = w.score == null ? '' : ` · score ${w.score} / ${stats.scoreMax}`;
      line(`${w.place}. ${w.project.title} · ${w.prize.label} (${w.prize.amount} ${w.prize.currency})${score}${w.ecosystemPrize ? ' · ★ Ecosystem Prize' : ''}`);
    }
    if (t.id === 'agentic') line('Judged by Bitrefill; no Stadium scores.');
  }
  line();

  // Headline numbers
  const h = stats.headline;
  line('## Headline numbers');
  line(`- Submissions: ${h.submissions}`);
  line(`- Hackers: ${h.hackers}`);
  line(`- Teams: ${h.teams}`);
  line(`- Privacy: ${h.byTrack.privacy ?? 0}`);
  line(`- Both tracks: ${h.byTrack.both ?? 0}`);
  line(`- Agentic Commerce only: ${h.byTrack.agentic ?? 0}`);
  line();

  // Tracks and categories
  line('## Submissions per track');
  for (const t of stats.perTrack) line(`- ${t.label}: ${t.count} · ${list(t.projects)}`);
  line();
  line('## Submissions per category, split by track');
  for (const c of stats.perCategory) {
    line(`- ${c.label}: ${c.total}`);
    for (const s of c.segments) if (s.count) line(`  - ${SEGMENT_LABELS[s.track] ?? s.track}: ${s.count} · ${list(s.projects)}`);
  }
  line();

  // Top per category
  line('## Top scored projects per category');
  line(`Judge score out of ${stats.scoreMax}. ★ = prize winner.`);
  for (const c of stats.topByCategory) {
    line();
    line(`### ${c.label}`);
    if (!c.scored.length) line('No scored projects in this category.');
    c.scored.forEach((x, i) => line(`${i + 1}. ${x.winner ? '★ ' : ''}${x.project.title} · ${x.score} / ${stats.scoreMax}`));
    if (c.unscored.length) line(`Not scored yet: ${list(c.unscored)}`);
    if (c.notJudged.length) line(`${stats.unscoredNote}: ${list(c.notJudged)}`);
  }
  line();

  // Top per score criterion
  const byCriterion = (stats.topByCriterion ?? []).filter((c) => c.rows.length);
  if (byCriterion.length) {
    line('## Top projects per score criterion');
    line('Judge score on each rubric criterion, highest first. ★ = prize winner.');
    for (const c of byCriterion) {
      line();
      line(`### ${c.id.charAt(0).toUpperCase()}${c.id.slice(1)} (out of ${c.max})`);
      c.rows.forEach((x, i) => line(`${i + 1}. ${x.winner ? '★ ' : ''}${x.project.title} · ${x.score} / ${c.max}`));
    }
    line();
  }

  // Privacy track tech review
  if (review) renderReview(review, line);

  // Feedback
  line('## Event feedback (anonymized)');
  line(`Ratings from 1 to 5 given with each submission. No names, emails or projects; questions with fewer than ${stats.feedback.minResponses} responses are hidden.`);
  for (const g of stats.feedback.groups) {
    line();
    line(`### ${g.label}`);
    if (g.none) {
      line('No feedback collected');
      continue;
    }
    for (const q of g.questions) {
      if (q.suppressed) line(`- ${q.label}: hidden (too few responses)`);
      else line(`- ${q.label}: avg ${q.avg} · n ${q.n} · ${[5, 4, 3, 2, 1].map((v) => `${v}: ${q.distribution[v]}`).join(', ')}`);
    }
  }
  line();
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

function renderReview(r, line) {
  const h = r.headline;
  const names = (xs) => (xs.length ? xs.join(', ') : 'none');
  const v = r.version;
  line('## Privacy track tech review');
  line(
    `${h.submissions} privacy-track submissions; ${h.readable} of ${h.submissions} repos readable. ${h.noirWallet} use Noir Wallet, ${h.nymRouted} route traffic over Nym (${h.nymBuiltIn} built in, ${h.nymThroughZingo} through zingo-cli), ${h.webzjs} builds on ChainSafe WebZjs, and ${h.upstreamTeams} teams filed ${h.upstreamDuringHack} upstream PRs and issues during the hack.`,
  );
  line(`Counts are use in each project's code; the event's shared template files (AGENTS.md, llms.txt) are not counted. Repos were read as of ${v.reposReadDate}, not at the deadline.`);
  line();
  line('### How projects reach Zcash');
  for (const x of [...r.charts.reach].sort((a, b) => b.projects.length - a.projects.length)) line(`- ${x.label}: ${x.projects.length} · ${names(x.projects)}`);
  line();
  line('### Nym in practice');
  for (const x of r.charts.nym.filter((n) => n.status !== 'Not used')) line(`- ${x.status}: ${x.projects.length} · ${names(x.projects)}`);
  if (r.nymDetails) line(r.nymDetails);
  line();
  line('### ChainSafe WebZjs');
  for (const x of r.charts.webzjs) line(`- ${x.status}: ${x.projects.length} · ${names(x.projects)}`);
  if (r.webzjsNote) line(r.webzjsNote);
  line();
  line('### Agent and crypto building blocks');
  for (const x of [...r.charts.blocks].sort((a, b) => b.projects.length - a.projects.length)) line(`- ${x.label}: ${x.projects.length} · ${names(x.projects)}`);
  line();
  line('### Shielded features used in code');
  line('Keyword hits in code, a coarser test than the charts above; the review gives totals only.');
  for (const f of r.shieldedFeatures) line(`- ${f.feature}: ${f.count} of ${f.of} (search: ${f.search})`);
  line();
  line('### Which ZIPs the projects cite');
  line('The page charts ZIPs cited by 2 or more projects; all cited ZIPs are listed here.');
  for (const z of [...r.zips].sort((a, b) => b.projects.length - a.projects.length || a.zip - b.zip)) {
    line(`- ZIP ${z.zip} · ${z.name}${z.asCited ? ' (as cited)' : ''} · ${z.theme} · ${z.use}: ${z.projects.length} · ${names(z.projects)} · ${zipUrl(z.zip)}`);
  }
  line();
  line('### Projects building on new or draft ZIPs');
  for (const x of r.newZips) {
    const zips = x.zips.map((z) => (z.zip != null ? `${z.label} (${zipUrl(z.zip)})` : z.label)).join(', ');
    line(`- ${names(x.projects)} · ZIPs ${zips} · ${x.what}`);
  }
  line();
  line('### Findings');
  r.findings.forEach((f, i) => line(`${i + 1}. ${f.lead} ${f.text}`));
  line();
  line('### What slowed teams down');
  if (r.frictionNote) line(r.frictionNote);
  for (const f of r.friction) line(`- ${f.theme}: ${f.projects.length} · ${names(f.projects.map((p) => (p.shortName ? p.shortName : `${p.name} (entry not specified)`)))}`);
  line();
  line('### PRs and issues in other repos');
  if (r.upstreamDescription) line(r.upstreamDescription);
  for (const u of r.upstream) {
    const caveat = u.duringHack && r.upstreamCaveats[u.project] ? ` · Note: ${r.upstreamCaveats[u.project]}` : '';
    line(`- ${u.project} · ${u.repo}${u.number != null ? ` #${u.number}` : ''} · ${u.type} · ${u.title} · ${u.status} · ${u.date} · ${u.when} · ${u.url}${caveat}`);
  }
  line();
  line('### Every submission');
  line(`After deadline = latest commit after the 00:00 IST 5 Nov deadline; the review read repos as of ${v.reposReadDate}, so it is not a judging input.`);
  line();
  line(`| Project | Track | Language | ${TABLE_TOOLS.map(([, l]) => l).join(' | ')} | Nym | ZIPs cited | After deadline |`);
  line(`|${' --- |'.repeat(TABLE_TOOLS.length + 6)}`);
  for (const p of r.projects) {
    const track = p.track === 'both' ? 'Both' : 'Privacy';
    if (!p.readable) {
      line(`| ${cell(p.shortName)} | ${track} | Not readable: ${cell(p.notReadableReason)} |${' |'.repeat(TABLE_TOOLS.length + 3)} ${p.afterDeadline ? 'Y' : ''} |`);
      continue;
    }
    const tools = TABLE_TOOLS.map(([k]) => (p.tools[k] ? 'Y' : '')).join(' | ');
    line(`| ${cell(p.shortName)} | ${track} | ${cell(p.language)} | ${tools} | ${cell(p.nym)} | ${p.zips.join(' ')} | ${p.afterDeadline ? `Y (${p.lastCommitIst} IST)` : ''} |`);
  }
  line();
  line('### How this was checked');
  for (const s of r.scope) line(`- ${s}`);
  line(r.countingRule);
  for (const c of r.columnDefinitions) line(`- ${c.column}: ${c.rule}`);
  line(`Version ${v.version} · generated ${v.generated} · by ${v.generatedBy}`);
  if (v.reposRead) line(`Repos read: ${v.reposRead}`);
  if (v.githubSearch) line(`GitHub search: ${v.githubSearch}`);
  line('Changelog:');
  for (const c of v.changelog) line(`- ${c.version} (${c.date}): ${c.text}`);
  line(`Track review v${v.version}, generated ${v.generatedDate} by ${v.generatedBy.split(/[\s(]/)[0]} from repo snapshots.`);
  line();
}
