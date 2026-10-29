/**
 * Developer resources for the Free Society Hack (from the builder doc,
 * "Zcash Developer Resources" and "Bitrefill Developer Resources"). Feeds the
 * program page's Developer resources section and the generated llms.txt.
 *
 * Every `url` was checked to resolve to the named project (29 Oct 2026). A
 * resource with `url: null` could not be confirmed and is shown by name only;
 * the list is in docs/zcash/free-society-hack.md (llms.txt section).
 *
 * Relative imports only: vite.config.ts bundles this at build time.
 */

export type Resource = { name: string; url: string | null; note?: string };
export type StackRow = { building: string; start: Resource[]; note?: string };
export type NeedRow = { need: string; tools: Resource[]; note?: string };

const r = (name: string, url: string | null, note?: string): Resource => ({ name, url, note });

export const ZCASH = {
  intro:
    "Build on testnet with shielded unified addresses, using the SDK for your platform and the tools below.",
  knowFirst: [
    "**Testnet only.** Coins are TAZ (worthless). Unified addresses start `utest1`.",
    "**NU7 is live on testnet:** 25-second average blocks, v4 transactions invalid. Mainnet activation isn't scheduled yet.",
    "**Orchard is sealed.** Since NU6.3, new shielded funds go to the **Ironwood** pool; unified addresses keep working. Ignore old \"use Orchard\" or Sprout tutorials.",
    "**Let the SDK compute fees** (ZIP 317), and treat payments as seen → mined → confirmed, not \"done in 25 s\".",
  ],
  stack: [
    {
      building: "Web app",
      start: [r("WebZjs", "https://github.com/ChainSafe/WebZjs"), r("@zcash/sdk", null, "payment links and QR")],
      note: "Needs a gRPC-web proxy (`docker-compose up` in the WebZjs repo). Unaudited.",
    },
    {
      building: "Android",
      start: [r("Zcash Android Wallet SDK", "https://github.com/zcash/zcash-android-wallet-sdk")],
      note: "Reference app: Zodl Android (https://github.com/zodl-inc/zodl-android).",
    },
    {
      building: "iOS",
      start: [r("Zcash Swift Wallet SDK", "https://github.com/zcash/zcash-swift-wallet-sdk")],
      note: "Reference app: Zodl iOS (https://github.com/zodl-inc/zodl-ios).",
    },
    {
      building: "Rust app, CLI or bot",
      start: [
        r("Zingolib", "https://github.com/zingolabs/zingolib", "quick"),
        r("librustzcash", "https://github.com/zcash/librustzcash", "full control"),
      ],
    },
    {
      building: "Prototyping from the terminal",
      start: [r("zcash-devtool", "https://github.com/zcash/zcash-devtool")],
      note: "Not for production.",
    },
    {
      building: "Agent payments (HTTP 402)",
      start: [r("ZPay", "https://github.com/gustavovalverde/zpay")],
      note: "x402 facilitator plus a spend-limited agent wallet.",
    },
    {
      building: "Your own node",
      start: [
        r("Zebra 7.0.0-rc.0+", "https://github.com/ZcashFoundation/zebra"),
        r("Zakura", "https://github.com/zakura-core/zakura"),
      ],
      note: "Install steps: the Zebra book (https://zebra.zfnd.org/).",
    },
  ] as StackRow[],
  stackNote: "Check each repo supports NU6.3 (Ironwood) and NU7 before you start.",
  local: {
    tool: r("Thus Spoke Zakura", "https://github.com/zcashlabs/thus-spoke-zakura"),
    text: "runs a private Zcash network on your machine with NU7 already on. It has its own faucet, so you get test coins instantly and never hit a limit, and it can mine blocks on demand.",
  },
  testnet: {
    server: "https://testnet.zec.rocks:443",
    faucets: [
      r("Valar", null, "0.125 TAZ a day per network"),
      r("Fauzec", "https://fauzec.com/", "1 TAZ a day per address"),
      r("Jino Labs", null),
    ],
    explorers: [r("Zexplorer", "https://zexplorer.app/"), r("testnet.zcashexplorer.app", "https://testnet.zcashexplorer.app/")],
  },
  payments: [
    "**Ask for the payment.** Create a `zcash:` payment link and QR code (ZIP 321) with the address, amount and an order ID in the memo.",
    "**See that it arrived.** Give your server a *viewing key*: it can see incoming payments but can't spend them. Keep the spending key off the server.",
    "**Confirm it.** Wait until the payment is in a block, and wait longer for larger amounts.",
  ],
  cipherpay: r(
    "CipherPay",
    "https://www.cipherpay.app/",
    "a hosted checkout page that pays straight to your address and calls your server when the payment arrives",
  ),
  more: [
    { need: "Connect a dApp to a browser-extension wallet", tools: [r("Noir Wallet SDK", "https://github.com/NoirWallet/noir-wallet-sdk")], note: "TS SDK and example dApp; the extension has a testnet build." },
    { need: "Zcash inside MetaMask", tools: [r("WebZjs Zcash Snap", "https://github.com/ChainSafe/WebZjs/tree/main/packages/snap")], note: "Use MetaMask Flask for development." },
    {
      need: "Payment links on mobile",
      tools: [
        r("ZIP 321 for Kotlin", "https://github.com/zecdev/zcash-kotlin-payment-uri"),
        r("ZIP 321 for Swift", "https://github.com/zecdev/zcash-swift-payment-uri"),
      ],
      note: "ZecDev.",
    },
    { need: "Validate any address, including unified addresses", tools: [r("zaddr-wasm-parser", "https://github.com/ruzcash/zaddr-wasm-parser")] },
    { need: "Swaps in and out of ZEC", tools: [r("Zcash Router SDK", "https://github.com/nufi-official/zcash-router-sdk")] },
    {
      need: "Shared custody or threshold signing",
      tools: [r("FROST (Zcash Foundation)", "https://frost.zfnd.org/"), r("zcash-ika", "https://github.com/Frontier-Compute/zcash-ika")],
    },
    { need: "Hardware signing", tools: [r("Ledger Zcash Signer Kit", "https://developers.ledger.com/docs/device-interaction/references/signers/zcash")] },
    { need: "Hide app traffic metadata", tools: [r("Nym Zcash SDK", "https://zcash-sdk.nym.com/")], note: "Nym is the host partner for network privacy." },
    { need: "Headless or agent CLI wallet", tools: [r("zcli", null)], note: "`--testnet` flag." },
    { need: "Server-side wallet with RPC", tools: [r("Zallet", "https://zcash.github.io/zallet/"), r("zecd", "https://zecd.org/introduction.html")] },
    {
      need: "Your own light-wallet server or indexer",
      tools: [
        r("Zaino", "https://github.com/zingolabs/zaino"),
        r("lightwalletd", "https://github.com/zcash/lightwalletd"),
        r("Zinder", "https://github.com/ZcashFoundation/zinder", "alpha"),
      ],
    },
    {
      need: "Give an AI agent Zcash tools",
      tools: [r("zcash-mcp", "https://github.com/Frontier-Compute/zcash-mcp")],
      note: "`npx @frontiercompute/zcash-mcp`; read-only, attestations, no spending.",
    },
  ] as NeedRow[],
  moreNote: "Most of these are community or early-stage projects: fine for a hack, but get a review before handling real money.",
  learn: [
    r("ZecHub developer hub", "https://zechub.wiki/developers", "the curated map of docs, SDKs and nodes"),
    r("Zcash docs", "https://zcash.readthedocs.io/"),
    r("ZIP 316 (unified addresses)", "https://zips.z.cash/zip-0316"),
    r("ZIP 317 (fees)", "https://zips.z.cash/zip-0317"),
    r("ZIP 321 (payment URIs)", "https://zips.z.cash/zip-0321"),
    r("ZecHub tutorials", "https://zechub.wiki/guides"),
    r("ZecDev developer tools", "https://github.com/zecdev"),
    r("ZecHub Hackathon 3.0 projects", "https://zechub.wiki/hackathon", "to fork or extend"),
    r("\"What are you building on Zcash?\"", null, "ideas and collaborators"),
  ],
  help: [
    r("Mentors at the venue", null),
    r("#zechub on the Zcash Discord", "https://discord.gg/zcash"),
    r("Zcash Community Forum", "https://forum.zcashcommunity.com/"),
  ],
};

export const BITREFILL = {
  intro: "Build an agent that finds, buys and pays for real products through Bitrefill on its own.",
  knowFirst: [
    "**Use at least one Bitrefill surface** below: MCP, CLI, Agent Skills, x402 or the REST API.",
    "**The agent makes the purchase**, and it must work for real in your demo, not mocked.",
    "**Use test products.** Never pay for them with real money or store credit: both are still charged.",
    "**What you need:** an agent that can run an MCP server, or a free general-purpose CLI. A laptop helps but isn't required.",
  ],
  surfaces: [
    {
      surface: r("Agent Skills (bitrefill/agents)", "https://github.com/bitrefill/agents"),
      start: "`npx skills add bitrefill/agents`, or install as a Claude Code / Cowork plugin",
      bestFor: "The fastest start: give an existing agent Bitrefill shopping skills",
    },
    {
      surface: r("eCommerce MCP", "https://docs.bitrefill.com/docs/ecommerce-mcp"),
      start: "Hosted at `api.bitrefill.com/mcp` (OAuth), or self-host bitrefill-mcp-server (https://github.com/bitrefill/bitrefill-mcp-server)",
      bestFor: "Any MCP-capable agent; can pay with crypto directly, not only from account balance",
    },
    {
      surface: r("CLI (@bitrefill/cli)", "https://github.com/bitrefill/cli"),
      start: "`npm install -g @bitrefill/cli`",
      bestFor: "Scripts, scheduled jobs and terminal agents",
    },
    {
      surface: r("x402 payments", null),
      start: "Purchase responses include an `x402_payment_url` the agent pays on its own; settles USDC on Base and other chains",
      bestFor: "Fully autonomous payment, no human checkout",
    },
    {
      surface: r("REST API", "https://docs.bitrefill.com/docs/api-overview"),
      start: "Personal, Business and Affiliate tiers (quickstart: https://docs.bitrefill.com/docs/quickstart-2)",
      bestFor: "Full control in your own backend",
    },
  ],
  agentGuide: r("Partner Integration Guide (build an agent on Bitrefill's MCP)", "https://docs.bitrefill.com/docs/mcp-partner-integration-guide"),
  docsIndex: r("Bitrefill docs llms.txt", "https://docs.bitrefill.com/llms.txt"),
  testing: [
    "**API test products:** https://docs.bitrefill.com/docs/test-products",
    "**MCP test product:** `delos-syldavia`",
    "All crypto payment methods work with test products. They're delivered after about 5 seconds, so you can see and handle the pending state.",
    "Further along? Ask Bitrefill for test credits on your test account to order real products.",
  ],
  help: "Bitrefill mentors are on site on hack day.",
};

/** Resources that could not be confirmed (no link shown). */
export const unverifiedResources = (): string[] =>
  [
    ...ZCASH.stack.flatMap((s) => s.start),
    ...ZCASH.testnet.faucets,
    ...ZCASH.more.flatMap((m) => m.tools),
    ...ZCASH.learn,
    ...BITREFILL.surfaces.map((s) => s.surface),
  ]
    .filter((x) => x.url === null)
    .map((x) => x.name);

/** "[name](url)" or the bare name when unconfirmed, plus an optional note. */
export const mdLink = (x: Resource, withNote = true) =>
  `${x.url ? `[${x.name}](${x.url})` : x.name}${withNote && x.note ? ` (${x.note})` : ""}`;
