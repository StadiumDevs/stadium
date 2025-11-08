import mongoose from "mongoose";
import dotenv from "dotenv";
import Project from "./models/Project.js";

dotenv.config();

const connectToMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ Mongoose connection failed:", err);
    throw err;
  }
};

const m2Projects = [
  {
    _id: "polkadot-portfolio-tracker-a1b2c3",
    projectName: "Polkadot Portfolio Tracker",
    teamMembers: [
      {
        name: "Sarah Chen",
        walletAddress: "5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9",
        role: "Lead Developer",
        github: "sarahchen",
        twitter: "@sarahchen_dev"
      },
      {
        name: "Mike Johnson",
        walletAddress: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
        role: "Backend Developer",
        github: "mikejohnson"
      }
    ],
    description: "A comprehensive portfolio tracking application for the Polkadot ecosystem. Track your assets across multiple parachains, view real-time prices, analyze performance, and get insights on your holdings. Features beautiful charts, transaction history, and support for 20+ parachains including Moonbeam, Acala, Astar, and more.",
    hackathon: {
      id: "synergy-2025",
      name: "Synergy 2025",
      endDate: new Date("2025-07-18T18:00:00"),
      eventStartedAt: "synergy-hack-2024"
    },
    projectRepo: "https://github.com/sarahchen/polkadot-portfolio-tracker",
    demoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    slidesUrl: "https://docs.google.com/presentation/d/example-portfolio-tracker",
    techStack: ["React", "TypeScript", "Polkadot.js", "Node.js", "MongoDB", "Chart.js"],
    categories: ["DeFi", "Analytics", "Developer Tools"],
    milestones: [],
    bountyPrize: [
      {
        name: "Best Developer Tooling Track",
        amount: 3000,
        hackathonWonAtId: "synergy-2025"
      }
    ],
    donationAddress: "5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9",
    projectState: "Milestone Delivered",
    bountiesProcessed: false,
    
    // M2 Accelerator Program - Building Status
    m2Status: "building",
    m2Agreement: {
      agreedDate: new Date("2025-10-28T10:00:00Z"),
      agreedFeatures: [
        "Multi-chain portfolio aggregation supporting 20+ parachains with automatic balance updates every 30 seconds",
        "Real-time price feeds integration from major DEXs and CEXs with <5 second refresh rate",
        "Historical performance charts showing 1D, 7D, 30D, 90D, 1Y views with interactive tooltips",
        "Transaction history explorer with filtering by chain, token, and date range",
        "Portfolio analytics including ROI calculations, asset allocation pie charts, and P&L statements",
        "Export functionality to CSV/PDF for tax reporting purposes"
      ],
      documentation: [
        "Complete README with installation and setup guide",
        "API documentation for all endpoints",
        "Architecture diagram showing system components",
        "User guide with screenshots and tutorials",
        "Deployment guide for production"
      ],
      successCriteria: "Application must successfully track assets across at least 20 parachains, display real-time prices with <5 second latency, support 50+ major tokens, handle 1000+ transactions in history without performance degradation, and provide accurate portfolio value calculations with 99%+ accuracy."
    },
    submittedDate: new Date("2025-10-28T10:00:00Z")
  },
  
  {
    _id: "decentralized-voting-dao-d4e5f6",
    projectName: "Decentralized Voting DAO",
    teamMembers: [
      {
        name: "David Martinez",
        walletAddress: "5DAAnuX2qToh7223z2J5tV6a2UqXG1nS1g4G2g1eZA1Lz9aU",
        role: "Smart Contract Developer",
        github: "davidmartinez",
        twitter: "@dmartinez_dev",
        linkedin: "https://linkedin.com/in/davidmartinez"
      },
      {
        name: "Emma Wilson",
        walletAddress: "5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qUsSWFc",
        role: "Frontend Developer",
        github: "emmawilson"
      },
      {
        name: "James Lee",
        walletAddress: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y",
        role: "Product Designer",
        twitter: "@jameslee_design"
      }
    ],
    description: "A fully on-chain DAO governance platform built with ink! smart contracts. Create proposals, vote on decisions, execute approved actions automatically, and manage treasury funds transparently. Features quadratic voting, time-locked execution, and delegate voting. Built for the Polkadot ecosystem with support for any parachain.",
    hackathon: {
      id: "synergy-2025",
      name: "Synergy 2025",
      endDate: new Date("2025-07-18T18:00:00"),
      eventStartedAt: "synergy-hack-2024"
    },
    projectRepo: "https://github.com/davidmartinez/decentralized-voting-dao",
    demoUrl: "https://www.youtube.com/watch?v=demo-dao-voting",
    slidesUrl: "https://docs.google.com/presentation/d/example-dao-slides",
    techStack: ["ink!", "Rust", "React", "TypeScript", "Polkadot.js", "Substrate"],
    categories: ["Governance", "DAO", "Smart Contracts"],
    milestones: [],
    bountyPrize: [
      {
        name: "Best ink! Smart Contract",
        amount: 4000,
        hackathonWonAtId: "synergy-2025"
      }
    ],
    donationAddress: "5DAAnuX2qToh7223z2J5tV6a2UqXG1nS1g4G2g1eZA1Lz9aU",
    projectState: "Milestone Delivered",
    bountiesProcessed: false,
    
    // M2 Accelerator Program - Under Review Status
    m2Status: "under_review",
    m2Agreement: {
      agreedDate: new Date("2025-10-20T14:00:00Z"),
      agreedFeatures: [
        "Proposal creation system with rich text editor and file attachments up to 10MB",
        "Multiple voting mechanisms: simple majority, supermajority (66%), and quadratic voting",
        "Time-locked execution of approved proposals with configurable delay periods (1-30 days)",
        "Delegate voting system allowing token holders to assign voting power to trusted representatives",
        "Treasury management with multi-signature approval for fund transfers",
        "Proposal discussion forum with threaded comments and emoji reactions",
        "Real-time vote tracking dashboard with beautiful visualizations",
        "Automated proposal archival after 90 days of inactivity"
      ],
      documentation: [
        "Complete README with project overview and setup instructions",
        "Smart contract documentation with all functions and events explained",
        "Frontend component documentation",
        "User guide with step-by-step tutorials for creating proposals and voting",
        "Security audit report from external auditor",
        "Deployment guide for mainnet"
      ],
      successCriteria: "Platform must support creation and voting on proposals with <1 minute finality, handle at least 100 concurrent voters without performance issues, execute approved proposals automatically via smart contracts, maintain 100% uptime during voting periods, and pass comprehensive security audit with no critical vulnerabilities."
    },
    finalSubmission: {
      repoUrl: "https://github.com/davidmartinez/decentralized-voting-dao",
      demoUrl: "https://dao-voting-demo.vercel.app",
      docsUrl: "https://dao-voting-docs.gitbook.io",
      summary: "We've successfully built a comprehensive DAO voting platform with all planned features implemented. The smart contracts have been deployed to Rococo testnet and audited by CertiK with no critical issues found. The frontend provides an intuitive interface for proposal creation, voting, and treasury management. We implemented quadratic voting to prevent whale dominance, time-locked execution for security, and delegate voting for improved participation. The platform has been tested with 150+ concurrent users and handles proposal creation/voting with sub-second response times. All documentation is complete including user guides, API docs, and deployment guides.",
      submittedDate: new Date("2025-11-01T18:30:00Z")
    },
    submittedDate: new Date("2025-10-20T14:00:00Z")
  }
];

const seedM2Projects = async () => {
  await connectToMongo();

  try {
    // Check if projects already exist
    const existingIds = await Project.find({
      _id: { $in: m2Projects.map(p => p._id) }
    }).select('_id projectName');

    if (existingIds.length > 0) {
      console.log("⚠️  Found existing M2 projects:");
      existingIds.forEach(p => console.log(`   - ${p.projectName} (${p._id})`));
      console.log("\n🔄 Updating existing projects...");
      
      // Update each project
      for (const project of m2Projects) {
        await Project.updateOne({ _id: project._id }, project, { upsert: true });
        console.log(`✅ Updated: ${project.projectName}`);
      }
    } else {
      // Insert new projects
      await Project.insertMany(m2Projects);
      console.log("✅ Inserted 2 new M2 projects");
    }

    console.log("\n📊 M2 Projects Summary:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    for (const project of m2Projects) {
      const statusEmoji = project.m2Status === 'building' ? '🟢' : 
                         project.m2Status === 'under_review' ? '⏳' : '✅';
      console.log(`\n${statusEmoji} ${project.projectName}`);
      console.log(`   ID: ${project._id}`);
      console.log(`   Status: ${project.m2Status.toUpperCase()}`);
      console.log(`   Team Members: ${project.teamMembers.length}`);
      console.log(`   Mentor: ${project.m2Agreement.mentorName}`);
      if (project.finalSubmission) {
        console.log(`   Submitted: ${project.finalSubmission.submittedDate.toLocaleDateString()}`);
      }
    }
    
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n🎉 M2 seed data complete!");
    console.log("\n📝 Test URLs:");
    console.log("   Building: http://localhost:8080/projects/polkadot-portfolio-tracker-a1b2c3");
    console.log("   Under Review: http://localhost:8080/projects/decentralized-voting-dao-d4e5f6");

  } catch (error) {
    console.error("❌ Error seeding M2 projects:", error);
    throw error;
  } finally {
    mongoose.connection.close();
    console.log("\n✅ Database connection closed");
  }
};

seedM2Projects().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});

