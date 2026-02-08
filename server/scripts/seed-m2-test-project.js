import mongoose from "mongoose";
import dotenv from "dotenv";
import Project from "../models/Project.js";

dotenv.config();

// ⚠️ SAFETY CHECK: This script is for LOCAL TESTING ONLY!
if (process.env.NODE_ENV === 'production') {
  console.error('❌ CRITICAL ERROR: This script cannot run in production!');
  console.error('This script creates mock test data for M2 submission testing.');
  process.exit(1);
}

console.log('🧪 Running in TEST/DEVELOPMENT mode...\n');

const connectToMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ Mongoose connection failed:", err);
    throw err;
  }
};

const seedTestProject = async () => {
  await connectToMongo();

  try {
    // Calculate dates for Week 5 (submission window is open)
    // Set hackathon end date to 4 weeks ago, so we're in Week 5
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const fiveWeeksAgo = new Date();
    fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35);

    // Admin wallet address from environment (use the one from your setup)
    const adminWallet = '5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9';

    const testProject = {
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
        endDate: fourWeeksAgo, // 4 weeks ago = Week 5 now
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
      
      // M2 Incubator Program - Building Status (Week 5 - Submission Window Open)
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
    };

    console.log("\n📅 Creating M2 Test Project for Submission Testing...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Check if project already exists
    const existing = await Project.findById(testProject._id);
    
    if (existing) {
      console.log("⚠️  Test project already exists. Updating...");
      await Project.updateOne({ _id: testProject._id }, testProject);
      console.log("✅ Updated existing test project");
    } else {
      await Project.create(testProject);
      console.log("✅ Created new test project");
    }

    // Calculate current week
    const now = new Date();
    const daysProject = Math.floor((now.getTime() - fourWeeksAgo.getTime()) / (1000 * 60 * 60 * 24));
    const weekProject = Math.floor(daysProject / 7) + 1;

    // Calculate days until deadline (Week 6 ends at 42 days)
    const deadlineDate = new Date(fourWeeksAgo);
    deadlineDate.setDate(deadlineDate.getDate() + 42);
    const daysUntilDeadline = Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    console.log("\n📊 Project Status:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`\n🎯 Project ID: ${testProject._id}`);
    console.log(`📝 Project Name: ${testProject.projectName}`);
    console.log(`👤 Admin Wallet: ${adminWallet}`);
    console.log(`\n📅 Timeline:`);
    console.log(`   Hackathon Ended: ${fourWeeksAgo.toLocaleDateString()}`);
    console.log(`   Current Week: ${weekProject} of 6`);
    console.log(`   Days Until Deadline: ${daysUntilDeadline} days`);
    console.log(`   Deadline: ${deadlineDate.toLocaleDateString()}`);
    
    console.log(`\n✅ Status Checks:`);
    console.log(`   Can Submit M2? ${weekProject >= 5 && weekProject <= 6 ? '✅ YES (Week 5-6)' : '❌ NO'}`);
    console.log(`   Can Edit Roadmap? ${weekProject <= 4 ? '✅ YES (Week 1-4)' : '❌ NO (locked)'}`);
    console.log(`   M2 Status: ${testProject.m2Status.toUpperCase()}`);
    console.log(`   Has Submitted? NO (ready to test submission)`);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n🎉 Test project created successfully!");
    console.log("\n📝 Testing Instructions:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n1. Visit the project page:");
    console.log(`   http://localhost:8080/projects/${testProject._id}`);
    console.log("\n2. Connect your wallet:");
    console.log(`   Use wallet: ${adminWallet}`);
    console.log("   (This wallet is in the team, so you can submit as team member)");
    console.log("\n3. Test M2 Submission:");
    console.log("   ✅ Timeline should show Week 5 (Submission Window Open)");
    console.log("   ✅ Green alert: 'Submission window is OPEN!'");
    console.log("   ✅ Submit button should be ENABLED");
    console.log("   ✅ Click 'Submit M2 Deliverables'");
    console.log("   ✅ Fill out the form and submit");
    console.log("\n4. Verify submission:");
    console.log("   ✅ m2Status should change to 'under_review'");
    console.log("   ✅ finalSubmission data should be saved");
    console.log("   ✅ Timeline should show 'Submitted on [date]'");
    console.log("\n💡 Tips:");
    console.log("   - Use any valid GitHub URL (must include 'github.com')");
    console.log("   - Use YouTube or Loom video URL");
    console.log("   - Summary must be 10-1000 characters");
    console.log("   - Check confirmation checkbox before submitting");
    console.log("\n🔧 Admin Features:");
    console.log("   - As admin, you can submit even outside Week 5-6");
    console.log("   - Check server logs for submission details");
    console.log("   - Verify backend validation is working");

  } catch (error) {
    console.error("\n❌ Error creating test project:", error);
    throw error;
  } finally {
    mongoose.connection.close();
    console.log("\n✅ Database connection closed\n");
  }
};

seedTestProject().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});

