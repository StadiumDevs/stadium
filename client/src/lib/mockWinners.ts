/**
 * Preview-mode fixture data.
 *
 * Sourced from a public production API snapshot (stadium-production-996a.up.railway.app)
 * taken 2026-04-15, then sanitized: wallet addresses and
 * tx hashes replaced with placeholders; totalPaid zeroed. All other fields are public
 * data already visible on stadium.joinwebzero.com and retained to give previews a
 * realistic dataset.
 *
 * Regenerate by re-running the snapshot script (see docs/AGENT_GUIDE.md deployment section
 * or commit history for the most recent regeneration).
 *
 * Consumed by client/src/lib/api.ts when VITE_USE_MOCK_DATA=true.
 */

export type MockApiProject = {
  id: string;
  projectName: string;
  description?: string;
  teamMembers?: Array<{ name: string; walletAddress?: string; role?: string; twitter?: string; github?: string; linkedin?: string; customUrl?: string }>;
  projectRepo?: string;
  demoUrl?: string;
  slidesUrl?: string;
  liveUrl?: string | null;
  donationAddress?: string;
  bountyPrize?: Array<{ name: string; amount: number; hackathonWonAtId: string; txHash?: string; currency?: string }>;
  techStack?: string[];
  categories?: string[];
  hackathon?: { id: string; name: string; endDate: string; eventStartedAt?: string };
  projectState?: string;
  bountiesProcessed?: boolean;
  m2Status?: 'building' | 'under_review' | 'completed';
  completionDate?: string | null;
  submittedDate?: string | null;
  updatedAt?: string;
  milestones?: Array<Record<string, unknown>>;
  totalPaid?: number;
  finalSubmission?: {
    repoUrl?: string;
    demoUrl?: string;
    docsUrl?: string;
    summary?: string;
    submittedDate?: string;
  };
  m2Agreement?: {
    mentorName?: string | null;
    agreedDate?: string;
    agreedFeatures?: string[];
    documentation?: string[];
    successCriteria?: string | null;
    lastUpdatedBy?: string;
    lastUpdatedDate?: string;
  };
  changesRequested?: {
    feedback: string;
    requestedBy: string;
    requestedDate: string;
  };
};

export const mockWinningProjects: MockApiProject[] = [
  {
    "id": "plata-mia-15ac43",
    "projectName": "Plata Mia",
    "description": "Crosschain privacy solution using stealth addresses",
    "projectRepo": "https://github.com/catmcgee/plata-mia",
    "demoUrl": "https://share.descript.com/view/Xyq1SJTQfkS",
    "slidesUrl": "https://www.canva.com/design/DAG40G9GAUU/JSJZmsjNiAjyTUBHUkzG5g/edit?utm_content=DAG40G9GAUU&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Milestone Delivered",
    "bountiesProcessed": true,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": "completed",
    "m2Agreement": {
      "mentorName": null,
      "agreedDate": "2026-01-08T00:00:00+00:00",
      "agreedFeatures": [
        "Week 1–2: Wallet Connector + Stealth Identity Module — Users activate Stealth Mode from Polkadot wallet (Talisman/Subwallet). Module derives & stores stealth keys, manages stealthId, syncs with vault contract. Who: Cat McGee",
        "Week 1–2: Wallet Stealth Balance Panel — Assets tab → Stealth Balance shows PAS funds via Hyperbridge. Who: Frontend Engineer (friend)",
        "Week 2–3: Wallet Notification Bridge (xx → Wallet Inbox API) — Notifications in wallet native inbox; xx network for metadata privacy. Who: Backend Engineer (friend)",
        "Week 2–3: XCM Pay-with-Stealth UI — Pay invoices on any chain using stealth balances on Asset Hub (Hyperbridge). Who: Cat McGee",
        "Week 3–4: Stealth Top-Up (Swap → Deposit → Stealth) — Convert wallet assets to stealth balances in one action. Who: Cat McGee",
        "Week 3–4: Production xx Notification Microservice — Multiple recipients, topic routing, wallet inbox adapters, rate limiting & retry. Who: Backend Engineer (friend)"
      ],
      "documentation": [],
      "successCriteria": null,
      "lastUpdatedBy": "admin",
      "lastUpdatedDate": "2026-02-09T08:35:10.885+00:00"
    },
    "finalSubmission": {
      "repoUrl": "https://github.com/the-pines/plata-mia",
      "demoUrl": "https://plata-mia.vercel.app/",
      "docsUrl": "https://the-pines.github.io/plata-mia/overview",
      "summary": "During the development of the second Milestone we achieve the following:\n\n- WebApp completely functional adapted for mobile & desktop devices\n- xx-network backend built in go with all instructions and dockerization for local execution if opt\n- Package with all cryptography primitives for stealth addresses implementation published as \"stealth core\"\n- Live docs explaining both how to use Plata Mia, its architecture and what are stealth addresses\n- Smart contract deployed in Asset Hub integrated with the webapp\n- Hyperbridge integration for stealth transfer cross-chain",
      "submittedDate": "2026-03-05T19:58:37.934+00:00",
      "submittedBy": "5HBCVkNe72oVAYyNUsC8WgM4CeAWqLJCfKyUkM9cmUABydcz"
    },
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-04-09T21:48:34.781284+00:00",
    "teamMembers": [
      {
        "name": "Cat (updated)",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": null,
        "role": "Admin",
        "twitter": null,
        "github": null,
        "linkedin": null
      },
      {
        "name": "Nacho",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": null,
        "role": "Admin",
        "twitter": "ziginiz",
        "github": null,
        "linkedin": null
      },
      {
        "name": "Test Harness (preview only)",
        "walletAddress": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
        "customUrl": null,
        "role": "Team",
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "IDEA-THON main track",
        "amount": 4000,
        "hackathonWonAtId": "symbiosis-2025"
      },
      {
        "name": "Hyperbridge",
        "amount": 500,
        "hackathonWonAtId": "symbiosis-2025"
      },
      {
        "name": "xx Network",
        "amount": 1000,
        "hackathonWonAtId": "symbiosis-2025"
      }
    ],
    "milestones": [],
    "totalPaid": [
      {
        "milestone": "M1",
        "amount": 2000,
        "currency": "USDC",
        "transactionProof": "https://assethub-polkadot.subscan.io/extrinsic/10496453-2",
        "bountyName": null,
        "paidDate": "2025-11-22T00:00:00+00:00"
      }
    ]
  },
  {
    "id": "obraclara-98b0e9",
    "projectName": "ObraClara",
    "description": "ObraClara is a digital platform designed to modernize the management of Service Orders (OS) and Request Notes (NP) in public infrastructure projects.\n\nToday, these processes rely on WhatsApp messages, scattered PDFs, and physical logbooks, leading to loss of traceability, legal risks, delays, and low operational transparency.\n\nThe platform centralizes the registration, tracking, and validation of critical project documents.\n\nIt incorporates:\n- Automated digitalization of OS/NP through uploads of photos, PDFs, text, or voice.\n- Immutable blockchain traceability, storing document hashes to guarantee authenticity and prevent tampering.\n- Automated alerts for deadlines and critical response windows.\n- AI-powered search, enabling users to find historical records, justify delays, audit processes, or generate reports in seconds.\n- A unified dashboard for site managers and construction company owners.\n\nObraClara reduces operational time, eliminates document loss, strengthens transparency, and provides reliable legal evidence for audits and public oversight. It is a scalable solution for construction companies and municipalities, aligned with modern standards of public and private sector management.",
    "projectRepo": "https://github.com/chulista/hacksub0.obra-clara.git",
    "demoUrl": "https://youtu.be/00FERndF9Rw",
    "slidesUrl": "https://docs.google.com/presentation/d/1RyJv-ST3eSlvFXZlR7SOaVAwotoWy2GKRQ9r5jj8THw/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": "completed",
    "m2Agreement": {
      "mentorName": null,
      "agreedDate": "2026-02-09T08:34:58.467+00:00",
      "agreedFeatures": [],
      "documentation": [],
      "successCriteria": null,
      "lastUpdatedBy": null,
      "lastUpdatedDate": null
    },
    "finalSubmission": {
      "repoUrl": "https://github.com/obra-clara/ink-documents-contract",
      "demoUrl": "https://youtu.be/_4Z4MabWh8E",
      "docsUrl": "https://github.com/chulista/hacksub0.obra-clara/blob/main/README.md",
      "summary": "Milestone 2 completed. Smart contract repository: ink-documents-contract. Full details in MILESTONE-2-COMPLETED.md in hacksub0.obra-clara repo.",
      "submittedDate": "2026-01-20T00:00:00+00:00",
      "submittedBy": null
    },
    "completionDate": "2026-01-20T00:00:00+00:00",
    "submittedDate": null,
    "updatedAt": "2026-03-12T13:34:03.891798+00:00",
    "teamMembers": [
      {
        "name": "Omar",
        "customUrl": null,
        "role": "Lead Developer",
        "twitter": null,
        "github": null,
        "linkedin": null
      },
      {
        "name": "Paulino",
        "customUrl": null,
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      },
      {
        "name": "Anita",
        "customUrl": null,
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "IDEA-THON main track",
        "amount": 4000,
        "hackathonWonAtId": "symbiosis-2025"
      }
    ],
    "milestones": [],
    "totalPaid": [
      {
        "milestone": "M1",
        "amount": 2000,
        "currency": "USDC",
        "transactionProof": "https://assethub-polkadot.subscan.io/extrinsic/10496453-2",
        "bountyName": null,
        "paidDate": "2025-11-22T00:00:00+00:00"
      },
      {
        "milestone": "M2",
        "amount": 2000,
        "currency": "USDC",
        "transactionProof": "https://assethub-polkadot.subscan.io/extrinsic/11315030-5",
        "bountyName": null,
        "paidDate": "2026-01-20T00:00:00+00:00"
      }
    ]
  },
  {
    "id": "kleo-protocol-53c76f",
    "projectName": "Kleo Protocol",
    "description": "In LATAM, getting a micro loan is slow and insanely inefficient, that's why people resort to shark loans. We're fixing that.\n\nKleo is a DeFi lending/borrowing protocol that is based around trust and mathematics, that way borrowers don't need collateral, just people who to trust.\n\nThis PoC (almost complete) was built with POP Scaffold, ink! contracts and Next.js frontend.",
    "projectRepo": "https://github.com/Kleo-Protocol/",
    "demoUrl": "https://youtu.be/8dBzYAqTVug",
    "slidesUrl": "https://www.canva.com/design/DAG4yhOUStE/2cN9f7x5xkyVzw9d0PPkNQ/edit?utm_content=DAG4yhOUStE&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    "liveUrl": "https://kleo.finance/",
    "techStack": [],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": "completed",
    "m2Agreement": {
      "mentorName": null,
      "agreedDate": "2026-02-09T08:34:58.467+00:00",
      "agreedFeatures": [],
      "documentation": [],
      "successCriteria": null,
      "lastUpdatedBy": null,
      "lastUpdatedDate": null
    },
    "finalSubmission": {
      "repoUrl": "https://github.com/Kleo-Protocol",
      "demoUrl": "https://youtu.be/i9du6iR0uiI",
      "docsUrl": "https://deepwiki.com/Kleo-Protocol/kleo-contracts",
      "summary": "Loan event standardization with schema for indexing. Full repayment system with on-chain transfers. Protocol update using pools and vouchers (no collateral). Kleo SDK public on npm (@kleo-protocol/kleo-sdk). Full Kleo beta on Paseo Asset Hub with PAS tokens. Repos: kleo-dapp, kleo-contracts, kleo-sdk, kleo-landing-page. Live at kleo.finance.",
      "submittedDate": "2026-01-31T00:00:00+00:00",
      "submittedBy": null
    },
    "completionDate": "2026-01-31T00:00:00+00:00",
    "submittedDate": null,
    "updatedAt": "2026-03-05T14:27:55.664449+00:00",
    "teamMembers": [
      {
        "name": "Santiago Villarreal",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": null,
        "role": "Developer",
        "twitter": null,
        "github": null,
        "linkedin": null
      },
      {
        "name": "Fabián Sánchez",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": null,
        "role": "Developer",
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "SHIP-A-THON main track",
        "amount": 4000,
        "hackathonWonAtId": "symbiosis-2025"
      }
    ],
    "milestones": [],
    "totalPaid": [
      {
        "milestone": "M1",
        "amount": 2000,
        "currency": "USDC",
        "transactionProof": "https://assethub-polkadot.subscan.io/extrinsic/10496453-2",
        "bountyName": null,
        "paidDate": "2025-11-22T00:00:00+00:00"
      },
      {
        "milestone": "M2",
        "amount": 2000,
        "currency": "USDC",
        "transactionProof": "https://assethub-polkadot.subscan.io/extrinsic/11561829-4",
        "bountyName": null,
        "paidDate": "2026-01-31T00:00:00+00:00"
      }
    ]
  },
  {
    "id": "openarkiv-8bc72d",
    "projectName": "OpenArkiv",
    "description": "OpenArkiv is a resilient, censorship-proof data submission protocol that works even when the internet is intentionally shut down. Built by forking and extending the decentralized mesh architecture of BitChat, OpenArkiv enables encrypted payloads to hop across nearby devices via Bluetooth—no servers, SIM cards, or connectivity required. Data continues propagating through this mesh until it reaches a Beacon device, which has intermittent internet access. The Beacon verifies and optionally signs the submission, then publishes it to Arkiv, a blockchain-native database built on Ethereum. Arkiv ensures that every submitted message becomes a permanent, verifiable, and queryable record, protected from tampering or state censorship.\nOpenArkiv supports two user modes:\nSigned Mode (Journalists): Payloads are signed using a biometric-derived wallet and tagged with GPS and timestamps for credibility and provenance.\nWhistleblower Mode (Anonymous): Powered by the xxDK privacy layer, this mode strips all metadata and enables fully anonymous submissions, even under heavy surveillance.\nBy combining offline mesh networking, cryptographic identity, anonymous messaging, and decentralized storage, OpenArkiv creates a trustworthy pipeline for journalists, activists, and citizens to get crucial information out of blackout zones and onto a provably immutable public ledger.",
    "projectRepo": "https://github.com/orgs/OpenArkiv/repositories",
    "demoUrl": "https://www.canva.com/design/DAG43q0bFZ8/PsfBO_qDOAY5n0W6nBTqYQ/watch?utm_content=DAG43q0bFZ8&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hf1176f2881",
    "slidesUrl": "https://pitch.com/v/open-arkiv-7qnk9q",
    "liveUrl": "https://openarkiv.vercel.app",
    "techStack": [],
    "categories": [
      "Privacy",
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": "completed",
    "m2Agreement": {
      "mentorName": null,
      "agreedDate": "2026-02-09T08:34:58.467+00:00",
      "agreedFeatures": [],
      "documentation": [],
      "successCriteria": null,
      "lastUpdatedBy": null,
      "lastUpdatedDate": null
    },
    "finalSubmission": {
      "repoUrl": "https://github.com/OpenArkiv",
      "demoUrl": "https://youtu.be/zQvZUBh5aco",
      "docsUrl": "https://github.com/OpenArkiv",
      "summary": "Refactored and initialized the codebase for scalability. Designed and tested multi-hop architecture for routing payloads across n devices. Validated multi-hop flows with BitChat architecture and test cases. Implemented Open Attestation schema on Arkiv with location coordinates. Refactored device key generation and signature flows for secure multi-device usage. Began media support and base64 encoding strategies. Advanced planning and partial implementation of encrypted payload flows. Created new landing site with sideloading instructions and shipped release file for OpenArkiv app installation.",
      "submittedDate": "2026-02-04T00:00:00+00:00",
      "submittedBy": null
    },
    "completionDate": "2026-02-04T00:00:00+00:00",
    "submittedDate": null,
    "updatedAt": "2026-02-09T08:35:02.223152+00:00",
    "teamMembers": [
      {
        "name": "Fabian",
        "customUrl": null,
        "role": "Developer",
        "twitter": null,
        "github": null,
        "linkedin": null
      },
      {
        "name": "Romario",
        "customUrl": null,
        "role": "Developer",
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "SHIP-A-THON main track",
        "amount": 4000,
        "hackathonWonAtId": "symbiosis-2025"
      }
    ],
    "milestones": [],
    "totalPaid": [
      {
        "milestone": "M1",
        "amount": 2000,
        "currency": "USDC",
        "transactionProof": "https://assethub-polkadot.subscan.io/extrinsic/10496453-2",
        "bountyName": null,
        "paidDate": "2025-11-22T00:00:00+00:00"
      },
      {
        "milestone": "M2",
        "amount": 2000,
        "currency": "USDC",
        "transactionProof": "https://assethub-polkadot.subscan.io/extrinsic/11702297-2",
        "bountyName": null,
        "paidDate": "2026-02-04T00:00:00+00:00"
      }
    ]
  },
  {
    "id": "web3-drawbot-fd8514",
    "projectName": "Web3 Drawbot",
    "description": "We are building a robot for an Interactive Robot Art Installation, where robots are drawing on a canvas while driving, controlled by AI and humans. A user connects their wallet to buy a control token and take control over the robot.",
    "projectRepo": "https://github.com/mischa-robots/drawbot-symmetry-hackathon",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/1sJA1RIzh0gFkisng4Wsj6-m4809c6-8Ook7pBDd0VCk/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Jetson Nano",
      "Rust",
      "HTML",
      "JS",
      "CSS",
      "NMKR Api"
    ],
    "categories": [
      "Arts",
      "Gaming"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:04:15.592447+00:00",
    "teamMembers": [
      {
        "name": "Mischa Robots",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "web-3bune-3f8c7c",
    "projectName": "Web 3bune",
    "description": "Web 3bune is a protocol to create and distribute token-gated news. Our goal is to realign incentives between journalists and platforms through micro transactions.",
    "projectRepo": "https://github.com/deeecent/web3bune",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/1qoHMshbTk0soMMUxPxYr2jD1sI5ToX4TWaRSOH32xRI/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "JavaScript",
      "Solidity",
      "Hardhat",
      "Farcaster Frames",
      "Kiwi News"
    ],
    "categories": [
      "Social",
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:04:14.414966+00:00",
    "teamMembers": [
      {
        "name": "Tim Daubenschütz",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "verfy-d0db73",
    "projectName": "Verfy",
    "description": "Authentication of e-mail attachments using blockchain technology.",
    "projectRepo": "https://github.com/marlykiwi/verfy",
    "demoUrl": "nan",
    "slidesUrl": "nan",
    "liveUrl": null,
    "techStack": [
      "React",
      "Vite",
      "Wagmi",
      "Viem",
      "TypeScript",
      "Solidity",
      "Hardhat",
      "Sepolia Testnet"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:04:13.252709+00:00",
    "teamMembers": [
      {
        "name": "Delphine De Wulf",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "starknetmeetups-6f2c54",
    "projectName": "StarknetMeetups",
    "description": "StarknetMeetups is a decentralized event management infrastructure built on StarkNet, where each event is represented by a custom smart contract.",
    "projectRepo": "https://github.com/afterrootq/starknetmeetups",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/1k5P0kjDVumERN4n4OmmAn6-oQsZzQB87CBcz3vcW9uo/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Cairo",
      "typescript"
    ],
    "categories": [
      "Social"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:04:12.085461+00:00",
    "teamMembers": [
      {
        "name": "Marek Hakala",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "solana-vm-substrate-runtime-2eae20",
    "projectName": "Solana VM Substrate Runtime",
    "description": "We present the integration of the Solana Virtual Machine as a pallet into a Substrate runtime, allowing developers to spin up Polkadot parachains and substrate-based chains compatible with the Solana stack.",
    "projectRepo": "https://github.com/kpatch",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/1oFYzRXj6Ia6eQF3XWfH-3dvdNluHjreg7z_rIMEfI0Y/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Solana / SVM repository",
      "Polkadot SDK / Substrate"
    ],
    "categories": [
      "Developer Tools"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:04:10.882245+00:00",
    "teamMembers": [
      {
        "name": "Irvin Cardenas",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "si-3-viral-love-36d563",
    "projectName": "SI<3> Viral $LOVE",
    "description": "Our platform empowers communities by providing decentralized social networks with seamless Web3 interoperability, where each community operates on its own Kusama parachain with custom tokens and shared governance through $LOVE.",
    "projectRepo": "https://www.canva.com/design/DAGON34SPbA/m-26GxKHzxASrl4ALV6GVw/view?utm_content=DAGON34SPbA&utm_campaign=designshare&utm_medium=link&utm_source=editor",
    "demoUrl": "nan",
    "slidesUrl": "https://www.canva.com/design/DAGON34SPbA/m-26GxKHzxASrl4ALV6GVw/view?utm_content=DAGON34SPbA&utm_campaign=designshare&utm_medium=link&utm_source=editor",
    "liveUrl": null,
    "techStack": [
      "Microservices architecture Backend: Java or Rust",
      "Frontend: React Native or Flutter",
      "PostgreSQL or Mongo",
      "Web3.js",
      "Polkadot SDK",
      "Livepeer and more integrations"
    ],
    "categories": [
      "Social"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:04:09.711218+00:00",
    "teamMembers": [
      {
        "name": "Zeya Mentsapuu",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "raitify-7d2d8a",
    "projectName": "Raitify",
    "description": "Raitify makes information about AI agents explicit and transparent, allowing agents to become visible and reputable so users can find the right models to advance their work.",
    "projectRepo": "https://github.com/csmarc/raitify",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/1cqw4-dAiPZsOFhg0RfofaiLl0nFXzfNjhzOvjYgrgt8/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Solana"
    ],
    "categories": [
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:04:08.512625+00:00",
    "teamMembers": [
      {
        "name": "Alexander Schmitt",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "qstn-6c753b",
    "projectName": "QSTN",
    "description": "QSTN is a self-service AI-powered survey marketplace that allows businesses to fund surveys using Solana tokens and Solana NFTs, rewarding participants while ensuring user consent via zero-knowledge proofs.",
    "projectRepo": "https://github.com/QSTN-US/Solana-QSTN-v2",
    "demoUrl": "https://testnet.qstnus.com",
    "slidesUrl": "https://docsend.com/view/yj4eyq73rqrvnnga",
    "liveUrl": null,
    "techStack": [
      "Typescript",
      "Rust",
      "CSS",
      "Javascript"
    ],
    "categories": [
      "AI",
      "Social"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:04:07.338798+00:00",
    "teamMembers": [
      {
        "name": "Orrin Campbell",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "propcorn-15409b",
    "projectName": "propcorn",
    "description": "Propcorn is a public good designed to incentivize open-source developers by enabling micro-funding for small features or fixes on GitHub.",
    "projectRepo": "https://github.com/deeecent/propcorn/",
    "demoUrl": "https://propcorn.xyz/",
    "slidesUrl": "nan",
    "liveUrl": null,
    "techStack": [
      "HardHat",
      "react",
      "wagmi"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Milestone Delivered",
    "bountiesProcessed": true,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": "completed",
    "m2Agreement": {
      "mentorName": null,
      "agreedDate": null,
      "agreedFeatures": [],
      "documentation": [],
      "successCriteria": null,
      "lastUpdatedBy": null,
      "lastUpdatedDate": null
    },
    "finalSubmission": {
      "repoUrl": "https://github.com/deeecent/propcorn/",
      "demoUrl": "https://propcorn.xyz/",
      "docsUrl": "nan",
      "summary": "Propcorn is a public good designed to incentivize open-source developers by enabling micro-funding for small features or fixes on GitHub.",
      "submittedDate": "2024-10-02T00:00:00+00:00",
      "submittedBy": null
    },
    "completionDate": "2024-10-02T00:00:00+00:00",
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:04:05.711945+00:00",
    "teamMembers": [
      {
        "name": "Alberto Granzotto",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Symmetry 2024 Winner",
        "amount": 5000,
        "hackathonWonAtId": "symmetry-2024"
      }
    ],
    "milestones": [
      {
        "description": "- Revamped UI, overhaul Smart Contract, and ready to GO LIVE",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "peggd-fec278",
    "projectName": "peggd",
    "description": "Our platform empowers retail investors to capitalize on the rising market values of football players, enabling them to capture significant growth.",
    "projectRepo": "https://github.com/phipsae/peggd",
    "demoUrl": "https://peggd.vercel.app/",
    "slidesUrl": "https://www.canva.com/design/DAGOakrdDGE/WqRK5eQOyST3e8lMaANtcQ/view?utm_content=DAGOakrdDGE&utm_campaign=designshare&utm_medium=link&utm_source=editor",
    "liveUrl": null,
    "techStack": [
      "Backend Solidity",
      "Front end Wagmi & VIEM"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:04:04.562332+00:00",
    "teamMembers": [
      {
        "name": "Philip Krause",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "papi-actions-059d09",
    "projectName": "PAPI Actions",
    "description": "This defines a series of intents, a routing system that uniquely identifies one action to be performed, which can be implemented by dApps or extensions.",
    "projectRepo": "https://github.com/polkadot-api/web3-blockspace-actions/tree/main?tab=readme-ov-file",
    "demoUrl": "https://web3-blockspace-actions.vercel.app/",
    "slidesUrl": "nan",
    "liveUrl": null,
    "techStack": [
      "Polkadot API",
      "React",
      "RxJS"
    ],
    "categories": [
      "Developer Tools"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Abandoned",
    "bountiesProcessed": true,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:04:02.896075+00:00",
    "teamMembers": [
      {
        "name": "Josep Maria Sobrepere Profitos",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Symmetry 2024 Winner",
        "amount": 5000,
        "hackathonWonAtId": "symmetry-2024"
      }
    ],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "hypertents-e2d30a",
    "projectName": "Hypertents",
    "description": "Hypertents achieves cross-chain intent settling using Hyperbridge as the bridging layer.",
    "projectRepo": "https://github.com/jak-pan/hypertents",
    "demoUrl": "https://hackmd.io/WLU6CpxeSrix_m0ZiVJ0bg",
    "slidesUrl": "https://hackmd.io/@Lederstrumpf/hypertents-presentation",
    "liveUrl": null,
    "techStack": [
      "Hyperbridge",
      "Solidity",
      "Ethers",
      "React"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Abandoned",
    "bountiesProcessed": true,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:04:01.104242+00:00",
    "teamMembers": [
      {
        "name": "Seun Lanlege",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Symmetry 2024 Winner",
        "amount": 2500,
        "hackathonWonAtId": "symmetry-2024"
      }
    ],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "how-to-manage-a-smart-co-working-via-polkadot-opengov-98bafc",
    "projectName": "How to manage a Smart Co-working via Polkadot OpenGov",
    "description": "This project demonstrates how, with the help of the large Polkadot OpenGov community, we can manage access to a shared coworking space.",
    "projectRepo": "https://github.com/nakata5321/robonomics/tree/hackaton",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/1cboIxpV20KAUwUFZfNICT-tYb_jdxNVsUOH4T7Kcsp0/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Polkadot",
      "Robonomics",
      "IPFS",
      "Home Assistant"
    ],
    "categories": [
      "Social"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:59.8932+00:00",
    "teamMembers": [
      {
        "name": "Makar Cherniaev",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "helixstreet-43f4df",
    "projectName": "helixstreet",
    "description": "Helixstreet is building the future of life sciences and healthcare in the Web3 world. This hack session brought us closer to that vision, creating a flexible parathread pay-as-you-go blockchain foundation.",
    "projectRepo": "https://github.com/helixstreet/helixstreet-node",
    "demoUrl": "https://helixstreet.io",
    "slidesUrl": "nan",
    "liveUrl": null,
    "techStack": [
      "substrate / frame / zombienet"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:58.712935+00:00",
    "teamMembers": [
      {
        "name": "Tom Deisen",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "empathy-technologies-0b9c51",
    "projectName": "Empathy Technologies",
    "description": "Empathy Technologies is a project that aims to optimize knowledge transfer and collaboration across diverse fields by mapping and translating complex information into user-specific contexts.",
    "projectRepo": "https://github.com/JanetMo/empathy-technologies",
    "demoUrl": "nan",
    "slidesUrl": "https://www.canva.com/design/DAGOd680kCE/CIw3fPEoWmXc5946PZD69A/edit?utm_content=DAGOd680kCE&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    "liveUrl": null,
    "techStack": [
      "Python",
      "Figma",
      "C",
      "GraphViz",
      "Rust"
    ],
    "categories": [
      "Social"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Abandoned",
    "bountiesProcessed": true,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:57.072979+00:00",
    "teamMembers": [
      {
        "name": "Yip ThyDiep Ta",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Symmetry 2024 Winner",
        "amount": 2500,
        "hackathonWonAtId": "symmetry-2024"
      }
    ],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "dot-takeout-1dd274",
    "projectName": "DOT Takeout",
    "description": "Dot Takeout is the ultimate tax reporting tool for the Polkadot ecosystem. By aggregating data across all Polkadot chains, Dot Takeout provides users with a comprehensive, automated report of all transactions.",
    "projectRepo": "https://github.com/KarimJedda/takeout/",
    "demoUrl": "https://dottakeout.xyz",
    "slidesUrl": "https://docs.google.com/presentation/d/1--9A0csRwvrof6-jZSfTFK3GjT1nsqCCW11r-E-eSUI/edit#slide=id.g2206d6f2d92_0_13",
    "liveUrl": null,
    "techStack": [
      "Python",
      "Flask",
      "React"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:55.913323+00:00",
    "teamMembers": [
      {
        "name": "Karim Jedda",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "descinet-67255f",
    "projectName": "DeSciNet",
    "description": "The network accepts causal models uploaded by users. Those are then tested against observations in the network and scored by surprise. The lowest surprise model is the consensus model.",
    "projectRepo": "https://github.com/BrunoZell/DeSciNet",
    "demoUrl": "nan",
    "slidesUrl": "nan",
    "liveUrl": null,
    "techStack": [
      "F#",
      "Structured Causal Models (Judea Pearl)"
    ],
    "categories": [
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:54.750984+00:00",
    "teamMembers": [
      {
        "name": "Bruno Zell",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "dephy-access-a956e8",
    "projectName": "DePHY Access",
    "description": "DePHY Access is a dApp that facilitates user access to decentralized resources in the DePIN sector, like GPU rentals and decentralized cloud computing.",
    "projectRepo": "https://github.com/jasl/blockspace-hackathon-2024",
    "demoUrl": "https://drive.google.com/file/d/175yXF5hHe_JqPTLDFhH_kXX3AKnSCs1t/view?usp=sharing",
    "slidesUrl": "nan",
    "liveUrl": null,
    "techStack": [
      "Ollama",
      "EVM Pallet",
      "dephy messaging layer",
      "DePHY ID",
      "Solidity"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:53.565452+00:00",
    "teamMembers": [
      {
        "name": "Darren Seah",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "delegit-4b414c",
    "projectName": "Delegit",
    "description": "Increasing participation turnout is key to decentralized governance. Delegit is a 2-click flow to delegate on Polkadot.",
    "projectRepo": "https://github.com/delegit-xyz/dashboard",
    "demoUrl": "https://delegit.xyz/",
    "slidesUrl": "https://docs.google.com/presentation/d/1SWbxKM9O3H5CB0CWYKDpizNt6j3B_gfR2daLCxolOCE/pub?start=false&loop=false&delayms=3000",
    "liveUrl": null,
    "techStack": [
      "TS",
      "React",
      "Papi",
      "DotConnect"
    ],
    "categories": [
      "DeFi",
      "Social"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Milestone Delivered",
    "bountiesProcessed": true,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": "completed",
    "m2Agreement": {
      "mentorName": null,
      "agreedDate": null,
      "agreedFeatures": [],
      "documentation": [],
      "successCriteria": null,
      "lastUpdatedBy": null,
      "lastUpdatedDate": null
    },
    "finalSubmission": {
      "repoUrl": "https://github.com/delegit-xyz/dashboard",
      "demoUrl": "https://delegit.xyz/",
      "docsUrl": "https://docs.google.com/presentation/d/1SWbxKM9O3H5CB0CWYKDpizNt6j3B_gfR2daLCxolOCE/pub?start=false&loop=false&delayms=3000",
      "summary": "Increasing participation turnout is key to decentralized governance. Delegit is a 2-click flow to delegate on Polkadot.",
      "submittedDate": "2024-10-02T00:00:00+00:00",
      "submittedBy": null
    },
    "completionDate": "2024-10-02T00:00:00+00:00",
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:51.950888+00:00",
    "teamMembers": [
      {
        "name": "Thibaut Sardan",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Symmetry 2024 Winner",
        "amount": 5000,
        "hackathonWonAtId": "symmetry-2024"
      }
    ],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "ctrl-x-49fd44",
    "projectName": "CTRL+X",
    "description": "The Blocklicense is a web3 content licensing registry and relicensing marketplace for text-based journalistic content.",
    "projectRepo": "https://github.com/Arikia/ctrl-x",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/1q1j6W8yQc5lN4RPGA9iAMwgvzWgKI3hQ0xQx4C9fIuA/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "NextJS",
      "Typescript",
      "Blink (Solana)",
      "Phantom Wallet"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:50.783951+00:00",
    "teamMembers": [
      {
        "name": "Arikia Millikan",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "crypto-knights-d05878",
    "projectName": "Crypto Knights",
    "description": "Crypto Knight is a revolutionary platform designed to simplify your crypto investments. With Crypto Knight, you can invest in decentralized index funds managed by smart contracts.",
    "projectRepo": "https://github.com/arkanoeth/CKweb3summit",
    "demoUrl": "nan",
    "slidesUrl": "nan",
    "liveUrl": null,
    "techStack": [
      "Solidity",
      "Next.js"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:49.616843+00:00",
    "teamMembers": [
      {
        "name": "Matias Arkano",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "codekarma-ae4feb",
    "projectName": "CodeKarma",
    "description": "CodeKarma - A CLI tool to check that the code you write aligns with your values written in your manifesto.",
    "projectRepo": "https://github.com/ltfschoen/CodeKarma",
    "demoUrl": "nan",
    "slidesUrl": "nan",
    "liveUrl": null,
    "techStack": [
      "deno"
    ],
    "categories": [
      "Developer Tools"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:48.428835+00:00",
    "teamMembers": [
      {
        "name": "Luke Schoen",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "clima-compass-6eb2ce",
    "projectName": "Clima Compass",
    "description": "Clima Compass is a gamified Web3 platform that incentivizes users to make predictions about global climate metrics. By rewarding accurate forecasts, it aims to increase climate awareness, gather valuable data insights, and foster positive environmental impact through partnerships and financial contributions.",
    "projectRepo": "https://github.com/mxber2022/Web3HackBerlin",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/12wyW2Bnft6RE8pi__v9P5HoLN77XTzR5vjKrEFdFB_8/edit#slide=id.g20e4fc113c20dbc9_81",
    "liveUrl": null,
    "techStack": [
      "Rootstock",
      "Cere Network",
      "Sepolia Testnet",
      "Goldsky Subgraph",
      "SQL",
      "Nextjs",
      "Langchain"
    ],
    "categories": [
      "DeFi",
      "Social"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:47.277399+00:00",
    "teamMembers": [
      {
        "name": "Gesa Schneider",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "chatpay-as-a-dapp-cere-integration-2e87af",
    "projectName": "ChatPay (as a Dapp, Cere integration)",
    "description": "ChatPay is a Telegram Mini App that brings decentralization to data acquisition for the common good, allowing users to sell their data instead of having it taken by large platforms.",
    "projectRepo": "https://github.com/lmangall/chatpay_cere_feature",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/1CGZKZNb35VYOfA0cnfN144L2WpR6zfpY_vd9ZaTivbY/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Next.js"
    ],
    "categories": [
      "Social",
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:46.120838+00:00",
    "teamMembers": [
      {
        "name": "Léonard Mangallon",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "chainview-d82ae5",
    "projectName": "ChainView",
    "description": "Visualise and track transactions of a wallet on all EVM chains, in a human-readable format.",
    "projectRepo": "https://github.com/gedithejedi/chainview",
    "demoUrl": "https://chain-view.vercel.app/",
    "slidesUrl": "https://www.canva.com/design/DAGOe_VaGNI/M--Q61VEF7SCchmFV5-EZg/edit?utm_content=DAGOe_VaGNI&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    "liveUrl": null,
    "techStack": [
      "NEXT",
      "mongoDB",
      "ethers.js and some api's for transaction and token data"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Abandoned",
    "bountiesProcessed": true,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": "completed",
    "m2Agreement": {
      "mentorName": null,
      "agreedDate": null,
      "agreedFeatures": [],
      "documentation": [],
      "successCriteria": null,
      "lastUpdatedBy": null,
      "lastUpdatedDate": null
    },
    "finalSubmission": {
      "repoUrl": "https://github.com/gedithejedi/chainview",
      "demoUrl": "https://chain-view.vercel.app/",
      "docsUrl": "https://www.canva.com/design/DAGOe_VaGNI/M--Q61VEF7SCchmFV5-EZg/edit?utm_content=DAGOe_VaGNI&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
      "summary": "Visualise and track transactions of a wallet on all EVM chains, in a human-readable format.",
      "submittedDate": "2024-10-02T00:00:00+00:00",
      "submittedBy": null
    },
    "completionDate": "2024-10-02T00:00:00+00:00",
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:44.501062+00:00",
    "teamMembers": [
      {
        "name": "Gedas",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Symmetry 2024 Winner",
        "amount": 2500,
        "hackathonWonAtId": "symmetry-2024"
      }
    ],
    "milestones": [
      {
        "description": "- Deploy an MVP with basic multichain transacion fetching and graph output\\n- Improved and more reliable fetching of transactions\\n- Caching system to avoid refetching the same data and improve speed of the app for returning users\\n- Advanced filtering by time, wallets and token\\n- All multichain transactions in a table format\\n- Log-in flow\\n- Improve general UI/UX",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "anytype-nft-gating-a36d06",
    "projectName": "Anytype - NFT Gating",
    "description": "Anytype Spaces are currently like Communities. You can Join spaces, share links, etc. You can Collaborate together - write docs, chat, etc. Let's add more Web3 SOCIAL FEATURES: add NFT token gating to the Anytype. If someone has a required NFT -> he can join the space.",
    "projectRepo": "https://github.com/AnthonyAkentiev/Web3Summit_Hackathon",
    "demoUrl": "https://anytype.io",
    "slidesUrl": "https://docs.google.com/presentation/d/1_hwlBbFb36U9f-ePhIKG44maaBdKzqZ6rOF-BKar4k0/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Golang",
      "TypeScript"
    ],
    "categories": [
      "NFT",
      "Social"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Abandoned",
    "bountiesProcessed": true,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:42.865856+00:00",
    "teamMembers": [
      {
        "name": "Tony Kent",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Symmetry 2024 Winner",
        "amount": 5000,
        "hackathonWonAtId": "symmetry-2024"
      }
    ],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "alibi-edc3e7",
    "projectName": "Alibi",
    "description": "High-resolution location proofs with TLSNotary allow users to prove their geolocation over time while maintaining privacy. By leveraging internet security and Google's data, Alibi lets users with a Google account prove their historical location without revealing unnecessary information, bridging Web2 and Web3.",
    "projectRepo": "https://github.com/orgs/w3s-alibi/repositories",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/1sT8KSk_zZ-IuYjFFUmSgybwyKwERL2IJcDuE1_ZZvTs/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Rust",
      "TypeScript",
      "React"
    ],
    "categories": [
      "Social"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Abandoned",
    "bountiesProcessed": true,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:41.709364+00:00",
    "teamMembers": [
      {
        "name": "James Lefrère",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- more research needed for next milestone",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "airdrops-for-everyone-on-polkadot-cbccca",
    "projectName": "Airdrops for Everyone on Polkadot",
    "description": "Airdrops at the moment are very expensive. We aim to make them cheaper by utilising merkle trees/root and merkle proofs. It makes the airdrops multiple times cheaper. This project is a follow-up on an existing pull request to Polkadot SDK.",
    "projectRepo": "https://github.com/RostislavLitovkin/AirdropsForEveryone",
    "demoUrl": "nan",
    "slidesUrl": "nan",
    "liveUrl": null,
    "techStack": [
      "Rust",
      "wasm",
      "typescript",
      "react"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symmetry-2024",
      "name": "Symmetry 2024",
      "endDate": "2024-08-22T04:55:00+00:00",
      "eventStartedAt": "funkhaus-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:40.541451+00:00",
    "teamMembers": [
      {
        "name": "Daniel Vaculík",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- unknown",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "european-artist-bank-be8a6e",
    "projectName": "European Artist Bank",
    "description": "European Artist Bank creates a decentralized financial ecosystem specifically designed for artists and creative professionals. The platform offers micro-loans, revenue sharing agreements, and intellectual property monetization tools, enabling artists to access capital and monetize their work without traditional intermediaries.",
    "projectRepo": "https://github.com/European-Art-Bank/eab",
    "demoUrl": "nan",
    "slidesUrl": "https://pitch.com/v/eab-2-s8c3go",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "Arts",
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:39.846567+00:00",
    "teamMembers": [
      {
        "name": "robertmathewstanley",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "curvecast-330dea",
    "projectName": "CurveCast",
    "description": "CurveCast leverages advanced analytics and machine learning to predict DeFi yield curves and optimize liquidity provision strategies. The platform provides real-time insights into pool performance, impermanent loss risks, and optimal entry/exit points for yield farmers.",
    "projectRepo": "https://github.com/BitcoinAmiens/CurveCast",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/18vKWiXiJmWN65iyW8kOaOQo3uHnOaUBH7eiLEE_8vsw/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "AI",
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:39.145671+00:00",
    "teamMembers": [
      {
        "name": "destefaniandrei",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "uniswap-unicorn-hunt-7ccbf0",
    "projectName": "UNISWAP UNICORN HUNT",
    "description": "A gamified DeFi competition platform where users compete to achieve the highest Compound Annual Growth Rate (CAGR) on their crypto holdings. Players hunt for 'unicorn' tokens with explosive growth potential while learning advanced trading strategies through interactive gameplay.",
    "projectRepo": "https://github.com/UniswapUnicornHunt/UniswapUnicornHunt",
    "demoUrl": "nan",
    "slidesUrl": "https://pitch.com/v/uniswap-unicorn-hunt-lpwqlq",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "Gaming",
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:38.444582+00:00",
    "teamMembers": [
      {
        "name": "giovannifulin",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "inkpayroll-ec0b7c",
    "projectName": "inkpayroll",
    "description": "A decentralized payroll solution built with ink! smart contracts that automates salary distributions, tax calculations, and compliance reporting. inkpayroll enables companies to pay employees in crypto while maintaining traditional payroll features like recurring payments and detailed record-keeping.",
    "projectRepo": "https://github.com/InkSmartContract/inkpayroll-frontend",
    "demoUrl": "nan",
    "slidesUrl": "https://pitch.com/v/inkpayroll-i3l63k",
    "liveUrl": null,
    "techStack": [
      "ink!"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:37.748054+00:00",
    "teamMembers": [
      {
        "name": "liyuanying225",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "dynavest-555629",
    "projectName": "Dynavest",
    "description": "Dynavest revolutionizes portfolio management through AI-driven dynamic rebalancing strategies. The platform continuously analyzes market conditions, risk factors, and user preferences to automatically adjust investment allocations, maximizing returns while maintaining desired risk levels.",
    "projectRepo": "https://github.com/SamPink/dev-wallet",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/10BmnfbOhqLQfON5ys1uAUZ7r8DJgtKYqxjgA--Dn0Pw/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "AI",
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:37.033582+00:00",
    "teamMembers": [
      {
        "name": "sam135642",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "bohemia-roots-app-0ee930",
    "projectName": "Bohemia Roots App",
    "description": "A community-driven platform connecting Czech and Slovak diaspora worldwide, facilitating cultural exchange, business networking, and preserving traditions through blockchain-verified identity and reputation systems.",
    "projectRepo": "",
    "demoUrl": "nan",
    "slidesUrl": "https://app.screencast.com/Xx8F7mN1ub0ag",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "Social"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:36.231791+00:00",
    "teamMembers": [
      {
        "name": "cisar2218",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "hermes-42e49e",
    "projectName": "Hermes",
    "description": "Hermes is a next-generation messaging protocol built on blockchain technology, enabling secure, private, and decentralized communication. With end-to-end encryption and distributed storage, Hermes ensures messages remain confidential while providing users with complete control over their data and communication channels.",
    "projectRepo": "https://github.com/dani320flu/hermes",
    "demoUrl": "nan",
    "slidesUrl": "https://www.canva.com/design/DAGYHqayWIo/7bW7xqBtLg9p7V-Reo7TRQ/edit?utm_content=DAGYHqayWIo&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "Social"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:35.535084+00:00",
    "teamMembers": [
      {
        "name": "daniel.zarzecki047",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "kazdao-a96499",
    "projectName": "KazDao",
    "description": "KazDao is a decentralized autonomous organization focused on empowering communities through collective decision-making and resource allocation. The platform enables transparent governance, fair proposal systems, and automated treasury management for community-driven projects and initiatives.",
    "projectRepo": "https://github.com/EmilFane/KazDao",
    "demoUrl": "nan",
    "slidesUrl": "https://www.canva.com/design/DAGXz2CqDJc/mBBLz35nFVnMyfFRu9eVMA/edit?utm_content=DAGXz2CqDJc&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    "liveUrl": null,
    "techStack": [
      "Kusama"
    ],
    "categories": [
      "Social",
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:34.840028+00:00",
    "teamMembers": [
      {
        "name": "ndongmefane",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "burn2play-2078c7",
    "projectName": "Burn2Play",
    "description": "Burn2Play introduces a revolutionary gaming model where players burn tokens to access premium game features, creating deflationary pressure while enhancing gameplay. This sustainable economic model benefits both players through exclusive content and token holders through increasing scarcity.",
    "projectRepo": "https://github.com/Josep-Grimalt/burn2play",
    "demoUrl": "nan",
    "slidesUrl": "https://www.canva.com/design/DAGYIJKGnwg/K6xC6_l7XOdHRO63-MJAOQ/edit?utm_content=DAGYIJKGnwg&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    "liveUrl": null,
    "techStack": [
      "ink!"
    ],
    "categories": [
      "Gaming",
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:33.321403+00:00",
    "teamMembers": [
      {
        "name": "josep",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "sustained-17eda8",
    "projectName": "Sustained",
    "description": "Sustained creates a blockchain-powered ecosystem for tracking and incentivizing sustainable behaviors. Users earn tokens for eco-friendly actions verified through IoT devices and community validation, creating a circular economy that rewards environmental consciousness and funds green initiatives.",
    "projectRepo": "https://github.com/alidevs/sustained",
    "demoUrl": "nan",
    "slidesUrl": "https://www.canva.com/design/DAGYJCXXTxo/xkUCOkBGgHGJW5IZ9zOtog/edit?utm_content=DAGYJCXXTxo&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "Social",
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:32.611392+00:00",
    "teamMembers": [
      {
        "name": "ali.pourgholami99",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "nofiatcurrency-nfc-ddd84f",
    "projectName": "NoFiatCurrency(NFC)",
    "description": "Transforming Smartphones into Hardware Wallets | The Future of secure and convenient crypto is in your pocket.\nNFC enables users to securely sign transactions using their phone's built-in NFC chip, eliminating the need for separate hardware wallets while maintaining bank-level security through secure element technology.",
    "projectRepo": "https://github.com/shazzarr/NFC_HW",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/12F2V-BdCYgjJrYGtQ5EVgfMVQKN0CEP5HGOoOTx0K-0/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "Mobile"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:31.903607+00:00",
    "teamMembers": [
      {
        "name": "0xshazam",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "ink-game-treasure-framework-dd0b86",
    "projectName": "Ink! Game Treasure framework",
    "description": "Reusable framework for creating treasure hunt games with NFT rewards on the Polkadot ecosystem using ink! smart contracts. Developers can easily deploy customizable treasure hunt experiences where players discover and collect unique digital assets.",
    "projectRepo": "https://github.com/fabiola29/ink-game-treasure-synergy-hackaton.git",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/10XoV4lPfNx70b7MnWl2y6REb-Ii_vJKgtKUUHgGOEPE/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "ink!"
    ],
    "categories": [
      "Gaming",
      "NFT"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:31.208353+00:00",
    "teamMembers": [
      {
        "name": "faramirezs",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "nexor-21188b",
    "projectName": "Nexor",
    "description": "Nexor lets you send and receive crypto instantly with a unique @key, Tap to Pay, and non-custodial technology with multi-token support.",
    "projectRepo": "https://github.com/web3summit/nexor",
    "demoUrl": "https://drive.google.com/file/d/1_u3jVXsLd0nqX-z45H2ywakwnWp-ww32/view?usp=drive_link",
    "slidesUrl": "https://www.figma.com/slides/kBpfUiWaYMTmjKGlR2SVdR/",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Bounty Payout",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": "completed",
    "m2Agreement": {
      "mentorName": null,
      "agreedDate": null,
      "agreedFeatures": [],
      "documentation": [],
      "successCriteria": null,
      "lastUpdatedBy": null,
      "lastUpdatedDate": null
    },
    "finalSubmission": {
      "repoUrl": "https://github.com/web3summit/nexor",
      "demoUrl": "https://drive.google.com/file/d/1_u3jVXsLd0nqX-z45H2ywakwnWp-ww32/view?usp=drive_link",
      "docsUrl": "https://www.figma.com/slides/kBpfUiWaYMTmjKGlR2SVdR/",
      "summary": "Nexor lets you send and receive crypto instantly with a unique @key, Tap to Pay, and non-custodial technology with multi-token support.",
      "submittedDate": "2025-08-29T00:00:00+00:00",
      "submittedBy": null
    },
    "completionDate": "2025-08-29T00:00:00+00:00",
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:29.091019+00:00",
    "teamMembers": [
      {
        "name": "jose",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Polkadot main track",
        "amount": 5000,
        "hackathonWonAtId": "synergy-2025"
      }
    ],
    "milestones": [
      {
        "description": "- Deploy production-ready ink! smart contracts (Escrow, PaymentVault, MultiHopSwap) to AssetHub with full XCM + ISMP support - Includes slippage protection, timeout handling, and refund logic for all cross-chain payment flows.\\n- Launch merchant dashboard v1.0 with live transaction history, invoice generator, webhook configuration, and CSV export - Onboard 20+ merchants using real dashboards connected to live testnet payments.\\n- Release lightweight embeddable widget SDK (<50KB) with full UX polish, real-time USD conversion, and theme customization - Integrate into 50+ demo pages and pilot stores; support DOT, USDC, USDT, and bridged Solana payments with automatic Hydration swaps.\\n- Integrate Hyperbridge ISMP price oracle + cross-chain payment verification for trustless merchant settlement - Query token prices and confirm payments from at least 3 chains (e.g., Solana, Astar, AssetHub).\\n- Achieve 90%+ smart contract and backend test coverage, end-to-end CI pipeline, and production monitoring (Sentry, Grafana) - Ensure reliability, observability, and dev-friendly QA for scaling to production.",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": [
      {
        "milestone": "M1",
        "amount": 2500,
        "currency": "USDC",
        "transactionProof": "https://assethub-polkadot.subscan.io/extrinsic/9378594-2",
        "bountyName": null,
        "paidDate": "2026-02-09T07:03:30.979894+00:00"
      },
      {
        "milestone": "M2",
        "amount": 2500,
        "currency": "USDC",
        "transactionProof": "https://assethub-polkadot.subscan.io/extrinsic/9718458-2",
        "bountyName": null,
        "paidDate": "2026-02-09T07:03:30.979894+00:00"
      }
    ]
  },
  {
    "id": "emerald-1e61d6",
    "projectName": "Emerald",
    "description": "Emerald is a P2P imageboard protocol with a Layer 1 blockchain and a novel sharded CDN designed to overcome key latency and incentive issues in decentralized storage.  Building this protocol alone is a massive undertaking, so I've stuck to implementing the Substrate-based blockchain, leaving the libp2p client for off-chain storage for milestone 2.",
    "projectRepo": "https://github.com/rednaxela5950/emerald-hackathon",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/1Bh8zP4q5F8B0OcZMhdaOCx_kptNttIcpOfxcOhs4S-8/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "Social",
      "Developer Tools"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Bounty Payout",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": "completed",
    "m2Agreement": {
      "mentorName": null,
      "agreedDate": null,
      "agreedFeatures": [],
      "documentation": [],
      "successCriteria": null,
      "lastUpdatedBy": null,
      "lastUpdatedDate": null
    },
    "finalSubmission": {
      "repoUrl": "https://github.com/rednaxela5950/emerald-hackathon",
      "demoUrl": "nan",
      "docsUrl": "https://docs.google.com/presentation/d/1Bh8zP4q5F8B0OcZMhdaOCx_kptNttIcpOfxcOhs4S-8/edit?usp=sharing",
      "summary": "Emerald is a P2P imageboard protocol with a Layer 1 blockchain and a novel sharded CDN designed to overcome key latency and incentive issues in decentralized storage.  Building this protocol alone is a massive undertaking, so I've stuck to implementing the Substrate-based blockchain, leaving the libp2p client for off-chain storage for milestone 2.",
      "submittedDate": "2025-08-29T00:00:00+00:00",
      "submittedBy": null
    },
    "completionDate": "2025-08-29T00:00:00+00:00",
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:27.003305+00:00",
    "teamMembers": [
      {
        "name": "alexander",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Kusama main track",
        "amount": 500,
        "hackathonWonAtId": "synergy-2025"
      }
    ],
    "milestones": [
      {
        "description": "- Core functions, tests - All remaining functions for adding posts, attesting to data availability, and any other operations that mutate the already implemented storage items. These functions will require comprehensive tests.\\n- Documentation - Comprehensive documentation of the codebase to make open source contributions easier. This documentation will be in the form of markdown files in the repository on github, and should cover every part of the code, explaining how it works and what the rationale behind the design is.\\n- Libp2p client for off-chain data - Implementation of a data storage client based on libp2p. This is a crucial component required for an MVP.\\n- Rudimentary front-end - A front-end desktop application that can be used to demonstrate core functionality. It will allow a user to create a post which is uploaded to the network and made visible to other users using the same front-end.",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": [
      {
        "milestone": "M1",
        "amount": 250,
        "currency": "DOT",
        "transactionProof": "https://polkadot.subscan.io/extrinsic/27432606-2",
        "bountyName": null,
        "paidDate": "2026-02-09T07:03:28.862632+00:00"
      },
      {
        "milestone": "M2",
        "amount": 250,
        "currency": "DOT",
        "transactionProof": "https://polkadot.subscan.io/extrinsic/28282795-3",
        "bountyName": null,
        "paidDate": "2026-02-09T07:03:28.862632+00:00"
      }
    ]
  },
  {
    "id": "polkavote-d16487",
    "projectName": "PolkaVote",
    "description": "The first real-world ZK application for Polkadot, enabling anonymous voting using state-of-the-art tools (Noir, ZK-SNARKs, HONK, and Pedersen Commitments). This flexible, reusable platform provides decentralized anonymous governance for the Polkadot ecosystem.",
    "projectRepo": "https://github.com/armsves/PolkaVote",
    "demoUrl": "https://polka-vote.vercel.app/",
    "slidesUrl": "https://docs.google.com/document/d/1vTirzHW5sFZefvPmq85l9IZcgwMRSMA8MIYW7oxPN74/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Polkadot"
    ],
    "categories": [
      "Social"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Bounty Payout",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": "completed",
    "m2Agreement": {
      "mentorName": null,
      "agreedDate": null,
      "agreedFeatures": [],
      "documentation": [],
      "successCriteria": null,
      "lastUpdatedBy": null,
      "lastUpdatedDate": null
    },
    "finalSubmission": {
      "repoUrl": "https://github.com/armsves/PolkaVote",
      "demoUrl": "https://polka-vote.vercel.app/",
      "docsUrl": "https://docs.google.com/document/d/1vTirzHW5sFZefvPmq85l9IZcgwMRSMA8MIYW7oxPN74/edit?usp=sharing",
      "summary": "The first real-world ZK application for Polkadot, enabling anonymous voting using state-of-the-art tools (Noir, ZK-SNARKs, HONK, and Pedersen Commitments). This flexible, reusable platform provides decentralized anonymous governance for the Polkadot ecosystem.",
      "submittedDate": "2025-08-29T00:00:00+00:00",
      "submittedBy": null
    },
    "completionDate": "2025-08-29T00:00:00+00:00",
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:24.848559+00:00",
    "teamMembers": [
      {
        "name": "gil7788",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Kusama main track",
        "amount": 2000,
        "hackathonWonAtId": "synergy-2025"
      }
    ],
    "milestones": [
      {
        "description": "- Problem Statement and Research: Propose a new cryptographic primitives that suit the needs of the protocol\\n- Commitment Scheme Implementation: implementation of the new candidate to the commitment scheme variants that was proposed in the research phase\\n- Off Chain Merkle Tree: Implementation of a server that stores the voting commitments off chain and leverages blockchain for integrity by posting Merkle Tree root on chain",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": [
      {
        "milestone": "M1",
        "amount": 1000,
        "currency": "DOT",
        "transactionProof": "https://polkadot.subscan.io/extrinsic/27432606-2",
        "bountyName": null,
        "paidDate": "2026-02-09T07:03:26.751745+00:00"
      },
      {
        "milestone": "M2",
        "amount": 1000,
        "currency": "DOT",
        "transactionProof": "https://polkadot.subscan.io/extrinsic/28282795-3",
        "bountyName": null,
        "paidDate": "2026-02-09T07:03:26.751745+00:00"
      }
    ]
  },
  {
    "id": "memo-self-da160e",
    "projectName": "Memo Self",
    "description": "A sybil-resistant POAP claiming system that uses zero-knowledge proofs generated from passport data to verify human identity. This ensures only real people can claim POAPs, preventing bot attacks and duplicate claims. The system also supports demographic-specific events (e.g., women-only meetups) by verifying relevant attributes while maintaining privacy through ZK technology.",
    "projectRepo": "https://www.github.com/vikiival/memoself",
    "demoUrl": "https://www.loom.com/share/317b328b5f774468a1cb7001952cb50a?sid=82028085-73ff-40fa-aa75-ccd0b14848d1",
    "slidesUrl": "https://docs.google.com/presentation/d/14RTgJJN1JKQoU4fTPzEWQAKHJqJ_cg1KMWdykLJBPf8/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Polkadot"
    ],
    "categories": [
      "Social"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Bounty Payout",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": "completed",
    "m2Agreement": {
      "mentorName": null,
      "agreedDate": null,
      "agreedFeatures": [],
      "documentation": [],
      "successCriteria": null,
      "lastUpdatedBy": null,
      "lastUpdatedDate": null
    },
    "finalSubmission": {
      "repoUrl": "https://www.github.com/vikiival/memoself",
      "demoUrl": "https://www.loom.com/share/317b328b5f774468a1cb7001952cb50a?sid=82028085-73ff-40fa-aa75-ccd0b14848d1",
      "docsUrl": "https://docs.google.com/presentation/d/14RTgJJN1JKQoU4fTPzEWQAKHJqJ_cg1KMWdykLJBPf8/edit?usp=sharing",
      "summary": "A sybil-resistant POAP claiming system that uses zero-knowledge proofs generated from passport data to verify human identity. This ensures only real people can claim POAPs, preventing bot attacks and duplicate claims. The system also supports demographic-specific events (e.g., women-only meetups) by verifying relevant attributes while maintaining privacy through ZK technology.",
      "submittedDate": "2025-08-29T00:00:00+00:00",
      "submittedBy": null
    },
    "completionDate": "2025-08-29T00:00:00+00:00",
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:22.726879+00:00",
    "teamMembers": [
      {
        "name": "viktorko99",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Kusama main track",
        "amount": 3000,
        "hackathonWonAtId": "synergy-2025"
      }
    ],
    "milestones": [
      {
        "description": "- Implement Self Vue to support dotmemo.xyz\\n- Implement ink! contract with asset precompile to prepaid memos with stablecoin",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": [
      {
        "milestone": "M1",
        "amount": 1500,
        "currency": "DOT",
        "transactionProof": "https://polkadot.subscan.io/extrinsic/27432606-2",
        "bountyName": null,
        "paidDate": "2026-02-09T07:03:24.610937+00:00"
      },
      {
        "milestone": "M2",
        "amount": 1500,
        "currency": "DOT",
        "transactionProof": "https://polkadot.subscan.io/extrinsic/28282795-3",
        "bountyName": null,
        "paidDate": "2026-02-09T07:03:24.610937+00:00"
      }
    ]
  },
  {
    "id": "stablewrap-1f36ae",
    "projectName": "StableWrap",
    "description": "A stable coin aggregator platform that optimizes yields across multiple DeFi protocols while maintaining stability and minimizing risk through automated rebalancing strategies",
    "projectRepo": "https://github.com/SarthiAstra/StableWrap",
    "demoUrl": "nan",
    "slidesUrl": "https://www.canva.com/design/DAGYHrTOOJw/P76sJKxQqLH1Ipt0qIQv8w/edit?utm_content=DAGYHrTOOJw&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:22.029226+00:00",
    "teamMembers": [
      {
        "name": "eth.sarthi",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "uniswap-unicorn-hunt-ink-tuts-58e2a8",
    "projectName": "UNISWAP UNICORN HUNT + INK TUTs",
    "description": "UniSwap Unicorn Hunt - Win prizes based on the top CAGR of your holdings.\n\nINK TUTs\nDeploy smart contracts on AlephZero with our interactive tutorials.\n\nVideo Link of both products: https://youtu.be/ULsHDXQwJyk\n\n--------------\n\nDev Bounty: \nInk Tutorial [https://github.com/giovannifulin/ink-tutorials]\n\nHackathon/Ecosystem Bounty:\nUniswap Unicorn Hunt [https://github.com/UniswapUnicornHunt/UniswapUnicornHunt]",
    "projectRepo": "https://github.com/UniswapUnicornHunt/UniswapUnicornHunt",
    "demoUrl": "nan",
    "slidesUrl": "https://pitch.com/v/uniswap-unicorn-hunt-lpwqlq",
    "liveUrl": null,
    "techStack": [
      "ink!"
    ],
    "categories": [
      "Gaming",
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:21.310109+00:00",
    "teamMembers": [
      {
        "name": "giovannifulin",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "dezi-network-ee36d3",
    "projectName": "dezi network",
    "description": "Open source SDK , API and Tools for Substrate Based Private Blockchains Development, Testing and deployment",
    "projectRepo": "https://github.com/dezilabs",
    "demoUrl": "nan",
    "slidesUrl": "https://www.canva.com/design/DAGYJrNueSU/RgxCJnqnxZ9YMHQCqg7wjg/edit?utm_content=DAGYJrNueSU&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "Developer Tools"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:20.611985+00:00",
    "teamMembers": [
      {
        "name": "adityajayasuriya",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "lasscrypto-eb0237",
    "projectName": "LassCrypto",
    "description": "LassCrypto revolutionizes crypto management by creating an intelligent wallet ecosystem that learns from user behavior to automate complex DeFi strategies. Our AI-powered platform simplifies yield farming, liquidity provision, and cross-chain operations into one-click actions, making advanced crypto strategies accessible to everyone.",
    "projectRepo": "https://github.com/Aero25x/lass-crypto",
    "demoUrl": "nan",
    "slidesUrl": "https://pitch.com/v/lasscrypto-pue5ti",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "AI",
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:19.917352+00:00",
    "teamMembers": [
      {
        "name": "danial",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "proof-of-rest-with-aave-38a1fe",
    "projectName": "Proof of rest with aave",
    "description": "Proof of Rest is a revolutionary DeFi protocol that transforms idle assets into productive yield generators by seamlessly integrating with Aave's lending pools. Our smart contracts automatically optimize lending strategies across multiple chains, allowing users to earn passive income while maintaining liquidity through tokenized positions.",
    "projectRepo": "https://github.com/Blockspace-Corporation/proof-of-rest-aave",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/11lp3wMY7aUNJdUQqWB_BdiqKA4dphU-RRZIqTD4YJpU/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:19.218982+00:00",
    "teamMembers": [
      {
        "name": "farbey.peter",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "chromamind-75f48f",
    "projectName": "Chromamind",
    "description": "Where ART meets Technology || All your ART needs in one place. || Powered by AI and secured on the Blockchain.",
    "projectRepo": "https://github.com/shazzarr/chromamind",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/1lq7y9M5d9hCmOBgFQT8iQhj6DiMvJgY2HTrqxe9X8tc/edit#slide=id.p",
    "liveUrl": null,
    "techStack": [
      "ink!"
    ],
    "categories": [
      "Arts",
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:18.521248+00:00",
    "teamMembers": [
      {
        "name": "0xshazam",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "monsters-ink-acd555",
    "projectName": "Monsters ink!",
    "description": "Create an adorable creature by learning Polkadot and Ink.",
    "projectRepo": "https://github.com/forever8896/inkverse",
    "demoUrl": "https://inkverse-sooty.vercel.app/",
    "slidesUrl": "https://docs.google.com/presentation/d/1Y29e6dFRJQgKqQ8Bf-nRdFN8h8hJNxgQh23Nuz8YmKE/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "ink!"
    ],
    "categories": [
      "Gaming",
      "Arts"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Bounty Payout",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": "completed",
    "m2Agreement": {
      "mentorName": null,
      "agreedDate": null,
      "agreedFeatures": [],
      "documentation": [],
      "successCriteria": null,
      "lastUpdatedBy": null,
      "lastUpdatedDate": null
    },
    "finalSubmission": {
      "repoUrl": "https://github.com/forever8896/inkverse",
      "demoUrl": "https://inkverse-sooty.vercel.app/",
      "docsUrl": "https://docs.google.com/presentation/d/1Y29e6dFRJQgKqQ8Bf-nRdFN8h8hJNxgQh23Nuz8YmKE/edit?usp=sharing",
      "summary": "Create an adorable creature by learning Polkadot and Ink.",
      "submittedDate": "2025-08-29T00:00:00+00:00",
      "submittedBy": null
    },
    "completionDate": "2025-08-29T00:00:00+00:00",
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:16.351359+00:00",
    "teamMembers": [
      {
        "name": "kilianvaldman",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Polkadot main track",
        "amount": 5000,
        "hackathonWonAtId": "synergy-2025"
      }
    ],
    "milestones": [
      {
        "description": "- More creature designs, colors\\n- Create a token for your creature using Assets Precompile\\n- Create a unique gen-ai image of your finished creature\\n- Then mint the image as an NFT because why not",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": [
      {
        "milestone": "M1",
        "amount": 2500,
        "currency": "USDC",
        "transactionProof": "https://assethub-polkadot.subscan.io/extrinsic/9378594-2",
        "bountyName": null,
        "paidDate": "2026-02-09T07:03:18.289868+00:00"
      },
      {
        "milestone": "M2",
        "amount": 2500,
        "currency": "USDC",
        "transactionProof": "https://assethub-polkadot.subscan.io/extrinsic/9718458-2",
        "bountyName": null,
        "paidDate": "2026-02-09T07:03:18.289868+00:00"
      }
    ]
  },
  {
    "id": "bohemia-fam-867126",
    "projectName": "Bohemia Fam",
    "description": "A community social platform designed to connect families and individuals sharing similar interests, creating meaningful relationships through shared activities and mutual support. The platform facilitates local meetups, resource sharing, and community building with a focus on family-friendly environments.",
    "projectRepo": "",
    "demoUrl": "nan",
    "slidesUrl": "https://app.screencast.com/cZXdMy0HUYxQJ",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "Social",
      "Mobile"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:15.646446+00:00",
    "teamMembers": [
      {
        "name": "enkorinkova",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "european-artist-bank-computer-vision-poc-proof-of-concept-732f05",
    "projectName": "European Artist Bank – Computer Vision PoC (Proof of Concept)",
    "description": "The European Artist Bank – Computer Vision PoC focuses on demonstrating the potential of integrating computer vision technology to support artists in the digital art ecosystem. By leveraging AI-driven image recognition and analysis, this PoC aims to create a decentralized platform where artists can authenticate, protect, and monetize their digital artworks. The project explores how computer vision can help identify unique artistic styles, detect copyright infringements, and facilitate fair compensation through blockchain technology.",
    "projectRepo": "",
    "demoUrl": "nan",
    "slidesUrl": "https://pitch.com/v/eab-yshd8t",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "AI",
      "Arts"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:14.933351+00:00",
    "teamMembers": [
      {
        "name": "gordon.dyballa",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "the-bright-pink-dot-e7597f",
    "projectName": "The Bright Pink Dot",
    "description": "A full-spectrum donation platform designed to solve the money transfer barrier limiting global support for LGBTQ+ people living under repressive regimes.",
    "projectRepo": "https://github.com/bright-pink-dot/bright-pink-dot",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/1LCflRqVQfBySfwXCxnvh4iJ0eO7c_HcxJCCyOFYb2zc/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "Social",
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:14.224718+00:00",
    "teamMembers": [
      {
        "name": "scila.averkie",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "agent3-ink-212b8c",
    "projectName": "agent3.ink",
    "description": "Next-Gen AI Agents Powered by OpenAI and Polkadot",
    "projectRepo": "https://github.com/pw-xd/agent3-ink",
    "demoUrl": "nan",
    "slidesUrl": "https://agent3-ink.my.canva.site/",
    "liveUrl": null,
    "techStack": [
      "ink!"
    ],
    "categories": [
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:13.502337+00:00",
    "teamMembers": [
      {
        "name": "pweimer16",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "polkaleads-ec32ae",
    "projectName": "PolkaLeads",
    "description": "The first and only lead generation native Polkadot CRM tool with Integration for cross-chain messaging through XMTP, DotLake’s BigQuery tables for wallets filtration, KILT Protocol integration for KYC verification, LeadScore algorithm for tracking and scoring wallet behavior designed for Web2 marketing agencies.",
    "projectRepo": "https://github.com/vladasanadev/TrustDotLeads",
    "demoUrl": "nan",
    "slidesUrl": "https://www.canva.com/design/DAGtcrwll1w/41axXTJdNt6WYHOSpo6gqQ/edit?utm_content=DAGtcrwll1w&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:12.791319+00:00",
    "teamMembers": [
      {
        "name": "michaelrose.work93",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "zontix-a4f6f2",
    "projectName": "Zontix",
    "description": "We are creating the future of gaming through Blockchain technology. Our Unity SDK enables any Unity-based game to accept crypto payments from players, with automated conversions and wallet management - no blockchain expertise required. During the hackathon, we implemented a subscription system that lets Unity developers easily monetize their games through crypto payments",
    "projectRepo": "https://github.com/Zontix-SDK/Zontix-Unity-Polkadot",
    "demoUrl": "nan",
    "slidesUrl": "https://pitch.com/v/zontix-unity-sdk-noxnz7/dc17c80d-8f4e-4e94-9aa1-5f2fe965e87d",
    "liveUrl": null,
    "techStack": [
      "Polkadot"
    ],
    "categories": [
      "Gaming",
      "Developer Tools"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:12.083959+00:00",
    "teamMembers": [
      {
        "name": "lukas.c.seel",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "findme-974cc1",
    "projectName": "FindME",
    "description": "FindMe instantly connects users with verified, authentic people physically present at their venue, using secure proof-of-presence . During the hackathon, we built a simple,  MVP web app that seamlessly verifies attendees without needing blockchain wallets or personal data sharing upfront.",
    "projectRepo": "https://github.com/Sam-web3-2025/findme-mvp",
    "demoUrl": "https://drive.google.com/drive/folders/1Ep5C7J1LL1rztPxPGp0zZMnyQe8A0IlI",
    "slidesUrl": "https://drive.google.com/drive/folders/1Ep5C7J1LL1rztPxPGp0zZMnyQe8A0IlI?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Polkadot"
    ],
    "categories": [
      "Social"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:11.37856+00:00",
    "teamMembers": [
      {
        "name": "shampa.imp",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "cranenalysis-dfb3d7",
    "projectName": "Cranenalysis",
    "description": "An onchain monitoring and sleuthing tool that allows users to get a cutting edge for any future decision. From personal knowledge growth to an aid how to shape Inflation on Polkadot, through knowing what of the staking rewards will get sold, everything is possible and more fruitful with more information available.",
    "projectRepo": "https://github.com/0xCraneX/Blockchain-Monitor-and-Sleuther/tree/blockchain-monitor",
    "demoUrl": "https://drive.google.com/file/d/1vXyUr3RR0CTahL3WZwwfkf16CM-Z7ijh/view?usp=sharing",
    "slidesUrl": "https://docs.google.com/presentation/d/1UVOLcJ2yE7fhahBQD3YKP6Jc10m1VJKx3kLiGdgYP5c/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Polkadot"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Bounty Payout",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": "completed",
    "m2Agreement": {
      "mentorName": null,
      "agreedDate": null,
      "agreedFeatures": [],
      "documentation": [],
      "successCriteria": null,
      "lastUpdatedBy": null,
      "lastUpdatedDate": null
    },
    "finalSubmission": {
      "repoUrl": "https://github.com/0xCraneX/Blockchain-Monitor-and-Sleuther/tree/blockchain-monitor",
      "demoUrl": "https://drive.google.com/file/d/1vXyUr3RR0CTahL3WZwwfkf16CM-Z7ijh/view?usp=sharing",
      "docsUrl": "https://docs.google.com/presentation/d/1UVOLcJ2yE7fhahBQD3YKP6Jc10m1VJKx3kLiGdgYP5c/edit?usp=sharing",
      "summary": "An onchain monitoring and sleuthing tool that allows users to get a cutting edge for any future decision. From personal knowledge growth to an aid how to shape Inflation on Polkadot, through knowing what of the staking rewards will get sold, everything is possible and more fruitful with more information available.",
      "submittedDate": "2025-08-29T00:00:00+00:00",
      "submittedBy": null
    },
    "completionDate": "2025-08-29T00:00:00+00:00",
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:09.236188+00:00",
    "teamMembers": [
      {
        "name": "yanick.savov",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Polkadot main track",
        "amount": 5000,
        "hackathonWonAtId": "synergy-2025"
      }
    ],
    "milestones": [
      {
        "description": "- Deliverable 1: Further improve the tooling. More filters. Easier loading, more clarity, more features.\\n- Deliverable 2: Switch from Subscan Free Api connection to proper RPC connection. Already in contact with RPC providers\\n- Deliverable 3: Support Technical Fellowship with the inflation Discussion and decision making. Already in talks with them. Probably out of scope for this actual deliverable, as it may be a longer term, but interesting for demand nonetheless.",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": [
      {
        "milestone": "M1",
        "amount": 2500,
        "currency": "USDC",
        "transactionProof": "https://assethub-polkadot.subscan.io/extrinsic/9378594-2",
        "bountyName": null,
        "paidDate": "2026-02-09T07:03:11.11417+00:00"
      },
      {
        "milestone": "M2",
        "amount": 2500,
        "currency": "USDC",
        "transactionProof": "https://assethub-polkadot.subscan.io/extrinsic/9718458-2",
        "bountyName": null,
        "paidDate": "2026-02-09T07:03:11.11417+00:00"
      }
    ]
  },
  {
    "id": "modelguard-288b63",
    "projectName": "ModelGuard",
    "description": "A secure marketplace for machine learning models using blockchain tech stack built on Polkadot. ModelGuard creates a trusted environment where developers can monetize AI models while users benefit from transparent, verified AI services.",
    "projectRepo": "https://github.com/modelguard/modelguard",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/1-mJ7wOkqaxh6ZgQXNqpJHJRxXoE7nzYb7cJ3SXwf0lA/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Polkadot"
    ],
    "categories": [
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:08.537033+00:00",
    "teamMembers": [
      {
        "name": "lucas",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "v3ss3l-d27551",
    "projectName": "V3SS3L",
    "description": "V3SS3L is a decentralized AI-driven investment advisor that demystifies crypto, simplifies investing, and delivers personalized financial strategies. With decentralized data storage, privacy-first design, and seamless multichain integration (Polkadot), V3SS3L provides portfolio tracking, staking rewards management, and tailored investment advice—all in a simple, user-friendly interface, built for adoption at scale.",
    "projectRepo": "https://github.com/kaycee-okoye/v3ss3l",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/1VcEzjRGHWI6SWu7xmOm1ovT7dJhRqQP7vL0BnvHGEcU/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Polkadot"
    ],
    "categories": [
      "DeFi",
      "Mobile"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:07.84356+00:00",
    "teamMembers": [
      {
        "name": "georgej99",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "chill-n-fill-bot-c2cb22",
    "projectName": "Chill'n'Fill Bot",
    "description": "Telegram bot for a gasless user experience when using parachains. Passkey-based Telegram login allows users to interact with parachains via the bot, while transactions are paid for by a transaction-bundler hosted by Polkadot.",
    "projectRepo": "https://github.com/chillfill-dapp/telegram-bot-gas",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/1fBJOwVGNd3z5h-Rp4L3xHO2IhR7sE6j--VLlgqGh7zo/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "Mobile"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:07.129612+00:00",
    "teamMembers": [
      {
        "name": "joshuaschiemann",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "kusamaritans-365a69",
    "projectName": "KuSamaritans",
    "description": "KuSamaritans: Help Anonymously. Pay it Forward on Kusama.",
    "projectRepo": "https://github.com/admi-n/kusama-samaritans",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/1o4gRBnkj6yMfrXAuGb9dFLhtksUyf2XSLAOx3vnHJrA/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Kusama"
    ],
    "categories": [
      "Social"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:06.432934+00:00",
    "teamMembers": [
      {
        "name": "fly",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "0xcc-the-cross-chain-p2p-payment-bill-splitting-with-zk-privacy-d0b0ed",
    "projectName": "0xCC - The Cross-Chain P2P Payment & Bill Splitting with ZK Privacy",
    "description": "For example, imagine you're out at dinner with colleagues, including your boss, and the person with the company credit card pays the $460 bill. 0xCC ensures that when you send your $115 share, your boss can't see the specific amount you owe – only that you've contributed to the payment. This privacy layer prevents awkward workplace dynamics where spending habits or financial situations might be judged. Similarly, in a vacation rental split among friends, 0xCC allows different people to contribute varying amounts based on room preferences without creating social tension over who paid what. Unlike traditional apps like Venmo or Splitwise where payment amounts and history are visible, 0xCC uses zero-knowledge proofs to verify payments without revealing individual contribution details, making it perfect for maintaining financial privacy in social and professional settings.",
    "projectRepo": "https://github.com/soragXYZ/0xCC",
    "demoUrl": "nan",
    "slidesUrl": "https://pitch.com/v/0xcc-6s5j0l",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "DeFi",
      "Social"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:05.733049+00:00",
    "teamMembers": [
      {
        "name": "hannes.gao",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "inkwise-4e66a6",
    "projectName": "Inkwise",
    "description": "Build on-chain applications and smart contracts for Polkadot Ecosystem with no-code studio. <br><br>The main idea is to make no-code integration platform that helps to integrate polkadot blockchain capabilities to already existing platforms and startups.  So the businesses don't have to hire more developers or learn a programming language.",
    "projectRepo": "https://github.com/scrap-a/inkwise-parachain",
    "demoUrl": "nan",
    "slidesUrl": "https://www.canva.com/design/DAGXw4vLDfc/82ENShh8AJSgnEKJuANd8g/view",
    "liveUrl": null,
    "techStack": [
      "ink!"
    ],
    "categories": [
      "Developer Tools"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:05.026614+00:00",
    "teamMembers": [
      {
        "name": "scrap2030",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "grantflow-dev-3e29f5",
    "projectName": "GrantFlow.dev",
    "description": "GrantFlow helps foundations, grant programs, hackathons, and ecosystem funds streamline their grant distribution processes, while allowing builders to showcase their work and accomplishments in a verifiable, on-chain manner.",
    "projectRepo": "https://github.com/justmert/grantflow-backend-hyperlane",
    "demoUrl": "nan",
    "slidesUrl": "https://www.canva.com/design/DAGYCfcaHHQ/a6qJKdH-6LsXTqgVsezJGg/edit?utm_content=DAGYCfcaHHQ&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:04.314719+00:00",
    "teamMembers": [
      {
        "name": "maurits.bos",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "polkadot-airdrop-for-eth-builder-b35e81",
    "projectName": "Polkadot airdrop for eth builder",
    "description": "Seamless Crypto Rewards for Your Community.",
    "projectRepo": "https://github.com/cjumelin/polkadot-hackathon-2024",
    "demoUrl": "nan",
    "slidesUrl": "https://github.com/cjumelin/polkadot-hackathon-2024",
    "liveUrl": null,
    "techStack": [
      "Polkadot"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:03.610988+00:00",
    "teamMembers": [
      {
        "name": "cjumelin",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "milkyway2-c55833",
    "projectName": "Milkyway2",
    "description": "Milkyway2 delivers transparent, privacy-first risk and incident reporting across Polkadot, Kusama and parachains. Users see real-time, color-coded risk indicators for each validator—paired with clear action steps—so anyone can make informed moves instantly. The platform combines advanced zero-knowledge, Sybil-resistant reporting and encrypted validator messaging, ensuring that every alert brings both context and security for the entire network.",
    "projectRepo": "https://github.com/tatdz/milkyway2",
    "demoUrl": "https://monorepo-2-milestone-qadh.vercel.app/",
    "slidesUrl": "https://docs.google.com/presentation/d/14uqsXmstUvj2FWImFQv1frIORn4BB-z26BDHaYE9FsA/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "ink!"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Bounty Payout",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": "completed",
    "m2Agreement": {
      "mentorName": null,
      "agreedDate": null,
      "agreedFeatures": [],
      "documentation": [],
      "successCriteria": null,
      "lastUpdatedBy": null,
      "lastUpdatedDate": null
    },
    "finalSubmission": {
      "repoUrl": "https://github.com/tatdz/milkyway2",
      "demoUrl": "https://monorepo-2-milestone-qadh.vercel.app/",
      "docsUrl": "https://docs.google.com/presentation/d/14uqsXmstUvj2FWImFQv1frIORn4BB-z26BDHaYE9FsA/edit?usp=sharing",
      "summary": "Milkyway2 delivers transparent, privacy-first risk and incident reporting across Polkadot, Kusama and parachains. Users see real-time, color-coded risk indicators for each validator—paired with clear action steps—so anyone can make informed moves instantly. The platform combines advanced zero-knowledge, Sybil-resistant reporting and encrypted validator messaging, ensuring that every alert brings both context and security for the entire network.",
      "submittedDate": "2025-08-29T00:00:00+00:00",
      "submittedBy": null
    },
    "completionDate": "2025-08-29T00:00:00+00:00",
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:01.465979+00:00",
    "teamMembers": [
      {
        "name": "anonymous",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Polkadot main track",
        "amount": 5000,
        "hackathonWonAtId": "synergy-2025"
      }
    ],
    "milestones": [
      {
        "description": "- Bringing Milkyway2 on mainnet\\n- Multi-wallet support and data export features\\n- Risk log integration for DeFi applications\\n- Advanced analytics and reporting tools\\n- ZK-powered governance voting system\\n- Full DAO risk aggregation platform\\n- Strategic partnerships with validators",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": [
      {
        "milestone": "M1",
        "amount": 2500,
        "currency": "USDC",
        "transactionProof": "https://assethub-polkadot.subscan.io/extrinsic/9378594-2",
        "bountyName": null,
        "paidDate": "2026-02-09T07:03:03.375205+00:00"
      },
      {
        "milestone": "M2",
        "amount": 2500,
        "currency": "USDC",
        "transactionProof": "https://assethub-polkadot.subscan.io/extrinsic/9718458-2",
        "bountyName": null,
        "paidDate": "2026-02-09T07:03:03.375205+00:00"
      }
    ]
  },
  {
    "id": "acdc-b59eaf",
    "projectName": "ACDC",
    "description": "A cross chain defi comprehensive aggregator. Yield generation via cross-chain liquidity provision. Powered by hyperlane and chainflip.  Build your own portfolio using the investment bots with cross-chain limit orders from chainflip",
    "projectRepo": "https://github.com/nwakaku/ACDC",
    "demoUrl": "nan",
    "slidesUrl": "https://www.canva.com/design/DAGXVWwqcUs/hY1HiJV4vTQ5Tm93sL1_OA/edit",
    "liveUrl": null,
    "techStack": [
      "Other"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:00.744185+00:00",
    "teamMembers": [
      {
        "name": "web3enthusiastbc",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "secure-scout-b2282b",
    "projectName": "Secure Scout",
    "description": "Secure Scout is an on-chain smart contract vulnerability scanner specifically designed for the Polkadot ecosystem using ink! smart contracts. The platform provides automated security analysis, vulnerability detection, and actionable remediation suggestions for developers building on Polkadot and its parachains.",
    "projectRepo": "https://github.com/chekpey/secure-scout-contract-example",
    "demoUrl": "nan",
    "slidesUrl": "https://pitch.com/v/secure-scout-0ofvjj",
    "liveUrl": null,
    "techStack": [
      "ink!"
    ],
    "categories": [
      "Developer Tools"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:03:00.038864+00:00",
    "teamMembers": [
      {
        "name": "babespapes",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "iconic-ink-2e4f87",
    "projectName": "Iconic Ink",
    "description": "Artists and their fans are able to have intimate interactions, by collaborating in creating an art-piece. An artist grants fans access to their collaborative studio, fans submit media they would like the artist to sign, this is then minted on chain for the fan. Within the studio there are also features such a fan group chat with the artist and livestream capability by the artist to their fans.",
    "projectRepo": "https://github.com/mxber2022/IconicInkBerlin",
    "demoUrl": "https://iconicink.vercel.app/",
    "slidesUrl": "https://www.canva.com/design/DAGtf_7SMLk/oUdsaqp7OnRPcxV2ix18Dg/edit?utm_content=DAGtf_7SMLk&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    "liveUrl": null,
    "techStack": [
      "ink!"
    ],
    "categories": [
      "Arts",
      "NFT"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:59.336256+00:00",
    "teamMembers": [
      {
        "name": "scrap2030",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "kusama-hub-a0d98b",
    "projectName": "Kusama Hub",
    "description": "A discoverability platform for smart contracts and tooling on Kusama Asset Hub. It aims to connect developers with users with an extra gamification edge.",
    "projectRepo": "https://github.com/lovelaced/kusamahub",
    "demoUrl": "https://kusamahub.com",
    "slidesUrl": "https://www.youtube.com/watch?v=_Us1moAl3Nc",
    "liveUrl": null,
    "techStack": [
      "Kusama"
    ],
    "categories": [
      "Developer Tools",
      "Gaming"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Bounty Payout",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": "completed",
    "m2Agreement": {
      "mentorName": null,
      "agreedDate": null,
      "agreedFeatures": [],
      "documentation": [],
      "successCriteria": null,
      "lastUpdatedBy": null,
      "lastUpdatedDate": null
    },
    "finalSubmission": {
      "repoUrl": "https://github.com/lovelaced/kusamahub",
      "demoUrl": "https://kusamahub.com",
      "docsUrl": "https://www.youtube.com/watch?v=_Us1moAl3Nc",
      "summary": "A discoverability platform for smart contracts and tooling on Kusama Asset Hub. It aims to connect developers with users with an extra gamification edge.",
      "submittedDate": "2025-08-29T00:00:00+00:00",
      "submittedBy": null
    },
    "completionDate": "2025-08-29T00:00:00+00:00",
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:57.195956+00:00",
    "teamMembers": [
      {
        "name": "leemo",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Kusama main track",
        "amount": 2000,
        "hackathonWonAtId": "synergy-2025"
      }
    ],
    "milestones": [
      {
        "description": "- Transfer between Substrate & EVM in a simple UI\\n- Additional game smart contract by the team\\n- XP system for using contracts on the site\\n- Real time log of user interactions with the platform\\n- Improved documentation on how to build smart contracts on Kusama Asset Hub and how to deploy them to the platform\\n- Migrate existing contracts from Passet Hub to Kusama Asset Hub",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": [
      {
        "milestone": "M1",
        "amount": 1000,
        "currency": "DOT",
        "transactionProof": "https://polkadot.subscan.io/extrinsic/27432606-2",
        "bountyName": null,
        "paidDate": "2026-02-09T07:02:59.101243+00:00"
      },
      {
        "milestone": "M2",
        "amount": 1000,
        "currency": "DOT",
        "transactionProof": "https://polkadot.subscan.io/extrinsic/28282795-3",
        "bountyName": null,
        "paidDate": "2026-02-09T07:02:59.101243+00:00"
      }
    ]
  },
  {
    "id": "chainbet-4b3170",
    "projectName": "ChainBet",
    "description": "Empowering Gamers with Decentralized Trust",
    "projectRepo": "https://github.com/Kaybarax/chain-bet",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/1RJOaINpGKOKL2qOhkMvyP5kL_X7Gq_kqrNnU-u_Weh4/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Solana"
    ],
    "categories": [
      "Gaming",
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:56.482363+00:00",
    "teamMembers": [
      {
        "name": "kaybarax",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "kusama-waifus-9840e7",
    "projectName": "Kusama Waifus",
    "description": "AI-generated anime girls deployed as an NFT collection on Kusama. Uncensored.",
    "projectRepo": "https://github.com/HexPandaa/kusama-waifus",
    "demoUrl": "https://kusama-waifus.vercel.app/",
    "slidesUrl": "",
    "liveUrl": null,
    "techStack": [
      "Kusama"
    ],
    "categories": [
      "NFT",
      "Arts"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:55.775942+00:00",
    "teamMembers": [
      {
        "name": "kuchelnat",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "deadman-vault-5dc5b5",
    "projectName": "DeadMan Vault",
    "description": "DeadMan Vault is a secure smart contract system that allows users to create vaults with customizable access rules. The vaults automatically transfer ownership or execute predefined actions when the owner becomes inactive (the dead man switch). This ensures that digital assets are never lost and can be safely passed on to designated beneficiaries.",
    "projectRepo": "https://github.com/Georgi-G-Angelov/DeadMan",
    "demoUrl": "nan",
    "slidesUrl": "https://www.canva.com/design/DAGYE5bRt6k/KzG0x0wL24fkVrjzpPj1xg/edit",
    "liveUrl": null,
    "techStack": [
      "Solana"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:54.584072+00:00",
    "teamMembers": [
      {
        "name": "georgiivanov",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- **Deliverables:**\n\n- [ ] Deliverable 1: \\[Specific, measurable outcome\\]\n- [ ] Deliverable 2: \\[Specific, measurable outcome\\]\n- [ ] Deliverable 3: \\[Specific, measurable outcome\\]",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "cere-network-aa7cb3",
    "projectName": "Cere Network",
    "description": "We are making smart Wallets that are cheaper, smarter, faster, fully decentralized and more secure.<br>What we created during the hackathon: we created full non-custodial decentralized system to optimize fees and support interoperability all chains and added polkadot chain for test.  <br><br> Cere network is unique Validator network that uses a different method to create super smart contracts. It relies on a validators decision threshold that ensures scalability and security",
    "projectRepo": "https://github.com/giorgi568/synergyhack",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/1sH6F4JGjRB87qsLsyXTCKjyxFVzZ2FflnzMnOEO9Wlo/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Polkadot"
    ],
    "categories": [
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:52.203567+00:00",
    "teamMembers": [
      {
        "name": "giorgi",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- **Deliverables:**\n\n- [ ] Deliverable 1: We will create better Architecture and framework for web3 developers. Which would create a good abstraction between smart contracts and off chain AI agents and backend code. For example it might be written in Rust (polkadot) or Move or any other language. To take the simplicity even further we might have an intermediate language for the web3. \n- [ ] Deliverable 2: We will publish our white paper and create more documentation on how to use this approach.\n- [ ] Deliverable 3: Create validators network setup for the Cere Network and the decentralization metrics to be on par with big chains like polkadot.",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "gradient-235dff",
    "projectName": "Gradient",
    "description": "Launch multichain governance processes, execute proposals cross-chain by plugging in blockchains and protocols (in any language or VM) through a unified interface",
    "projectRepo": "https://github.com/metaspan/gradient",
    "demoUrl": "nan",
    "slidesUrl": "https://pitch.com/v/gradient-the-dao-interoperability-layer-znq4cg",
    "liveUrl": null,
    "techStack": [
      "Polkadot"
    ],
    "categories": [
      "Social"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:50.984712+00:00",
    "teamMembers": [
      {
        "name": "francesco.stefani",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- **Deliverables:**\n\n- Deliverable 1: Launch on Production after Security Audit of the Polkadot blockchain\n- Deliverable 2: Setup bootstrap proposal creators and treasuries such as <br> Hyperlane DAO  <br> Hydration  <br> InvArch DAO  <br> Polimec DAO  <br> Subsquare DAO.\n- Deliverable 3: Integrate with Morpheus (AI agents executing onchain actions on behalf of humans)",
        "createdAt": "2026-02-09T06:26:06.342+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.342+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "playnet-free-association-184ed3",
    "projectName": "Playnet: Free-Association",
    "description": "We have been extending the free-association interface for scaling gift-economies, DAO governance, and mutual-aid networks. We have been working on the UI/UX and polkadot integration so that we can scale gift-economies in web-3",
    "projectRepo": "https://github.com/interplaynetary/free-association",
    "demoUrl": "https://youtu.be/Y8a1-c3COwo",
    "slidesUrl": "https://interplaynetary.github.io/free-association/",
    "liveUrl": null,
    "techStack": [
      "Kusama"
    ],
    "categories": [
      "Social",
      "DeFi"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Bounty Payout",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": "completed",
    "m2Agreement": {
      "mentorName": null,
      "agreedDate": null,
      "agreedFeatures": [],
      "documentation": [],
      "successCriteria": null,
      "lastUpdatedBy": null,
      "lastUpdatedDate": null
    },
    "finalSubmission": {
      "repoUrl": "https://github.com/interplaynetary/free-association",
      "demoUrl": "https://youtu.be/Y8a1-c3COwo",
      "docsUrl": "https://interplaynetary.github.io/free-association/",
      "summary": "We have been extending the free-association interface for scaling gift-economies, DAO governance, and mutual-aid networks. We have been working on the UI/UX and polkadot integration so that we can scale gift-economies in web-3",
      "submittedDate": "2025-10-20T00:00:00+00:00",
      "submittedBy": null
    },
    "completionDate": "2025-10-20T00:00:00+00:00",
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:48.803471+00:00",
    "teamMembers": [
      {
        "name": "ruzgarimski",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Kusama main track",
        "amount": 1000,
        "hackathonWonAtId": "synergy-2025"
      }
    ],
    "milestones": [
      {
        "description": "- Web3 ecosystem can use free-association gift-economy economics to distribute tokens and validate contributions. Concretely: meaning tokens can easily be transferred according to mutual-recognition proportions.\\n- Collective-Recognition (derived from mutual-recognition) has been deployed with convenient UX: Concretely, now collective-assets (DAO treasuries etc.) can be distributed according to collective-recognition easily.\\n- Collective-Tree (derived from individual trees and Collective-Recognition) has been deployed with convenient UX allowing organizations and communities (DAOs etc.) to easily view what is concretely important to the collective. Concretely this means extending the protocol further, and adapting the Resizable-TreeMap to a collective context.",
        "createdAt": "2026-02-09T06:26:06.341+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.341+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": [
      {
        "milestone": "M1",
        "amount": 500,
        "currency": "DOT",
        "transactionProof": "https://polkadot.subscan.io/extrinsic/27432606-2",
        "bountyName": null,
        "paidDate": "2026-02-09T07:02:50.747864+00:00"
      },
      {
        "milestone": "M2",
        "amount": 500,
        "currency": "DOT",
        "transactionProof": "https://polkadot.subscan.io/extrinsic/28282795-3",
        "bountyName": null,
        "paidDate": "2026-02-09T07:02:50.747864+00:00"
      }
    ]
  },
  {
    "id": "polkadot-roots-app-9af29a",
    "projectName": "Polkadot Roots App",
    "description": "The app is about communication on events, claiming and managing .MEMOs. Its purpose is to simplify and unite event interactions.",
    "projectRepo": "https://github.com/valentynhol/polkadotroots",
    "demoUrl": "nan",
    "slidesUrl": "",
    "liveUrl": null,
    "techStack": [
      "Polkadot"
    ],
    "categories": [
      "Social"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:47.630895+00:00",
    "teamMembers": [
      {
        "name": "hol.valentyn",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- **Deliverables:**\n\n- [ ] Deliverable 1: \\[Specific, measurable outcome\\]\n- [ ] Deliverable 2: \\[Specific, measurable outcome\\]\n- [ ] Deliverable 3: \\[Specific, measurable outcome\\]",
        "createdAt": "2026-02-09T06:26:06.341+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.341+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "interzone-52af1a",
    "projectName": "Interzone",
    "description": "Interzone is a platform for underground events and counter-culture expression. We enable trusted communities that can afford to stay open to form, within privacy-preserving groups.",
    "projectRepo": "",
    "demoUrl": "nan",
    "slidesUrl": "https://docs.google.com/presentation/d/1ZKRgxrRdQyUxNnNE7Ydr8ICtKQwA3eaJBdmASKKBVjc/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Kusama"
    ],
    "categories": [
      "Social"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:46.443798+00:00",
    "teamMembers": [
      {
        "name": "me",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- **Deliverables:**\n\n- [ ] Deliverable 1: \\[Specific, measurable outcome\\]\n- [ ] Deliverable 2: \\[Specific, measurable outcome\\]\n- [ ] Deliverable 3: \\[Specific, measurable outcome\\]",
        "createdAt": "2026-02-09T06:26:06.341+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.341+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "gay-fun-bc22d4",
    "projectName": "Gay.fun",
    "description": "The general public believes that anonymity supports illicit activity. We'd like to demonstrate that it is necessary to advance human rights and social good by enabling those in oppressed areas - such as gays in Iran - to vote, donate, and communicate.\n\nApplying for Marketing Bounty",
    "projectRepo": "",
    "demoUrl": "https://v0-iran-charity-website.vercel.app/",
    "slidesUrl": "https://v0-iran-charity-website.vercel.app/",
    "liveUrl": null,
    "techStack": [
      "Polkadot"
    ],
    "categories": [
      "Social"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:45.251042+00:00",
    "teamMembers": [
      {
        "name": "jeffreyjoh",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- **Deliverables:**\n\n- 1: Landing page launch, attract (nonanonymous) email submissions. \n- 2: With Polkavote team development, establish a site where cryptoholders and anonymously vote/join.",
        "createdAt": "2026-02-09T06:26:06.341+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.341+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "trendify-08590b",
    "projectName": "Trendify",
    "description": "Trendify is a platform that lets creators tokenize their content and intellectual property using bonding curves, turning fan engagement into tradable assets. During the hackathon, we built a prototype where creators can launch their own tokens, with dynamic pricing based on demand, and earn transparently as supporters buy in.\n\n <br> <https://www.canva.com/design/DAGtgTqqUDE/0SQVBrwVjRO1IMWWAFeAqw/edit>",
    "projectRepo": "https://github.com/ghosthash2/trendify",
    "demoUrl": "nan",
    "slidesUrl": "https://www.canva.com/en_gb/login/?redirect=%2Flogin%2Fswitch%3Fbrand%3DBAFSSzIA8BI%26redirect%3D%252Fdesign%252FDAGtgTqqUDE%252Fedit",
    "liveUrl": null,
    "techStack": [
      "Solana"
    ],
    "categories": [
      "NFT",
      "Social"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:44.042485+00:00",
    "teamMembers": [
      {
        "name": "noah.haufer",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- **Deliverables:**\n\n- \\[ \\] Deliverable 1: \\[Specific, measurable outcome\\]\n- \\[ \\] Deliverable 2: \\[Specific, measurable outcome\\]\n- \\[ \\] Deliverable 3: \\[Specific, measurable outcome\\]",
        "createdAt": "2026-02-09T06:26:06.341+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.341+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "simchain-9cfbef",
    "projectName": "SIMChain",
    "description": "We're enabling people without smartphones or internet to access blockchain-based financial services using just a basic phone by using USSD Service. \n\nSIMChain is a SIM-based smart wallet system that lets users send, save, and stake crypto on Solana and Polkadot — no apps or internet needed.<br>It brings DeFi to the real world by turning any phone into a gateway to Web3.",
    "projectRepo": "https://github.com/Monehin/simchain",
    "demoUrl": "https://youtu.be/DN7aKlYfQSA",
    "slidesUrl": "https://docs.google.com/presentation/d/129MJ7YZNVobdDw6EM5N0Hm9UAmbcQYylmO1fs5QySEw/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [
      "Polkadot"
    ],
    "categories": [
      "Mobile",
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-07-18T23:00:00+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:42.850325+00:00",
    "teamMembers": [
      {
        "name": "hekamphorst",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [
      {
        "description": "- **Deliverables:**\n\n- **Developer API and Ecosystem** \n\n\n- **PolkaDot integration**\n\n- **Partner with Telcos / NGOs**\n\n- **Launch pilot in Rwanda**",
        "createdAt": "2026-02-09T06:26:06.341+00:00",
        "createdBy": "migration",
        "updatedAt": "2026-02-09T06:26:06.341+00:00",
        "updatedBy": "migration"
      }
    ],
    "totalPaid": []
  },
  {
    "id": "dchat-974015",
    "projectName": "Dchat",
    "description": "Web3 business chat software. A communication application that automatically shares business cards. The synchronized interface allows for sharing of projects, experiences, and resources. It accelerates business collaboration, enabling collaborative project building. Payments are also supported within the chat.",
    "projectRepo": "https://github.com/everest-an/dchat",
    "demoUrl": "https://drive.google.com/file/d/1A1WwGIeF57EzfiaMepkExnYX56c5LBNp/view?usp=sharing",
    "slidesUrl": "https://g8h3ilcq76yy.manus.space/",
    "liveUrl": null,
    "techStack": [],
    "categories": [],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:42.148076+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "healtguard-9bdb96",
    "projectName": "HealtGuard",
    "description": "HealthGuard é um sistema de monitoramento médico em tempo real que detecta emergências e registra eventos críticos de saúde na blockchain Polkadot. Utiliza extrinsics system.remark da Westend Testnet para criar registros imutáveis e auditáveis. A solução reduz riscos de diagnósticos tardios e garante integridade total de histórico médico em situações de emergência.",
    "projectRepo": "https://github.com/Jhonata96/HealthGuard",
    "demoUrl": "https://youtube.com/shorts/ltJEz0ONc8o?si=azZWonYUDQR6nY11",
    "slidesUrl": "https://www.canva.com/design/DAG43HDjALk/YwYnLq16s3nX-0aW4cvQeQ/edit?utm_content=DAG43HDjALk&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI",
      "Mobile"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:41.455717+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "cats-dissolved-in-the-light-941e79",
    "projectName": "Cats dissolved in the light",
    "description": "The intention of this project is to bring traditional art closer to web3. Using NFTs as a tool for selling art",
    "projectRepo": "No repositorio",
    "demoUrl": "https://youtu.be/qZg_HZFQE1Q?si=cLRLETlUCEuWovFv",
    "slidesUrl": "https://kodadot.xyz/ahk/collection/626",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Kusama",
      "NFT"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:39.48628+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "siphon-protocol-d276b4",
    "projectName": "Siphon Protocol",
    "description": "Enabling untraceable, hyperliquid and institutional-grade DeFi privacy",
    "projectRepo": "https://github.com/undefinedlab/siphon_dot",
    "demoUrl": "https://drive.google.com/file/d/1VVP6MJ2MsYHCxC19iJiYPSvwYLxgBlin/view?usp=sharing",
    "slidesUrl": "https://youtu.be/L9Ibom3o6lU",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Privacy",
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:38.297123+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Hyperbridge",
        "amount": 1500,
        "hackathonWonAtId": "symbiosis-2025"
      }
    ],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "decomp-network-8c3306",
    "projectName": "decomp.network",
    "description": "An on-chain decentralized compliance intelligence protocol for the open economy.",
    "projectRepo": "https://github.com/helikon-labs/decomp",
    "demoUrl": "https://drive.google.com/file/d/1T-vQs-r5iaHUnxZL6RRIyhhu0pNNwnIf/view?usp=sharing",
    "slidesUrl": "https://docs.google.com/presentation/d/1HajS91-A3alV6JRm_fWIXqVehUNK99WloSxnBx2HcTc/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:37.502389+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "security-nexus-c0e9c5",
    "projectName": "Security Nexus",
    "description": "The problem:\n- **$474 million** lost in 2024 alone from DeFi exploits\n- **Zero specialized tools** for auditing Substrate and FRAME pallets\n- **Brutal scarcity** of auditors who can review Substrate code\n- **No real-time monitoring** exists to detect attacks before they succeed\n\nThe solution:\n\n**1. Prevention** - SAFT Enhanced statically analyzes your code BEFORE deployment, detecting vulnerabilities like integer overflow, reentrancy, access control issues.\n\n**2. Detection** - Real-time mempool monitoring detecting flash loan attacks, MEV, oracle manipulation as they happen.\n\n**3. Response** - Reporting system with zero-knowledge proofs to disclose vulnerabilities privately.\n\n**4. Cross-chain** - Unified security through Hyperbridge ISMP for all parachains.\n\nEverything built natively for Substrate and FRAME.\"\n\nWhat we build:\n\n- **SAFT Enhanced** detects real vulnerabilities from 2024 exploits\n- **Monitoring Engine** analyzes transactions in real-time from Polkadot, Kusama, Westend\n- **Professional dashboard** with live reports, no mocked data\n- **Multi-chain support** working today\n- **Production-ready** with Docker, TimescaleDB, complete API\n\n\nImpact:\n\n\"The impact is immediate:\n\n- Parachain developers can audit their code **before** deployment\n- Real-time attack detection **before** they succeed\n- We lower the barrier to secure development in Polkadot",
    "projectRepo": "https://github.com/JuaniRaggio/SecurityNexus.git",
    "demoUrl": "https://github.com/JuaniRaggio/SecurityNexus/blob/dev/presentations/security-nexus-video-pitch.html",
    "slidesUrl": "https://github.com/JuaniRaggio/SecurityNexus/tree/main/presentations",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Privacy",
      "AI",
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:36.789342+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "chiri-app-ea8aee",
    "projectName": "Chiri App",
    "description": "Chiri Sensorial Bridge allows a physical collectible with an embedded NFC chip to sync 'story events' and micro sensor data into an Arkiv data stream, which automatically updates a dynamic NFT on Unique Network. It gives creators and collectors a verifiable identity layer for hybrid physical digital items.",
    "projectRepo": "https://github.com/Im-dimension/interface",
    "demoUrl": "https://drive.google.com/file/d/1dryX2S-ARGfSbqWcRXceTb1SOyEUv50B/view?usp=drive_link",
    "slidesUrl": "https://drive.google.com/file/d/1dNQd4kxkftS-lQXQoqwbnp55xmjAdTyL/view?usp=drive_link",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Kusama",
      "NFT"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:35.5926+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Kusama",
        "amount": 500,
        "hackathonWonAtId": "symbiosis-2025"
      }
    ],
    "milestones": [],
    "totalPaid": [
      {
        "milestone": "BOUNTY",
        "amount": 500,
        "currency": "USDC",
        "transactionProof": "https://assethub-polkadot.subscan.io/extrinsic/10652483-5",
        "bountyName": "Kusama bounty",
        "paidDate": "2025-12-03T00:00:00+00:00"
      }
    ]
  },
  {
    "id": "rsee-fc9883",
    "projectName": "rsee",
    "description": "esrnterst",
    "projectRepo": "sertnrestn",
    "demoUrl": "ersntersnt",
    "slidesUrl": "rsentrset.com",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Storage"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:34.890118+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "sraensa-62b60c",
    "projectName": "sraensa",
    "description": "rsnetriesnt",
    "projectRepo": "senteirs",
    "demoUrl": "esrntersnt",
    "slidesUrl": "erssnrt",
    "liveUrl": null,
    "techStack": [],
    "categories": [],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:34.182661+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "tixbid-e82e21",
    "projectName": "TixBid",
    "description": "TixBid is a decentralized platform that implements a Dutch Reverse Auction system for ticket sales, ensuring fairness and transparency in secondary markets. By utilizing blockchain technology, the system allows users to bid on tickets, with the first 10 bidders securing their tickets at the lowest final price, promoting competition while preventing scalping. The system protects user privacy through encrypted bids and ensures that the final ticket price remains the same for all winners.is a decentralized platform that implements a Dutch Reverse Auction system for ticket sales, ensuring fairness and transparency in secondary markets. By utilizing blockchain technology, the system allows users to bid on tickets, with the first 10 bidders securing their tickets at the lowest final price, promoting competition while preventing scalping. The system protects user privacy through encrypted bids and ensures that the final ticket price remains the same for all winners.",
    "projectRepo": "https://github.com/Odig0/Polkadot-sub0-HACK",
    "demoUrl": "https://github.com/Odig0/Polkadot-sub0-HACK",
    "slidesUrl": "https://drive.google.com/drive/folders/1DfxtxD0lXw4COozydjGLnstcQDLcgPTl?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Kusama",
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:33.488463+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "bciioe-440d9b",
    "projectName": "BCIIoE",
    "description": "A decentralized certification system that verifies renewable energy production directly from power plant meters to the Polkadot blockchain, eliminating intermediaries and ensuring transparent, tamper-proof environmental compliance.\n🎯 Problem Statement\nTraditional energy certification systems face critical challenges:\n\nCentralized Verification: Third-party auditors control certification\nData Manipulation: Intermediaries can alter or falsify records\nLack of Real-Time Tracking: Delayed reporting obscures actual production\nOracle Dependencies: Additional points of failure and trust\nHigh Costs: Multiple intermediaries increase certification expenses\n\n💡 Solution\nOur platform directly connects energy quality meters to the Polkadot blockchain, creating an immutable, real-time record of renewable energy production without any intermediate software systems.",
    "projectRepo": "https://github.com/venehsoftw/BCIIoE_v0.1",
    "demoUrl": "https://youtube.com/shorts/Xo-62xOK8dU?si=zMLbJm4JrE0K2kJS",
    "slidesUrl": "https://drive.google.com/drive/folders/1K0XIFNaqLRIr3JkqSOz2Jx5AIV_hXlWS?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:32.780024+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "the-people-s-vote-30b492",
    "projectName": "The People's Vote",
    "description": "We want to recognise the time, money and effort that people spend travelling to Polkadot events, or attending local meetups, by giving them a voice on OpenGov - even if they don't own any DOT.\\r\\n\\r\\nThe core engine of the project is a cryptographically anonymous voting protocol, that is preserving privacy across all technical layers - from theoretical foundations to implementation and networking.\\r\\n\\r\\nFor Milestone 2 we plan to combine this with a probabilistic proof of personhood which is a function of the number of IRL Polkadot events a person attends. We can use Luma QR ticket codes and NFC to ensure we allow only one account per person.",
    "projectRepo": "https://github.com/owenb/the-peoples-vote",
    "demoUrl": "https://youtu.be/XZ-oYs_AULc",
    "slidesUrl": "https://docs.google.com/presentation/d/17YidDdA90TRZZXZgceG7o8KUjnFpPATELyZ4NY2giqQ/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:31.574267+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "xx Network",
        "amount": 3000,
        "hackathonWonAtId": "symbiosis-2025"
      }
    ],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "roomfi-2d679a",
    "projectName": "RoomFi",
    "description": "RoomFi makes rental reputation **portable**. Your payment history, verification badges, and reputation score live in a **soul-bound NFT** on Passet hub in Polkadot. Thanks to **Hyperbridge**, it's instantly readable on Arbitrum, Moonbeam, and any connected chain.",
    "projectRepo": "https://github.com/hackatonmxnb/roomfi-sub0/tree/main",
    "demoUrl": "https://youtu.be/wyxLS3FjfAo",
    "slidesUrl": "https://www.canva.com/design/DAG1zsp1s6Y/1UwuEMFgUboFEonHdhWibg/edit",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI",
      "NFT"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:30.883184+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "truth-or-slash-145608",
    "projectName": "Truth or Slash",
    "description": "ruth or Slash is a Kusama-native dare market where creators stake KSM on completing dares, believers and doubters back the outcome, and an oracle finalizes results so winners auto-claim from an ink! smart contract. The stack pairs Rust + ink! on Shibuya/Shiden with a Next.js + TypeScript frontend using Tailwind CSS, Polkadot wallet integration, and reactive dare cards showing live odds, countdowns, and staking flows—turning social dares into transparent, on-chain prediction games.",
    "projectRepo": "https://github.com/namn-grg/truth-or-slash",
    "demoUrl": "https://drive.google.com/file/d/1CTwWvsR6NmY8a7ZWFcdfaR3-hSO2fgIM/view?usp=sharing",
    "slidesUrl": "empty",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Kusama",
      "AI",
      "Gaming",
      "Social"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:30.189397+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "opengov-latam-ff704a",
    "projectName": "OpenGov Latam",
    "description": "Una prueba de concepto con ZK para el voto de propuestas de representantes políticos para la representatividad ciudadana con votos en ZK",
    "projectRepo": "https://github.com/cryptohumano/zkPoll-System",
    "demoUrl": "https://youtu.be/p8t3ot_Ff5M",
    "slidesUrl": "https://docs.google.com/presentation/d/1QK0-6bzShZZVMbUEENrdhtuO_C5R23Zj/edit?usp=sharing&ouid=110353380380132837700&rtpof=true&sd=true",
    "liveUrl": null,
    "techStack": [],
    "categories": [],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:29.482959+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "certik-protocol-05df0a",
    "projectName": "Certik Protocol",
    "description": "Arkiv Protocol is a decentralized data layer that, through Arkiv SDK, enables cryptographic hashing, on-chain TTL, and immutable versioning for any document. It guarantees authenticity, integrity, and verifiable validity. Certik integrates it with React, TypeScript, Vite, wagmi, plus IPFS and Mendoza Network, to deliver secure, real-time document certification and verification.",
    "projectRepo": "https://github.com/cesarge13/sub0-hack-nov",
    "demoUrl": "https://www.youtube.com/watch?v=xEsL027yb80",
    "slidesUrl": "https://drive.google.com/drive/folders/1ih_6cLK163y4frn7hClmUa13H2dRdC5n?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Storage",
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:28.757088+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "arc-range-markets-8072f6",
    "projectName": "Arc - Range Markets",
    "description": "Verifiable on-chain prediction markets specifically designed for range markets with sub second updates and intervals, all powered by arkiv",
    "projectRepo": "https://github.com/KENILSHAHH/arkiv",
    "demoUrl": "https://www.loom.com/share/73011a0bcd054a1fbddb0e1e7bdbd56e",
    "slidesUrl": "https://www.canva.com/design/DAG42Kt0n4g/USkGwQhsFC9otnGSgtZ9PQ/edit?utm_content=DAG42Kt0n4g&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Storage",
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:28.054807+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "artefact-4831f1",
    "projectName": "Artefact",
    "description": "Physical places currently lose their histories the moment we walk away. Artefact lets explorers, campus communities, city labs, and event attendees drop short AR messages that are anchored to a real GPS point, then persisted on Arkiv’s immutable ledger. The platform surfaces those contextual notes through a browser-native AR and console experience, so anyone who arrives at that place can unlock the hidden story, revisit it through Arkiv’s explorer, or canonize it on Polkadot Hub’s TestNet for a trusted record.",
    "projectRepo": "https://github.com/traplordmoses/artifact",
    "demoUrl": "https://youtu.be/sA_v2gKC_A0 (pitch), https://youtu.be/B5hMgRAFLpc (demo)",
    "slidesUrl": "https://github.com/traplordmoses/artifact/blob/master/artefact_pitch.pdf",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Kusama"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:27.357064+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "dmegle-a50420",
    "projectName": "dMegle",
    "description": "dMegle is a decentralized, real-time video streaming platform built on Arkiv Testnet that enables live camera streaming directly from browsers to viewers worldwide. Unlike traditional streaming services that rely on centralized servers, this platform leverages Arkiv's blockchain-based data storage and real-time subscription features to create a truly decentralized streaming experience.",
    "projectRepo": "https://github.com/armsves/dMegle",
    "demoUrl": "https://youtu.be/DcJNhLIc3AY",
    "slidesUrl": "https://www.canva.com/design/DAG40obHmmg/eQ2LkPFl8a6s2UwtZozIEg/view?utm_content=DAG40obHmmg&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=hcbcda58497",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Storage",
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:25.441039+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "ai-internet-meritocracy-3560a8",
    "projectName": "AI Internet-Meritocracy",
    "description": "My app asks AI, what portion of the global GDP a user is worth, and gives him the proportional part of the funds. It is a very important act to save science from publication crisis by giving marketing money.",
    "projectRepo": "https://github.com/vporton/meritocracy",
    "demoUrl": "https://www.youtube.com/watch?v=ZDqr2lRd5uc",
    "slidesUrl": "https://drive.google.com/file/d/16-MX-0q8O6U7J8GCD_aQSMEWTvK04_FZ/view?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Kusama",
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:24.750031+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "parmelia-5b81da",
    "projectName": "Parmelia",
    "description": "Parmelia is an app that lets users hold USDC and pay in their local currency with zero merchant fees. On the surface, it feels like a simple “BOB ⇄ USDC” everyday wallet that you can use to pay for groceries, rent or services. And protect them from inflation",
    "projectRepo": "https://github.com/danelerr/parmelia2",
    "demoUrl": "https://drive.google.com/drive/folders/1lveSTj8dyIRlXvONh_Xst9VqeYbkSCWH?usp=sharing",
    "slidesUrl": "https://www.canva.com/design/DAG43qnYzis/eSl_WdpYv6UAgMDz7zY1Nw/view?utm_content=DAG43qnYzis&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h9b631fe820",
    "liveUrl": null,
    "techStack": [],
    "categories": [],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:23.987043+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "smh-domains-9075c5",
    "projectName": "SMH Domains",
    "description": "Internet domain names aren't self custodial, the registrars can take down your domain technically and also if the judiciary of the country that registrar resides in orders (in the case of .com, .net and .org domains it's the US judiciary, in case of .top it's China) for example .com domains can be seized/stolen by your domain registrars so easily as it happened in the case of Wikileaks.com\n\nUsing blockchain technology we can register our domains on the blockchain, the global immutable ledger; The flow of the project is like this:\n\n👉🏾 Domain registration at https://smh-domains.vercel.app\n👉🏾 The website registers it on the blockchain\n👉🏾 The smart contract emits an event that the domain was registered\n👉🏾 The user can add DNS zones to the domain (for example an A zone pointing to the user server's IP)\n👉🏾 A daemon on the server listens for any events from domain registry's smart contract and keeps adding domains and zones to an authoritative PowerDNS server, and that authoritative server is attached to a recursive PowerDNS server that resolves all non SMH extensions normally.\n\nSo, if any device uses our SMH enabled DNS server, it can resolve our blockchain domains\n\nBy registering domains on blockchain and creating DNS servers that resolve them to IPs, we'll have custody of our domain names",
    "projectRepo": "https://github.com/elamirch/smh, https://github.com/elamirch/smh-domains-website/, https://github.com/elamirch/smh-dns-plugin",
    "demoUrl": "https://youtu.be/ymD3-cjBmOE",
    "slidesUrl": "https://docs.google.com/presentation/d/1Ta1mneuKkwMAIpwTq8iW8Ve5TKWWjpYRer7Sc3bdzxs/edit?slide=id.p#slide=id.p",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:23.275772+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "zign-55c0f2",
    "projectName": "ZIGN",
    "description": "A privacy-first app for signing documents",
    "projectRepo": "-",
    "demoUrl": "https://drive.google.com/file/d/1kRQY5XBjKhfaF_gmTTfZFbZlDboJSJ95/view?usp=sharing",
    "slidesUrl": "https://www.canva.com/design/DAG43XLgVyA/kD6yWGP96djPaI44YiTtrw/edit?utm_content=DAG43XLgVyA&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Privacy"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:22.575017+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "medi-chain-1cf6de",
    "projectName": "Medi Chain",
    "description": "MediChain is a decentralized medical record management system that combines blockchain (Polkadot), intelligent document processing (OCR/Vision AI) and distributed storage (Arkiv) to create an innovative medical traceability solution.",
    "projectRepo": "https://github.com/padillano/medichain.git",
    "demoUrl": "http://clevel.lat/medichain/medichain.mp4",
    "slidesUrl": "https://gamma.app/docs/MediChain-The-Decentralized-Future-of-Digital-Health-sdkd90d47e8ouhw",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:21.858445+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "meteorfall-7940ac",
    "projectName": "Meteorfall",
    "description": "Meteorfall es una DApp de innovación cívica desarrollada con tecnología blockchain, que transforma la acción ciudadana de reportar fallas urbanas en una experiencia gamificada, transparente y colaborativa.",
    "projectRepo": "https://github.com/lucu-s/meteorfall-sub0-hackathon.git",
    "demoUrl": "https://www.loom.com/share/c1926a1abed74ceca4532e2d44733084",
    "slidesUrl": "https://docs.google.com/presentation/d/1nOF4GwTL8GtrjhqcrlfiFvnh_tIyeVjyfBvEZAIYEV0/edit?slide=id.g3865463a9c9_0_67#slide=id.g3865463a9c9_0_67",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:21.041308+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "open-league-1b9c8d",
    "projectName": "Open League",
    "description": "Open League es la primera liga global donde cualquier jugador puede convertirse en profesional alcanzando un nivel verificado, permitiendo que fans e inversores apoyen su carrera desde el inicio. Un puente transparente entre talento real, oportunidades y comunidad.",
    "projectRepo": "https://github.com/Emanuel250YT/openleague-backend",
    "demoUrl": "https://drive.google.com/file/d/1WzDr9Z4PcukCBSABKyV-PuQVDdPX1xy0/view?usp=sharing",
    "slidesUrl": "https://www.canva.com/design/DAG42GtNNKw/rPIMUcbSg5Q-EAv3-j4QQg/edit?utm_content=DAG42GtNNKw&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    "liveUrl": null,
    "techStack": [],
    "categories": [],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:20.342738+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "spuro-86eaf8",
    "projectName": "Spuro",
    "description": "Spuro is an agent-powered platform that enables AI agents to persistently store, query, and monitor Polkadot blockchain data using Arkiv (a decentralized storage layer) with automatic TTL-based expiry, while transparently handling micropayments via HTTPayer's x402 protocol. Built with a Python/FastAPI backend, TypeScript/Node.js CLI agent, Next.js documentation frontend, and a TypeScript SDK (spuro-functions), Spuro solves the problem of agents needing cost-efficient, queryable memory without managing wallets or payments directly—it abstracts payment complexity so payments feel like \"just HTTP\" while enabling real-world use cases like stash account monitoring for Polkadot nominators and validators tracking balances and staking behavior.",
    "projectRepo": "https://github.com/HTTPayer/sub0-hackathon",
    "demoUrl": "https://youtu.be/uvelneEQZW0",
    "slidesUrl": "https://www.canva.com/design/DAG43VTC2NQ/G6KOObAX85iaa2ufGUTuwg/view?utm_content=DAG43VTC2NQ&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h9b8d0fc99c",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Storage",
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:19.633925+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "public-sale-launcher-8a4b3e",
    "projectName": "Public Sale Launcher",
    "description": "Public Token sale platform replacing expensive agencies. Plug-and-play SaaS with low fees. Live with Mandala Chain. Any Polkadot project can launch in quick. Save 85% on marketing.",
    "projectRepo": "https://github.com/ayano-pactreon/marketing_bounty_sub0_public_sale",
    "demoUrl": "https://drive.google.com/file/d/12hf3_8hZMmPHyOLxpxOzvNBlI93zlb4y/view?usp=sharing",
    "slidesUrl": "https://docs.google.com/presentation/d/1WubcZKeESJnfowuTyXfGIjGdFo8NRJZbMmEcL8FBJsI/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:18.945695+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "lendoor-de5cbf",
    "projectName": "Lendoor",
    "description": "Lendoor is a reputation-based money market that uses ZK income proofs and mini-app distribution to offer collateral-free micro-loans to informal workers.",
    "projectRepo": "https://github.com/lucholeonel/lendoor-polkadot",
    "demoUrl": "https://youtu.be/5GxycsXXLRc?si=Gtz-bGAY3Mr4af4t",
    "slidesUrl": "https://www.canva.com/design/DAG40yQKMNI/SUJlIYVXxYEEZ4oiZnYBWA/edit?utm_content=DAG40yQKMNI&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    "liveUrl": null,
    "techStack": [],
    "categories": [],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:18.224933+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "echomint-40c912",
    "projectName": "EchoMint",
    "description": "EchoMint creates dynamic NFTs that evolve in real-time based on cryptocurrency market conditions.\n   Each NFT reflects one of six mood states (Bullish, Bearish, Volatile, Neutral, Positive,\n  Negative) that automatically update as market sentiment changes. Users mint NFTs tied to specific\n   cryptocurrencies (SOL, DOT, BTC) and watch their digital art transform alongside market\n  movements.\n\n  Tech Stack: Built with ink! v6 smart contracts on Polkadot's pallet-revive, integrated with Arkiv\n   Network for real-time market data indexing. Frontend uses React Router v7 with Polkadot.js API\n  and LunoKit for wallet connectivity. IPFS storage via Pinata for decentralized metadata and\n  images. Planned Hyperbridge integration for trustless cross-chain messaging.\n\n  Problem Solved: Traditional NFTs are static - they never change after minting and have no\n  connection to real-world events. EchoMint bridges the gap between on-chain digital art and\n  off-chain market reality, creating emotional resonance for crypto holders whose NFTs now reflect\n  the same sentiment they feel when markets move. This transforms NFTs from static collectibles\n  into living, responsive digital assets.",
    "projectRepo": "https://github.com/sushmitsarmah/sub0_echomint",
    "demoUrl": "https://youtu.be/csnKkrBI8fw",
    "slidesUrl": "https://docs.google.com/presentation/d/1XB5m_70E5a5EG0Hyl62MMb9jXLSnZMhtWWrXJW_h-AI/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Kusama",
      "AI",
      "NFT"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:17.514633+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "key-protocol-237d29",
    "projectName": "KEY protocol",
    "description": "sistema MVR monitoreo, verificacion y reporte",
    "projectRepo": "https://github.com/KEY-protocol/blockchain",
    "demoUrl": "https://drive.google.com/file/d/1vr3LVivk79IQS17D95K-GJ2wWqJrngSn/view",
    "slidesUrl": "https://docs.google.com/presentation/d/1niP73gqGhmYjkJFq-bjanMRWsT_axHKu/edit?usp=drivesdk&ouid=104192582024003498014&rtpof=true&sd=true",
    "liveUrl": null,
    "techStack": [],
    "categories": [],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:16.805858+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "tralala-contracts-6086fc",
    "projectName": "Tralala Contracts",
    "description": "Tralala Contracts for Sub0 reimagines the Blockly-style editor to target Polkadot’s Paseo testnet: users drag visual blocks to configure ink!/Substrate templates, connect with the Polkadot{.js} wallet, and deploy experimental pallets/contracts straight to Paseo—ideal for lightning-fast Sub0 demos without touching lower-level Rust code.",
    "projectRepo": "https://github.com/MatiasBoldrini/tralalacontracts-dot",
    "demoUrl": "https://drive.google.com/file/d/1dyua-hfyy4VfyRQsuJTTTpeKI7o9rvwl/view?usp=sharing",
    "slidesUrl": "https://www.loom.com/share/138bb62e94394b4ab2f2d3d19dc80628",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:16.114425+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "flashbet-bde150",
    "projectName": "FlashBet",
    "description": "Online sports betting platform",
    "projectRepo": "https://github.com/moises-herrera/bet-dapp",
    "demoUrl": "https://youtu.be/2aMo3mGAOgw",
    "slidesUrl": "https://www.canva.com/design/DAG43ukR-RQ/fTlqkBThmvUAeyg7g13ZhA/edit",
    "liveUrl": null,
    "techStack": [],
    "categories": [],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:15.424121+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "artcast-29f5be",
    "projectName": "Artcast",
    "description": "Artcast is a decentralized prediction market that unifies NFT art creation with community-driven financial incentives. It creates a “hype market” where artists and predictors both earn rewards based on an artwork’s popularity.",
    "projectRepo": "https://github.com/MukulKolpe/sub0-Hack",
    "demoUrl": "https://drive.google.com/file/d/1snp3o2qCfwA3EO8Qu7Q_1VnbRiyXLS9I/view?usp=sharing",
    "slidesUrl": "https://gamma.app/docs/ArtCast-Monetising-Creativity-Through-DeFi-qqlxrhucaautbzd?mode=doc",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Kusama",
      "NFT"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:14.031041+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "mentorgraph-439d1b",
    "projectName": "MentorGraph",
    "description": "MentorGraph is an on-chain, p2p mentorship and trust-graph layer built on Arkiv. \n\nUsers create a wallet-owned profile, publish Asks (what they want help with) and Offers (how they can help), explore a dynamic network graph to discover aligned mentors, mentees, and collaborators, and request meetings with each other for learning sessions. \n\nArkiv is the core data layer: profiles, asks, offers, and graph edges are stored as Arkiv entities. \n\nThe app demonstrates how Arkiv can power real-time, low-cost, composable social data graphs.",
    "projectRepo": "http://github.com/vrnvrn/mentor-graph",
    "demoUrl": "https://drive.google.com/file/d/1nol3FcIuf0nAIOAu90VAs0KrhCmg4akC/view?usp=sharing",
    "slidesUrl": "http://mentor-graph.vercel.app",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Storage",
      "AI",
      "Social"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:13.331084+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "leyby-e6145a",
    "projectName": "Leyby",
    "description": "Fix the unnecessary spending on DAO project grants; invest in projects intelligently.",
    "projectRepo": "https://github.com/facundopadilla/sub0-hackathon-arkiv",
    "demoUrl": "https://drive.google.com/file/d/1VTM8lQoZHtJKWOJZ4NzX7jOdXdgrFRRJ/view?usp=sharing",
    "slidesUrl": "https://docs.google.com/presentation/d/1Le_jYouA1wIA4I41yPrhYpqPpzRSXonRIrTid18fqxA/htmlpresent",
    "liveUrl": null,
    "techStack": [],
    "categories": [],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:12.63679+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "onlystables-48c87c",
    "projectName": "OnlyStables",
    "description": "Only Stables  is a cross-chain stablecoin swap and transfer platform from any chain to any chain, backed by Candy, the AI Agent with whom users can talk to execute transactions.\nAll AI agent artifacts and the transaction history are stored on the Arkiv Network, which includes transaction details easily understandable to a common user.\nThe focus is on providing a better User Experience (UX) to users: they simply connect their wallet, send a message to Candy, and Candy figures out the rest.",
    "projectRepo": "https://github.com/hrsh22/onlyStables",
    "demoUrl": "https://youtu.be/T23v-XWh_yI",
    "slidesUrl": "https://docs.google.com/presentation/d/1h9zgep_0tgp1YxTlWV8bvbpALuAXu3gSuEQFz4yPkdc/edit?slide=id.p#slide=id.p",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Storage",
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:11.934301+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "polka-psychat-4e1468",
    "projectName": "Polka Psychat",
    "description": "PsyChat is a privacy-first mental health platform built on Polkadot that lets users own their therapy data, earn from anonymized insights, and access AI and human therapy services.",
    "projectRepo": "https://github.com/Motus-DAO/PolkaPsychat",
    "demoUrl": "https://youtu.be/qcMM_hOH344",
    "slidesUrl": "https://www.canva.com/design/DAG4wHNbKSw/cXiQQkW-ukC3o8QM80jS0w/view?utm_content=DAG4wHNbKSw&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h8b1d37b14b",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Privacy",
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:11.245614+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "poof-931e61",
    "projectName": "Poof",
    "description": "Poof: Web3 messaging that vanishes\n\nSend messages and photos that disappear forever. No bs. Your conversations exist only in the moment, secured on-chain, then gone after specified amount of time",
    "projectRepo": "https://github.com/JustAnotherDevv/sub0-argentina",
    "demoUrl": "https://github.com/JustAnotherDevv/sub0-argentina",
    "slidesUrl": "https://github.com/JustAnotherDevv/sub0-argentina",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Kusama",
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:10.540962+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "offer-hub-3f599a",
    "projectName": "Offer-Hub",
    "description": "Offer-Hub is a freelance platform where smart contracts eliminate intermediaries that charge 15-20% commissions. Anyone with a crypto wallet can work globally—no bank account, no KYC required—receiving instant payments upon milestone completion, with transparent on-chain arbitration for disputes. The platform combines verifiable reputation tracking (SkillChain), automated escrow (ink! smart contracts), and sovereign identity (KILT) to democratize remote work, particularly for talent in countries with limited financial access, delivering secure, trustless, and borderless transactions at a fraction of traditional platform costs.",
    "projectRepo": "https://github.com/Josue19-08/Skill-Chain",
    "demoUrl": "https://youtu.be/UYGlWZHkJSg",
    "slidesUrl": "https://www.canva.com/design/DAG4yg83NFg/1SNobIu4F4xg85GxRDNfEQ/edit?utm_content=DAG4yg83NFg&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Cross-chain",
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:09.482401+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "flowdot-ce1356",
    "projectName": "Flowdot",
    "description": "Flowdot",
    "projectRepo": "https://github.com/CarlitaGeek",
    "demoUrl": "https://drive.google.com/file/d/1u2mRMnMoDSveUdLP51_8JjH6T0BX_eFA/view?usp=sharing",
    "slidesUrl": "https://drive.google.com/drive/folders/1ddxeFj-Mqmzf_tx47SdbGLl4Y2F_7mTO?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:08.794275+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "og-protocol-ffeea5",
    "projectName": "OG Protocol",
    "description": "OG Protocol is a solution that brings Decentralized Authentication for players to solve a real problem, non official user accounts and how can now use them.",
    "projectRepo": "https://github.com/JaimeH-Q",
    "demoUrl": "https://www.youtube.com/watch?v=U3WlXQdU5jA",
    "slidesUrl": "https://docs.google.com/presentation/d/1yZ9Js1-iUm5vfkrUSN6r7kAqJErYZj3n_2_bRG46Fh4/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:08.088958+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "bountea-766518",
    "projectName": "bountea",
    "description": "Video Bounty Platform with AI-Powered Verification on Polkadot\n\nCreate. Share. Earn.",
    "projectRepo": "https://github.com/flwst/bountea-platform",
    "demoUrl": "https://drive.google.com/file/d/1D-kkwMdiITI4DGSERrD_dhhyqPd96Z1-/view?usp=sharing",
    "slidesUrl": "https://docs.google.com/presentation/d/12N4uZkHsO5zTsDv9v_TRLOu92VTqaTJjWVQz1gjnmQo/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Kusama",
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:07.391711+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "hackvision-chronicle-8e163e",
    "projectName": "HackVision Chronicle",
    "description": "AI-Powered Event Chronicle with Ephemeral On-Chain Storage\n\nAn intelligent agent that observes real-world events through vision and audio, automatically chronicling meaningful moments to blockchain with time-expiring storage. Built on Polkadot, Arkiv, and Gemini 2.5 LIVE.",
    "projectRepo": "https://github.com/chinesepowered/polkadot-vision",
    "demoUrl": "https://www.youtube.com/watch?v=2DePtJp8V0Y",
    "slidesUrl": "https://github.com/chinesepowered/polkadot-vision",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:05.487956+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "degu-games-b2f752",
    "projectName": "Degu.Games",
    "description": "GameFi Playground — Bet on User-Created, Verifiable Mini-Games. Creators instantly monetize via custom commissions, bypassing smart contract development, and creating games with just drag and drop(no code).",
    "projectRepo": "https://github.com/0xPasho/sub0-degu.games",
    "demoUrl": "https://www.youtube.com/playlist?list=PL3UlUjd8O7qvQifTGVwRMCJCgABc0Vvp4",
    "slidesUrl": "https://drive.google.com/file/d/1gqC-xdnmjaMyehyarfPDXNo64T5B1J3B/view?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Gaming"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:04.763312+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "habitchain-232063",
    "projectName": "HabitChain",
    "description": "HabitChain is a blockchain dApp that turns self-discipline into a financial commitment.\nUsers lock funds on their own habit and complete daily check-ins.\nIf they succeed, they reclaim their stake plus yield.\nIf they fail, the locked funds are slashed to the protocol treasury or, in group mode, redistributed to successful peers.\n\n\nThe prototype demonstrates the key on-chain loop:\n commit → check-in → settle via a smart contract on Polkadot Paseo (EVM).\nBy adding real consequences and immediate feedback, HabitChain closes the motivation gap by aligning long-term personal progress with tangible, immediate economic incentives.",
    "projectRepo": "https://github.com/Markkop/habitchain-2",
    "demoUrl": "https://youtu.be/XtYEVgNKxWM",
    "slidesUrl": "https://gamma.app/docs/HabitChain-f1dxb88fmqqd1zx?mode=present",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:04.040545+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "carbon-smart-meter-80c87d",
    "projectName": "Carbon Smart Meter",
    "description": "Carbon Smart Meter is a wireless IoT device that measures renewable energy generation and signs all readings on-device using Ed25519 for tamper-proof verification. Users connect through a secure, app-less web portal hosted by the device’s private WiFi network to bind one or more meters to a site or wallet. Verified readings are uploaded to a GDPR-compliant backend, where carbon offsets are calculated using regional grid-intensity factors. The project uses Substrate, ink!, and PAPI to anchor device identities and immutable measurement attestations on Polkadot, enabling trusted real-world climate data in Web3.",
    "projectRepo": "https://github.com/compliancesmartmeter/polkadot",
    "demoUrl": "https://youtu.be/eeSKs14MsjQ?si=nVBe_1vus6TH4UT4",
    "slidesUrl": "https://drive.google.com/file/d/1xAJb_7UJEuBmzsl8uU5fcew0Wn-nJSpY/view",
    "liveUrl": null,
    "techStack": [],
    "categories": [],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:03.344764+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "xx Network",
        "amount": 250,
        "hackathonWonAtId": "symbiosis-2025"
      }
    ],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "polkadot-x402-c574ba",
    "projectName": "Polkadot-x402",
    "description": "Pay-per-use APIs with blockchain micropayment on Polkadot",
    "projectRepo": "https://github.com/adipundir/polkadot-x402",
    "demoUrl": "https://youtu.be/Y1xZHonDjME",
    "slidesUrl": "https://drive.google.com/file/d/1CLBRpspMUongvZZH3Eo5AgXJ2QVu3Q-3/view?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:02.639506+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "secretdot-be7a14",
    "projectName": "SecretDot",
    "description": "A decentralized messaging platform built on Web3 infrastructure, combining blockchain security and encrypted IPFS storage with Web3 authentication for censorship-resistant, private communication.",
    "projectRepo": "https://github.com/secretdot-hack/SecretDot_Sub0",
    "demoUrl": "https://www.loom.com/share/28dab6376cd24f269c080c0df9303749",
    "slidesUrl": "https://www.loom.com/share/510e282ea2cd4b45b0624cf94e7ef0f7",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:02:00.606836+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "private-credit-score-cc783d",
    "projectName": "Private Credit Score",
    "description": "Private Credit Score is a platform that democratizes access to credit in DeFi by creating a verifiable, private, multi-chain credit reputation. Similar to how FICO revolutionized traditional credit, this system allows users with good on-chain behavior to access better loan terms.\n\nValue Proposition\nFor Users (Borrowers): Lower collateralization, better rates, reputation portability.\nFor Protocols (Lenders): Risk reduction, better liquidity, market expansion.\nFor the Ecosystem: Financial inclusion, interoperability, privacy.",
    "projectRepo": "https://github.com/mapachemirlo/private-credit-score",
    "demoUrl": "youtube.com/watch?si=osoIQ4sOyCisaPTU&v=Hiz7YTunCEg&feature=youtu.be",
    "slidesUrl": "https://docs.google.com/presentation/d/19wWsf3NNw7GrTR0JoSFFZR8HpB5Z7XLYkMiM0ExwJnU/edit",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Cross-chain",
      "AI",
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:01:59.92267+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "amigo-ai-a2b38a",
    "projectName": "Amigo.ai",
    "description": "This project is a personal AI agent with decentralized, user-controlled memory. It uses Arkiv Network for secure, permanent storage and for fast memory indexing and recall. Users decide what to store and can manage their AI’s memory through tombstoning or key revocation, giving them full control over their data. This ensures context-rich personalization while keeping memory private, verifiable, and truly owned by the user. The agent can remember past interactions, files, and preferences, allowing it to provide more accurate and helpful responses over time. By separating storage from indexing, it offers efficient retrieval without compromising security. The system is designed to be modular and extensible, paving the way for future enhancements, such as integrating multiple agents or creating collaborative memory networks. Overall, it empowers users to interact with an AI that remembers intelligently while respecting their sovereignty over data.",
    "projectRepo": "https://github.com/rohitshukla11/Amigo.ai",
    "demoUrl": "https://youtu.be/7CXi0FxPLk8",
    "slidesUrl": "https://drive.google.com/file/d/1AYX3NdR_G7DJ-Qwu_NpHp7pmAbmkcvEs/view?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Storage",
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:01:59.220003+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "ark-link-a24d62",
    "projectName": "Ark Link",
    "description": "A decentralized, encrypted take on Linktree. Every profile bundles social and Web3 actions into a single shareable page while the underlying encrypted and ephemeral data lives on Arkiv Network. To get the data you have to meet the person IRL",
    "projectRepo": "https://github.com/vikiival/arklink",
    "demoUrl": "https://www.loom.com/share/7238df7d7f004c978afd1b2ddc1a98ec",
    "slidesUrl": "https://docs.google.com/presentation/d/1Z91iBuBQ2bVlydWhR21GRIz1ScyhWBmgiuIYEZqfdkM/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Kusama",
      "Social"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:01:58.534462+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "arkgram-6d8cf1",
    "projectName": "Arkgram",
    "description": "ArkGram is a decentralized social media platform that leverages the Arkiv to provide censorship-resistant content sharing. Users can create posts with images, share stories with configurable time-to-live, and engage in real-time feeds. Unlike traditional social platforms, ArkGram stores all content on Arkiv, giving users verifiable ownership and control over their content and data",
    "projectRepo": "https://github.com/akashbiswas0/Arkgram",
    "demoUrl": "https://youtu.be/SKPhRgptfQI",
    "slidesUrl": "https://www.canva.com/design/DAG0w4BpzIE/HTSMYsXbtZ-ViN5IkaT8-w/edit?utm_content=DAG0w4BpzIE&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Storage",
      "Social"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:01:57.830957+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "unblind-for-polkadot-600507",
    "projectName": "Unblind for Polkadot",
    "description": "Explain transaction in natural language before the users sign.",
    "projectRepo": "https://github.com/0xLucca/polkadot-tx-analyzer",
    "demoUrl": "https://www.loom.com/share/15c33fe6ef9547ea8bd9a20b76afa3a0",
    "slidesUrl": "https://docs.google.com/presentation/d/1YXL0_o52yMFyvEwx4j3Ggnw7LpoWI5MnCoygFVSRUUk/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Kusama",
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:01:56.676949+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Kusama",
        "amount": 1500,
        "hackathonWonAtId": "symbiosis-2025"
      }
    ],
    "milestones": [],
    "totalPaid": [
      {
        "milestone": "BOUNTY",
        "amount": 1500,
        "currency": "USDC",
        "transactionProof": "https://assethub-polkadot.subscan.io/extrinsic/10652483-5",
        "bountyName": "Kusama bounty",
        "paidDate": "2025-12-03T00:00:00+00:00"
      }
    ]
  },
  {
    "id": "ghostmesh-fd5e65",
    "projectName": "GhostMesh",
    "description": "GhostMesh is a privacy-first DePIN telemetry network where sensors and Raspberry Pi devices can contribute real-world data without revealing identity, location, or metadata.\nIt combines xx.network's post-quantum mixnet with Arkiv's cost-efficient, time-bound data layer to create an anonymous, high-integrity pipeline for real-time sensor analytics.\n\nIn GhostMesh, each Raspberry Pi runs a lightweight GhostNode agent that collects telemetry such as temperature, air quality, latency, or device health. Instead of sending this data directly over the public internet—where IPs, routing metadata, and timing patterns can identify the operator—the payload is routed through cMixx, the xx.network's metadata-shredding mixnet. This ensures no upstream information (IP, MAC, location, device identity) is ever exposed.\n\nOnce mixed, telemetry reaches the GhostMesh Ingress Service, which validates and stores events in Arkiv. Using Arkiv's programmable TTL, each record auto-expires after a defined period, preventing long-term correlation and enabling cost-efficient ephemeral analytics. Developers and analysts can access the data through a real-time dashboard powered by Arkiv queries and subscriptions, providing live insights without storing any persistent or identifying information.\n\nGhostMesh demonstrates a new DePIN primitive:\na hardware sensor network that produces anonymous, ephemeral, post-quantum-secure telemetry—safe for enterprises, researchers, and privacy-critical environments.",
    "projectRepo": "https://github.com/LeoFranklin015/GhostMesh",
    "demoUrl": "https://youtu.be/G-aNLL8FXTo",
    "slidesUrl": "https://www.canva.com/design/DAG43PVOZGM/8gOnph1bkakKv3lrsaNsPg/edit",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Privacy",
      "AI",
      "DeFi"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:01:55.528843+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "xx Network",
        "amount": 2000,
        "hackathonWonAtId": "symbiosis-2025"
      }
    ],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "utana-0633d8",
    "projectName": "utana",
    "description": "unique tickets for unique humans, avoid resellers",
    "projectRepo": "https://github.com/luucamay/unique-tickets",
    "demoUrl": "https://drive.google.com/drive/folders/1-3q7l6c5xOqGvdLFMwygEQ4_beFa261i?usp=drive_link",
    "slidesUrl": "https://www.canva.com/design/DAG43X6rkTI/2abEyM3s_r2Q-Q7iK5PqSA/view?utm_content=DAG43X6rkTI&utm_campaign=designshare&utm_medium=link2&utm_source=uniquelinks&utlId=h65f989863f",
    "liveUrl": null,
    "techStack": [],
    "categories": [],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:01:54.839871+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "cross-chain-treasury-monitor-ea78fa",
    "projectName": "Cross-Chain Treasury Monitor",
    "description": "Cross-Chain Treasury Monitor es una herramienta Web3 que centraliza en un solo panel la actividad financiera de wallets públicas importantes (DAOs, fundaciones, tesorerías) distribuidas en múltiples blockchains.\nResuelve el problema de la transparencia fragmentada: hoy las organizaciones operan en varias redes y los usuarios deben revisar muchos explorers diferentes para entender los movimientos.\n\nUsando Hyperbridge Storage Queries, la aplicación obtiene datos verificados on-chain (balances, movimientos, storage slots) desde Polkadot, parachains y redes compatibles EVM.\nLa arquitectura está construida como un monorepo modular con un servicio indexador, un módulo de configuración compartida y un frontend en Next.js, permitiendo una experiencia de monitoreo multichain simple, confiable y eficiente.\n\nTecnologías principales: TypeScript, Hyperbridge SDK, Clean Architecture, Next.js, Node.js.",
    "projectRepo": "https://github.com/kaream-badillo/sub0-polkadot-nov-2025.git",
    "demoUrl": "https://github.com/kaream-badillo/sub0-polkadot-nov-2025.git",
    "slidesUrl": "https://github.com/kaream-badillo/sub0-polkadot-nov-2025.git",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Cross-chain",
      "AI",
      "Mobile"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:01:53.451885+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "dex-aggregator-dd6751",
    "projectName": "Dex Aggregator",
    "description": "A decentralized exchange aggregator for Polkadot AssetHub that compares prices across multiple Uniswap V2 and V3 compatible DEXes to find the best swap routes with optimal pricing.",
    "projectRepo": "https://github.com/ayano-pactreon/DexAggregator",
    "demoUrl": "https://drive.google.com/file/d/1QElpyTAzGvbBiLsaDBVyMZCqdTZnWLn_/view",
    "slidesUrl": "https://docs.google.com/presentation/d/14T-ixfokzS5X-VT21BTeVQkz0-YYVmkGdM7AQRQvLkU/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:01:52.761265+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "dotgo-d49e5b",
    "projectName": "DotGo",
    "description": "**DotGo** is a cross-chain portfolio platform where students and young professionals showcase real projects and earn **verified reviews from industry mentors**",
    "projectRepo": "https://github.com/MarxMad/Sub0Polk",
    "demoUrl": "https://www.loom.com/share/742025a3e2a64d64b550172cc0ce3df4",
    "slidesUrl": "https://gamma.app/docs/DotGo-Verificando-el-Futuro-Impulsando-Carreras-3sxl3ojbsbucdby",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:01:52.073183+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "soulscape-e3d681",
    "projectName": "SoulScape",
    "description": "Soulscape transforms your Polkadot on-chain activity into a living digital organism.\n\nEvery wallet mints a Polkadot “Soul” NFT whose traits evolve with real blockchain behavior.\nThese traits generate dynamic SVG art, mood-driven music, and determine how you paint on a real-time collaborative graffiti wall.\n\nAll Soul evolution, mood spikes, pixel strokes, and ephemeral states are stored, queried, and streamed using Arkiv, making Soulscape a fully reactive, living art world.\n\nThis is part social experiment, part generative art platform, part on-chain identity primitive.",
    "projectRepo": "https://github.com/Akhil-2310/spirit",
    "demoUrl": "https://www.loom.com/share/8ea805b1094748d49272d7966c28c6ae",
    "slidesUrl": "https://www.canva.com/design/DAG42Dj_sjk/-ERWU0DyyDTuAwqoEEVaCA/edit",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI",
      "NFT",
      "Social"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:01:51.370936+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "infinite-conspiracy-363748",
    "projectName": "Infinite conspiracy",
    "description": "Blockchain-based detective game with automation-resistant puzzles, infinite mystery generation, and real cryptocurrency bounties.",
    "projectRepo": "https://github.com/Zaptu3117/InfiniteConspiracy/tree/main",
    "demoUrl": "https://drive.google.com/file/d/17_X0S8Xw5BfOqQcMrN6ccmQck2LGljBP/view?usp=drive_link",
    "slidesUrl": "https://drive.google.com/file/d/1Nj4PRuUBqGQarNXuJTwbUEIF9TKOx0TA/view?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI",
      "Gaming"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:01:50.208107+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Kusama",
        "amount": 3000,
        "hackathonWonAtId": "symbiosis-2025"
      }
    ],
    "milestones": [],
    "totalPaid": [
      {
        "milestone": "BOUNTY",
        "amount": 3000,
        "currency": "USDC",
        "transactionProof": "https://assethub-polkadot.subscan.io/extrinsic/10652483-5",
        "bountyName": "Kusama bounty",
        "paidDate": "2025-12-03T00:00:00+00:00"
      }
    ]
  },
  {
    "id": "ssp-963b8f",
    "projectName": "SSP",
    "description": "Facial payment and acquiring system: Users can use their faces to make cryptocurrency or fiat currency payments, and merchants can use cameras to receive payments.",
    "projectRepo": "https://github.com/everest-an/SSP",
    "demoUrl": "https://drive.google.com/file/d/1a7rOsiPZGuGhdC_PmAEzDxPwGNeGccLp/view?usp=sharing",
    "slidesUrl": "ssp.click",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Cross-chain"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:01:49.495642+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "proof-of-attendeeship-ca440a",
    "projectName": "Proof of Attendeeship",
    "description": "Android app for event attendee registration with Luma API integration, QR code scanning, and offline storage.",
    "projectRepo": "https://github.com/ayano-pactreon/proofOfAttendeeShip/tree/main",
    "demoUrl": "https://drive.google.com/file/d/1F7C3dMrQMUHSNtQj3syrm2nLVnixF6yo/view?usp=sharing",
    "slidesUrl": "https://docs.google.com/presentation/d/1sHBYSBmvhxyHlTYP07bDxqw5XU5eoWUaO61e1W9XqwU/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Mobile"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:01:48.803367+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "tin-temporal-intelligence-network-ddd92d",
    "projectName": "TIN - Temporal Intelligence Network",
    "description": "AI agents with human-like memory powered by Arkiv blockchain. Detective agents collaborate to solve mysteries while their insights persist and naturally expire on-chain. Ships with create-arkiv-app npm package for instant developer onboarding. Real blockchain persistence, simulated collaboration, viral developer experience.",
    "projectRepo": "https://github.com/DruxAMB/TIN/tree/master",
    "demoUrl": "https://youtu.be/BUrxidxsiag",
    "slidesUrl": "https://gamma.app/docs/AI-Agents-That-Learn-Adapt-and-Collaborate-3wusls6ac7g7n3q",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:01:48.102547+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "r3mail-d9ac80",
    "projectName": "R3MAIL",
    "description": "R3LAY enables creators to publish encrypted content to private audiences without relying on centralized servers. All access control is cryptographic, follower lists are private, and content is stored encrypted on IPFS.\n\nThe initial product built on R3LAY is R3MAIL, which is like email but based on your wallet. Fully end to end encrypted and the data is stored on IPFS. \n\nIt uses wallet addresses, smart contracts, IPFS and encryption.",
    "projectRepo": "https://github.com/replghost/r3lay",
    "demoUrl": "https://youtu.be/zz799onLrWY",
    "slidesUrl": "https://docs.google.com/presentation/d/1bveEqep6D6TOY0T0HVIJVMo_wOfIlNBxysvahsMi1Ds/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:01:47.41048+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "polkadotx402-a9e2bf",
    "projectName": "PolkadotX402",
    "description": "PolkadotX402 is a purpose-built payment protocol enabling instant, low-cost, trustless transactions specifically designed for autonomous AI agents on Polkadot's high-performance infrastructure.\n\nKey Features\n⚡ 0.3s Settlement - Near-instant transaction finality on Polkadot\n💰 $0.001 Average Cost - 1000x cheaper than Ethereum alternatives\n🛡️ Trustless Escrow - Smart contract-based payment security\n🔌 Simple Integration - TypeScript SDK for rapid deployment\n📊 Built-in Analytics - Real-time monitoring and reputation tracking",
    "projectRepo": "https://github.com/chinesepowered/polkadot-idea",
    "demoUrl": "https://www.youtube.com/watch?v=XkSBcIzd2BM",
    "slidesUrl": "https://github.com/chinesepowered/polkadot-idea/blob/main/pitch-deck.md",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:01:46.709258+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "adchain-846cb8",
    "projectName": "AdChain",
    "description": "AdChain is a decentralized advertising marketplace where:\n\n✅ Viewers earn tokens for watching ads (10 ATN/day) ✅ Advertisers bid directly for 24-hour placement ✅ Smart contracts automate auctions and rewards ✅ Zero middlemen - all transactions on-chain\n\nThe Innovation\nAdChain uniquely combines Polkadot's EVM-compatible Passet Hub for financial transactions with Arkiv's Ethereum L2 for cost-efficient data storage, creating a truly cross-chain advertising platform.",
    "projectRepo": "https://github.com/chinesepowered/polkadot-arg",
    "demoUrl": "https://www.youtube.com/watch?v=qSWv8gDXfQU",
    "slidesUrl": "https://github.com/chinesepowered/polkadot-arg",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:01:45.994253+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "money-pot-1ff2a9",
    "projectName": "Money Pot",
    "description": "Money Pot is live on both Aptos and Polkadot Hub Testnet, with over 200 pots created and $10,000+ total value locked on-chain across both deployments. We’ve enabled secure, brain-powered DeFi and gaming for a rapidly growing early user base—demonstrating product-market fit and cross-chain demand.\n\nDemo:\nAptos – https://moneypot.ideomind.org\nEVM – https://mp-evm.ideomind.org",
    "projectRepo": "https://github.com/ideo-mind/auth.money",
    "demoUrl": "https://youtu.be/E13YjXeCWoo",
    "slidesUrl": "https://docs.google.com/presentation/d/15jinwWUA_gv2QReEUtAni7RZOR3dCOn5TS0qa_k-Qrg/edit?usp=sharing",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "AI",
      "DeFi",
      "Gaming"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:01:45.290624+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "quantumaivault-d6373a",
    "projectName": "QuantumAiVault",
    "description": "Quantum AI Marketplace is a decentralized platform built on Polkadot that lets AI researchers and data scientists securely upload, verify, and sell high-quality machine learning datasets — all while keeping full control and earning up to 97.5% of the sale.You upload your dataset. Our AI automatically checks it for errors, missing values, outliers, and more, then gives it a quality score and generates a detailed report. The dataset is encrypted using quantum-resistant cryptography (CRYSTALS-Kyber and Dilithium) so it stays safe even against future quantum computers. It’s then permanently stored on Arkiv, a special IPFS service that guarantees your data lives for 100 years.Everything is recorded on Moonbeam, a fast and cheap EVM chain in the Polkadot ecosystem. Buyers pay with USDC, DOT, or USDT, you get paid instantly, and there’s only a 2.5% platform fee — no middlemen, no censorship, no data deletion.Thanks to Hyperbridge, your dataset can be discovered and purchased from any blockchain — Ethereum, Polygon, Arbitrum, or beyond — without you doing anything extra.Sellers get a dashboard to track earnings, views, and downloads. Buyers can preview the first 100 rows for free before buying. It’s simple, secure, and built for the future of AI.Quantum AI Marketplace isn’t just another data site — it’s the first AI-verified, quantum-secure, permanently stored marketplace for machine learning data.",
    "projectRepo": "https://github.com/Beutife/QuantamVault",
    "demoUrl": "https://drive.google.com/file/d/1oBd5xqQMsLZ0Z0GjtCWI_xOzLxMezeZw/view?usp=drivesdk",
    "slidesUrl": "https://docs.google.com/presentation/d/1XFwEE3AiH0FUyoH5K-5v7difO3DRnHCp/edit?usp=sharing&ouid=112717298043840896418&rtpof=true&sd=true",
    "liveUrl": null,
    "techStack": [],
    "categories": [
      "Cross-chain",
      "AI"
    ],
    "donationAddress": "",
    "projectState": "Hackathon Submission",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "symbiosis-2025",
      "name": "Symbiosis 2025",
      "endDate": "2025-11-19T23:00:00+00:00",
      "eventStartedAt": "symbiosis-2025"
    },
    "m2Status": null,
    "completionDate": null,
    "submittedDate": null,
    "updatedAt": "2026-02-09T07:01:44.03455+00:00",
    "teamMembers": [
      {
        "name": "Team Lead",
        "customUrl": "",
        "role": null,
        "twitter": null,
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "m2-submission-test-admin-xyz123",
    "projectName": "M2 Submission Test Project",
    "description": "A test project for validating M2 deliverable submission workflow. This project is currently in Week 5 of the M2 program, which means the submission window is open. Use this project to test the submission form, validation, and backend integration.",
    "projectRepo": "https://github.com/test/m2-submission-test",
    "demoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "slidesUrl": "https://docs.google.com/presentation/d/test-m2-submission",
    "liveUrl": null,
    "techStack": [
      "React",
      "TypeScript",
      "Node.js",
      "MongoDB",
      "Polkadot.js"
    ],
    "categories": [
      "Developer Tools",
      "DeFi"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Milestone Delivered",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-11-10T03:48:20.403+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": "building",
    "m2Agreement": {
      "mentorName": null,
      "agreedDate": "2025-11-03T03:48:20.403+00:00",
      "agreedFeatures": [
        "Real-time data synchronization with sub-second latency",
        "Multi-signature wallet support for team treasuries",
        "Cross-chain asset tracking across 15+ parachains",
        "Beautiful dashboard with charts and analytics",
        "Mobile-responsive design with PWA support"
      ],
      "documentation": [
        "Complete README with setup instructions",
        "API documentation for all endpoints",
        "User guide with screenshots",
        "Architecture diagram",
        "Deployment guide"
      ],
      "successCriteria": "Application must handle 100+ concurrent users, sync data in <1 second, support all major parachains, pass security audit, and provide intuitive UX with <2 second page loads.",
      "lastUpdatedBy": null,
      "lastUpdatedDate": null
    },
    "completionDate": null,
    "submittedDate": "2025-11-03T03:48:20.403+00:00",
    "updatedAt": "2026-01-29T09:19:14.69321+00:00",
    "teamMembers": [
      {
        "name": "Admin Tester",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": null,
        "role": "Lead Developer",
        "twitter": "@admin_test",
        "github": "admin-tester",
        "linkedin": null
      },
      {
        "name": "Jane Developer",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": null,
        "role": "Frontend Developer",
        "twitter": null,
        "github": "janedev",
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Best Innovation Track",
        "amount": 2500,
        "hackathonWonAtId": "synergy-2025"
      }
    ],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "decentralized-voting-dao-d4e5f6",
    "projectName": "Decentralized Voting DAO",
    "description": "A fully on-chain DAO governance platform built with ink! smart contracts. Create proposals, vote on decisions, execute approved actions automatically, and manage treasury funds transparently. Features quadratic voting, time-locked execution, and delegate voting. Built for the Polkadot ecosystem with support for any parachain.",
    "projectRepo": "https://github.com/davidmartinez/decentralized-voting-dao",
    "demoUrl": "https://www.youtube.com/watch?v=demo-dao-voting",
    "slidesUrl": "https://docs.google.com/presentation/d/example-dao-slides",
    "liveUrl": null,
    "techStack": [
      "ink!",
      "Rust",
      "React",
      "TypeScript",
      "Polkadot.js",
      "Substrate"
    ],
    "categories": [
      "Governance",
      "DAO",
      "Smart Contracts"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Milestone Delivered",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-11-03T03:48:20.403+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": "under_review",
    "m2Agreement": {
      "mentorName": null,
      "agreedDate": "2025-10-27T03:48:20.403+00:00",
      "agreedFeatures": [
        "Proposal creation system with rich text editor and file attachments up to 10MB",
        "Multiple voting mechanisms: simple majority, supermajority (66%), and quadratic voting",
        "Time-locked execution of approved proposals with configurable delay periods (1-30 days)",
        "Delegate voting system allowing token holders to assign voting power to trusted representatives",
        "Treasury management with multi-signature approval for fund transfers",
        "Proposal discussion forum with threaded comments and emoji reactions",
        "Real-time vote tracking dashboard with beautiful visualizations",
        "Automated proposal archival after 90 days of inactivity"
      ],
      "documentation": [
        "Complete README with project overview and setup instructions",
        "Smart contract documentation with all functions and events explained",
        "Frontend component documentation",
        "User guide with step-by-step tutorials for creating proposals and voting",
        "Security audit report from external auditor",
        "Deployment guide for mainnet"
      ],
      "successCriteria": "Platform must support creation and voting on proposals with <1 minute finality, handle at least 100 concurrent voters without performance issues, execute approved proposals automatically via smart contracts, maintain 100% uptime during voting periods, and pass comprehensive security audit with no critical vulnerabilities.",
      "lastUpdatedBy": null,
      "lastUpdatedDate": null
    },
    "finalSubmission": {
      "repoUrl": "https://github.com/davidmartinez/decentralized-voting-dao",
      "demoUrl": "https://dao-voting-demo.vercel.app",
      "docsUrl": "https://dao-voting-docs.gitbook.io",
      "summary": "We've successfully built a comprehensive DAO voting platform with all planned features implemented. The smart contracts have been deployed to Rococo testnet and audited by CertiK with no critical issues found. The frontend provides an intuitive interface for proposal creation, voting, and treasury management. We implemented quadratic voting to prevent whale dominance, time-locked execution for security, and delegate voting for improved participation. The platform has been tested with 150+ concurrent users and handles proposal creation/voting with sub-second response times. All documentation is complete including user guides, API docs, and deployment guides.",
      "submittedDate": "2025-12-08T03:48:20.403+00:00",
      "submittedBy": null
    },
    "completionDate": null,
    "submittedDate": "2025-10-27T03:48:20.403+00:00",
    "updatedAt": "2026-01-29T09:19:13.443308+00:00",
    "teamMembers": [
      {
        "name": "David Martinez",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": null,
        "role": "Smart Contract Developer",
        "twitter": "@dmartinez_dev",
        "github": "davidmartinez",
        "linkedin": "https://linkedin.com/in/davidmartinez"
      },
      {
        "name": "Emma Wilson",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": null,
        "role": "Frontend Developer",
        "twitter": null,
        "github": "emmawilson",
        "linkedin": null
      },
      {
        "name": "James Lee",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": null,
        "role": "Product Designer",
        "twitter": "@jameslee_design",
        "github": null,
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Best ink! Smart Contract",
        "amount": 4000,
        "hackathonWonAtId": "synergy-2025"
      }
    ],
    "milestones": [],
    "totalPaid": []
  },
  {
    "id": "polkadot-portfolio-tracker-a1b2c3",
    "projectName": "Polkadot Portfolio Tracker",
    "description": "A comprehensive portfolio tracking application for the Polkadot ecosystem. Track your assets across multiple parachains, view real-time prices, analyze performance, and get insights on your holdings. Features beautiful charts, transaction history, and support for 20+ parachains including Moonbeam, Acala, Astar, and more.",
    "projectRepo": "https://github.com/sarahchen/polkadot-portfolio-tracker",
    "demoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "slidesUrl": "https://docs.google.com/presentation/d/example-portfolio-tracker",
    "liveUrl": null,
    "techStack": [
      "React",
      "TypeScript",
      "Polkadot.js",
      "Node.js",
      "MongoDB",
      "Chart.js"
    ],
    "categories": [
      "DeFi",
      "Analytics",
      "Developer Tools"
    ],
    "donationAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
    "projectState": "Milestone Delivered",
    "bountiesProcessed": false,
    "hackathon": {
      "id": "synergy-2025",
      "name": "Synergy 2025",
      "endDate": "2025-11-24T03:48:20.403+00:00",
      "eventStartedAt": "synergy-hack-2024"
    },
    "m2Status": "building",
    "m2Agreement": {
      "mentorName": null,
      "agreedDate": "2025-11-17T03:48:20.403+00:00",
      "agreedFeatures": [
        "Multi-chain portfolio aggregation supporting 20+ parachains with automatic balance updates every 30 seconds",
        "Real-time price feeds integration from major DEXs and CEXs with <5 second refresh rate",
        "Historical performance charts showing 1D, 7D, 30D, 90D, 1Y views with interactive tooltips",
        "Transaction history explorer with filtering by chain, token, and date range",
        "Portfolio analytics including ROI calculations, asset allocation pie charts, and P&L statements",
        "Export functionality to CSV/PDF for tax reporting purposes"
      ],
      "documentation": [
        "Complete README with installation and setup guide",
        "API documentation for all endpoints",
        "Architecture diagram showing system components",
        "User guide with screenshots and tutorials",
        "Deployment guide for production"
      ],
      "successCriteria": "Application must successfully track assets across at least 20 parachains, display real-time prices with <5 second latency, support 50+ major tokens, handle 1000+ transactions in history without performance degradation, and provide accurate portfolio value calculations with 99%+ accuracy.",
      "lastUpdatedBy": null,
      "lastUpdatedDate": null
    },
    "completionDate": null,
    "submittedDate": "2025-11-17T03:48:20.403+00:00",
    "updatedAt": "2026-01-29T09:19:11.756041+00:00",
    "teamMembers": [
      {
        "name": "Sarah Chen",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": null,
        "role": "Lead Developer",
        "twitter": "@sarahchen_dev",
        "github": "sarahchen",
        "linkedin": null
      },
      {
        "name": "Mike Johnson",
        "walletAddress": "5MockWalletAddressRedactedForPreviewPurposes00000",
        "customUrl": null,
        "role": "Backend Developer",
        "twitter": null,
        "github": "mikejohnson",
        "linkedin": null
      }
    ],
    "bountyPrize": [
      {
        "name": "Best Developer Tooling Track",
        "amount": 3000,
        "hackathonWonAtId": "synergy-2025"
      }
    ],
    "milestones": [],
    "totalPaid": []
  }
];

/** Simulates an API response with the full mock project list. */
export const getMockWinnersResponse = () => ({
  status: 'success' as const,
  data: mockWinningProjects,
  meta: {
    total: mockWinningProjects.length,
    count: mockWinningProjects.length,
    limit: 1000,
    page: 1,
  },
});
