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
};

export type SubmissionTerms = { title: string; body: string };

/** Terms for a program's submission form, or null when the program has none. */
export function getSubmissionTerms(slug: string): SubmissionTerms | null {
  return TERMS_BY_SLUG[slug] ?? null;
}
