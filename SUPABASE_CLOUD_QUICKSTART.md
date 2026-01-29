# Supabase Cloud - Quick Start (5 Steps)

## ⚡ Quick Setup (10 minutes)

### Step 1: Create Project (2 min) 🌐
1. Go to: **https://supabase.com**
2. Click: **"New Project"**
3. Fill in:
   - Name: `stadium`
   - Password: (choose & save it)
   - Region: (closest to you)
4. Click: **"Create new project"**
5. Wait for green checkmark ✅

---

### Step 2: Get Credentials (1 min) 🔑

**Go to:** Project Settings → API

**Copy these 3 values:**

```
Project URL: https://xxxxx.supabase.co
Anon Key: eyJhbGc...
Service Role Key: eyJhbGc...
```

**Save them somewhere safe!** You'll need them next.

---

### Step 3: Link & Push Schema (2 min) 💾

Open terminal and run:

```bash
cd /Users/salansky/Desktop/GithubRepos/stadium

# Link to your project (replace xxxxx with your project ref)
supabase link --project-ref xxxxx

# Push database schema
supabase db push
```

**Your project ref** is in the URL: `https://xxxxx.supabase.co` → `xxxxx`

---

### Step 4: Update Environment (1 min) ⚙️

Run this command (I'll fill in your credentials):

```bash
cd /Users/salansky/Desktop/GithubRepos/stadium/server

# Stop current server first
# Then run this (replace with your actual credentials):
cat > .env << 'EOF'
# Supabase (NEW)
SUPABASE_URL=https://YOUR_PROJECT_URL.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# Server config
PORT=2000
NODE_ENV=development
EXPECTED_DOMAIN=localhost
DISABLE_SIWS_DOMAIN_CHECK=true
NETWORK_ENV=testnet
MULTISIG_ADDRESS=5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9
AUTHORIZED_SIGNERS=5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9

# MongoDB (keep for migration)
MONGO_URI=mongodb://localhost:27017/blockspace-stadium
EOF
```

---

### Step 5: Install & Test (4 min) 🚀

```bash
# Install Supabase client
cd /Users/salansky/Desktop/GithubRepos/stadium/server
npm install @supabase/supabase-js

# I'll help you update the code next!
```

---

## 🎯 What You Get

After these 5 steps:
- ✅ Supabase PostgreSQL database (cloud)
- ✅ All tables created (projects, team_members, etc.)
- ✅ Credentials configured
- ✅ Ready to migrate data

---

## 📊 Next: Update Server Code

You have 2 options:

### Option A: Manual (Recommended for learning)
Follow the detailed guide in: `SUPABASE_SETUP_STEPS.md` → Step 7

### Option B: Let me do it (Faster)
Tell me: **"Update server code for Supabase"** and I'll:
1. Update `db.js` to use Supabase
2. Update `server.js`
3. Update repository layer
4. Create migration script
5. Migrate your 3 test projects

---

## 🔍 Verify It Worked

After setup, check Supabase Studio:

1. Go to: https://supabase.com/dashboard
2. Open your project: **stadium**
3. Click: **Table Editor**
4. You should see:
   - ✅ projects
   - ✅ team_members
   - ✅ bounty_prizes
   - ✅ milestones
   - ✅ payments
   - ✅ multisig_transactions
   - ✅ multisig_approvals

---

## 📝 Commands Summary

```bash
# 1. Create project at supabase.com

# 2. Link local to cloud
supabase link --project-ref YOUR_REF

# 3. Push database schema
supabase db push

# 4. Install client
npm install @supabase/supabase-js

# 5. Update .env (use template above)

# 6. Migrate data (after code update)
node scripts/migrate-mongo-to-supabase.js
```

---
