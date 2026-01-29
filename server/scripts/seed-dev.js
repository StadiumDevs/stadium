/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧪 DEV SEED SCRIPT - Complete Test Data Setup
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This script sets up a complete test environment for local development.
 * It combines all dev seed scripts into one comprehensive setup.
 *
 * ⚠️  CRITICAL: LOCAL DEVELOPMENT ONLY ⚠️
 * This script will:
 *   - DESTROY all existing data in the database
 *   - Create fake test projects with manipulated dates
 *   - Set up M2 projects in different states for testing
 *
 * DO NOT run this script in production - it will corrupt your data!
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHAT THIS SCRIPT DOES:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. Clears the entire database
 * 2. Seeds 2 sample M2 projects from seed-m2-projects.js:
 *    - Polkadot Portfolio Tracker (building status, Week 3)
 *    - Decentralized Voting DAO (under_review status, Week 6)
 * 3. Creates a test project for submission testing:
 *    - M2 Submission Test Project (Week 5, ready for submission)
 *    - Uses admin wallet for easy testing
 * 4. Manipulates dates to enable time-based feature testing
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * USAGE:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * From server directory:
 *   npm run seed:dev
 *
 * Or directly:
 *   node scripts/seed-dev.js
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TESTING SCENARIOS ENABLED:
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * After running this script, you can test:
 *
 * ✅ M2 Roadmap Editing (Weeks 1-4):
 *    - Use Polkadot Portfolio Tracker project
 *    - Currently in Week 3 - roadmap editing should work
 *
 * ✅ M2 Submission (Weeks 5-6):
 *    - Use M2 Submission Test Project
 *    - Currently in Week 5 - submission window is open
 *    - Connect with admin wallet to test submission flow
 *
 * ✅ M2 Under Review State:
 *    - Use Decentralized Voting DAO project
 *    - Already submitted, currently under review
 *    - Test admin review/approval flow
 *
 * ✅ Timeline Restrictions:
 *    - Test that roadmap editing is blocked after Week 4
 *    - Test that submission is blocked outside Weeks 5-6
 *    - Test admin bypass capabilities
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import Project from "../models/Project.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory (one level up from scripts/)
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ═══════════════════════════════════════════════════════════════════════════
// SAFETY CHECK: Production Protection
// ═══════════════════════════════════════════════════════════════════════════

if (process.env.NODE_ENV === 'production') {
  console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('❌ CRITICAL ERROR: Cannot run dev seed in production!');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('\nThis script will DESTROY ALL DATA in the database.');
  console.error('It is designed for LOCAL TESTING ONLY.');
  console.error('\nFor production data:');
  console.error('  - Use scripts/migration.js for historical data');
  console.error('  - Never manipulate dates on real projects');
  console.error('  - Never delete production data\n');
  process.exit(1);
}

// Check if running in a test/development environment
const mongoUri = process.env.MONGO_URI || '';
const isLocalMongo = mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1');

if (!isLocalMongo) {
  console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('❌ SAFETY CHECK FAILED: Not connected to localhost');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('\nYour MONGO_URI does not appear to be localhost.');
  console.error('This script is for LOCAL DEVELOPMENT ONLY.');
  console.error(`\nYour MONGO_URI: ${mongoUri}`);
  console.error('\nIf this is a mistake, update your .env file.');
  console.error('If you really want to seed a remote DB, remove this check.');
  console.error('(But you probably shouldn\'t!)\n');
  process.exit(1);
}

console.log('\n🧪 Running in TEST/DEVELOPMENT mode...');
console.log('✅ Safety checks passed (localhost MongoDB detected)\n');

// ═══════════════════════════════════════════════════════════════════════════
// Database Connection
// ═══════════════════════════════════════════════════════════════════════════

const connectToMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ Mongoose connection failed:", err);
    throw err;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Test Data Definitions
// ═══════════════════════════════════════════════════════════════════════════

const createTestProjects = () => {
  // Calculate various dates for different testing scenarios
  const now = new Date();

  // Week 3 of M2 (roadmap editing allowed)
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const threeWeeksAgo = new Date();
  threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

  // Week 5 of M2 (submission window open)
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const fiveWeeksAgo = new Date();
  fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35);

  // Week 6 of M2 (already submitted)
  const sixWeeksAgo = new Date();
  sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);

  const adminWallet = process.env.ADMIN_WALLETS?.split(',')[0] || '5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9';

  return [
    // ─────────────────────────────────────────────────────────────────────
    // Project 1: Building Status (Week 3 - Can edit roadmap)
    // ─────────────────────────────────────────────────────────────────────
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
        endDate: twoWeeksAgo, // Week 3 of M2
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
      m2Status: "building",
      m2Agreement: {
        agreedDate: threeWeeksAgo,
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
      submittedDate: threeWeeksAgo
    },

    // ─────────────────────────────────────────────────────────────────────
    // Project 2: Under Review Status (Week 6 - Already submitted)
    // ─────────────────────────────────────────────────────────────────────
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
        endDate: fiveWeeksAgo, // Week 6 of M2
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
      m2Status: "under_review",
      m2Agreement: {
        agreedDate: sixWeeksAgo,
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
        submittedDate: now
      },
      submittedDate: sixWeeksAgo
    },

    // ─────────────────────────────────────────────────────────────────────
    // Project 3: Test Project (Week 5 - Ready for submission)
    // ─────────────────────────────────────────────────────────────────────
    {
      _id: "m2-submission-test-admin-xyz123",
      projectName: "M2 Submission Test Project",
      teamMembers: [
        {
          name: "Admin Tester",
          walletAddress: adminWallet,
          role: "Lead Developer",
          github: "admin-tester",
          twitter: "@admin_test"
        },
        {
          name: "Jane Developer",
          walletAddress: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
          role: "Frontend Developer",
          github: "janedev"
        }
      ],
      description: "A test project for validating M2 deliverable submission workflow. This project is currently in Week 5 of the M2 program, which means the submission window is open. Use this project to test the submission form, validation, and backend integration.",
      hackathon: {
        id: "synergy-2025",
        name: "Synergy 2025",
        endDate: fourWeeksAgo, // Week 5 of M2
        eventStartedAt: "synergy-hack-2024"
      },
      projectRepo: "https://github.com/test/m2-submission-test",
      demoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      slidesUrl: "https://docs.google.com/presentation/d/test-m2-submission",
      techStack: ["React", "TypeScript", "Node.js", "MongoDB", "Polkadot.js"],
      categories: ["Developer Tools", "DeFi"],
      milestones: [],
      bountyPrize: [
        {
          name: "Best Innovation Track",
          amount: 2500,
          hackathonWonAtId: "synergy-2025"
        }
      ],
      donationAddress: adminWallet,
      projectState: "Milestone Delivered",
      bountiesProcessed: false,
      m2Status: "building",
      m2Agreement: {
        agreedDate: fiveWeeksAgo,
        agreedFeatures: [
          "Real-time data synchronization with sub-second latency",
          "Multi-signature wallet support for team treasuries",
          "Cross-chain asset tracking across 15+ parachains",
          "Beautiful dashboard with charts and analytics",
          "Mobile-responsive design with PWA support"
        ],
        documentation: [
          "Complete README with setup instructions",
          "API documentation for all endpoints",
          "User guide with screenshots",
          "Architecture diagram",
          "Deployment guide"
        ],
        successCriteria: "Application must handle 100+ concurrent users, sync data in <1 second, support all major parachains, pass security audit, and provide intuitive UX with <2 second page loads."
      },
      submittedDate: fiveWeeksAgo
    }
  ];
};

// ═══════════════════════════════════════════════════════════════════════════
// Main Seed Function
// ═══════════════════════════════════════════════════════════════════════════

const seedDev = async () => {
  await connectToMongo();

  try {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🗑️  STEP 1: Clearing existing data...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const deleteResult = await Project.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} existing projects\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌱 STEP 2: Seeding test projects...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const testProjects = createTestProjects();
    await Project.insertMany(testProjects);
    console.log(`✅ Inserted ${testProjects.length} test projects\n`);

    // Calculate and display project statuses
    const now = new Date();

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 PROJECT STATUS SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    testProjects.forEach(project => {
      const daysElapsed = Math.floor((now.getTime() - project.hackathon.endDate.getTime()) / (1000 * 60 * 60 * 24));
      const week = Math.floor(daysElapsed / 7) + 1;
      const canEditRoadmap = week <= 4;
      const canSubmit = week >= 5 && week <= 6;

      const statusEmoji = project.m2Status === 'building' ? '🟢' :
                         project.m2Status === 'under_review' ? '⏳' : '✅';

      console.log(`${statusEmoji} ${project.projectName}`);
      console.log(`   ID: ${project._id}`);
      console.log(`   Status: ${project.m2Status.toUpperCase()}`);
      console.log(`   Current Week: ${week} of 6`);
      console.log(`   Edit Roadmap: ${canEditRoadmap ? '✅ Allowed' : '❌ Locked'}`);
      console.log(`   Submit M2: ${canSubmit ? '✅ Allowed' : project.m2Status === 'under_review' ? '✅ Already Submitted' : '❌ Not Available'}`);
      console.log(`   Team Size: ${project.teamMembers.length} members`);
      console.log(`   Test URL: http://localhost:8080/projects/${project._id}\n`);
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 DEV SEED COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📝 TESTING GUIDE:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('1️⃣  TEST M2 ROADMAP EDITING (Weeks 1-4):');
    console.log('   Project: Polkadot Portfolio Tracker');
    console.log('   URL: http://localhost:8080/projects/polkadot-portfolio-tracker-a1b2c3');
    console.log('   Status: Week 3 - roadmap editing ENABLED ✅\n');

    console.log('2️⃣  TEST M2 SUBMISSION (Weeks 5-6):');
    console.log('   Project: M2 Submission Test Project');
    console.log('   URL: http://localhost:8080/projects/m2-submission-test-admin-xyz123');
    console.log(`   Wallet: ${process.env.ADMIN_WALLETS?.split(',')[0] || '5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9'}`);
    console.log('   Status: Week 5 - submission window OPEN ✅\n');

    console.log('3️⃣  TEST ADMIN REVIEW:');
    console.log('   Project: Decentralized Voting DAO');
    console.log('   URL: http://localhost:8080/projects/decentralized-voting-dao-d4e5f6');
    console.log('   Status: Under Review - test admin approval flow ⏳\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 TIPS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('• Admin wallets can bypass all time restrictions');
    console.log('• Week calculations are based on hackathon end date');
    console.log('• Dates are automatically calculated for realistic testing');
    console.log('• Re-run this script anytime to reset test data\n');

  } catch (error) {
    console.error('\n❌ Error seeding dev data:', error);
    throw error;
  } finally {
    mongoose.connection.close();
    console.log('✅ Database connection closed\n');
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Execute
// ═══════════════════════════════════════════════════════════════════════════

seedDev().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
