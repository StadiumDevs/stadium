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
curl http://localhost:2000/api/m2-program | jq '.meta'
# Should show: { "total": 84, "count": 10, "limit": 10, "page": 1 }
```

#### 4. Setup Frontend (Client)

```bash
cd client

# Install dependencies
npm install

# Create .env file
cat > .env << 'EOF'
# API Configuration
VITE_API_BASE_URL=http://localhost:2000/api

# Admin Wallet Addresses (comma-separated)
# Add your wallet address(es) that should have admin privileges
VITE_ADMIN_ADDRESSES=5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9
EOF

# Start the development server
npm run dev
```

Frontend runs on `http://localhost:8080`.

**⚠️ Important:** After creating or modifying `.env`, you **must restart** the dev server for changes to take effect.

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
# API Configuration
VITE_API_BASE_URL=http://localhost:2000/api

# Admin Wallet Addresses (comma-separated, lowercase)
# These wallet addresses will have admin privileges to:
# - Submit M2 deliverables outside submission window
# - Edit any project's M2 agreement
# - Approve/reject M2 submissions
# - Manage team members and payout addresses
VITE_ADMIN_ADDRESSES=5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9

# Example with multiple admins:
# VITE_ADMIN_ADDRESSES=5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9,5DAAnuX2qToh7223z2J5tV6a2UqXG1nS1g4G2g1eZA1Lz9aU
```

**Note:** `VITE_ADMIN_ADDRESSES` must match `ADMIN_WALLETS` in the server `.env` for consistency.

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
- `GET /api/m2-program` - List all M2 program projects (supports filtering, search, pagination)
- `GET /api/m2-program/:id` - Get single M2 project

### Protected Endpoints (Require SIWS Authentication)
- `POST /api/m2-program` - Create project (Admin only)
- `PATCH /api/m2-program/:id` - Update project (Admin or Team Member)
- `PUT /api/m2-program/:id/team` - Update team members (Team Member)
- `POST /api/m2-program/:id/submit-review` - Submit M2 deliverables (Team Member)

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
curl http://localhost:2000/api/m2-program

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

### Wallet Connected But Submit Button Disabled

**Issue:** "Connect your wallet to submit deliverables" shows even after connecting wallet

**Solution:**

This means the frontend doesn't recognize your wallet as an admin or team member.

1. **Create `client/.env` file** (if it doesn't exist):
   ```bash
   cd client
   cat > .env << 'EOF'
   VITE_API_BASE_URL=http://localhost:2000/api
   VITE_ADMIN_ADDRESSES=5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9
   EOF
   ```

2. **Restart the dev server** (critical!):
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

3. **Hard refresh browser:**
   - Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
   - Firefox: Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)

4. **Verify in browser console:**
   ```javascript
   [constants] VITE_ADMIN_ADDRESSES env: 5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9
   [constants] Checking admin access: { isAdmin: true }
   ```

See [WALLET_CONNECTION_FIX.md](./WALLET_CONNECTION_FIX.md) for detailed troubleshooting.

---

## 🚀 Production Deployment

### Prerequisites
- Node.js v20+ on production server
- MongoDB Atlas or self-hosted MongoDB
- Domain with SSL/TLS certificate
- Environment variables configured

### Backend (Server) Setup

#### 1. Environment Variables

Create `server/.env` on production server:

```bash
# MongoDB Connection (use MongoDB Atlas for production)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/blockspace?retryWrites=true&w=majority

# Server Configuration
PORT=2000
NODE_ENV=production

# Admin Wallet Addresses (comma-separated)
# CRITICAL: Keep these secure and only add trusted addresses
ADMIN_WALLETS=5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9,5DAAnuX2qToh7223z2J5tV6a2UqXG1nS1g4G2g1eZA1Lz9aU

# SIWS Authentication (IMPORTANT for security)
EXPECTED_DOMAIN=stadium.example.com
DISABLE_SIWS_DOMAIN_CHECK=false  # MUST be false in production!

# Optional: Logging and monitoring
LOG_LEVEL=info
```

#### 2. Build and Start

```bash
cd server

# Install production dependencies only
npm ci --only=production

# Run database migration (one-time setup)
node migration.js

# Start with PM2 (recommended)
npm install -g pm2
pm2 start server.js --name "stadium-backend"
pm2 save
pm2 startup

# Or use systemd service
sudo systemctl start stadium-backend
```

#### 3. Database Migration

**First-time setup:**
```bash
node migration.js
node seed-m2-projects.js  # Optional: Add M2 test projects
```

**⚠️ DO NOT run `update-m2-dates.js` in production!** It's for testing only.

### Frontend (Client) Setup

#### 1. Environment Variables

Create `client/.env.production`:

```bash
# Production API URL
VITE_API_BASE_URL=https://api.stadium.example.com/api

# Admin Wallet Addresses (MUST match server ADMIN_WALLETS)
VITE_ADMIN_ADDRESSES=5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9,5DAAnuX2qToh7223z2J5tV6a2UqXG1nS1g4G2g1eZA1Lz9aU
```

#### 2. Build for Production

```bash
cd client

# Install dependencies
npm ci

# Build optimized production bundle
npm run build

# Output will be in client/dist/
```

#### 3. Serve with Nginx

**Example Nginx configuration:**

```nginx
# Frontend
server {
    listen 80;
    listen [::]:80;
    server_name stadium.example.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name stadium.example.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/stadium.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/stadium.example.com/privkey.pem;
    
    # Frontend static files
    root /var/www/stadium/client/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy
    location /api {
        proxy_pass http://localhost:2000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API (optional separate subdomain)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.stadium.example.com;
    
    ssl_certificate /etc/letsencrypt/live/stadium.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/stadium.example.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:2000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4. Deploy

```bash
# Copy build to web server
scp -r client/dist/* user@server:/var/www/stadium/client/dist/

# Restart Nginx
sudo systemctl restart nginx
```

### Database (MongoDB) Setup

#### Option 1: MongoDB Atlas (Recommended)

1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Add IP whitelist (0.0.0.0/0 for production server)
4. Create database user with read/write permissions
5. Get connection string and update `MONGO_URI` in server `.env`

#### Option 2: Self-Hosted MongoDB

```bash
# Install MongoDB 7.0
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Create admin user
mongosh
use admin
db.createUser({
  user: "admin",
  pwd: "secure_password_here",
  roles: ["root"]
})
exit

# Update server/.env with connection string
MONGO_URI=mongodb://admin:secure_password_here@localhost:27017/blockspace?authSource=admin
```

### Security Checklist

- [ ] `NODE_ENV=production` in server
- [ ] `DISABLE_SIWS_DOMAIN_CHECK=false` in server
- [ ] `EXPECTED_DOMAIN` set to actual domain
- [ ] Strong MongoDB password
- [ ] Admin wallet addresses kept secure
- [ ] HTTPS enabled (SSL certificates)
- [ ] Firewall configured (only ports 80/443 open)
- [ ] MongoDB not exposed to public internet
- [ ] Regular backups configured
- [ ] Error logging set up (Sentry, LogRocket, etc.)
- [ ] Rate limiting enabled (nginx limit_req or express-rate-limit)
- [ ] CORS configured for production domain only

### Monitoring

#### PM2 Monitoring

```bash
# View logs
pm2 logs stadium-backend

# Monitor CPU/Memory
pm2 monit

# Restart if needed
pm2 restart stadium-backend
```

#### Health Checks

```bash
# Check backend health
curl https://api.stadium.example.com/api/health

# Should return:
# {"status":"OK","message":"Server is running","timestamp":"..."}
```

### Backup Strategy

#### MongoDB Backup

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
mongodump --uri="$MONGO_URI" --out=/backups/mongodb-$DATE
tar -czf /backups/mongodb-$DATE.tar.gz /backups/mongodb-$DATE
rm -rf /backups/mongodb-$DATE

# Keep only last 7 days
find /backups -name "mongodb-*.tar.gz" -mtime +7 -delete
```

Add to crontab:
```bash
crontab -e
# Add: 0 2 * * * /path/to/backup-script.sh
```

### Updates and Maintenance

#### Updating Server

```bash
cd server
git pull
npm ci --only=production
pm2 restart stadium-backend
```

#### Updating Client

```bash
cd client
git pull
npm ci
npm run build
# Copy dist/ to web server
```

#### Database Migrations

If schema changes:
```bash
cd server
node migration.js  # Re-run migration if needed
# Or create custom migration scripts for schema updates
```

---

## 📚 Additional Documentation

### Setup & Configuration
- [Wallet Connection Fix](./WALLET_CONNECTION_FIX.md) - Troubleshooting admin wallet connection
- [M2 Testing Guide](./M2_TESTING_GUIDE.md) - Complete M2 submission testing guide
- [M2 Date Enforcement](./M2_DATE_ENFORCEMENT.md) - Week-based restrictions and timeline

### API & Development
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

