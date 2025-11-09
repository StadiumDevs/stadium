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

const updateTestProject = async () => {
  await connectToMongo();

  try {
    const newWallet = '5GE6ptWSLAgSgoDzBDsFgZi1cauUCmEpEgtddyphkL5GGQcF';
    const projectId = 'm2-submission-test-admin-xyz123';

    console.log('\n🔄 Updating test project with correct wallet address...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const result = await Project.updateOne(
      { _id: projectId },
      {
        $set: {
          'teamMembers.0.walletAddress': newWallet,
          'donationAddress': newWallet
        }
      }
    );

    if (result.matchedCount === 0) {
      console.log('❌ Test project not found. Creating new one...');
      
      // Calculate dates for Week 5
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const fiveWeeksAgo = new Date();
      fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35);

      const testProject = {
        _id: projectId,
        projectName: "M2 Submission Test Project",
        teamMembers: [
          {
            name: "Admin Tester",
            walletAddress: newWallet,
            role: "Lead Developer",
            github: "admin-tester",
            twitter: "@admin_test"
          }
        ],
        description: "A test project for validating M2 deliverable submission workflow. Currently in Week 5 (submission window open).",
        hackathon: {
          id: "synergy-2025",
          name: "Synergy 2025",
          endDate: fourWeeksAgo,
          eventStartedAt: "synergy-hack-2024"
        },
        projectRepo: "https://github.com/test/m2-submission-test",
        demoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        techStack: ["React", "TypeScript", "Node.js", "MongoDB", "Polkadot.js"],
        categories: ["Developer Tools", "DeFi"],
        milestones: [],
        donationAddress: newWallet,
        projectState: "Milestone Delivered",
        m2Status: "building",
        m2Agreement: {
          agreedDate: fiveWeeksAgo,
          agreedFeatures: [
            "Real-time data synchronization",
            "Multi-signature wallet support",
            "Cross-chain asset tracking",
            "Beautiful dashboard with analytics"
          ],
          documentation: [
            "Complete README",
            "API documentation",
            "User guide"
          ],
          successCriteria: "Handle 100+ concurrent users, <1 second sync time"
        },
        submittedDate: fiveWeeksAgo
      };

      await Project.create(testProject);
      console.log('✅ Created new test project');
    } else {
      console.log('✅ Updated existing test project');
    }

    const project = await Project.findById(projectId);
    
    console.log('\n📊 Updated Project:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Project ID: ${projectId}`);
    console.log(`   Team Member Wallet: ${project.teamMembers[0].walletAddress}`);
    console.log(`   Payout Address: ${project.donationAddress}`);
    console.log(`   Status: ${project.m2Status}`);
    
    // Calculate current week
    const now = new Date();
    const daysProject = Math.floor((now.getTime() - project.hackathon.endDate.getTime()) / (1000 * 60 * 60 * 24));
    const weekProject = Math.floor(daysProject / 7) + 1;
    
    console.log(`   Current Week: ${weekProject} of 6`);
    console.log(`   Can Submit: ${weekProject >= 5 && weekProject <= 6 ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎉 Update complete!');
    console.log('\n📝 Next Steps:');
    console.log('   1. RESTART your frontend dev server (Ctrl+C then npm run dev)');
    console.log('   2. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)');
    console.log('   3. Visit: http://localhost:8080/projects/m2-submission-test-admin-xyz123');
    console.log(`   4. Connect wallet: ${newWallet}`);
    console.log('   5. Submit button should now appear! ✅');

  } catch (error) {
    console.error('\n❌ Error updating project:', error);
    throw error;
  } finally {
    mongoose.connection.close();
    console.log('\n✅ Database connection closed\n');
  }
};

updateTestProject().catch(err => {
  console.error("Update failed:", err);
  process.exit(1);
});

