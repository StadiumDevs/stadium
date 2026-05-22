import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, Github, ChevronDown } from "lucide-react";

interface Unit {
  unitNumber: string;
  title: string;
  author: string;
  /** Long-form copy. Trimmed to a TL;DR by default; the full text is
   *  revealed by the READ MORE toggle. */
  description: string;
  longDescription?: string;
  track: string;
  isWinner?: boolean;
  isM2?: boolean;
  prize?: string;
  date?: string;
  demoUrl?: string;
  githubUrl?: string;
  projectUrl?: string;
  /** Tech stack chips. Optional — falls through cleanly when absent. */
  techStack?: string[];
  /** Category chips (Gaming, DeFi, etc.). Optional. */
  categories?: string[];
  /** Team size; rendered as a stat chip when ≥ 1. */
  teamSize?: number;
}

interface UnitDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: Unit;
}

/**
 * First sentence (up to `max` chars) of `text`. Pokemon-card-style TL;DR:
 * fast scan, the rest hides behind READ MORE.
 */
const tldr = (text: string | undefined, max = 160): string => {
  if (!text) return "";
  const sentenceMatch = text.match(/^[\s\S]+?[.!?](\s|$)/);
  const first = sentenceMatch ? sentenceMatch[0].trim() : text.trim();
  if (first.length <= max) return first;
  return `${first.slice(0, max - 1).trimEnd()}…`;
};

/** Reusable stat tile — label on top, value bold below. */
function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="lcd px-3 py-2 min-w-0 flex-1">
      <div className="label-hw-dim mb-1 truncate">{label}</div>
      <div className="font-mono text-[14px] text-display tabular-nums truncate">{value}</div>
    </div>
  );
}

export function UnitDetailModal({ open, onOpenChange, unit }: UnitDetailModalProps) {
  const [expanded, setExpanded] = useState(false);
  const fullDescription = unit.longDescription || unit.description;
  const summary = tldr(fullDescription);
  const hasMore = fullDescription && fullDescription.length > summary.length;

  const techChips = (unit.techStack || []).slice(0, 8);
  const categoryChips = (unit.categories || []).slice(0, 4);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="lcd max-w-xl max-h-[88vh] overflow-y-auto p-0">
        {/* Card header — number + date pinned top-left, badges top-right */}
        <DialogHeader className="px-5 pt-5 pb-3">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="label-hw-dim">
              ENTRY {unit.unitNumber}{unit.date && ` · ${unit.date}`}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {unit.isWinner && (
                <span className="bg-display text-shell px-2 py-[2px] font-mono text-[10px] font-bold tracking-[0.12em]">
                  WINNER
                </span>
              )}
              {unit.isM2 && (
                <span className="border border-display text-display px-2 py-[2px] font-mono text-[10px] font-bold tracking-[0.12em]">
                  M2
                </span>
              )}
            </div>
          </div>
          <DialogTitle className="font-display text-3xl md:text-4xl uppercase tracking-tight text-display leading-[0.95]">
            {unit.title}
          </DialogTitle>
          <DialogDescription className="label-hw-dim mt-1">
            BY {unit.author.toUpperCase()}
          </DialogDescription>
        </DialogHeader>

        {/* Stat strip — pokemon-card style: 3-4 tiles at a glance */}
        <div className="px-5 pb-3 flex gap-2">
          <StatTile
            label="TRACK"
            value={<span className="text-[12px]">{unit.track.toUpperCase()}</span>}
          />
          {unit.prize && <StatTile label="PRIZE" value={unit.prize} />}
          {typeof unit.teamSize === "number" && unit.teamSize > 0 && (
            <StatTile label="TEAM" value={unit.teamSize} />
          )}
          {techChips.length > 0 && (
            <StatTile label="STACK" value={techChips.length} />
          )}
        </div>

        {/* TL;DR — first sentence, mono caps for the lead-in arrow */}
        {summary && (
          <div className="px-5 pb-3">
            <p className="text-body leading-relaxed text-sm">
              <span className="label-hw-dim mr-1">▸</span>
              {summary}
            </p>
          </div>
        )}

        {/* Tech chips */}
        {techChips.length > 0 && (
          <div className="px-5 pb-3">
            <div className="label-hw-dim mb-1.5">·STACK</div>
            <div className="flex flex-wrap gap-1">
              {techChips.map((t) => (
                <span
                  key={t}
                  className="border border-hairline text-label-mid bg-panel-deep px-2 py-[1px] font-mono text-[10px] tracking-[0.12em] uppercase"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Category chips — distinct tone (display border) so they don't
            blur into the tech stack row */}
        {categoryChips.length > 0 && (
          <div className="px-5 pb-3">
            <div className="label-hw-dim mb-1.5">·CATEGORIES</div>
            <div className="flex flex-wrap gap-1">
              {categoryChips.map((c) => (
                <span
                  key={c}
                  className="border border-display text-display px-2 py-[1px] font-mono text-[10px] tracking-[0.12em] uppercase"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* READ MORE — preserves the full long-form description for
            anyone who wants it without forcing it on every viewer */}
        {hasMore && (
          <div className="px-5 pb-3">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="label-hw-dim hover:text-display transition-colors duration-150 inline-flex items-center gap-1"
              aria-expanded={expanded}
            >
              {expanded ? "▴ READ LESS" : "▾ READ MORE"}
              <ChevronDown
                className={`h-3 w-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            {expanded && (
              <p className="text-body leading-relaxed text-sm mt-3 whitespace-pre-line">
                {fullDescription}
              </p>
            )}
          </div>
        )}

        {/* Action bar */}
        <div className="border-t border-hairline-subtle px-5 py-3 flex flex-wrap gap-2">
          {unit.demoUrl && (
            <button
              type="button"
              onClick={() => window.open(unit.demoUrl, "_blank", "noopener,noreferrer")}
              className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim px-3 py-2"
            >
              <ExternalLink className="w-3 h-3" />
              VIEW DEMO
            </button>
          )}
          {unit.projectUrl && (
            <a
              href={unit.projectUrl}
              className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-1.5 font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-2"
            >
              PROJECT PAGE
            </a>
          )}
          {unit.githubUrl && (
            <button
              type="button"
              onClick={() => window.open(unit.githubUrl, "_blank", "noopener,noreferrer")}
              aria-label="View on GitHub"
              className="inline-flex items-center justify-center border border-hairline text-label-mid hover:text-display hover:bg-panel-deep w-9 h-9 flex-shrink-0"
            >
              <Github className="w-4 h-4" />
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
