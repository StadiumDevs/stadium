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
    m2Status: 'building'
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
    m2Status: 'under_review'
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
