# Supabase Integration - Quick Start Guide

> Fast reference for implementing Supabase in Stadium app

---

## 🚀 Quick Setup

### 1. Create Supabase Project

```bash
# Visit https://supabase.com/dashboard
# Create new project
# Save these credentials:
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_ANON_KEY=[your-anon-key]
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
```

### 2. Install Dependencies

```bash
cd server
npm install @supabase/supabase-js

# Remove MongoDB dependencies (optional)
npm uninstall mongoose
```

### 3. Create Database Schema

Run the SQL schema from `SUPABASE_MIGRATION_CONTEXT.md` in Supabase SQL Editor.

Or use migration file:

```bash
# Copy schema to migration file
cp migrations/001_initial_schema.sql supabase/migrations/

# Apply migration
supabase db push
```

---

## 📦 Core Changes

### Replace MongoDB Connection

**Before** (`server/db.js`):
```javascript
import mongoose from "mongoose";
await mongoose.connect(process.env.MONGO_URI);
```

**After** (`server/db.js`):
```javascript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test connection
export const connectToSupabase = async () => {
  const { data, error } = await supabase.from('projects').select('count');
  if (error) throw error;
  console.log('✅ Connected to Supabase');
};
```

---

### Update Repository Layer

**Before** (`server/api/repositories/project.repository.js`):
```javascript
import Project from '../../models/Project.js';

export const findAllProjects = async (filters) => {
  return await Project.find(filters);
};
```

**After**:
```javascript
import { supabase } from '../../db.js';

export const findAllProjects = async (filters) => {
  let query = supabase
    .from('projects')
    .select(`
      *,
      team_members(*),
      bounty_prizes(*),
      milestones(*),
      payments(*)
    `);
  
  // Apply filters
  if (filters.hackathonId) {
    query = query.eq('hackathon_id', filters.hackathonId);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  
  return data;
};
```

---

### Update Environment Variables

**`.env`**:
```bash
# Replace
MONGO_URI=mongodb+srv://...

# With
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

---

## 🔐 Authentication

### Keep SIWS Authentication

No changes needed to SIWS flow! Just update database queries.

**Auth middleware** (`server/api/middleware/auth.middleware.js`):
- Keep SIWS verification
- Replace Project model queries with Supabase

```javascript
// Before
const project = await Project.findById(projectId).select('teamMembers');

// After
const { data: project } = await supabase
  .from('projects')
  .select('id, team_members(*)')
  .eq('id', projectId)
  .single();
```

---

## 📊 Common Query Patterns

### Get All Projects with Filters

```javascript
const { data, error } = await supabase
  .from('projects')
  .select(`
    *,
    team_members(*),
    bounty_prizes(*)
  `)
  .eq('hackathon_id', 'synergy-2025')
  .order('created_at', { ascending: false })
  .range(0, 9); // Pagination: 0-9 (first 10)
```

### Get Single Project

```javascript
const { data, error } = await supabase
  .from('projects')
  .select(`
    *,
    team_members(*),
    bounty_prizes(*),
    milestones(*),
    payments(*)
  `)
  .eq('id', projectId)
  .single();
```

### Create Project

```javascript
// 1. Insert project
const { data: project, error: projectError } = await supabase
  .from('projects')
  .insert({
    id: generateId(projectName),
    project_name: projectName,
    description,
    hackathon_id: 'synergy-2025',
    // ... other fields
  })
  .select()
  .single();

// 2. Insert team members
const { error: teamError } = await supabase
  .from('team_members')
  .insert(
    teamMembers.map(member => ({
      project_id: project.id,
      name: member.name,
      wallet_address: member.walletAddress,
    }))
  );
```

### Update Project

```javascript
const { data, error } = await supabase
  .from('projects')
  .update({
    m2_status: 'under_review',
    updated_at: new Date().toISOString()
  })
  .eq('id', projectId)
  .select()
  .single();
```

### Delete Project

```javascript
// CASCADE will delete related records (team_members, etc.)
const { error } = await supabase
  .from('projects')
  .delete()
  .eq('id', projectId);
```

### Search Projects

```javascript
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .or(`project_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
```

---

## 🔄 Migration Script

### Migrate Data from MongoDB to Supabase

```javascript
// server/scripts/migrate-mongodb-to-supabase.js
import mongoose from 'mongoose';
import { createClient } from '@supabase/supabase-js';
import Project from '../models/Project.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrate() {
  // Connect to MongoDB
  await mongoose.connect(process.env.MONGO_URI);
  
  // Fetch all projects
  const projects = await Project.find({});
  console.log(`Found ${projects.length} projects to migrate`);
  
  for (const project of projects) {
    console.log(`Migrating: ${project.projectName}`);
    
    // 1. Insert project
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .insert({
        id: project._id,
        project_name: project.projectName,
        description: project.description,
        project_repo: project.projectRepo,
        demo_url: project.demoUrl,
        slides_url: project.slidesUrl,
        tech_stack: project.techStack,
        categories: project.categories,
        donation_address: project.donationAddress,
        project_state: project.projectState,
        bounties_processed: project.bountiesProcessed,
        
        // Hackathon
        hackathon_id: project.hackathon.id,
        hackathon_name: project.hackathon.name,
        hackathon_end_date: project.hackathon.endDate,
        hackathon_event_started_at: project.hackathon.eventStartedAt,
        
        // M2
        m2_status: project.m2Status,
        m2_mentor_name: project.m2Agreement?.mentorName,
        m2_agreed_date: project.m2Agreement?.agreedDate,
        m2_agreed_features: project.m2Agreement?.agreedFeatures,
        m2_documentation: project.m2Agreement?.documentation,
        m2_success_criteria: project.m2Agreement?.successCriteria,
        
        // Final submission
        final_submission_repo_url: project.finalSubmission?.repoUrl,
        final_submission_demo_url: project.finalSubmission?.demoUrl,
        final_submission_docs_url: project.finalSubmission?.docsUrl,
        final_submission_summary: project.finalSubmission?.summary,
        final_submission_submitted_date: project.finalSubmission?.submittedDate,
        
        completion_date: project.completionDate,
        submitted_date: project.submittedDate,
      })
      .select()
      .single();
    
    if (projectError) {
      console.error(`Error migrating project ${project._id}:`, projectError);
      continue;
    }
    
    // 2. Insert team members
    if (project.teamMembers?.length > 0) {
      await supabase.from('team_members').insert(
        project.teamMembers.map(member => ({
          project_id: project._id,
          name: member.name,
          wallet_address: member.walletAddress,
          custom_url: member.customUrl,
          role: member.role,
          twitter: member.twitter,
          github: member.github,
          linkedin: member.linkedin,
        }))
      );
    }
    
    // 3. Insert bounty prizes
    if (project.bountyPrize?.length > 0) {
      await supabase.from('bounty_prizes').insert(
        project.bountyPrize.map(prize => ({
          project_id: project._id,
          name: prize.name,
          amount: prize.amount,
          hackathon_won_at_id: prize.hackathonWonAtId,
        }))
      );
    }
    
    // 4. Insert milestones
    if (project.milestones?.length > 0) {
      await supabase.from('milestones').insert(
        project.milestones.map(milestone => ({
          project_id: project._id,
          description: milestone.description,
          created_at: milestone.createdAt,
          created_by: milestone.createdBy,
          updated_at: milestone.updatedAt,
          updated_by: milestone.updatedBy,
        }))
      );
    }
    
    // 5. Insert payments
    if (project.totalPaid?.length > 0) {
      await supabase.from('payments').insert(
        project.totalPaid.map(payment => ({
          project_id: project._id,
          milestone: payment.milestone,
          amount: payment.amount,
          currency: payment.currency,
          transaction_proof: payment.transactionProof,
        }))
      );
    }
    
    console.log(`✅ Migrated: ${project.projectName}`);
  }
  
  console.log('Migration complete!');
  await mongoose.connection.close();
}

migrate().catch(console.error);
```

**Run migration**:
```bash
cd server
node scripts/migrate-mongodb-to-supabase.js
```

---

## 🎯 Testing Checklist

```bash
# 1. Test connection
curl http://localhost:2000/api/health

# 2. Test get all projects
curl http://localhost:2000/api/m2-program

# 3. Test get single project
curl http://localhost:2000/api/m2-program/[project-id]

# 4. Test authenticated endpoint (with SIWS)
curl -X PATCH http://localhost:2000/api/m2-program/[project-id] \
  -H "Content-Type: application/json" \
  -H "x-siws-auth: [base64-encoded-siws-payload]" \
  -d '{"m2_status": "building"}'
```

---

## 🚨 Common Issues

### Issue: "relation does not exist"
**Solution**: Run the SQL schema in Supabase SQL Editor first.

### Issue: "RLS policy violation"
**Solution**: Either:
1. Use service role key (bypasses RLS)
2. Disable RLS: `ALTER TABLE projects DISABLE ROW LEVEL SECURITY;`
3. Create RLS policies for your auth system

### Issue: "Cannot read properties of undefined"
**Solution**: Supabase returns `null` for not found, not throws error. Check:
```javascript
const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
if (error) throw error;
if (!data) throw new Error('Project not found');
```

---

## 📚 Next Steps

1. ✅ Set up Supabase project
2. ✅ Run SQL schema
3. ✅ Update server dependencies
4. ✅ Replace database connection
5. ✅ Update repositories layer
6. ✅ Migrate data
7. ✅ Test all endpoints
8. ✅ Update frontend (if using Supabase client directly)
9. ✅ Deploy

---

## 🔗 Resources

- [Supabase JavaScript Client Docs](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase SQL Functions](https://supabase.com/docs/guides/database/functions)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Stadium Full Context](./SUPABASE_MIGRATION_CONTEXT.md)

---

**Last Updated**: 2025-01-11


