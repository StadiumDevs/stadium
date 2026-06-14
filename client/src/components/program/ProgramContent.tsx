import type { ProgramContentSection } from "@/lib/api";
import { LCDStat } from "@/components/lcd-stat";
import { MarkdownBody } from "@/components/program/MarkdownBody";

/**
 * Renders a program's templatable `content` (ordered, typed sections) as
 * on-brand hardware panels. Mirrors the panel/lcd styling used elsewhere on
 * ProgramDetailPage so curated event content reads as part of the console.
 */
export function ProgramContent({
  sections,
}: {
  sections?: ProgramContentSection[] | null;
}) {
  if (!sections || sections.length === 0) return null;

  return (
    <>
      {sections.map((section, i) => (
        <Section key={i} section={section} />
      ))}
    </>
  );
}

const PanelHeading = ({ title }: { title?: string }) =>
  title ? <div className="label-hw mb-3">·{title.toUpperCase()}</div> : null;

function Section({ section }: { section: ProgramContentSection }) {
  switch (section.type) {
    case "text":
      return (
        <div className="panel p-4 mb-4">
          <PanelHeading title={section.title} />
          <p className="text-body text-base leading-relaxed whitespace-pre-line">
            {section.body}
          </p>
        </div>
      );

    case "markdown":
      return (
        <div className="panel p-4 mb-4">
          <PanelHeading title={section.title} />
          <MarkdownBody>{section.body}</MarkdownBody>
        </div>
      );

    case "steps":
      return (
        <div className="panel p-4 mb-4">
          <PanelHeading title={section.title} />
          <ol className="space-y-2">
            {section.items.map((item, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-mono text-[11px] tracking-[0.12em] text-label-dim border border-hairline bg-panel-deep px-2 py-[1px] leading-none mt-[2px] shrink-0">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-body text-base leading-relaxed">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      );

    case "schedule":
      return (
        <div className="panel p-4 mb-4">
          <PanelHeading title={section.title} />
          <div className="space-y-2">
            {section.rows.map((row, i) => (
              <div
                key={i}
                className="flex items-baseline justify-between gap-3 border-b border-hairline-subtle pb-2 last:border-b-0 last:pb-0"
              >
                <span className="font-mono text-[12px] text-display tabular-nums shrink-0">
                  {row.time}
                </span>
                <span className="text-body text-sm text-right">{row.label}</span>
              </div>
            ))}
          </div>
        </div>
      );

    case "lineup":
      return (
        <div className="panel p-4 mb-4">
          <PanelHeading title={section.title} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {section.items.map((item, i) => (
              <div key={i} className="lcd p-3 space-y-2">
                <div className="font-display text-base tracking-tight text-display uppercase leading-tight">
                  {item.name}
                </div>
                {item.blurb && (
                  <p className="text-body text-sm leading-relaxed">{item.blurb}</p>
                )}
                {item.tryItems && item.tryItems.length > 0 && (
                  <div className="pt-1">
                    <div className="label-hw-dim mb-1">·WHAT YOU'LL TRY</div>
                    <ol className="space-y-1">
                      {item.tryItems.map((t, j) => (
                        <li key={j} className="flex gap-2 text-body text-sm leading-snug">
                          <span className="text-label-dim font-mono text-[11px] shrink-0">
                            {j + 1}.
                          </span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {item.links && item.links.length > 0 && (
                  <div className="flex flex-wrap gap-3 pt-1">
                    {item.links.map((l, j) => (
                      <a
                        key={j}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[11px] tracking-[0.08em] text-display hover:underline break-all uppercase"
                      >
                        {l.label} ▸
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );

    case "stats":
      return (
        <div className="panel p-4 mb-4">
          <PanelHeading title={section.title} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {section.items.map((stat, i) => (
              <LCDStat key={i} value={stat.value} label={stat.label} size="sm" />
            ))}
          </div>
        </div>
      );

    case "feedback":
      return (
        <div className="panel p-4 mb-4">
          <PanelHeading title={section.title} />
          <div className="space-y-2">
            {section.items.map((item, i) => (
              <figure key={i} className="lcd p-3 space-y-2">
                <blockquote className="text-body text-sm leading-relaxed">
                  "{item.quote}"
                </blockquote>
                {(item.product || item.rating || item.recommend !== undefined) && (
                  <figcaption className="flex flex-wrap items-center gap-2">
                    {item.product && (
                      <span className="border border-hairline text-display bg-panel-deep px-2 py-[1px] font-mono text-[10px] tracking-[0.12em] uppercase">
                        {item.product}
                      </span>
                    )}
                    {item.rating && (
                      <span className="border border-hairline text-label-mid px-2 py-[1px] font-mono text-[10px] tracking-[0.12em] uppercase">
                        EASE {item.rating}
                      </span>
                    )}
                    {item.recommend !== undefined && (
                      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.12em] text-label-dim uppercase">
                        <span
                          className={`led led-sm ${item.recommend ? "" : "opacity-30"}`}
                          aria-hidden="true"
                        />
                        {item.recommend ? "WOULD RECOMMEND" : "WOULD NOT"}
                      </span>
                    )}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </div>
      );

    case "cta":
      return (
        <div className="panel p-4 mb-4">
          <PanelHeading title={section.title} />
          <a
            href={section.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim px-4 py-2 uppercase"
          >
            {section.label} ▸
          </a>
        </div>
      );

    default:
      return null;
  }
}
