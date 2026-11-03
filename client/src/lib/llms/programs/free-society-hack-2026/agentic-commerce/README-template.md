<!--
Free Society Hack 2026 — README template: AGENTIC COMMERCE TRACK (Bitrefill)

Judges read your README while they score. The sections follow the order of the
scoring rubric, so a judge can find each answer without searching.

How to use:
- Copy this file into your repo as README.md.
- Keep every heading. If something doesn't apply, write "N/A".
- Replace each [placeholder] and delete these HTML comments before submitting.
- Entering both tracks? Use the Privacy template and add section 5 below
  ("Agentic commerce with Bitrefill") to it.
- Short and honest beats long and vague.
-->

# [Project name]

> [One line: what the agent does and for whom. Use the same pitch as your submission form.]

| | |
|---|---|
| **Track** | Agentic Commerce |
| **Lane** | [1–5 or own idea] |
| **What it is** | [agent / web app / mobile app / SDK or library / CLI / other] |
| **Live URL** | [https://… or N/A] |
| **Demo video** | [https://… — 2 to 3 minutes, showing the agent completing a purchase] |
| **Real purchase invoice ID** | [the Bitrefill invoice ID of the real purchase your agent made] |
| **Team** | [Name (@handle), Name (@handle)] |

---

## 1. The problem and who it's for
<!-- Feeds "How innovative": new triggers, guarantees, endings or users score higher. -->

- **User:** [who exactly, e.g. "travellers who need a local eSIM on arrival"]
- **Problem:** [what's broken for them today, in one or two sentences]
- **Evidence:** [links or quotes: a documented gap, an issue thread, user conversations, a partner asking for it]

## 2. What it does
<!-- 3 to 5 sentences, plus a screenshot or GIF. -->

[Describe the core flow step by step, from the user's request to the agent delivering the purchase.]

![screenshot](./docs/screenshot.png)

## 3. Try it in 5 minutes
<!-- Feeds "Followed the requirements": run it in under 15 minutes, following only this section. -->

**Without installing anything:**
1. [Open https://…]
2. [Ask the agent to X]
3. [You should see Y]

**Run it locally:**

```bash
git clone [repo-url]
cd [repo-folder]
cp .env.example .env   # [list each variable and where to get it, e.g. BITREFILL_API_KEY, MODEL_API_KEY]
[install command]      # e.g. npm install
[run command]          # e.g. npm run dev
```

**Requirements:** [e.g. Node 20+, an MCP-capable client, Docker — or "none"]

**Test accounts / funds:** [Bitrefill test account or API key, prepaid balance, low-value product to buy — whatever a judge needs to complete the flow safely]

## 4. What actually works
<!-- Feeds "Followed the requirements" and "Use of the Bitrefill tech stack": the agent itself must start and complete a real purchase. A mocked or hand-done purchase, or a missing invoice ID, caps Requirements at 1. -->

| Step in the core flow | Status | Evidence |
|---|---|---|
| [e.g. agent searches products] | ✅ real / 🟡 partial / 🔴 mocked | [video timestamp, log, file link] |
| [e.g. agent picks product within budget] | [ ] | [ ] |
| [e.g. agent places and pays for order] | [ ] | [ ] |
| [e.g. code / eSIM delivered to user] | [ ] | [ ] |

**Known limitations:** [what's incomplete, hard-coded or manual right now]

## 5. Agentic commerce with Bitrefill
<!-- Scored as "Followed the requirements", "Use of the Bitrefill tech stack" and "How innovative". -->

- **What the agent does on its own:** [finds → chooses → buys → pays, and where a human steps in]
- **Bitrefill integration:** [which pieces you used — API v2, hosted eCommerce MCP, self-hosted MCP — with links to the code]
- **Payment method:** [e.g. account balance (event credits), lightning, USDC on Base — ZEC isn't accepted]
- **Guardrails:** [max <amount> per purchase and <amount> per day; who approves above that, and how; product allowlist]
- **Purchase proof:** [invoice ID + video timestamp of the agent completing the purchase]
- **What's new here:** [why this isn't just a wrapper around a checkout]

## 6. Data and trust
<!-- Optional but recommended: judges notice agents that handle user data carefully. -->

- **What the agent sees and stores:** [e.g. prompts, order history, delivery email]
- **Who users have to trust:** [Bitrefill, the AI model provider, your backend, you as operator]

## 7. How it's built
<!-- Feeds "Use of the Bitrefill tech stack": the full loop (poll or webhook until delivered), error handling (expired quotes, 429s, failed orders, out of stock). -->

- **Stack:** [e.g. Bitrefill MCP, Claude / other model, Next.js]
- **Architecture:** [a short diagram or 3–4 bullets]

  ```
  [User] → [Frontend / Chat] → [Agent] → [Bitrefill API / MCP]
                                       → [Payment: wallet / balance]
  ```

- **Code worth reading:** [`path/to/agent.ts`: what it does and why it's interesting]
- **Built during the hack vs before:** [what existed before the hack, if anything]
- **Reusable parts:** [anything others can use: a tool, a guardrail module, a PR upstream]

## 8. What's next (30 days)
<!-- Concrete steps beat plans. -->

- **Next milestone:** [one concrete deliverable and a date]
- **Who benefits:** [a named user, partner or project]
- **Already started:** [links to an upstream PR, an open issue, a partner thread, a pilot]

## 9. Links

- Repo: [https://github.com/…]
- Demo video: [https://…]
- Live app: [https://…]
- Slides (optional): [https://…]

## Feedback

[See FEEDBACK.md: what broke, confused or slowed you down with Bitrefill. Required for this track; the best one wins $100.]

## License

[MIT / Apache-2.0 / …]

---

<!-- Developer resources — keep the ones you used, delete the rest. -->

## Resources used

- Agentic Commerce track brief: https://stadium.joinwebzero.com/programs/free-society-hack-2026/agentic-commerce/llms.txt
- Bitrefill developer docs (API v2): https://docs.bitrefill.com
- API key: https://www.bitrefill.com/account/developers
- Hosted eCommerce MCP (OAuth): `https://api.bitrefill.com/mcp` — guide: https://docs.bitrefill.com/docs/ecommerce-mcp
- Development MCP (docs + API for your code editor): https://docs.bitrefill.com/docs/development-mcp
- Self-hostable sample MCP server: https://github.com/bitrefill/bitrefill-mcp-server