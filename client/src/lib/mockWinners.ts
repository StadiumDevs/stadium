/**
 * Mock winning projects data for temporary use while server is down
 * This file contains 3 winning projects to display in the UI
 */

export type MockApiProject = {
  id: string;
  projectName: string;
  description: string;
  teamMembers?: { name: string; walletAddress?: string }[];
  projectRepo?: string;
  demoUrl?: string;
  slidesUrl?: string;
  donationAddress?: string;
  bountyPrize?: { name: string; amount: number; hackathonWonAtId: string }[];
  techStack?: string[];
  categories?: string[];
  hackathon?: { id: string; name: string; endDate: string };
  m2Status?: 'building' | 'under_review' | 'completed';
  finalSubmission?: {
    repoUrl: string;
    demoUrl: string;
    docsUrl: string;
    summary: string;
    submittedDate: string;
  };
  m2Agreement?: {
    mentorName: string;
    agreedDate: string;
    agreedFeatures: string[];
    documentation?: string[];
    successCriteria?: string;
  };
  changesRequested?: {
    feedback: string;
    requestedBy: string;
    requestedDate: string;
  };
};

export const mockWinningProjects: MockApiProject[] = [
  {
    id: "mock-winner-1",
    projectName: "Polkadot DEX Aggregator",
    description: "A revolutionary decentralized exchange aggregator that connects multiple DEXs across the Polkadot ecosystem, providing users with the best swap rates and lowest slippage. Built with Substrate and features advanced liquidity routing algorithms.",
    teamMembers: [
      { name: "Alice Developer", walletAddress: "5GE6ptWSLAgSgoDzBDsFgZi1cauUCmEpEgtddyphkL5GGQcF" },
      { name: "Bob Team Member" }
    ],
    projectRepo: "https://github.com/example/polkadot-dex-aggregator",
    demoUrl: "https://demo.example.com/polkadot-dex",
    slidesUrl: "https://slides.example.com/polkadot-dex",
    donationAddress: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    bountyPrize: [
      {
        name: "Best Polkadot Track Winner",
        amount: 5000,
        hackathonWonAtId: "synergy-2025"
      }
    ],
    techStack: ["Substrate", "Rust", "Polkadot", "Web3.js"],
    categories: ["DeFi", "Developer Tools"],
    hackathon: {
      id: "synergy-2025",
      name: "Blockspace Synergy 2025",
      endDate: "2025-02-01"
    },
    m2Status: 'building',
    m2Agreement: {
      mentorName: "PolkadotExpert",
      agreedDate: "2025-11-25T14:00:00Z",
      agreedFeatures: [
        "Multi-DEX aggregation engine with route optimization - Support routing through at least 3 different DEXs with automatic selection of best rates",
        "Real-time price comparison across 5+ DEXs - Display live price feeds with update intervals < 5 seconds",
        "User-friendly swap interface with slippage protection - Allow users to set custom slippage tolerance up to 5% with warnings",
        "Portfolio tracking for swapped assets - Track transaction history and current balances for all swapped tokens",
        "Gas optimization for batch transactions - Implement multi-hop routing to minimize transaction costs"
      ],
      documentation: [
        "README with setup instructions",
        "Architecture overview explaining how it works",
        "API documentation for integration",
        "Smart contract audit report",
        "User guide with screenshots"
      ],
      successCriteria: "DEX aggregator must successfully route transactions through at least 3 different DEXs with <2% slippage, support 10+ major tokens (DOT, USDC, USDT, etc.), and have 99.9% uptime for price feeds. All swaps must complete within 30 seconds and show clear transaction status to users."
    }
  },
  {
    id: "mock-winner-2",
    projectName: "Monsters Ink! - Interactive NFT Game",
    description: "An adorable creature collection and battle game built entirely with ink! smart contracts. Players can mint, train, and battle their creatures while earning rewards. Features beautiful pixel art and engaging gameplay mechanics.",
    teamMembers: [{ name: "Bob Creator" }],
    projectRepo: "https://github.com/example/monsters-ink",
    demoUrl: "https://demo.example.com/monsters-ink",
    slidesUrl: "https://slides.example.com/monsters-ink",
    donationAddress: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    bountyPrize: [
      {
        name: "Best ink! Track Winner",
        amount: 3000,
        hackathonWonAtId: "synergy-2025"
      }
    ],
    techStack: ["ink!", "Rust", "Substrate", "WebAssembly"],
    categories: ["NFT", "Gaming"],
    hackathon: {
      id: "synergy-2025",
      name: "Blockspace Synergy 2025",
      endDate: "2025-02-01"
    },
    m2Status: 'under_review',
    m2Agreement: {
      mentorName: "InkMaster",
      agreedDate: "2025-11-26T10:00:00Z",
      agreedFeatures: [
        "Creature minting system with rarity distribution - Support minting with randomized stats (HP, Attack, Defense, Speed) and 5 rarity tiers",
        "Training and leveling mechanics - Allow users to train creatures to increase stats, with a maximum level of 50",
        "PvP battle system with turn-based combat - Implement battle mechanics where creatures fight using their stats and special abilities",
        "NFT marketplace integration - Enable trading of creatures on secondary markets with royalty support",
        "Reward system for battles - Distribute rewards (tokens or items) to winners based on battle outcomes"
      ],
      documentation: [
        "README with setup instructions",
        "Architecture overview explaining how it works",
        "Smart contract documentation with ink! code examples",
        "Game mechanics guide explaining battle system",
        "Frontend integration guide for developers"
      ],
      successCriteria: "Game must support minting of at least 10 different creature types, enable PvP battles with working turn-based combat, have a functional training system that increases creature stats, and maintain a battle-tested user base of 100+ active players. All smart contracts must be deployed and audited."
    },
    finalSubmission: {
      repoUrl: "https://github.com/monsters-ink/monsters-ink-game",
      demoUrl: "https://www.youtube.com/watch?v=monsters-ink-demo",
      docsUrl: "https://docs.monstersink.io",
      summary: "Monsters Ink! is now a fully functional NFT battle game with creature minting, training mechanics, and PvP battles. All smart contracts are deployed on testnet, the frontend is live, and we've completed comprehensive testing. The game supports 10+ creature types with unique abilities and has been battle-tested by 100+ users.",
      submittedDate: "2025-12-23T10:30:00Z"
    }
  },
  {
    id: "mock-winner-3",
    projectName: "Kusama Bridge Protocol",
    description: "A secure and efficient cross-chain bridge protocol connecting Kusama with major blockchain networks. Enables seamless asset transfers with minimal fees and fast transaction times. Built with cutting-edge cryptographic proofs for maximum security.",
    teamMembers: [{ name: "Charlie Bridge" }],
    projectRepo: "https://github.com/example/kusama-bridge",
    demoUrl: "https://demo.example.com/kusama-bridge",
    slidesUrl: "https://slides.example.com/kusama-bridge",
    donationAddress: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
    bountyPrize: [
      {
        name: "Best Kusama Track Winner",
        amount: 4000,
        hackathonWonAtId: "synergy-2025"
      }
    ],
    techStack: ["Kusama", "Substrate", "Rust", "XCM"],
    categories: ["DeFi", "Developer Tools"],
    hackathon: {
      id: "synergy-2025",
      name: "Blockspace Synergy 2025",
      endDate: "2025-02-01"
    },
    m2Status: 'completed'
  }
];

/**
 * Simulates an API response with mock winning projects
 */
export const getMockWinnersResponse = () => {
  return {
    status: "success",
    data: mockWinningProjects,
    meta: {
      total: mockWinningProjects.length,
      count: mockWinningProjects.length,
      limit: 1000,
      page: 1
    }
  };
};
