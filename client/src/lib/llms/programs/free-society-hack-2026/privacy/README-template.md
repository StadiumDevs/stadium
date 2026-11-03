<!--
Free Society Hack 2026 — README template: PRIVACY TRACK (Zcash)

Judges read your README while they score. The sections follow the order of the
scoring rubric, so a judge can find each answer without searching.

How to use:
- Copy this file into your repo as README.md.
- Keep every heading. If something doesn't apply, write "N/A".
- Replace each [placeholder] and delete these HTML comments before submitting.
- Entering both tracks? Use this template and add section 5 from the
  Agentic Commerce template ("Agentic commerce with Bitrefill").
- Short and honest beats long and vague.
-->

# [Project name]

> [One line: what it does and for whom. Use the same pitch as your submission form.]

| | |
|---|---|
| **Track** | Privacy |
| **Privacy theme(s)** | [1. Private payment rails / 2. The first five minutes / 3. Privacy beyond the transaction] |
| **What it is** | [web app / mobile app / SDK or library / CLI / agent / other] |
| **Live URL** | [https://… or N/A] |
| **Demo video** | [https://… — 2 to 3 minutes, showing the core flow working end to end] |
| **Testnet txid** | [one shielded testnet txid your project created + https://zexplorer.app/testnet/tx/<txid>] |
| **Team** | [Name (@handle), Name (@handle)] |

---

## 1. The problem and who it's for
<!-- Scored as "Needed". Name a specific user and give evidence of the need. -->

- **User:** [who exactly, e.g. "freelancers in India paid in crypto by foreign clients"]
- **Problem:** [what's broken for them today, in one or two sentences]
- **Evidence:** [links or quotes: a documented ecosystem gap, an issue thread, user conversations, a partner asking for it]

## 2. What it does
<!-- 3 to 5 sentences, plus a screenshot or GIF. -->

[Describe the core flow step by step, from the user's first click to the result they get.]

![screenshot](./docs/screenshot.png)

## 3. Try it in 5 minutes
<!-- Scored as "Easy". A judge should be able to finish the core task alone, following only this section. -->

**Without installing anything:**
1. [Open https://…]
2. [Do X]
3. [You should see Y]

**Run it locally:**

```bash
git clone [repo-url]
cd [repo-folder]
cp .env.example .env   # [list each variable and where to get it, e.g. LIGHTWALLETD_URL, NETWORK=testnet]
[install command]      # e.g. npm install
[run command]          # e.g. npm run dev
```

**Requirements:** [e.g. Node 20+, Rust toolchain, Docker — or "none"]

**Test funds:** [testnet faucet (Fauzec, Valar), or a pre-funded test wallet / seed judges can use — testnet only]

## 4. What actually works
<!-- Scored as "Works". Be precise: anything mocked or manual that isn't listed here costs more than listing it. -->

| Step in the core flow | Status | Evidence |
|---|---|---|
| [e.g. create shielded address] | ✅ real / 🟡 partial / 🔴 mocked | [txid, video timestamp, file link] |
| [e.g. sync wallet via lightwalletd] | [ ] | [ ] |
| [e.g. send shielded payment] | [ ] | [ ] |

**Known limitations:** [what's incomplete, hard-coded or manual right now]

## 5. Privacy and trust
<!-- Scored as "Private". Same four questions as the submission form. Naming a gap doesn't cost points; leaving one out does. -->

1. **What stays private?** [e.g. amounts, sender and receiver are shielded on-chain]
2. **What does the app reveal, and to whom?** [e.g. the server logs email addresses next to payment IDs; the lightwalletd server sees the user's IP]
3. **Who do users have to trust?** [name each party: a hosted lightwalletd, your backend, any third-party API, you as operator]
4. **What would you fix next?** [the most important privacy gap and how you'd close it]

**Viewing key (optional):** [`uviewtest…` + wallet birth height, so judges can see the amount and memo]

## 6. How it's built
<!-- For "Bonus" (original technical or reusable ecosystem contribution). Point judges to the code that matters. -->

- **Technologies used:** [every one, with versions, e.g. zkool_graphql 1.x, lightwalletd, Next.js 15]
- **Architecture:** [a short diagram or 3–4 bullets]

  ```
  [User] → [Frontend / Wallet] → [lightwalletd] → [Zcash testnet]
                               → [Your backend, if any]
  ```

- **Code worth reading:** [`path/to/file.ts`: what it does and why it's interesting]
- **Built during the hack vs before:** [what existed before the hack, if anything]
- **Reusable parts:** [anything others in the ecosystem can use: a library, a fix, a PR upstream]

## 7. What's next (30 days)
<!-- Scored as "Continuing". Concrete steps beat plans. -->

- **Next milestone:** [one concrete deliverable and a date]
- **Who benefits:** [a named user, partner or project]
- **Already started:** [links to an upstream PR, an open issue, a partner thread, a pilot]

## 8. Links

- Repo: [https://github.com/…]
- Demo video: [https://…]
- Live app: [https://…]
- Slides (optional): [https://…]

## Feedback

[Feedback for the Zcash teams: see FEEDBACK.md (what broke, confused or slowed you down). Optional, not scored.]

## License

[MIT / Apache-2.0 / …]

---

<!-- Developer resources — keep the ones you used, delete the rest. -->

## Resources used

- Privacy track brief: https://stadium.joinwebzero.com/programs/free-society-hack-2026/privacy/llms.txt
- Testnet faucets: https://fauzec.com · https://faucet.testnet.valargroup.dev/
- Testnet explorer: https://zexplorer.app (`/testnet/tx/<txid>`)
- lightwalletd: https://github.com/zcash/lightwalletd