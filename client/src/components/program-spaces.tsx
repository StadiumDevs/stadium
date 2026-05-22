import { Link } from "react-router-dom";
import { Zap, Lightbulb, Eye, Mic, type LucideIcon } from "lucide-react";
import type { ApiProgram } from "@/lib/api";

type Space = {
  type: ApiProgram["programType"];
  label: string;
  blurb: string;
  href: string;
  Icon: LucideIcon;
};

// The four evergreen program types. M2 has its own dedicated page; the others
// deep-link into the /programs directory filtered by type.
const SPACES: Space[] = [
  {
    type: "hackathon",
    label: "HACKATHONS",
    blurb: "Weekend build sprints on Polkadot: ship something new, win bounties.",
    href: "/programs?type=hackathon",
    Icon: Zap,
  },
  {
    type: "m2_incubator",
    label: "M2 INCUBATOR",
    blurb: "Keep building what you shipped, with a mentor and a defined Milestone 2.",
    href: "/m2-program",
    Icon: Lightbulb,
  },
  {
    type: "dogfooding",
    label: "DOGFOODING",
    blurb: "Hands-on sessions where builders trade real, structured feedback.",
    href: "/programs?type=dogfooding",
    Icon: Eye,
  },
  {
    type: "pitch_off",
    label: "PITCHOFF",
    blurb: "Builders pitch live to the room, and the crowd picks what's next.",
    href: "/programs?type=pitch_off",
    Icon: Mic,
  },
];

/**
 * Landing-page entry point to all WebZero programs: one "space" per program
 * type, with a culture blurb. Counts are derived from the programs already
 * loaded by HomePage (no extra fetch).
 */
export function ProgramSpaces({ programs }: { programs: ApiProgram[] }) {
  const countFor = (t: ApiProgram["programType"]) =>
    programs.filter((p) => p.programType === t).length;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-hairline">
        <div className="label-hw text-display flex items-center gap-2">
          <span className="led led-sm led-pulse" aria-hidden="true" /> ·PROGRAMS / WHAT WE DO
        </div>
      </div>
      <p className="text-body text-sm md:text-base max-w-2xl leading-relaxed mb-3">
        WebZero is where the best people come together in the same room to explore their creative
        potential and build something cool. Each program is tied to a specific event, with prizes
        ranging from cash to event tickets to exclusive merch.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {SPACES.map(({ type, label, blurb, href, Icon }) => {
          const count = countFor(type);
          return (
            <Link
              key={type}
              to={href}
              className="lcd block px-4 py-4 transition-transform duration-150 hover:-translate-y-[1px]"
            >
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 text-display flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="font-display text-2xl uppercase tracking-tight text-display leading-none mb-1">
                    {label}
                  </div>
                  <p className="text-[12px] text-body leading-[1.6] mb-2">{blurb}</p>
                  <div className="flex items-center justify-between">
                    <span className="label-hw-dim">
                      {count > 0 ? `·${count} ${count === 1 ? "EVENT" : "EVENTS"}` : "·COMING SOON"}
                    </span>
                    <span className="label-hw-dim" aria-hidden="true">▸</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
