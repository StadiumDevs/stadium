import { useState } from "react";
import type { StatsProject } from "@/lib/programStats";
import type { PrivacyReview, ReviewTools } from "@/lib/privacyReview";
import { cn } from "@/lib/utils";
import { BarList, ChartFrame, Legend, ProjectNames, type BarItem } from "./StatsCharts";

// The privacy track tech review (section 11 of the review file). Every number
// comes from the versioned fixture in the stats snapshot; nothing is computed
// from live repos. Names list on hover/focus like every other chart and link to
// the project page when the row matched a submission that has one.

const GOOD = "hsl(var(--led))";
const WARN = "hsl(var(--warn))";
const BAD = "hsl(var(--destructive))";
const MUTED = "hsl(var(--label-dim))";

const NYM_COLORS: Record<string, string> = {
  "Built in": GOOD,
  "Through zingo-cli": GOOD,
  "Optional proxy setting": WARN,
  "Turned off in zingo-cli build": BAD,
  "Not used": MUTED,
};

/** ZIP themes, in the file's legend order. */
const THEME_COLORS: Record<string, string> = {
  "Payments UX": "hsl(var(--info))",
  "Ironwood and NU7": "hsl(var(--find))",
  Keys: "hsl(var(--led))",
  "Selective disclosure": "hsl(var(--warn))",
  Custody: "hsl(48 90% 62%)",
  "Transaction format": "hsl(var(--display-dim))",
  "Exchange rails": "hsl(175 65% 52%)",
  "Missing primitive": "hsl(var(--label-dim))",
};

type Tone = "good" | "warn" | "bad" | "neutral";
const TONE_CLASS: Record<Tone, string> = {
  good: "border-led text-led",
  warn: "border-warn text-warn",
  bad: "border-destructive text-destructive",
  neutral: "border-hairline text-label-mid",
};

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={cn("inline-block border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.06em] uppercase whitespace-nowrap", TONE_CLASS[tone])} data-testid="status-pill" data-tone={tone}>
      {children}
    </span>
  );
}

const zipUrl = (zip: number) => `https://zips.z.cash/zip-${String(zip).padStart(4, "0")}`;

function ZipLink({ zip, label }: { zip: number; label?: string }) {
  return (
    <a href={zipUrl(zip)} target="_blank" rel="noreferrer" className="text-display underline decoration-dotted underline-offset-2 hover:decoration-solid" data-testid="zip-link">
      {label ?? zip}
    </a>
  );
}

const TH = "py-1 pr-3 whitespace-nowrap";
const TD = "py-1.5 pr-3";

const TABLE_TOOLS: { key: keyof ReviewTools; label: string }[] = [
  { key: "noirWallet", label: "Noir" },
  { key: "zcashDevtool", label: "devtool" },
  { key: "zkool", label: "zkool" },
  { key: "zingoCli", label: "zingo" },
  { key: "librustzcash", label: "librustzcash" },
  { key: "pczt", label: "PCZT" },
  { key: "frost", label: "FROST" },
];

const TRACK_SHORT: Record<string, string> = { privacy: "Privacy", both: "Both" };

export function PrivacyReviewSection({ review, slug }: { review: PrivacyReview; slug: string }) {
  const [howOpen, setHowOpen] = useState(false);
  const h = review.headline;
  const v = review.version;
  const ref = (name: string): StatsProject => review.refs[name] ?? { id: `review:${name}`, title: name, track: null, linkable: false };
  const refsOf = (names: string[]) => names.map(ref);
  const feature = (name: string) => review.shieldedFeatures.find((f) => f.feature === name);
  const memos = feature("Encrypted memos");
  const uas = feature("Unified addresses");
  const privacyOnly = review.projects.filter((p) => p.track === "privacy").length;
  const both = review.projects.length - privacyOnly;
  const webzjsUsers = review.charts.webzjs.find((s) => s.status === "Used (patched build)")?.projects ?? [];
  const generator = v.generatedBy.split(/[\s(]/)[0];
  const deadlineNote = `Latest commit is after the 00:00 IST 5 Nov deadline. This review read repos as of ${v.reposReadDate}; judges scored the deadline state, so the review is not a judging input.`;

  const toolBars = (rows: { key: string; label: string; projects: string[] }[]): BarItem[] =>
    [...rows]
      .sort((a, b) => b.projects.length - a.projects.length)
      .map((r) => ({ key: r.key, label: r.label, value: r.projects.length, projects: refsOf(r.projects) }));

  const zipThemes = new Set<string>();
  const zipBars: BarItem[] = review.zips
    .filter((z) => z.projects.length >= 2)
    .sort((a, b) => b.projects.length - a.projects.length || a.zip - b.zip)
    .map((z) => {
      zipThemes.add(z.theme);
      return {
        key: `zip-${z.zip}`,
        label: `ZIP ${z.zip} · ${z.name}`,
        value: z.projects.length,
        projects: refsOf(z.projects),
        color: THEME_COLORS[z.theme] ?? MUTED,
      };
    });

  const tiles: { label: string; value: number; sub?: string; testId: string }[] = [
    { label: "Use Noir Wallet", value: h.noirWallet, testId: "tile-noir" },
    { label: "Route traffic over Nym", value: h.nymRouted, sub: `${h.nymBuiltIn} built in + ${h.nymThroughZingo} through zingo-cli`, testId: "tile-nym" },
    { label: "Build on WebZjs", value: h.webzjs, sub: webzjsUsers.join(", ") || undefined, testId: "tile-webzjs" },
    { label: "Upstream PRs and issues filed during the hack", value: h.upstreamDuringHack, sub: `from ${h.upstreamTeams} teams`, testId: "tile-upstream" },
  ];

  return (
    <div className="space-y-6 min-w-0" data-testid="privacy-review">
      {/* 1. Intro + counting rule */}
      <div className="text-[13px] text-body space-y-1 max-w-3xl" data-testid="privacy-review-intro">
        <p>
          What the <span className="text-display">{h.submissions}</span> privacy-track submissions ({privacyOnly} Privacy only, {both} in both tracks) built on.{" "}
          <span className="text-display">{h.readable}</span> of {h.submissions} repos were readable. {h.noirWallet} use Noir Wallet, {h.nymRouted} route traffic
          over Nym ({h.nymBuiltIn} built in, {h.nymThroughZingo} through zingo-cli), {h.webzjs} builds on ChainSafe WebZjs, and {h.upstreamTeams} teams filed{" "}
          {h.upstreamDuringHack} upstream PRs and issues during the hack.
          {memos && uas && (
            <>
              {" "}
              Encrypted memos are used in {memos.count} of {memos.of} readable repos, unified addresses in {uas.count} of {uas.of}.
            </>
          )}
        </p>
        <p className="text-label-mid" data-testid="privacy-review-counting-rule">
          Counts are use in each project's code; the event's shared template files (AGENTS.md, llms.txt) are not counted. Repos were read as of {v.reposReadDate},
          not at the deadline.
        </p>
      </div>

      {/* 2. Tiles */}
      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-2" data-testid="privacy-review-tiles">
        {tiles.map((t) => (
          <div key={t.testId} className="border border-hairline p-2" data-testid={t.testId}>
            <dt className="label-hw-dim normal-case">{t.label}</dt>
            <dd className="font-mono text-display text-xl" data-testid="tile-value">
              {t.value}
            </dd>
            {t.sub && <dd className="text-[11px] text-label-dim">{t.sub}</dd>}
          </div>
        ))}
      </dl>

      {/* 3. How projects reach Zcash */}
      <ChartFrame title="How projects reach Zcash" testId="pr-chart-reach">
        <BarList slug={slug} items={toolBars(review.charts.reach)} />
      </ChartFrame>

      {/* 4. Nym */}
      <ChartFrame title="Nym in practice" testId="pr-chart-nym">
        <BarList
          slug={slug}
          items={review.charts.nym.map((s) => ({
            key: s.status,
            label: s.status,
            value: s.projects.length,
            projects: refsOf(s.projects),
            color: NYM_COLORS[s.status] ?? MUTED,
          }))}
        />
        {review.nymDetails && <p className="text-[12px] text-label-mid">{review.nymDetails}</p>}
      </ChartFrame>

      {/* 5. WebZjs */}
      <ChartFrame title="ChainSafe WebZjs" testId="pr-table-webzjs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-[12px] text-body border-collapse">
            <thead>
              <tr className="label-hw-dim text-left">
                <th className={TH}>STATUS</th>
                <th className={TH}>PROJECTS</th>
                <th className={TH}>WHICH</th>
              </tr>
            </thead>
            <tbody>
              {review.charts.webzjs.map((s) => (
                <tr key={s.status} className="border-t border-hairline-subtle align-top">
                  <td className={TD}>
                    <Pill tone={s.status.startsWith("Used") ? "good" : s.status === "Flags it as broken" ? "warn" : "neutral"}>{s.status}</Pill>
                  </td>
                  <td className={cn(TD, "font-mono text-display")}>{s.projects.length}</td>
                  <td className={TD}>
                    <ProjectNames slug={slug} projects={refsOf(s.projects)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {review.webzjsNote && <p className="text-[12px] text-label-mid">{review.webzjsNote}</p>}
      </ChartFrame>

      {/* 6. Agent and protocol building blocks */}
      <ChartFrame title="Agent and crypto building blocks" testId="pr-chart-blocks">
        <BarList slug={slug} items={toolBars(review.charts.blocks)} />
      </ChartFrame>

      {/* 7. Shielded features */}
      <ChartFrame title="Shielded features used in code" testId="pr-chart-features">
        <BarList
          slug={slug}
          max={h.readable}
          items={review.shieldedFeatures.map((f) => ({
            key: f.feature,
            label: f.feature,
            value: f.count,
            valueLabel: `${f.count} of ${f.of}`,
            projects: [],
            empty: `Keyword search in code (${f.search}); the review gives totals only, not project names.`,
          }))}
          hint="Keyword hits in code, a coarser test than the charts above. Hover or focus a bar for the search used."
        />
      </ChartFrame>

      {/* 8. ZIPs cited */}
      <ChartFrame title="Which ZIPs the projects cite" testId="pr-chart-zips">
        <Legend items={review.zipThemes.filter((t) => zipThemes.has(t)).map((t) => ({ label: t, color: THEME_COLORS[t] ?? MUTED }))} />
        <BarList slug={slug} items={zipBars} wideLabels hint="ZIPs cited by 2 or more projects, coloured by theme. Hover or focus a bar to list its projects." />
      </ChartFrame>

      {/* 9. New or draft ZIPs */}
      <ChartFrame title="Projects building on new or draft ZIPs" testId="pr-table-new-zips">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[12px] text-body border-collapse">
            <thead>
              <tr className="label-hw-dim text-left">
                <th className={TH}>PROJECT</th>
                <th className={TH}>ZIPS</th>
                <th className={TH}>WHAT THEY BUILD</th>
              </tr>
            </thead>
            <tbody>
              {review.newZips.map((r, i) => (
                <tr key={i} className="border-t border-hairline-subtle align-top">
                  <td className={TD}>
                    <ProjectNames slug={slug} projects={refsOf(r.projects)} />
                  </td>
                  <td className={cn(TD, "font-mono whitespace-nowrap")}>
                    {r.zips.map((z, j) => (
                      <span key={j}>
                        {j > 0 && ", "}
                        {z.zip != null ? <ZipLink zip={z.zip} label={z.label} /> : z.label}
                      </span>
                    ))}
                  </td>
                  <td className={TD}>{r.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartFrame>

      {/* 10. Findings */}
      <div data-testid="pr-findings">
        <h3 className="label-hw text-display mb-2">FINDINGS</h3>
        <ol className="list-decimal pl-5 space-y-1.5 text-[13px] text-body max-w-3xl">
          {review.findings.map((f) => (
            <li key={f.lead}>
              <span className="text-display">{f.lead}</span> {f.text}
            </li>
          ))}
        </ol>
      </div>

      {/* 11. Friction */}
      <ChartFrame title="What slowed teams down" testId="pr-chart-friction">
        <p className="text-[12px] text-label-mid">{review.frictionNote}</p>
        <BarList
          slug={slug}
          items={review.friction.map((f) => ({
            key: f.theme,
            label: f.theme,
            value: f.projects.length,
            projects: f.projects.map((p) =>
              p.shortName ? ref(p.shortName) : { id: `review:${p.name}`, title: `${p.name} (entry not specified)`, track: null, linkable: false },
            ),
          }))}
        />
      </ChartFrame>

      {/* 12. Upstream PRs and issues */}
      <ChartFrame title="PRs and issues in other repos" testId="pr-table-upstream">
        {review.upstreamDescription && <p className="text-[12px] text-label-mid">{review.upstreamDescription}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[12px] text-body border-collapse">
            <thead>
              <tr className="label-hw-dim text-left">
                <th className={TH}>PROJECT</th>
                <th className={TH}>REPO</th>
                <th className={TH}>TYPE</th>
                <th className={TH}>TITLE</th>
                <th className={TH}>STATUS</th>
                <th className={TH}>DATE</th>
                <th className={TH}>WHEN</th>
              </tr>
            </thead>
            <tbody>
              {review.upstream.map((u) => (
                <tr key={u.url} className="border-t border-hairline-subtle align-top" data-testid="upstream-row">
                  <td className={TD}>
                    <ProjectNames slug={slug} projects={[ref(u.project)]} />
                    {review.upstreamCaveats[u.project] && u.duringHack && (
                      <p className="text-[11px] text-warn mt-1 max-w-[16rem]" data-testid="upstream-caveat">
                        {review.upstreamCaveats[u.project]}
                      </p>
                    )}
                  </td>
                  <td className={cn(TD, "font-mono whitespace-nowrap")}>
                    {u.repo}
                    {u.number != null && ` #${u.number}`}
                  </td>
                  <td className={cn(TD, "whitespace-nowrap")}>{u.type}</td>
                  <td className={TD}>
                    <a href={u.url} target="_blank" rel="noreferrer" className="text-display underline decoration-dotted underline-offset-2 hover:decoration-solid" data-testid="upstream-link">
                      {u.title}
                    </a>
                  </td>
                  <td className={TD}>
                    <Pill tone={u.status === "Merged" ? "good" : u.status === "Not filed" ? "warn" : "neutral"}>{u.status}</Pill>
                  </td>
                  <td className={cn(TD, "font-mono whitespace-nowrap")}>{u.date}</td>
                  <td className={TD}>{u.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartFrame>

      {/* 13. Every submission */}
      <ChartFrame title="Every submission" testId="pr-table-all">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-[12px] text-body border-collapse">
            <thead>
              <tr className="label-hw-dim text-left">
                <th className={TH}>PROJECT</th>
                <th className={TH}>TRACK</th>
                <th className={TH}>LANGUAGE</th>
                {TABLE_TOOLS.map((t) => (
                  <th key={t.key} className={TH}>
                    {t.label.toUpperCase()}
                  </th>
                ))}
                <th className={TH}>NYM</th>
                <th className={TH}>ZIPS CITED</th>
                <th className={TH}>
                  <abbr title={deadlineNote} className="cursor-help no-underline">
                    AFTER DEADLINE
                  </abbr>
                </th>
              </tr>
            </thead>
            <tbody>
              {review.projects.map((p) => (
                <tr key={p.shortName} className="border-t border-hairline-subtle align-top" data-testid="review-row">
                  <td className={cn(TD, "whitespace-nowrap")}>
                    <ProjectNames slug={slug} projects={[ref(p.shortName)]} />
                  </td>
                  <td className={TD}>{TRACK_SHORT[p.track] ?? p.track}</td>
                  {p.readable ? (
                    <>
                      <td className={cn(TD, "whitespace-nowrap")}>{p.language}</td>
                      {TABLE_TOOLS.map((t) => (
                        <td key={t.key} className={cn(TD, "font-mono text-display")}>
                          {p.tools[t.key] ? "Y" : ""}
                        </td>
                      ))}
                      <td className={cn(TD, p.nym === "Not used" ? "text-label-dim" : "text-display")}>{p.nym}</td>
                      <td className={cn(TD, "font-mono")}>
                        {p.zips.map((z, j) => (
                          <span key={z}>
                            {j > 0 && " "}
                            <ZipLink zip={z} />
                          </span>
                        ))}
                      </td>
                    </>
                  ) : (
                    <td className={cn(TD, "text-warn")} colSpan={TABLE_TOOLS.length + 3} data-testid="not-readable">
                      Not readable: {p.notReadableReason}
                    </td>
                  )}
                  <td className={TD}>
                    {p.afterDeadline && (
                      <span title={`${p.lastCommitIst} IST. ${deadlineNote}`} tabIndex={0} className="relative cursor-help" data-testid="after-deadline">
                        <Pill tone="neutral">After deadline</Pill>
                        <span className="sr-only"> {deadlineNote}</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartFrame>

      {/* 14. How this was checked + footer */}
      <details
        id="stats-privacy-review-how"
        open={howOpen}
        onToggle={(e) => setHowOpen((e.currentTarget as HTMLDetailsElement).open)}
        className="border border-hairline p-3 text-[12px] text-body"
        data-testid="pr-how"
      >
        <summary className="label-hw text-display cursor-pointer">HOW THIS WAS CHECKED</summary>
        <div className="mt-3 space-y-3 max-w-3xl">
          <ul className="list-disc pl-5 space-y-1">
            {review.scope.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <p>{review.countingRule}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse">
              <thead>
                <tr className="label-hw-dim text-left">
                  <th className={TH}>COLUMN</th>
                  <th className={TH}>COUNTS WHEN THE CODE…</th>
                </tr>
              </thead>
              <tbody>
                {review.columnDefinitions.map((c) => (
                  <tr key={c.column} className="border-t border-hairline-subtle align-top">
                    <td className={cn(TD, "text-display whitespace-nowrap")}>{c.column}</td>
                    <td className={TD}>{c.rule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            {(
              [
                ["Version", v.version],
                ["Generated", v.generated],
                ["Generated by", v.generatedBy],
                ["Repos read", v.reposRead],
                ["GitHub search", v.githubSearch],
              ] as [string, string | null][]
            )
              .filter(([, x]) => x)
              .map(([k, x]) => (
                <div key={k} className="contents">
                  <dt className="label-hw-dim normal-case">{k}</dt>
                  <dd className="break-words min-w-0">{x}</dd>
                </div>
              ))}
          </dl>
          <div id="stats-privacy-review-changelog">
            <div className="label-hw-dim mb-1">CHANGELOG</div>
            <ul className="space-y-0.5">
              {v.changelog.map((c) => (
                <li key={c.version}>
                  <span className="font-mono text-display">{c.version}</span> ({c.date}): {c.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>
      <p className="label-hw-dim normal-case" data-testid="privacy-review-footer">
        Track review v{v.version}, generated {v.generatedDate} by {generator} from repo snapshots; see{" "}
        <a
          href="#stats-privacy-review-changelog"
          onClick={() => setHowOpen(true)}
          className="underline decoration-dotted underline-offset-2 hover:text-display"
        >
          changelog
        </a>
        .
      </p>
    </div>
  );
}
