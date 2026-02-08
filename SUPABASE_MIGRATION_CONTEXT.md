# Stadium App - Supabase Migration Context

> Comprehensive documentation for AI coding agents to understand the Stadium repository and implement Supabase integration.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Current Tech Stack](#current-tech-stack)
3. [Architecture](#architecture)
4. [Data Models](#data-models)
5. [API Structure](#api-structure)
6. [Authentication System](#authentication-system)
7. [Client Architecture](#client-architecture)
8. [Key Features](#key-features)
9. [Migration Strategy](#migration-strategy)
10. [Environment Configuration](#environment-configuration)

---

## Project Overview

**Stadium** is a hackathon project showcase and M2 incubator program management platform built for the Polkadot ecosystem.

### Purpose
- Display hackathon projects (Synergy 2025, Symmetry 2024)
- Manage M2 Incubator Program (6-week mentorship program)
- Track project milestones and payments
- Enable team submissions and admin reviews
- Process on-chain payments via Polkadot multisig

### Users
1. **Team Members**: Submit projects, update info, submit M2 deliverables
2. **Admins**: Review projects, approve payments, manage program
3. **Mentors**: Guide teams through M2 program
4. **Visitors**: Browse projects, view winners

---

## Current Tech Stack

### Backend
- **Runtime**: Node.js (ES Modules, `"type": "module"`)
- **Framework**: Express 5.1.0
- **Database**: MongoDB Atlas (via Mongoose 8.16.1)
- **Authentication**: Sign-In With Substrate (SIWS) via `@talismn/siws`
- **Blockchain**: Polkadot.js API for on-chain payments
- **Port**: 2000 (default)

### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.1
- **UI Library**: Radix UI + Tailwind CSS
- **State Management**: TanStack Query (React Query) 5.56.2
- **Routing**: React Router DOM 6.26.2
- **Blockchain**: Polkadot.js for wallet connection
- **Port**: 8080 (dev server)

### Key Dependencies
- **Polkadot**: `@polkadot/api`, `@polkadot/extension-dapp`, `polkadot-api`
- **Forms**: React Hook Form 7.60.0 + Zod 3.25.76
- **UI**: Framer Motion, Recharts, Sonner (toasts)
- **Utils**: date-fns, clsx, tailwind-merge

---

## Architecture

### Folder Structure

```
stadium/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── admin/        # Admin-specific components
│   │   │   └── ui/           # Radix UI components (shadcn)
│   │   ├── pages/            # Route pages
│   │   ├── lib/              # Utilities, API client, constants
│   │   ├── hooks/            # Custom React hooks
│   │   └── data/             # Static JSON data
│   ├── public/               # Static assets
│   └── vite.config.ts        # Vite configuration
│
├── server/                    # Express backend
│   ├── api/
│   │   ├── controllers/      # Business logic
│   │   ├── middleware/       # Auth, logging
│   │   ├── repositories/     # Database access layer
│   │   ├── routes/           # Express routes
│   │   ├── services/         # Business services (payments, etc.)
│   │   ├── utils/            # Helpers
│   │   └── constants/        # Static data
│   ├── models/               # Mongoose schemas
│   ├── config/               # Configuration files
│   ├── scripts/              # Database scripts (migration, seeding)
│   ├── migration-data/       # Historical data (JSON/CSV)
│   ├── server.js             # Express app entry point
│   └── db.js                 # MongoDB connection
│
└── README.md                 # Project documentation
```

### Request Flow

```
Client (React) → API Request → Express Server → Middleware (Auth) → Controller → Service → Repository → MongoDB
                                                                                                    ↓
Client ← JSON Response ← Express ← Controller ← Service ← Repository ← Mongoose Model
```

---

## Data Models

### 1. Project Model (`server/models/Project.js`)

**Primary entity** for hackathon projects and M2 program tracking.

#### Core Fields

```javascript
{
  _id: String,                    // Custom ID (e.g., "polkadot-portfolio-tracker-a1b2c3")
  projectName: String,            // Required
  teamMembers: [{
    name: String,                 // Required
    customUrl: String,
    walletAddress: String,        // Polkadot wallet address
    role: String,
    twitter: String,
    github: String,
    linkedin: String
  }],
  description: String,            // Required
  
  // Hackathon metadata
  hackathon: {
    id: String,                   // "synergy-2025", "symmetry-2024"
    name: String,
    endDate: Date,                // Used for M2 week calculations
    eventStartedAt: String
  },
  
  // Project links
  projectRepo: String,            // GitHub repo
  demoUrl: String,                // Demo video URL
  slidesUrl: String,              // Presentation slides
  liveUrl: String,                // Live/production site (e.g. https://kleo.finance/)
  
  // Classification
  techStack: [String],            // Technologies used
  categories: [String],           // Project categories
  
  // Milestones
  milestones: [{
    description: String,
    createdAt: Date,
    createdBy: String,
    updatedAt: Date,
    updatedBy: String
  }],
  
  // Prizes
  bountyPrize: [{
    name: String,                 // Prize track name
    amount: Number,               // Prize amount in USD
    hackathonWonAtId: String
  }],
  
  // Payments
  donationAddress: String,        // Payout wallet address
  projectState: String,           // Project lifecycle state
  bountiesProcessed: Boolean,     // Payment completion flag
  
  // M2 Incubator Program
  m2Status: String,               // 'building' | 'under_review' | 'completed'
  m2Agreement: {
    mentorName: String,
    agreedDate: Date,
    agreedFeatures: [String],     // Max 500 chars each
    documentation: [String],      // Max 500 chars each
    successCriteria: String,      // Max 2000 chars
    lastUpdatedBy: String,        // 'team' | 'admin'
    lastUpdatedDate: Date
  },
  
  // Final submission (required for under_review/completed)
  finalSubmission: {
    repoUrl: String,              // Required if m2Status = under_review/completed
    demoUrl: String,              // Required
    docsUrl: String,              // Required
    summary: String,              // 10-1000 chars, Required
    submittedDate: Date,
    submittedBy: String
  },
  
  // Admin feedback
  changesRequested: {
    feedback: String,
    requestedBy: String,
    requestedDate: Date
  },
  
  // Completion tracking
  completionDate: Date,
  submittedDate: Date,
  
  // Payment records
  totalPaid: [{
    milestone: String,            // 'M1' | 'M2' | 'BOUNTY'
    amount: Number,
    currency: String,             // 'USDC' | 'DOT'
    transactionProof: String,     // URL to transaction proof
    bountyName: String,           // For BOUNTY: name from bountyPrize
    paidDate: Date                // When payment was made
  }],
  
  // Timestamps (auto-generated)
  updatedAt: Date
}
```

#### Important Notes
- **Custom ID Generation**: Uses `generateId(projectName)` from `api/utils/id.js`
- **Virtual Field**: `id` is exposed as alias for `_id` in JSON responses
- **Validation**: Conditional required fields based on `m2Status`
- **M2 Timeline**: Week calculations based on `hackathon.endDate`

---

### 2. MultisigTransaction Model (`server/models/MultisigTransaction.js`)

**Tracks multi-signature transactions** for on-chain payments.

#### Core Fields

```javascript
{
  _id: String,                    // Auto-generated
  
  // Transaction data
  callData: String,               // Hex-encoded call data
  callHash: String,               // Hash of call data
  
  // Multisig config
  threshold: Number,              // Approvals needed
  signatories: [String],          // All signatory addresses (sorted)
  
  // Metadata
  transactionType: String,        // 'transfer' | 'payment' | 'batch' | 'other'
  description: String,
  
  // Payment details
  recipients: [String],           // Recipient addresses
  amounts: [String],              // Amounts in plancks (BigInt as string)
  amountsFormatted: [String],     // Human-readable (e.g., "0.1 DOT")
  totalAmount: String,
  totalAmountFormatted: String,
  batchSize: Number,              // Default: 1
  
  // Blockchain
  network: String,                // 'testnet' | 'mainnet'
  blockNumber: Number,
  extrinsicIndex: Number,
  timepoint: {
    height: Number,
    index: Number
  },
  
  // Status
  status: String,                 // 'pending' | 'approved' | 'executed' | 'cancelled' | 'expired'
  
  // Approvals
  approvals: [{
    signerAddress: String,
    txHash: String,
    timestamp: Date,
    action: String                // 'initiated' | 'approved' | 'executed'
  }],
  
  // Execution
  executionTxHash: String,
  executionBlockHash: String,
  executedAt: Date,
  executedBy: String,
  
  // Timestamps
  createdAt: Date,
  updatedAt: Date,
  expiresAt: Date,
  
  // Metadata
  initiatedBy: String,
  notes: String
}
```

#### Important Methods
- `createTransaction(data)`: Static method to create new transaction
- `addApproval(signerAddress, txHash, action)`: Add approval and auto-update status
- `markExecuted(txHash, blockHash, executedBy)`: Mark as executed
- `hasApproved(signerAddress)`: Check if signer already approved
- `getRemainingSigners()`: Get addresses that haven't approved

---

## API Structure

### Base Configuration

**Base URL**: `http://localhost:2000/api` (dev) or production URL  
**CORS**: Configured for `localhost:3000`, `localhost:5173`, `localhost:8080`, production domains  
**Content-Type**: `application/json`  
**Auth Header**: `x-siws-auth` (Base64-encoded SIWS payload)

---

### Endpoints (`/api/m2-program`)

All project-related endpoints are under `/api/m2-program`.  
Legacy alias: `/api/projects` (backwards compatibility, to be removed).

#### Public (Read-Only)

```
GET /api/m2-program
GET /api/m2-program/:projectId
```

**Query Parameters** (GET all projects):
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `search`: Search term (project name, description)
- `projectState`: Filter by state
- `hackathonId`: Filter by hackathon
- `winnersOnly`: Boolean, filter winners only
- `sortBy`: Field to sort by
- `sortOrder`: 'asc' | 'desc'

**Response Format**:
```json
{
  "status": "success",
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 84,
    "count": 10,
    "totalPages": 9
  }
}
```

---

#### Protected (Requires Auth)

All protected endpoints require `x-siws-auth` header.

**Admin Only**:
```
POST   /api/m2-program                        # Create project
POST   /api/m2-program/:projectId/confirm-payment
POST   /api/m2-program/test-payment           # Admin test
POST   /api/m2-program/dev-test-payment       # Dev only (no auth)
```

**Team Member or Admin**:
```
PATCH  /api/m2-program/:projectId             # Update project
POST   /api/m2-program/:projectId/team        # Replace team members
PATCH  /api/m2-program/:projectId/m2-agreement
PATCH  /api/m2-program/:projectId/payout-address
POST   /api/m2-program/:projectId/submit-m2
```

---

### Authentication Flow

1. **Client**: Signs SIWS message with Polkadot wallet
2. **Client**: Encodes `{ message, signature, address }` as Base64
3. **Client**: Sends in `x-siws-auth` header
4. **Server**: Decodes, verifies signature with `@talismn/siws`
5. **Server**: Validates statement, domain, and authorization
6. **Server**: Grants access based on role (admin or team member)

---

## Authentication System

### Sign-In With Substrate (SIWS)

**Library**: `@talismn/siws` v1.0.0

#### Valid Statements

The SIWS message must contain one of these statements:
- "Submit milestone deliverables for Stadium"
- "Update team members for project on Stadium"
- "Update project details for project on Stadium"
- "Register team address for Stadium"
- "Perform administrative action on Stadium"
- "Sign in to Stadium"
- Pattern matches like: `"Update team members for [project name] on Stadium"`

#### Authorization Levels

**1. Admin (Multisig Signers)**  
Wallet addresses configured in `server/config/polkadot-config.js` as multisig signatories.

**2. Team Members**  
Users whose wallet address matches one in `project.teamMembers[].walletAddress`.

**3. Public**  
Read-only access to project data.

#### Middleware

- `requireAdmin`: Checks if signer is authorized multisig signer
- `requireTeamMemberOrAdmin`: Checks if signer is admin OR team member of the project
- `requireProjectWriteAccess`: (Legacy) Similar to `requireTeamMemberOrAdmin`

#### Configuration

Environment variables:
- `EXPECTED_DOMAIN`: Domain to validate in SIWS message (default: 'localhost')
- `DISABLE_SIWS_DOMAIN_CHECK`: Set to 'true' to skip domain validation

---

## Client Architecture

### Technology

- **React 18.3.1** with TypeScript
- **Vite** for fast dev server and building
- **React Router DOM** for client-side routing
- **TanStack Query** for data fetching and caching
- **Radix UI** for accessible components
- **Tailwind CSS** for styling
- **Polkadot.js** for wallet integration

### Key Files

**Entry Point**: `client/src/main.tsx`  
**Router**: `client/src/App.tsx`  
**API Client**: `client/src/lib/api.ts`  
**Polkadot Config**: `client/src/lib/polkadot-config.ts`  
**SIWS Utils**: `client/src/lib/siwsUtils.ts`

### Pages

```
/                       # HomePage - Landing page
/past-projects          # PastProjects - Historical hackathon projects
/m2-program             # M2ProgramPage - M2 program overview
/m2-program/:id         # ProjectDetailsPage - Individual project
/admin                  # AdminPage - Admin dashboard
/winners/:hackathon     # WinnersPage - Winners by hackathon
```

### State Management

**React Query** is used for:
- Fetching projects (`useQuery`)
- Updating projects (`useMutation`)
- Optimistic updates
- Cache invalidation

No global state library (Redux, Zustand) is used.

### Wallet Integration

1. **Extension Detection**: Check for Polkadot.js extension
2. **Account Selection**: User chooses account from extension
3. **Message Signing**: Sign SIWS message with selected account
4. **Store Auth**: Base64-encoded payload stored in memory (not localStorage for security)
5. **Attach Header**: Send `x-siws-auth` with API requests

---

## Key Features

### 1. M2 Incubator Program

**6-week mentorship program** for winning teams.

#### Timeline
- **Weeks 1-4**: Team builds, can edit M2 roadmap
- **Weeks 5-6**: Submission window opens
- **After Week 6**: Deadline passed, admin reviews

Week calculation: `Math.floor((now - hackathon.endDate) / 7 days) + 1`

#### Workflow
1. Team wins hackathon → Invited to M2 program
2. Team agrees to M2 terms → `m2Status = 'building'`
3. Team updates roadmap (Weeks 1-4 only)
4. Team submits deliverables (Weeks 5-6)
5. Admin reviews → `m2Status = 'under_review'`
6. Admin approves → `m2Status = 'completed'` + payment

#### Rules
- **Roadmap editing**: Only in Weeks 1-4 (admins can always edit)
- **Submission window**: Only Weeks 5-6 (admins can always submit)
- **Required fields**: finalSubmission must be complete for under_review/completed

---

### 2. On-Chain Payments

**Multisig payments** on Polkadot for M1/M2 milestones.

#### Flow
1. Admin initiates payment via admin panel
2. Creates `MultisigTransaction` with payment details
3. First signer approves → Transaction pending
4. Other signers approve until threshold reached
5. Last signer executes → On-chain transaction
6. Record saved in `project.totalPaid[]`

#### Payment Types
- **M1 (Milestone 1)**: Hackathon prize payout
- **M2 (Milestone 2)**: M2 program completion payout

#### Currencies
- USDC (stablecoin)
- DOT (native token)

---

### 3. Project Filtering & Search

**Features**:
- Full-text search (project name, description)
- Filter by hackathon (Synergy 2025, Symmetry 2024)
- Filter by project state
- Filter winners only
- Sort by various fields

**Implementation**:
- Server-side filtering via Mongoose queries
- Pagination for performance
- Results cached on client with React Query

---

## Migration Strategy

### Why Migrate to Supabase?

1. **PostgreSQL**: More robust relational data model
2. **Real-time**: Built-in real-time subscriptions
3. **Auth**: Built-in authentication (can integrate with SIWS)
4. **Storage**: File storage for images, documents
5. **Edge Functions**: Serverless functions at the edge
6. **Dashboard**: Admin UI for database management
7. **Cost**: Generous free tier

---

### Migration Approach

#### Phase 1: Database Schema

**Create Supabase tables**:

```sql
-- Projects table
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  project_name TEXT NOT NULL,
  description TEXT NOT NULL,
  project_repo TEXT,
  demo_url TEXT,
  slides_url TEXT,
  live_url TEXT,
  tech_stack TEXT[],
  categories TEXT[],
  donation_address TEXT,
  project_state TEXT NOT NULL,
  bounties_processed BOOLEAN DEFAULT FALSE,
  
  -- Hackathon (embedded)
  hackathon_id TEXT NOT NULL,
  hackathon_name TEXT NOT NULL,
  hackathon_end_date TIMESTAMPTZ NOT NULL,
  hackathon_event_started_at TEXT,
  
  -- M2 fields
  m2_status TEXT CHECK (m2_status IN ('building', 'under_review', 'completed')),
  m2_mentor_name TEXT,
  m2_agreed_date TIMESTAMPTZ,
  m2_agreed_features TEXT[],
  m2_documentation TEXT[],
  m2_success_criteria TEXT,
  m2_last_updated_by TEXT CHECK (m2_last_updated_by IN ('team', 'admin')),
  m2_last_updated_date TIMESTAMPTZ,
  
  -- Final submission
  final_submission_repo_url TEXT,
  final_submission_demo_url TEXT,
  final_submission_docs_url TEXT,
  final_submission_summary TEXT,
  final_submission_submitted_date TIMESTAMPTZ,
  final_submission_submitted_by TEXT,
  
  -- Changes requested
  changes_requested_feedback TEXT,
  changes_requested_by TEXT,
  changes_requested_date TIMESTAMPTZ,
  
  -- Completion
  completion_date TIMESTAMPTZ,
  submitted_date TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members (related table)
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  wallet_address TEXT,
  custom_url TEXT,
  role TEXT,
  twitter TEXT,
  github TEXT,
  linkedin TEXT
);

-- Bounty prizes (related table)
CREATE TABLE bounty_prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  hackathon_won_at_id TEXT NOT NULL
);

-- Milestones (related table)
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  created_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  updated_by TEXT NOT NULL
);

-- Payments (related table)
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone TEXT NOT NULL CHECK (milestone IN ('M1', 'M2', 'BOUNTY')),
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('USDC', 'DOT')),
  transaction_proof TEXT NOT NULL,
  bounty_name TEXT,
  paid_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multisig transactions
CREATE TABLE multisig_transactions (
  id TEXT PRIMARY KEY,
  call_data TEXT NOT NULL,
  call_hash TEXT NOT NULL,
  threshold INTEGER NOT NULL,
  signatories TEXT[] NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('transfer', 'payment', 'batch', 'other')),
  description TEXT NOT NULL,
  recipients TEXT[],
  amounts TEXT[],
  amounts_formatted TEXT[],
  total_amount TEXT,
  total_amount_formatted TEXT,
  batch_size INTEGER DEFAULT 1,
  network TEXT NOT NULL CHECK (network IN ('testnet', 'mainnet')),
  block_number INTEGER,
  extrinsic_index INTEGER,
  timepoint_height INTEGER,
  timepoint_index INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'executed', 'cancelled', 'expired')),
  execution_tx_hash TEXT,
  execution_block_hash TEXT,
  executed_at TIMESTAMPTZ,
  executed_by TEXT,
  initiated_by TEXT NOT NULL,
  notes TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Multisig approvals (related table)
CREATE TABLE multisig_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL REFERENCES multisig_transactions(id) ON DELETE CASCADE,
  signer_address TEXT NOT NULL,
  tx_hash TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action TEXT NOT NULL CHECK (action IN ('initiated', 'approved', 'executed'))
);

-- Indexes
CREATE INDEX idx_projects_m2_status ON projects(m2_status);
CREATE INDEX idx_projects_hackathon_id ON projects(hackathon_id);
CREATE INDEX idx_projects_project_state ON projects(project_state);
CREATE INDEX idx_team_members_project_id ON team_members(project_id);
CREATE INDEX idx_team_members_wallet_address ON team_members(wallet_address);
CREATE INDEX idx_multisig_transactions_status ON multisig_transactions(status, network);
CREATE INDEX idx_multisig_transactions_call_hash ON multisig_transactions(call_hash);
CREATE INDEX idx_multisig_approvals_transaction_id ON multisig_approvals(transaction_id);
CREATE INDEX idx_multisig_approvals_signer_address ON multisig_approvals(signer_address);
```

---

#### Phase 2: Authentication

**Option A: Keep SIWS + Supabase Auth**
- Use Supabase for session management
- Keep SIWS for wallet-based auth
- Create Supabase user on first SIWS sign-in

**Option B: Full Supabase Auth**
- Migrate to Supabase Auth
- Add custom provider for Polkadot wallets
- Use RLS (Row Level Security) policies

**Recommendation**: Option A for minimal changes.

---

#### Phase 3: Backend Migration

**Replace**:
- `mongoose` → `@supabase/supabase-js`
- MongoDB queries → Supabase queries
- Mongoose models → Supabase tables

**Update**:
- `server/db.js` → Initialize Supabase client
- `server/api/repositories/*` → Use Supabase queries
- Environment variables → Add Supabase credentials

**Keep**:
- Express server structure
- Authentication middleware (adapt for Supabase)
- API routes (same endpoints)
- Business logic in controllers/services

---

#### Phase 4: Frontend Migration

**Changes needed**:
- Update `client/src/lib/api.ts` to use Supabase client (optional)
- OR keep REST API approach (no changes needed)
- Add real-time subscriptions for live updates (optional)

**No changes needed**:
- React components
- UI components
- Routing
- State management

---

#### Phase 5: Data Migration

**Script to migrate existing data**:

```javascript
// scripts/migrate-to-supabase.js
import mongoose from 'mongoose';
import { createClient } from '@supabase/supabase-js';
import Project from './models/Project.js';
import MultisigTransaction from './models/MultisigTransaction.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 1. Fetch all projects from MongoDB
const projects = await Project.find({});

// 2. Transform and insert into Supabase
for (const project of projects) {
  // Insert project
  const { data: projectData } = await supabase
    .from('projects')
    .insert({
      id: project._id,
      project_name: project.projectName,
      // ... map all fields
    });
  
  // Insert team members
  for (const member of project.teamMembers) {
    await supabase.from('team_members').insert({
      project_id: project._id,
      name: member.name,
      wallet_address: member.walletAddress,
      // ...
    });
  }
  
  // Insert bounty prizes, milestones, payments
  // ...
}

// 3. Migrate multisig transactions
// ...
```

---

## Environment Configuration

### Server (.env)

```bash
# Database
MONGO_URI=mongodb+srv://...                        # Current MongoDB URI
SUPABASE_URL=https://xxx.supabase.co               # New Supabase URL
SUPABASE_ANON_KEY=xxx                              # New Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=xxx                      # New Supabase service role key

# Server
PORT=2000
NODE_ENV=development                                # development | production

# SIWS Authentication
EXPECTED_DOMAIN=localhost                           # Domain for SIWS verification
DISABLE_SIWS_DOMAIN_CHECK=true                      # Skip domain check in dev

# Polkadot Network
POLKADOT_NETWORK=testnet                            # testnet | mainnet
MULTISIG_ADDRESS=xxx                                # Multisig wallet address
AUTHORIZED_SIGNERS=addr1,addr2,addr3                # Comma-separated signer addresses
```

### Client (.env)

```bash
# API
VITE_API_BASE_URL=http://localhost:2000/api         # Backend API URL

# Supabase (if using direct client)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx

# Polkadot
VITE_POLKADOT_NETWORK=testnet
```

---

## Key Implementation Details

### 1. Custom ID Generation

Projects use readable IDs like `"polkadot-portfolio-tracker-a1b2c3"`.

**File**: `server/api/utils/id.js`

```javascript
export function generateId(name) {
  const sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const random = crypto.randomBytes(3).toString('hex');
  return `${sanitized}-${random}`;
}
```

**Migration**: Keep same logic for Supabase.

---

### 2. M2 Week Calculation

**Logic**: `Math.floor((now - hackathon.endDate) / (7 * 24 * 60 * 60 * 1000)) + 1`

**File**: `server/api/utils/dateHelpers.js` or inline in services

**Migration**: Move to PostgreSQL function or keep in backend.

---

### 3. Conditional Validation

Mongoose uses `required: function() { return this.m2Status === 'under_review'; }`

**Migration**: Use PostgreSQL constraints or backend validation.

```sql
ALTER TABLE projects
ADD CONSTRAINT check_final_submission
CHECK (
  (m2_status IN ('under_review', 'completed') AND 
   final_submission_repo_url IS NOT NULL AND
   final_submission_demo_url IS NOT NULL AND
   final_submission_docs_url IS NOT NULL AND
   final_submission_summary IS NOT NULL)
  OR
  (m2_status NOT IN ('under_review', 'completed'))
);
```

---

## Migration Checklist

### Pre-Migration
- [ ] Set up Supabase project
- [ ] Create database schema (SQL above)
- [ ] Add RLS policies (optional)
- [ ] Set up environment variables
- [ ] Test Supabase connection

### Backend Migration
- [ ] Install `@supabase/supabase-js`
- [ ] Replace `db.js` with Supabase client
- [ ] Update repositories to use Supabase queries
- [ ] Adapt authentication middleware
- [ ] Update services for new queries
- [ ] Test all API endpoints

### Data Migration
- [ ] Export data from MongoDB
- [ ] Transform data for PostgreSQL
- [ ] Import data into Supabase
- [ ] Verify data integrity
- [ ] Update IDs/references

### Frontend Updates (if needed)
- [ ] Update API client for Supabase (if using direct client)
- [ ] Add real-time subscriptions (optional)
- [ ] Test all user flows
- [ ] Update authentication flow

### Testing
- [ ] Test SIWS authentication
- [ ] Test project CRUD operations
- [ ] Test M2 workflow (roadmap edit, submission)
- [ ] Test admin operations (approve, payment)
- [ ] Test multisig transactions
- [ ] Test pagination and filtering
- [ ] Load testing

### Deployment
- [ ] Update environment variables in production
- [ ] Deploy backend with Supabase
- [ ] Deploy frontend
- [ ] Monitor for errors
- [ ] Rollback plan ready

---

## Additional Resources

### Documentation Files
- `server/scripts/README.md` - Database scripts documentation
- `client/README.md` - Frontend documentation
- `server/NETWORK_SETUP.md` - Polkadot network setup
- `client/NETWORK_SETUP.md` - Wallet integration guide

### Key Scripts
- `server/scripts/migration.js` - MongoDB data migration script (adapt for Supabase)
- `server/scripts/seed-dev.js` - Development seed script

### Configuration Files
- `server/config/polkadot-config.js` - Polkadot network and multisig config
- `client/src/lib/polkadot-config.ts` - Frontend Polkadot config

---

## Questions to Address

When implementing Supabase migration, consider:

1. **Do we keep the Express backend?** (Recommended: Yes)
   - Pros: Minimal changes, keep business logic centralized
   - Cons: Extra layer vs direct Supabase client

2. **Do we use Supabase Auth or keep SIWS only?**
   - SIWS only: Simpler, wallet-native
   - Supabase Auth + SIWS: Better session management, RLS support

3. **Do we use Supabase client on frontend?**
   - Yes: Real-time updates, simpler queries
   - No: Keep REST API, consistent architecture

4. **How do we handle file uploads?** (Currently none)
   - Supabase Storage for project images, documents
   - S3/CloudFlare for larger files

5. **Do we use Supabase Edge Functions?**
   - For webhook handlers, scheduled tasks
   - Or keep in Express

---

## Summary

**Stadium** is a React + Express + MongoDB app for hackathon project showcase and M2 incubator program management with Polkadot blockchain integration.

**Migration to Supabase** should:
1. Replace MongoDB with PostgreSQL (Supabase)
2. Keep Express backend for business logic
3. Maintain SIWS authentication
4. Preserve API contract for minimal frontend changes
5. Use Supabase features (real-time, storage) where beneficial

**Key Challenges**:
- Migrating nested documents (team members, prizes) to relational tables
- Adapting conditional validation from Mongoose to PostgreSQL
- Preserving custom ID generation
- Maintaining SIWS authentication flow
- Ensuring M2 timeline calculations remain accurate

**Key Opportunities**:
- Better querying with PostgreSQL
- Real-time updates for admin dashboard
- File storage for project documents
- Row-level security for data protection
- Better performance at scale

---

**Last Updated**: 2025-01-11  
**Version**: 1.0.0


