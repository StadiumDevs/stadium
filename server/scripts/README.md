# Database Setup Guide

Quick guide for setting up your database for development or production.

---

## 🚀 Quick Start

### For Local Development

```bash
# Complete dev setup (recommended)
npm run seed:dev
npm run dev
```

This gives you 3 test projects ready for M2 feature testing.

### For Production

```bash
# Fresh production setup
npm run db:migrate:fresh
npm start
```

This gives you 84 historical hackathon projects.

---

## 📋 Available Commands

### Essential Commands

| Command | What It Does | Use Case |
|---------|--------------|----------|
| `npm run seed:dev` | **Purge DB** → Add 3 test M2 projects | **Local development** ⭐ |
| `npm run db:migrate:fresh` | **Purge DB** → Add 84 historical projects | **Fresh production setup** |
| `npm run db:reset` | **Purge DB** → Add 84 historical + 1 test | **Hybrid (prod + test)** |

### Utility Commands

| Command | What It Does |
|---------|--------------|
| `npm run db:purge` | Delete entire database |
| `npm run db:migrate` | Add historical data (no purge) |

---

## 🎯 Common Workflows

### Starting Fresh for Development

```bash
# One command does it all
npm run seed:dev

# What you get:
# - 3 test M2 projects
# - Polkadot Portfolio Tracker (Week 3 - can edit roadmap)
# - Decentralized Voting DAO (Week 6 - under review)
# - M2 Submission Test Project (Week 5 - can submit)
```

### Starting Fresh for Production

```bash
# Purge and migrate
npm run db:migrate:fresh

# What you get:
# - 84 historical hackathon projects
# - 12 completed M2 projects
# - Matched payout data from CSV
```

### Hybrid Setup (Production Data + Test Project)

```bash
# Get both historical and test data
npm run db:reset

# What you get:
# - 84 historical projects
# - 1 test project for M2 submissions
```

### Adding Data Without Purging

```bash
# Add historical data to existing database
npm run db:migrate
```

**Note:** To add a test project to production data, use `npm run db:reset` instead.

---

## 📖 Understanding the Scripts

### Development Script: `seed-dev.js`

**Purpose:** Complete test environment setup

**What it does:**
- Automatically purges the database
- Creates 3 test projects with manipulated dates for testing
- Sets up projects in different M2 weeks (3, 5, 6)
- Uses admin wallet from `.env` for easy testing

**Safety Features:**
- ✅ Won't run if `NODE_ENV=production`
- ✅ Won't run if MongoDB is not localhost
- ✅ Multiple protection layers

**Test Scenarios Enabled:**
- M2 roadmap editing (Weeks 1-4)
- M2 submission window (Weeks 5-6)
- Admin review workflow
- Timeline restrictions

---

### Production Script: `migration.js`

**Purpose:** Import historical hackathon data

**What it does:**
- Reads project data from `migration-data/` JSON files
- Matches projects with payout data from CSV
- Creates `finalSubmission` for completed M2 projects
- Maps renamed projects automatically

**Requirements:**
- `migration-data/synergy-2025.json`
- `migration-data/symmetry-2024.json`
- `migration-data/payouts.csv` (optional)

**Safety Features:**
- ✅ Does NOT manipulate dates
- ✅ Does NOT purge database automatically
- ✅ Safe for production use

---

## 🔍 Verifying Your Setup

Check what's in your database:

```bash
# Count total projects
mongosh blockspace-stadium --eval "db.projects.countDocuments({})"

# Count M2 projects
mongosh blockspace-stadium --eval "db.projects.countDocuments({m2Status: {\$exists: true}})"

# List project names
mongosh blockspace-stadium --eval "db.projects.find({}, {projectName: 1, m2Status: 1}).limit(5)"
```

---

## 🛠️ Troubleshooting

### "Cannot run in production" error
**Solution:** This is intentional protection. For production, use `npm run db:migrate:fresh`

### "Not connected to localhost" error
**Solution:** Check your `.env` file. `MONGO_URI` must include `localhost` or `127.0.0.1`

### Projects not appearing
```bash
# Check MongoDB is running
brew services list

# Try connecting
mongosh

# Verify data
mongosh blockspace-stadium --eval "db.projects.countDocuments({})"
```

### Need to completely reset
```bash
# For dev
npm run seed:dev

# For production
npm run db:migrate:fresh
```

---

## 💡 Best Practices

### ✅ DO:
- Use `npm run seed:dev` for local development
- Use `npm run db:migrate:fresh` for production setup
- Re-run seed scripts whenever you need fresh data
- Keep `migration-data/` in `.gitignore` if it contains sensitive data

### ❌ DON'T:
- Run `seed:dev` in production (it's blocked anyway)
- Manually manipulate dates on production data
- Delete production data without backups
- Mix test and production data

---

## 📊 What You Get with Each Setup

### Development (`npm run seed:dev`)
```
3 projects total

✅ Polkadot Portfolio Tracker
   - Status: building
   - Week 3 of 6
   - Can edit roadmap: YES
   - Can submit M2: NO

✅ Decentralized Voting DAO
   - Status: under_review
   - Week 6 of 6
   - Can edit roadmap: NO (locked)
   - Can submit M2: Already submitted

✅ M2 Submission Test Project
   - Status: building
   - Week 5 of 6
   - Can edit roadmap: NO (locked)
   - Can submit M2: YES (window open!)
```

### Production (`npm run db:migrate:fresh`)
```
84 projects total
- 12 with M2 status (completed)
- 17 matched with payout data
- Real historical dates
- Production-ready
```

---

## 🔗 Quick Reference

```bash
# DEV: Fresh start
npm run seed:dev

# PROD: Fresh start
npm run db:migrate:fresh

# HYBRID: Both
npm run db:reset

# PURGE: Delete everything
npm run db:purge

# ADD: Migration only (no purge)
npm run db:migrate
```

---

## 📁 Script Files

Located in `server/scripts/`:

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `seed-dev.js` | Development setup (purge + 3 test projects) | **Main dev script** ⭐ |
| `migration.js` | Production migration (84 historical projects) | **Main prod script** |
| `seed-m2-test-project.js` | Add 1 test project (no purge) | Used by `db:reset` |

**Note:** These are called automatically by npm scripts. You rarely need to run them directly.

---

## ❓ Need Help?

1. Check the console output - scripts provide detailed feedback
2. Verify MongoDB is running: `brew services list`
3. Check your `.env` configuration
4. Review the Project schema: `models/Project.js`

---

**Last Updated:** 2025-01-11
