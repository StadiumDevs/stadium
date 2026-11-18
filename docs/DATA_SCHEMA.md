# Blockspace Stadium Data Schema Documentation

## Overview
This document describes the complete data schema for the Blockspace Stadium application, based on frontend expectations and mock data structures.

## Core Project Schema

### Base Fields (Always Present)

```typescript
{
  id: string;                    // Unique project identifier (generated from projectName)
  projectName: string;            // Required: Project title/name
  description: string;            // Required: Project description
  teamMembers: Array<{            // Required: Team members array
    name: string;                 // Required: Team member name
    customUrl?: string;           // Optional: Custom URL for team member
    walletAddress?: string;       // Optional: Polkadot wallet address (SS58 format)
    role?: string;               // Optional: Team member role (e.g., "Lead Developer")
    twitter?: string;            // Optional: Twitter handle/URL
    github?: string;             // Optional: GitHub username/URL
    linkedin?: string;           // Optional: LinkedIn profile URL
  }>;
  hackathon: {                   // Required: Hackathon information
    id: string;                  // Required: Hackathon identifier (e.g., "synergy-2025")
    name: string;                // Required: Hackathon name (e.g., "Synergy 2025")
    endDate: Date | string;     // Required: Hackathon end date (ISO format)
    eventStartedAt?: string;     // Optional: Event start date (ISO format)
  };
  projectRepo?: string;          // Optional: GitHub repository URL
  demoUrl?: string;             // Optional: Demo video/application URL
  slidesUrl?: string;           // Optional: Presentation slides URL
  techStack: string[];          // Required: Array of technology stack items
  categories?: string[];        // Optional: Project categories (e.g., ["DeFi", "NFT"])
  donationAddress?: string;     // Optional: Donation/payout wallet address (SS58 format)
  projectState: string;         // Required: Current project state
                                    // Values: "Hackathon Submission" | "Bounty Payout" | "Milestone Delivered" | "Abandoned"
  bountiesProcessed: boolean;   // Required: Flag indicating if bounties have been paid/processed
  bountyPrize?: Array<{          // Optional: Award/bounty information
    name: string;                // Required: Award name (e.g., "Best Polkadot Track Winner")
    amount: number;              // Required: Award amount in USD/currency
    hackathonWonAtId: string;    // Required: Hackathon ID where award was won
  }>;
  milestones?: Array<{           // Optional: Project milestones
    description: string;        // Required: Milestone description
    createdAt: Date | string;  // Required: Creation timestamp
    createdBy: string;          // Required: Creator identifier
    updatedAt: Date | string;   // Required: Last update timestamp
    updatedBy: string;          // Required: Updater identifier
  }>;
}
```

### M2 Incubator Program Fields (Optional)

```typescript
{
  m2Status?: 'building' | 'under_review' | 'completed';
  // Status of Milestone 2 in the incubator program
  
  m2Agreement?: {                // Optional: Milestone 2 agreement details
    mentorName: string;          // Required: Mentor name
    agreedDate: string;          // Required: Agreement date (ISO format)
    agreedFeatures: string[];    // Required: Array of agreed features
    documentation?: string[];   // Optional: Required documentation items
    successCriteria?: string;   // Optional: Success criteria description
  };
  
  finalSubmission?: {            // Optional: Final M2 submission
    repoUrl: string;             // Required: Repository URL
    demoUrl: string;             // Required: Demo video/application URL
    docsUrl: string;             // Required: Documentation URL
    summary?: string;            // Optional: Submission summary
    submittedDate: string;       // Required: Submission date (ISO format)
  };
  
  changesRequested?: {          // Optional: Feedback/changes requested
    feedback: string;           // Required: Feedback message
    requestedBy: string;        // Required: Requester identifier
    requestedDate: string;      // Required: Request date (ISO format)
  };
  
  completionDate?: string;       // Optional: M2 completion date (ISO format)
  submittedDate?: string;       // Optional: Initial submission date (ISO format)
  
  totalPaid?: Array<{            // Optional: Payment information for M1 and M2
    milestone: 'M1' | 'M2';     // Required: Milestone identifier
    amount: number;              // Required: Payment amount
    currency: 'USDC' | 'DOT';    // Required: Payment currency
    transactionProof: string;   // Required: URL to transaction proof on Subscan
  }>;
}
```

### Legacy/Deprecated Fields (For Backward Compatibility)

```typescript
{
  teamLead?: string;             // Legacy: Team lead name (use teamMembers[0] instead)
  winner?: string;               // Legacy: Winner information (use bountyPrize instead)
  isWinner?: boolean;           // Legacy: Winner flag (use bountyPrize.length > 0 instead)
}
```

## Field Mapping

### Frontend Type Definitions

**ProjectDetailsPage.tsx** expects:
- `ApiProject` type with all M2 fields
- `teamMembers` array with extended social fields
- `m2Status`, `finalSubmission`, `m2Agreement`, `changesRequested`

**HomePage.tsx** expects:
- `FullProject` type
- `fundingStatus` (optional string)
- `technologies` (alias for `techStack`)
- `completionDate` for M2 graduates
- `submittedDate` for initial submission

**ProjectsPage.tsx** expects:
- `LegacyProject` type (for backward compatibility)
- Mapped from `ApiProject` format

## API Response Format

### Success Response
```typescript
{
  status: "success",
  data: ApiProject | ApiProject[],  // Single project or array
  meta?: {                           // For list endpoints
    total: number;
    count: number;
    limit: number;
    page: number;
  }
}
```

### Error Response
```typescript
{
  status: "error",
  message: string;
}
```

## Migration Notes

1. **API store**: Production project data is in Supabase. Access goes through `server/api/repositories/`.
2. **ID Generation**: Project IDs are generated from `projectName` using `generateId()` utility

## Frontend Mock Data Usage

**Current Mock Data Files**:
- `client/src/lib/mockWinners.ts` - Contains 3 winning projects with M2 data
- `client/src/lib/mockData.ts` - Contains legacy project structure (older format)

**Mock Data Flag**:
- `USE_MOCK_DATA` in `client/src/lib/api.ts` (currently `true`)
- When `true`, API calls return mock data instead of real backend data
- Must be set to `false` to use the real API (Supabase)

## Schema changes

New fields go in Supabase: a migration under `supabase/migrations/` plus the transform in the matching `server/api/repositories/` file. (The offline Mongoose model was removed in #309.)

