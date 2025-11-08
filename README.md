# 🛠️ Blockspace Stadium

A full-stack web application for managing and reviewing Web3 projects submitted through the Stadium platform.

---

## Project Structure

```
.
├── client/        # Frontend (React + Vite + TypeScript)
├── server/        # Backend (Node.js + Express)
├── hackathonia/   # Ink! smart contracts (Rust)
```

---

## Getting Started

### 🐳 Quick Start with Docker (Recommended)

The easiest way to get started is using Docker Compose:

```bash
# Start MongoDB and Server
docker compose up -d

# Wait a few seconds for MongoDB to initialize, then populate the database
cd server
node migration.js

# Verify the server is running
curl http://localhost:2000/api/health
```

Your server will be running at `http://localhost:2000` with MongoDB on port `27017`.

**To stop the containers:**
```bash
docker compose down

# To stop and remove all data (fresh start)
docker compose down -v
```

---

### 💻 Local Development Setup

#### Prerequisites
- Node.js v20+
- Docker (for MongoDB)
- npm or yarn

#### 1. Start MongoDB with Docker

```bash
# Start only MongoDB in Docker
docker compose up mongodb -d
```

#### 2. Setup Backend (Server)

```bash
cd server

# Install dependencies
npm install

# Make sure your .env file has the correct MongoDB connection
# Should contain: MONGO_URI=mongodb://admin:password@localhost:27017/blockspace?authSource=admin&directConnection=true

# Start the development server
npm run dev
```

Server runs on `http://localhost:2000`.

#### 3. Populate Database with Sample Data

**Important:** The database needs to be populated with projects for the frontend to display data.

```bash
# From the server directory
node migration.js
```

This will import:
- **84 hackathon projects** from Synergy 2025 and Symmetry 2024
- **16 winning projects** with bounty/prize information
- **Payout and milestone data** from CSV files

**Verify the migration:**
```bash
curl http://localhost:2000/api/projects | jq '.meta'
# Should show: { "total": 84, "count": 10, "limit": 10, "page": 1 }
```

#### 4. Setup Frontend (Client)

```bash
cd client

# Install dependencies
npm install

# Make sure your .env file exists with:
# VITE_API_BASE_URL=http://localhost:2000/api

# Start the development server
npm run dev
```

Frontend runs on `http://localhost:8080`.

---

### 🔄 Development Workflow

**Option 1: Docker for Backend + Local Frontend**
```bash
# Terminal 1: Start backend services
docker compose up -d
cd server && node migration.js

# Terminal 2: Start frontend
cd client && npm run dev
```

**Option 2: All Local (MongoDB in Docker)**
```bash
# Terminal 1: Start MongoDB only
docker compose up mongodb -d

# Terminal 2: Start backend
cd server && npm run dev

# Terminal 3: Start frontend
cd client && npm run dev

# One-time: Populate database
cd server && node migration.js
```

---

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Radix UI** (shadcn/ui) components
- **Polkadot API** integration
- **Talisman SIWS** for Web3 authentication
- **React Query** for state management

### Backend
- **Node.js v20** with Express
- **MongoDB 7.0** with Mongoose
- **Polkadot API** integration
- **SIWS Authentication** middleware
- **CORS** enabled

### Smart Contracts
- **Rust** with Ink! framework
- **Polkadot** ecosystem integration

### Infrastructure
- **Docker Compose** for orchestration
- **MongoDB** containerized database
- **Alpine Linux** base images

---

## 🔧 Environment Variables

### Server (.env)
```bash
MONGO_URI=mongodb://admin:password@localhost:27017/blockspace?authSource=admin&directConnection=true
PORT=2000
NODE_ENV=development
ADMIN_WALLETS=5DAAnuX2qToh7223z2J5tV6a2UqXG1nS1g4G2g1eZA1Lz9aU
EXPECTED_DOMAIN=
DISABLE_SIWS_DOMAIN_CHECK=true
```

### Client (.env)
```bash
VITE_API_BASE_URL=http://localhost:2000/api
```

---

## 📊 Database Migration

The migration script (`server/migration.js`) imports project data from JSON files in `server/migration-data/`:

- `synergy-2025.json` - Synergy 2025 hackathon projects
- `symmetry-2024.json` - Symmetry 2024 hackathon projects  
- `payouts.csv` - Bounty payout information

**Run migration:**
```bash
cd server
node migration.js
```

**What gets migrated:**
- 84 total projects
- 16 winning projects with bounty prizes
- Team member information
- Tech stacks and categories
- Milestone data
- Payout addresses

**Re-run migration (fresh data):**
```bash
cd server
node migration.js  # Automatically clears existing data first
```

**Add M2 test projects:**
```bash
cd server
node seed-m2-projects.js
```

This adds 2 M2 Accelerator projects for testing:
- **Polkadot Portfolio Tracker** (status: `building`) - Active development
- **Decentralized Voting DAO** (status: `under_review`) - Submitted for review

**Update M2 dates for testing (LOCAL ONLY):**
```bash
cd server
node update-m2-dates.js
```

⚠️ **WARNING:** This script is for **LOCAL TESTING ONLY**! It updates test projects with realistic dates so you can test M2 time-based features (roadmap editing, submission windows). It has a built-in safety check and will refuse to run if `NODE_ENV=production`.

What it does:
- Sets Polkadot Portfolio Tracker to Week 3 (can edit roadmap)
- Sets Decentralized Voting DAO to Week 6 (can submit deliverables)
- Enables testing of date enforcement features

---

## 🚀 API Endpoints

### Public Endpoints
- `GET /api/health` - Health check
- `GET /api/projects` - List all projects (supports filtering, search, pagination)
- `GET /api/projects/:id` - Get single project

### Protected Endpoints (Require SIWS Authentication)
- `POST /api/projects` - Create project (Admin only)
- `PATCH /api/projects/:id` - Update project (Admin or Team Member)
- `PUT /api/projects/:id/team` - Update team members (Team Member)
- `POST /api/projects/:id/submit-review` - Submit M2 deliverables (Team Member)

See [API_DOCS.md](./API_DOCS.md) for full API documentation.

---

## 🐛 Troubleshooting

### MongoDB Connection Issues

**Error:** `Authentication failed`

**Solution:** 
```bash
# Stop containers and remove volumes
docker compose down -v

# Restart with fresh MongoDB
docker compose up -d

# Wait 5 seconds for MongoDB to initialize
sleep 5

# Run migration
cd server && node migration.js
```

### Frontend Shows No Data

**Issue:** Backend database is empty

**Solution:**
```bash
# Check if backend is returning data
curl http://localhost:2000/api/projects

# If empty, run migration
cd server && node migration.js

# Refresh your browser
```

### Port Already in Use

**Error:** `Port 2000 or 8080 already in use`

**Solution:**
```bash
# Find process using the port
lsof -i :2000
lsof -i :8080

# Kill the process or stop Docker
docker compose down
```

---

## 📚 Additional Documentation

- [API Documentation](./API_DOCS.md) - Complete API reference
- [Data Schema](./DATA_SCHEMA.md) - MongoDB schema and data model
- [Admin Review Guide](./ADMIN-REVIEW.md) - Code review checklist

---

## 🤝 Contributing

1. Ensure all tests pass
2. Follow the existing code style
3. Update documentation for any new features
4. Run the migration script to test with real data

---

## 📄 License

See [LICENSE](./LICENSE) for details.

