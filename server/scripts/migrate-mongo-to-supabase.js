/**
 * Migration Script: MongoDB to Supabase
 *
 * This script migrates all project data from MongoDB to Supabase.
 *
 * Usage:
 *   node scripts/migrate-mongo-to-supabase.js
 *
 * Requirements:
 *   - MongoDB must be running and accessible
 *   - Supabase tables must already exist (run `supabase db push` first)
 *   - Environment variables set in .env:
 *     - MONGO_URI
 *     - SUPABASE_URL
 *     - SUPABASE_SERVICE_ROLE_KEY
 */

import mongoose from 'mongoose';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB Project Schema (simplified for migration)
const ProjectSchema = new mongoose.Schema({
  _id: String,
  projectName: String,
  teamMembers: [{
    name: String,
    customUrl: String,
    walletAddress: String,
    role: String,
    twitter: String,
    github: String,
    linkedin: String
  }],
  description: String,
  hackathon: {
    id: String,
    name: String,
    endDate: Date,
    eventStartedAt: String
  },
  projectRepo: String,
  demoUrl: String,
  slidesUrl: String,
  techStack: [String],
  categories: [String],
  milestones: [{
    description: String,
    createdAt: Date,
    createdBy: String,
    updatedAt: Date,
    updatedBy: String
  }],
  bountyPrize: [{
    name: String,
    amount: Number,
    hackathonWonAtId: String
  }],
  donationAddress: String,
  projectState: String,
  bountiesProcessed: Boolean,
  m2Status: String,
  m2Agreement: {
    mentorName: String,
    agreedDate: Date,
    agreedFeatures: [String],
    documentation: [String],
    successCriteria: String,
    lastUpdatedBy: String,
    lastUpdatedDate: Date
  },
  finalSubmission: {
    repoUrl: String,
    demoUrl: String,
    docsUrl: String,
    summary: String,
    submittedDate: Date,
    submittedBy: String
  },
  changesRequested: {
    feedback: String,
    requestedBy: String,
    requestedDate: Date
  },
  completionDate: Date,
  submittedDate: Date,
  totalPaid: [{
    milestone: String,
    amount: Number,
    currency: String,
    transactionProof: String
  }]
}, { timestamps: true });

const Project = mongoose.model('Project', ProjectSchema, 'projects');

// Validate Supabase env vars
const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase env vars:');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗ missing');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_KEY ? '✓' : '✗ missing');
  console.error('\nSet them in server/.env or export before running:');
  console.error('   export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"');
  console.error('   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"');
  process.exit(1);
}

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrate() {
  console.log('🚀 Starting MongoDB to Supabase migration...\n');
  console.log(`Supabase URL: ${SUPABASE_URL.slice(0, 40)}...`);

  // Connect to MongoDB
  console.log('\n📦 Connecting to MongoDB...');
  if (!process.env.MONGO_URI) {
    console.error('❌ Missing MONGO_URI env var');
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  // Test Supabase connection
  console.log('🔗 Testing Supabase connection...');
  try {
    const { data, error: testError } = await supabase.from('projects').select('id').limit(1);
    if (testError) {
      console.error('❌ Supabase query failed:', testError.message);
      console.error('   Code:', testError.code);
      console.error('   Details:', testError.details);
      if (testError.message.includes('fetch')) {
        console.error('\n💡 Network error - check:');
        console.error('   • SUPABASE_URL is correct (https://xxx.supabase.co)');
        console.error('   • Internet connection');
        console.error('   • Supabase project is not paused');
      }
      await mongoose.connection.close();
      process.exit(1);
    }
    console.log('✅ Connected to Supabase\n');
  } catch (err) {
    console.error('❌ Supabase connection error:', err.message);
    if (err.cause) console.error('   Cause:', err.cause.message);
    console.error('\n💡 Check:');
    console.error('   • SUPABASE_URL format (should be https://xxx.supabase.co, no trailing slash)');
    console.error('   • SUPABASE_SERVICE_ROLE_KEY is the service_role key (not anon key)');
    console.error('   • Network/firewall allows outbound HTTPS');
    await mongoose.connection.close();
    process.exit(1);
  }

  // Fetch all projects from MongoDB
  console.log('📥 Fetching projects from MongoDB...');
  const projects = await Project.find({});
  console.log(`✅ Found ${projects.length} projects to migrate\n`);

  if (projects.length === 0) {
    console.log('ℹ️  No projects to migrate.');
    await mongoose.connection.close();
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const project of projects) {
    console.log(`\n📝 Migrating: ${project.projectName} (${project._id})`);

    try {
      // 1. Insert project
      const projectRow = {
        id: project._id,
        project_name: project.projectName,
        description: project.description,
        project_repo: project.projectRepo,
        demo_url: project.demoUrl,
        slides_url: project.slidesUrl,
        tech_stack: project.techStack || [],
        categories: project.categories || [],
        donation_address: project.donationAddress,
        project_state: project.projectState,
        bounties_processed: project.bountiesProcessed || false,

        // Hackathon fields
        hackathon_id: project.hackathon?.id,
        hackathon_name: project.hackathon?.name,
        hackathon_end_date: project.hackathon?.endDate,
        hackathon_event_started_at: project.hackathon?.eventStartedAt,

        // M2 fields
        m2_status: project.m2Status,
        m2_mentor_name: project.m2Agreement?.mentorName,
        m2_agreed_date: project.m2Agreement?.agreedDate,
        m2_agreed_features: project.m2Agreement?.agreedFeatures || [],
        m2_documentation: project.m2Agreement?.documentation || [],
        m2_success_criteria: project.m2Agreement?.successCriteria,
        m2_last_updated_by: project.m2Agreement?.lastUpdatedBy,
        m2_last_updated_date: project.m2Agreement?.lastUpdatedDate,

        // Final submission
        final_submission_repo_url: project.finalSubmission?.repoUrl,
        final_submission_demo_url: project.finalSubmission?.demoUrl,
        final_submission_docs_url: project.finalSubmission?.docsUrl,
        final_submission_summary: project.finalSubmission?.summary,
        final_submission_submitted_date: project.finalSubmission?.submittedDate,
        final_submission_submitted_by: project.finalSubmission?.submittedBy,

        // Changes requested
        changes_requested_feedback: project.changesRequested?.feedback,
        changes_requested_by: project.changesRequested?.requestedBy,
        changes_requested_date: project.changesRequested?.requestedDate,

        // Dates
        completion_date: project.completionDate,
        submitted_date: project.submittedDate,
        created_at: project.createdAt,
        updated_at: project.updatedAt
      };

      const { error: projectError } = await supabase
        .from('projects')
        .upsert(projectRow, { onConflict: 'id' });

      if (projectError) {
        throw new Error(`Project insert failed: ${projectError.message}`);
      }
      console.log('  ✓ Project record created');

      // 2. Insert team members
      if (project.teamMembers?.length > 0) {
        // Delete existing team members first (for upsert behavior)
        await supabase.from('team_members').delete().eq('project_id', project._id);

        const { error: teamError } = await supabase
          .from('team_members')
          .insert(project.teamMembers.map(m => ({
            project_id: project._id,
            name: m.name,
            wallet_address: m.walletAddress,
            custom_url: m.customUrl,
            role: m.role,
            twitter: m.twitter,
            github: m.github,
            linkedin: m.linkedin
          })));

        if (teamError) {
          console.log(`  ⚠ Team members error: ${teamError.message}`);
        } else {
          console.log(`  ✓ ${project.teamMembers.length} team members migrated`);
        }
      }

      // 3. Insert bounty prizes
      if (project.bountyPrize?.length > 0) {
        // Delete existing bounty prizes first
        await supabase.from('bounty_prizes').delete().eq('project_id', project._id);

        const { error: bountyError } = await supabase
          .from('bounty_prizes')
          .insert(project.bountyPrize.map(b => ({
            project_id: project._id,
            name: b.name,
            amount: b.amount,
            hackathon_won_at_id: b.hackathonWonAtId
          })));

        if (bountyError) {
          console.log(`  ⚠ Bounty prizes error: ${bountyError.message}`);
        } else {
          console.log(`  ✓ ${project.bountyPrize.length} bounty prizes migrated`);
        }
      }

      // 4. Insert milestones
      if (project.milestones?.length > 0) {
        // Delete existing milestones first
        await supabase.from('milestones').delete().eq('project_id', project._id);

        const { error: milestoneError } = await supabase
          .from('milestones')
          .insert(project.milestones.map(m => ({
            project_id: project._id,
            description: m.description,
            created_at: m.createdAt,
            created_by: m.createdBy,
            updated_at: m.updatedAt,
            updated_by: m.updatedBy
          })));

        if (milestoneError) {
          console.log(`  ⚠ Milestones error: ${milestoneError.message}`);
        } else {
          console.log(`  ✓ ${project.milestones.length} milestones migrated`);
        }
      }

      // 5. Insert payments
      if (project.totalPaid?.length > 0) {
        // Delete existing payments first
        await supabase.from('payments').delete().eq('project_id', project._id);

        const { error: paymentError } = await supabase
          .from('payments')
          .insert(project.totalPaid.map(p => ({
            project_id: project._id,
            milestone: p.milestone,
            amount: p.amount,
            currency: p.currency,
            transaction_proof: p.transactionProof
          })));

        if (paymentError) {
          console.log(`  ⚠ Payments error: ${paymentError.message}`);
        } else {
          console.log(`  ✓ ${project.totalPaid.length} payments migrated`);
        }
      }

      console.log(`  ✅ Successfully migrated: ${project.projectName}`);
      successCount++;

    } catch (error) {
      console.error(`  ❌ Failed to migrate: ${project.projectName}`);
      console.error(`     Error: ${error.message}`);
      errorCount++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total projects: ${projects.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${errorCount}`);
  console.log('='.repeat(50) + '\n');

  // Close connections
  await mongoose.connection.close();
  console.log('🔌 MongoDB connection closed');
  console.log('🎉 Migration complete!\n');
}

// Run migration
migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
