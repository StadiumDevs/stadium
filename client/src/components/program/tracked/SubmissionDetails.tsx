import type { ReactNode } from "react";
import type { ApiPublicSubmission, JudgedTrack } from "@/lib/api";
import { trackFieldsFor, trackLabel, type ProgramProfile } from "@/lib/programProfiles";
import { formatSurvey } from "@/lib/submissionFeedback";
import { TxCheckBadge, TxidLink } from "./TxCheckBadge";
import { ViewingKeyLine } from "./ViewingKeyLine";

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] gap-1 sm:gap-3 py-2 border-b border-hairline-subtle">
    <dt className="label-hw-dim">{label}</dt>
    <dd className="text-body text-[13px] leading-relaxed min-w-0 break-words">{children}</dd>
  </div>
);

const ExtLink = ({ href, label }: { href: string; label?: string }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-display underline underline-offset-2 break-all">
    {label ?? href}
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

/**
 * Everything a builder submitted (public projection: no emails). With `track`
 * (opened from one track's leaderboard), only that track's fields show.
 */
export function SubmissionDetails({
  profile,
  submission: s,
  track,
}: {
  profile: ProgramProfile;
  submission: ApiPublicSubmission;
  track?: JudgedTrack | null;
}) {
  const d = s.details;
  const show = trackFieldsFor(d.track, track);
  return (
    <dl>
      {/* Some entries came in without a pitch or description (e.g. Z-Pay): say so, don't leave a blank. */}
      {!d.pitch?.trim() && !s.projectBrief?.trim() ? (
        <Row label="DESCRIPTION">
          <span className="text-label-dim">No description submitted</span>
        </Row>
      ) : (
        <>
          <Row label="ONE-LINE PITCH">{d.pitch}</Row>
          <Row label="DESCRIPTION">{s.projectBrief}</Row>
        </>
      )}
      <Row label="TRACK">{trackLabel(profile, d.track)}</Row>
      {show.privacy && d.themes.length > 0 && (
        <Row label="THEMES">
          <Chips items={d.themes} />
        </Row>
      )}
      <Row label="POINT PERSON">{s.submitterName}</Row>
      {d.contact && (
        <Row label="DEMO-DAY CONTACT">
          {d.contact.app === "telegram" ? (
            <ExtLink href={`https://t.me/${d.contact.handle}`} label={`Telegram @${d.contact.handle}`} />
          ) : (
            <ExtLink href={`https://wa.me/${d.contact.handle.replace(/\D/g, "")}`} label={`WhatsApp ${d.contact.handle}`} />
          )}
        </Row>
      )}
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
        {s.videoUrl ? (
          <>
            <ExtLink href={s.videoUrl} />
            {d.demoVideoLength ? <span className="text-label-mid"> · {d.demoVideoLength}</span> : null}
          </>
        ) : (
          <span className="text-label-mid">None (optional for Privacy)</span>
        )}
      </Row>
      <Row label="REPO">
        <ExtLink href={s.githubUrl} />
      </Row>
      <Row label="TECHNOLOGIES">
        <Chips items={d.technologies} />
      </Row>
      {show.privacy && (
        <Row label="TESTNET TX">
          <div className="space-y-1.5">
            <TxCheckBadge check={d.txCheck} />
            {d.testnetTxid && (
              <div>
                <TxidLink txid={d.testnetTxid} explorerUrl={profile.txExplorerUrl} />
              </div>
            )}
            {d.viewingKey && <ViewingKeyLine viewingKey={d.viewingKey} birthHeight={d.birthHeight} />}
            {(d.network || d.pool) && (
              <div className="text-label-mid text-[12px]">{[d.network, d.pool].filter(Boolean).join(" · ")}</div>
            )}
          </div>
        </Row>
      )}
      {show.privacy && (
        <Row label="PRIVACY AND TRUST NOTE">
          {d.privacyNote ? <p className="whitespace-pre-line">{d.privacyNote}</p> : <span className="text-label-mid">None given</span>}
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
      <Row label="FEEDBACK FOR THE ECOSYSTEM">
        {d.frictionNotes ? (
          <p>{d.frictionNotes}</p>
        ) : (
          <span className="text-label-mid">None given</span>
        )}
      </Row>
      {show.agentic && d.bitrefillFeedback && (
        <Row label="BITREFILL FEEDBACK">
          <p><span className="text-label-mid">Worked: </span>{d.bitrefillFeedback.worked}</p>
          <p><span className="text-label-mid">Didn't: </span>{d.bitrefillFeedback.didnt}</p>
        </Row>
      )}
      {show.agentic && formatSurvey(s.feedback).length > 0 && (
        <Row label="BITREFILL SURVEY">
          {formatSurvey(s.feedback).map((r) => (
            <p key={r.label}><span className="text-label-mid">{r.label}: </span>{r.value}</p>
          ))}
        </Row>
      )}
    </dl>
  );
}
