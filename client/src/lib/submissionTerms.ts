// Submission terms shown in the "Read terms" modal on the project submission
// form, keyed by program slug. A program with no entry shows no terms gate.
// Authored as markdown and rendered with MarkdownBody. No em-dashes.

const TERMS_BY_SLUG: Record<string, { title: string; body: string }> = {
  "bitrefill-2026": {
    title: "PROMPT x PURCHASE Bitrefill Hackathon: Submission Terms",
    body: `By submitting a project to the PROMPT x PURCHASE Bitrefill hackathon, you confirm that you have read and agree to the following.

### Eligibility

- You attended the hackathon in person.
- Your submission is made through Stadium before the submission deadline (6:00 PM).

### Valid submission

To be eligible for judging, your submission must:

- Use at least one Bitrefill surface (MCP, CLI, Agent Skills, x402, or the REST API).
- Demonstrate an AI agent completing a real search, buy, and pay flow on Bitrefill by itself, shown working in your demo and not mocked or faked.
- Include your code or repository, a demo video or working link, and complete the feedback form about your experience.
- Be your own (or your team's) original work that you have the rights to.

Submissions that do not meet these requirements may be disqualified.

### Judging

Judges from Bitrefill and WebZero will review all submissions and select the winners. Each submission is scored on use of the Bitrefill tech stack, how well it meets the requirements, and how innovative it is. All judging decisions are final.

You can view all submissions at [stadium.joinwebzero.com/programs/bitrefill-2026](https://stadium.joinwebzero.com/programs/bitrefill-2026) after the event.

### Prizes

Winners will be notified and will receive their prizes by email. You are responsible for providing a valid email address and for claiming your prize.

### Showcasing

You grant Bitrefill and WebZero permission to feature, demo, and publicly highlight your project and team name, including on their channels and as demo references.

### Contact and privacy

You agree that Bitrefill may contact you about your project. The details you provide at submission are used to administer the event, contact participants, and deliver prizes.

### Conduct

Organizers may disqualify any submission that breaks the rules, infringes others' rights, or contains illegal or harmful content.`,
  },
  // PLACEHOLDER: drafted from the event brief. Replace with the 14 Oct Luma
  // sign-up doc text before the real program is created.
  "free-society-hack-2026": {
    title: "Free Society Hack: Submission Terms (PLACEHOLDER)",
    body: `**Placeholder terms for review. The final text comes from the Luma sign-up doc (14 Oct version).**

By submitting a project to the Free Society Hack, you confirm that you have read and agree to the following.

### Eligibility

- You checked in at the hackathon in person at Capital Social, BKC, Mumbai.
- You submit through Stadium before submissions close at midnight IST on Wed 4 Nov (00:00 Thu 5 Nov).

### Point person

- Each project names one point person: the person submitting, using the email they registered with on Luma.
- Prizes are paid to the point person, who is responsible for sharing them with the team.

### Privacy (Zcash) track

To be eligible for Privacy judging, your submission must:

- Work on Zcash testnet with NU7, using shielded Orchard funds via unified addresses.
- Include one testnet transaction id your project created.
- Include a one-line pitch, a demo video of 2 minutes or less (for non-apps it must show it working with Zcash), a public repo with a README, every technology used, and a next milestone for the 30 days with links to anything already started.

Out of scope: Zcash Shielded Assets, mainnet funds, Sprout, v4 transactions, and zcashd wallet RPC.

### Agentic Commerce (by Bitrefill) track

Agentic Commerce entries are judged and paid by Bitrefill under its own criteria. A project may enter and win in both tracks.

### Ecosystem Prize and milestone

- The judges pick two of the five Privacy podium projects (at any prize level) for the Ecosystem Prize. Each is paired with a partner and agrees a 30-day milestone.
- Completing it (agreed by Fri 13 Nov, delivered with a public link and confirmed by the partner by Fri 4 Dec, and shared at a ZecHub Friday Lounge by Fri 4 Dec) releases a further $100 on Fri 11 Dec.
- If the milestone is not completed, you keep your day prize and only the $100 is not released.
- The organisers' decision on whether a milestone is complete is final.

### Judging

Five judges score Privacy projects in Stadium on the published rubric. A project whose average Works score is 0 can't win. All judging decisions are final.

### Contact and follow-up

You agree to receive two short check-in emails (Thu 19 Nov and Fri 4 Dec). Submitted projects are shown publicly on the program page as soon as they are submitted; emails are never shown publicly, and names are hidden if you choose to stay anonymous.

### Conduct

Organisers may disqualify any submission that breaks the rules, infringes others' rights, or contains illegal or harmful content.`,
  },
};

export type SubmissionTerms = { title: string; body: string };

/** Terms for a program's submission form, or null when the program has none. */
export function getSubmissionTerms(slug: string): SubmissionTerms | null {
  return TERMS_BY_SLUG[slug] ?? null;
}
