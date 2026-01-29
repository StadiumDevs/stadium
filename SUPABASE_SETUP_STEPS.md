# Supabase Cloud Setup - Step by Step

## 📋 Checklist

- [ ] Create Supabase project at https://supabase.com
- [ ] Save your credentials (URL, anon key, service role key)
- [ ] Link local project to cloud
- [ ] Apply migrations
- [ ] Update server environment variables
- [ ] Install Supabase client
- [ ] Update server code
- [ ] Migrate data from MongoDB
- [ ] Test connection

---

## Step 1: Create Supabase Project ✅

1. Visit https://supabase.com and sign in
2. Click "New Project"
3. Fill in:
   - **Name:** `stadium`
   - **Database Password:** (choose a strong password)
   - **Region:** (choose closest to you)
4. Click "Create new project"
5. Wait 2 minutes for setup

---

## Step 2: Get Credentials 🔑

Go to: **Project Settings → API**

Copy these three values:

```bash
Project URL: https://xxxxx.supabase.co
Anon (public) Key: eyJhbGc...
Service Role Key: eyJhbGc... (secret!)
```

---

## Step 3: Link Your Local Project

Run this command (replace with your Project Ref from the URL):

```bash
cd /Users/salansky/Desktop/GithubRepos/stadium
supabase link --project-ref YOUR_PROJECT_REF
```

Example: If your URL is `https://dltkdvryaedrubuiifks.supabase.co`, 
your project ref is `dltkdvryaedrubuiifks`

When prompted:
- Enter your database password
- Confirm the link

---

## Step 4: Apply Database Schema

This will create all tables in your Supabase database:

```bash
cd /Users/salansky/Desktop/GithubRepos/stadium
supabase db push
```

This applies the migration file:
- `supabase/migrations/20251122024003_initial_schema.sql`

Tables created:
- ✅ projects
- ✅ team_members
- ✅ bounty_prizes
- ✅ milestones
- ✅ payments
- ✅ multisig_transactions
- ✅ multisig_approvals

---

## Step 5: Update Server Environment

Edit `server/.env`:

```bash
# Comment out MongoDB
# MONGO_URI=mongodb://localhost:27017/blockspace-stadium

# Add Supabase credentials
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Keep existing settings
PORT=2000
NODE_ENV=development
EXPECTED_DOMAIN=localhost
DISABLE_SIWS_DOMAIN_CHECK=true
NETWORK_ENV=testnet
MULTISIG_ADDRESS=5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9
AUTHORIZED_SIGNERS=5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9
```

---

## Step 6: Install Supabase Client

```bash
cd server
npm install @supabase/supabase-js
```

---

## Step 7: Update Server Code

### A. Update `server/db.js`

**Before (MongoDB):**
```javascript
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectToMongo = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ Mongoose connection failed:", err);
    throw err;
  }
};
 
export default connectToMongo;
```

**After (Supabase):**
```javascript
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Create Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Test connection
export const connectToSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('count', { count: 'exact', head: true });
    
    if (error) throw error;
    console.log('✅ Connected to Supabase');
  } catch (err) {
    console.error('❌ Supabase connection failed:', err);
    throw err;
  }
};

export default connectToSupabase;
```

### B. Update `server/server.js`

Change line 3:
```javascript
// Before
import connectToMongo from "./db.js";

// After
import connectToSupabase from "./db.js";
```

Change line 45:
```javascript
// Before
await connectToMongo();

// After
await connectToSupabase();
```

### C. Update Repository Layer

See `SUPABASE_QUICK_START.md` for detailed examples of converting MongoDB queries to Supabase queries.

Example for `server/api/repositories/project.repository.js`:

**Before (MongoDB):**
```javascript
export const findAllProjects = async (filters) => {
  return await Project.find(filters);
};
```

**After (Supabase):**
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
  
  if (filters.hackathon_id) {
    query = query.eq('hackathon_id', filters.hackathon_id);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  
  return data;
};
```

---

## Step 8: Migrate Data from MongoDB

Create a migration script: `server/scripts/migrate-mongo-to-supabase.js`

```javascript
import mongoose from 'mongoose';
import { supabase } from '../db.js';
import Project from '../models/Project.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrate() {
  // Connect to MongoDB
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');
  
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
        
        // M2 fields
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
      console.error(`Error: ${project._id}`, projectError);
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
    
    console.log(`✅ Migrated: ${project.projectName}`);
  }
  
  console.log('🎉 Migration complete!');
  await mongoose.connection.close();
}

migrate().catch(console.error);
```

Run migration:
```bash
cd server
node scripts/migrate-mongo-to-supabase.js
```

---

## Step 9: Test Connection

```bash
# Restart server
cd server
npm run dev

# Test health
curl http://localhost:2000/api/health

# Test projects endpoint
curl http://localhost:2000/api/m2-program
```

---

## 🎉 You're Done!

Your app is now using Supabase Cloud PostgreSQL instead of MongoDB!

**Supabase Studio:** https://supabase.com/dashboard
- View your data
- Run SQL queries
- Manage tables
- Monitor performance

---

## 📚 Resources

- Full migration guide: `SUPABASE_MIGRATION_CONTEXT.md`
- Quick start: `SUPABASE_QUICK_START.md`
- Supabase Docs: https://supabase.com/docs

---

## ⚠️ Important Notes

1. **Keep your Service Role Key secret!** Never commit it to git
2. **Backup your MongoDB data** before full migration
3. **Test thoroughly** before switching production
4. **Update all repository files** to use Supabase queries
5. **Row Level Security:** Consider enabling RLS policies for production

---

## 🆘 Troubleshooting

**Connection errors:**
- Verify credentials in `.env`
- Check Supabase project is active
- Ensure service role key has proper permissions

**Migration errors:**
- Check MongoDB is still accessible
- Verify Supabase tables are created (`supabase db push`)
- Review error messages for data validation issues

**Query errors:**
- Supabase uses different syntax than MongoDB
- See `SUPABASE_QUICK_START.md` for query examples
- Use Supabase Studio to test queries

