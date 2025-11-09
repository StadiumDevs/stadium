import mongoose from "mongoose";
import dotenv from "dotenv";
import Project from "./models/Project.js";

dotenv.config();

// ⚠️ SAFETY CHECK: This script is for LOCAL TESTING ONLY!
// It manipulates project dates to test M2 time-based features.
// DO NOT run this in production - it will corrupt real project timelines!
if (process.env.NODE_ENV === 'production') {
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('❌ CRITICAL ERROR: This script cannot run in production!');
  console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.error('');
  console.error('This script is designed for LOCAL TESTING ONLY.');
  console.error('It overwrites hackathon end dates with fake dates for testing.');
  console.error('');
  console.error('Running this in production would:');
  console.error('  - Corrupt real project timelines');
  console.error('  - Break M2 program week calculations');
  console.error('  - Confuse teams about their deadlines');
  console.error('');
  console.error('If you need to update dates in production, do it manually');
  console.error('or create a proper migration script with real dates.');
  console.error('');
  process.exit(1);
}

console.log('🧪 Running in TEST/DEVELOPMENT mode...');
console.log('   (Safe to manipulate dates for testing)\n');

const connectToMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ Mongoose connection failed:", err);
    throw err;
  }
};

const updateM2Dates = async () => {
  await connectToMongo();

  try {
    // Calculate dates:
    // - Set hackathon end date to 2 weeks ago (so we're in Week 2-3 of M2 program)
    // - This allows testing M2 roadmap editing (Weeks 1-4)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const threeWeeksAgo = new Date();
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

    console.log("\n📅 Updating M2 project dates for testing...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Update Polkadot Portfolio Tracker (building status)
    // Set to Week 3 of M2 program (can still edit roadmap)
    await Project.updateOne(
      { _id: "polkadot-portfolio-tracker-a1b2c3" },
      {
        $set: {
          "hackathon.endDate": twoWeeksAgo,
          "m2Agreement.agreedDate": threeWeeksAgo,
          submittedDate: threeWeeksAgo
        }
      }
    );
    console.log("✅ Updated Polkadot Portfolio Tracker");
    console.log(`   Hackathon ended: ${twoWeeksAgo.toLocaleDateString()} (Week 3 of M2)`);
    console.log(`   Status: Can edit M2 roadmap ✏️`);

    // Update Decentralized Voting DAO (under_review status)
    // Set to Week 5 of M2 program (submission window)
    const fiveWeeksAgo = new Date();
    fiveWeeksAgo.setDate(fiveWeeksAgo.getDate() - 35);
    
    const sixWeeksAgo = new Date();
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 42);

    await Project.updateOne(
      { _id: "decentralized-voting-dao-d4e5f6" },
      {
        $set: {
          "hackathon.endDate": fiveWeeksAgo,
          "m2Agreement.agreedDate": sixWeeksAgo,
          "finalSubmission.submittedDate": new Date(),
          submittedDate: sixWeeksAgo
        }
      }
    );
    console.log("✅ Updated Decentralized Voting DAO");
    console.log(`   Hackathon ended: ${fiveWeeksAgo.toLocaleDateString()} (Week 6 of M2)`);
    console.log(`   Status: In submission window 📤`);

    // Calculate current weeks
    const now = new Date();
    
    const daysProject1 = Math.floor((now.getTime() - twoWeeksAgo.getTime()) / (1000 * 60 * 60 * 24));
    const weekProject1 = Math.floor(daysProject1 / 7) + 1;
    
    const daysProject2 = Math.floor((now.getTime() - fiveWeeksAgo.getTime()) / (1000 * 60 * 60 * 24));
    const weekProject2 = Math.floor(daysProject2 / 7) + 1;

    console.log("\n📊 Current Week Status:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n🟢 Polkadot Portfolio Tracker:");
    console.log(`   Current Week: ${weekProject1} of 6`);
    console.log(`   M2 Roadmap Editing: ${weekProject1 <= 4 ? '✅ ALLOWED' : '❌ BLOCKED'}`);
    console.log(`   M2 Submission: ${weekProject1 >= 5 && weekProject1 <= 6 ? '✅ ALLOWED' : '❌ NOT YET'}`);
    
    console.log("\n⏳ Decentralized Voting DAO:");
    console.log(`   Current Week: ${weekProject2} of 6`);
    console.log(`   M2 Roadmap Editing: ${weekProject2 <= 4 ? '✅ ALLOWED' : '❌ BLOCKED (Week 4 passed)'}`);
    console.log(`   M2 Submission: ${weekProject2 >= 5 && weekProject2 <= 6 ? '✅ ALLOWED' : '❌ DEADLINE PASSED'}`);

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n🎉 Date update complete! You can now test the M2 features.");
    console.log("\n📝 Test These Actions:");
    console.log("   1. Edit M2 Roadmap for Polkadot Portfolio Tracker (should work ✅)");
    console.log("   2. Try submitting M2 for Portfolio Tracker (should say 'Not Week 5 yet' ⏰)");
    console.log("   3. Try editing roadmap for DAO project (should say 'Locked after Week 4' 🔒)");
    console.log("   4. Submit M2 for DAO project (should work ✅)");
    console.log("\n💡 Admin wallets can bypass all restrictions!");

  } catch (error) {
    console.error("❌ Error updating dates:", error);
    throw error;
  } finally {
    mongoose.connection.close();
    console.log("\n✅ Database connection closed\n");
  }
};

updateM2Dates().catch(err => {
  console.error("Update failed:", err);
  process.exit(1);
});

