import mongoose from "mongoose";
import dotenv from "dotenv";
import Project from "./models/Project.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import csv from "csv-parser";

// Load .env from server directory or root
const envPath = path.resolve(process.cwd(), "server", ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const connectToMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB for migration");
  } catch (err) {
    console.error("❌ Mongoose connection failed:", err);
    throw err;
  }
};

const generateProjectId = (projectName) => {
  if (!projectName) {
    return crypto.randomBytes(6).toString('hex');
  }
  const sanitizedName = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const randomString = crypto.randomBytes(3).toString("hex");
  return `${sanitizedName}-${randomString}`;
};

const generateTeamMemberId = (memberName) => {
  if (!memberName) {
    return crypto.randomBytes(6).toString('hex');
  }
  const sanitizedName = memberName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const randomString = crypto.randomBytes(3).toString("hex");
  return `${sanitizedName}-${randomString}`;
};

const readCsvData = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  CSV file not found at ${filePath}. Skipping payout data.`);
      return resolve({});
    }

    const payouts = {};
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const hackathonId = row['hackathon-id'];
        const projectName = row['Project'];
        if (hackathonId && projectName) {
          const key = `${hackathonId.trim()}-${projectName.trim().toLowerCase()}`;
          payouts[key] = row;
        }
      })
      .on('end', () => {
        console.log("✅ CSV data processed successfully.");
        resolve(payouts);
      })
      .on('error', (error) => {
        console.error("❌ Failed to process CSV file:", error);
        reject(error);
      });
  });
};

const migrate = async () => {
  await connectToMongo();

  const payoutsPath = path.resolve(process.cwd(), "migration-data", "payouts.csv");
  const payoutsData = await readCsvData(payoutsPath);
  const initialPayoutsCount = Object.keys(payoutsData).length;
  let matchedProjectsCount = 0;

  const projectNameMapping = {
    "anytype - nft gating": "AnyType NFT",
    "blockchain solutions hermann müller co kg": "Blockchain Solutions Hermann K."
  };

  const pastHackathons = [
    {
      id: "synergy-2025",
      name: "Synergy 2025",
      endDate: new Date("2025-07-18T18:00:00"),
    },
    {
      id: "symmetry-2024",
      name: "Symmetry 2024",
      endDate: new Date("2024-08-21T23:55:00"),
    },
  ];

  await Project.deleteMany({});
  let allProjectsToInsert = [];

  for (const hackathon of pastHackathons) {
    const jsonPath = path.resolve(
      process.cwd(),
      "migration-data",
      `${hackathon.id}.json`
    );

    let projectsData;
    try {
      const fileContent = fs.readFileSync(jsonPath, "utf-8");
      projectsData = JSON.parse(fileContent);
    } catch (err) {
      console.error(`❌ Failed to read or parse ${jsonPath}:`, err);
      continue;
    }

    const projectsFromHackathon = projectsData
      .filter(p => p.projectName && p.projectName.trim() !== "")
      .map(project => {
        const originalProjectName = project.projectName.trim().toLowerCase();
        const mappedProjectName = projectNameMapping[originalProjectName] || originalProjectName;
        const lookupKey = `${hackathon.id}-${mappedProjectName.toLowerCase()}`;
        
        const payoutInfo = payoutsData[lookupKey];
        let projectState = "Hackathon Submission";
        let walletAddress = "";
        let bountiesProcessed = false;

        if (payoutInfo) {
          matchedProjectsCount++;
          walletAddress = payoutInfo['Address'] || "";
          const milestone1Url = payoutInfo['Milestone 1'];
          const milestone2Url = payoutInfo['Milestone 2'];
          
          if (milestone2Url && milestone2Url.trim().startsWith('http')) {
              // TODO: find a solution for this admin panel should trigger an update and abandon the project if no milestone 2 is delivered
              projectState = 'Milestone Delivered';
              bountiesProcessed = true;
          } else if (hackathon.id === 'synergy-2025') {
              projectState = 'Bounty Payout';
              bountiesProcessed = false;
          } else {
              projectState = 'Abandoned';
              bountiesProcessed = true;
          }
          delete payoutsData[lookupKey];
        }

        let techStackArray = [];
        if (project.techStack) {
          if (Array.isArray(project.techStack)) {
            techStackArray = project.techStack;
          } else if (typeof project.techStack === 'string') {
            techStackArray = project.techStack.split(',').map(s => s.trim()).filter(Boolean);
          }
        }

        const milestoneDescription = Array.isArray(project.milestones)
          ? project.milestones.map(item => `- ${item}`).join('\\n')
          : project.milestones;

        return {
          _id: generateProjectId(project.projectName),
          projectName: project.projectName,
          teamMembers: [{
            name: project.teamLead,
            customUrl: "",
            walletAddress: walletAddress.trim()
          }],
          description: project.description,
          hackathon: {
            id: hackathon.id,
            name: hackathon.name,
            endDate: hackathon.endDate
          },
          projectRepo: project.githubRepo,
          demoUrl: project.demoUrl,
          slidesUrl: project.slidesUrl,
          techStack: techStackArray,
          categories: project.categories || [],
          milestones: milestoneDescription ? [{
            description: milestoneDescription,
            createdAt: new Date(),
            createdBy: "migration",
            updatedAt: new Date(),
            updatedBy: "migration",
          }] : [],
          bountyPrize: project.winner ? [{ name: project.winner, amount: 2500, hackathonWonAtId: hackathon.id }] : [],
          donationAddress: project.donationAddress || "",
          projectState: projectState,
          bountiesProcessed: bountiesProcessed,
        };
      });
      allProjectsToInsert.push(...projectsFromHackathon);
  }

  if (allProjectsToInsert.length > 0) {
    try {
      await Project.insertMany(allProjectsToInsert);
      console.log(`✅ Migrated ${allProjectsToInsert.length} projects in total.`);
    } catch (err) {
      console.error(`❌ Failed to insert projects:`, err);
    }
  }

  console.log(`\n--- Payouts CSV Matching Report ---`);
  console.log(`Found ${initialPayoutsCount} rows in payouts.csv to process.`);
  console.log(`Matched ${matchedProjectsCount} projects with payout data.`);
  
  const unmatchedProjects = Object.keys(payoutsData);
  if (unmatchedProjects.length > 0) {
      console.log(`⚠️ Could not match ${unmatchedProjects.length} projects from CSV. Please check for data consistency:`);
      unmatchedProjects.forEach(key => console.log(`  - ${key}`));
  } else if (initialPayoutsCount > 0) {
      console.log("✅ All projects from CSV were matched successfully.");
  }
  console.log("-------------------------------------\n");

  console.log("Migration finished.");

  mongoose.connection.close();
};

migrate().catch(err => {
  console.error("Migration failed:", err);
  mongoose.connection.close();
  process.exit(1);
});