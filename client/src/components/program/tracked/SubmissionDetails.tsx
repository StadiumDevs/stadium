import type { ReactNode } from "react";
import type { ApiPublicSubmission } from "@/lib/api";
import { trackLabel, type ProgramProfile } from "@/lib/programProfiles";
import { TxCheckBadge, TxidLink } from "./TxCheckBadge";

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-1 sm:gap-3 py-2 border-b border-hairline-subtle">
    <dt className="label-hw-dim">{label}</dt>
    <dd className="text-body text-[13px] leading-relaxed min-w-0 break-words">{children}</dd>
  </div>
);

const ExtLink = ({ href }: { href: string }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-display underline underline-offset-2 break-all">
    {href}
  </a>
);

const Chips = ({ items }: { items: string[] }) => (
  <div className="flex flex-wrap gap-1">
    {items.map((t) => (
      <span key={t} className="border border-hairline text-label-mid px-2 py-[1px] font-mono text-[10px] tracking-[0.08em]">
        {t}
      </span>
    ))}
  </div>
);

/** Everything a builder submitted (public projection: no emails). */
export function SubmissionDetails({ profile, submission: s }: { profile: ProgramProfile; submission: ApiPublicSubmission }) {
  const d = s.details;
  return (
    <dl>
      <Row label="ONE-LINE PITCH">{d.pitch}</Row>
      <Row label="DESCRIPTION">{s.projectBrief}</Row>
      <Row label="TRACK">{trackLabel(profile, d.track)}</Row>
      {d.themes.length > 0 && (
        <Row label="THEMES">
          <Chips items={d.themes} />
        </Row>
      )}
      <Row label="POINT PERSON">{s.submitterName}</Row>
      <Row label="TEAM">
        {d.team.length === 0 ? (
          <span className="text-label-mid">Solo</span>
        ) : (
          <ul>
            {d.team.map((m) => (
              <li key={m.name}>
                {m.name}
                {m.role ? <span className="text-label-mid"> · {m.role}</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Row>
      <Row label="TYPE">{d.appType}</Row>
      <Row label="PUBLIC URL">{d.publicUrl ? <ExtLink href={d.publicUrl} /> : <span className="text-label-mid">None (not an app)</span>}</Row>
      <Row label="DEMO VIDEO">
        <ExtLink href={s.videoUrl} />
        {d.demoVideoLength ? <span className="text-label-mid"> · {d.demoVideoLength}</span> : null}
      </Row>
      <Row label="REPO">
        <ExtLink href={s.githubUrl} />
      </Row>
      <Row label="TECHNOLOGIES">
        <Chips items={d.technologies} />
      </Row>
      {d.track !== "agentic" && (
        <Row label="TESTNET TX">
          <div className="space-y-1.5">
            <TxCheckBadge check={d.txCheck} />
            {d.testnetTxid && (
              <div>
                <TxidLink txid={d.testnetTxid} explorerUrl={profile.txExplorerUrl} />
              </div>
            )}
            {(d.network || d.pool) && (
              <div className="text-label-mid text-[12px]">{[d.network, d.pool].filter(Boolean).join(" · ")}</div>
            )}
          </div>
        </Row>
      )}
      <Row label="NEXT MILESTONE">
        <div className="space-y-1">
          <p>{d.nextStep}</p>
          {(d.nextStepLinks ?? []).map((l) => (
            <div key={l}>
              <ExtLink href={l} />
            </div>
          ))}
        </div>
      </Row>
      <Row label="FRICTION NOTES">
        {d.frictionNotes ? (
          <div className="space-y-1.5">
            <p>{d.frictionNotes}</p>
            {d.frictionAreas.length > 0 && <Chips items={d.frictionAreas} />}
          </div>
        ) : (
          <span className="text-label-mid">None given</span>
        )}
      </Row>
    </dl>
  );
}
