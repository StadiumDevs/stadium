# Hackathonia API Documentation

This document provides instructions on how to authenticate with and use the Hackathonia project API.

## Authentication

The API uses Sign-In with Substrate (SIWS) to protect certain endpoints (creating and updating projects). To access these routes, you must provide a valid, Base64-encoded SIWS signature in the `x-siws-auth` request header.

Only wallets listed in the `ADMIN_WALLETS` environment variable in the `.env` file are authorized to use these protected endpoints.

### Generating the `x-siws-auth` Header

A utility page has been created in the frontend to simplify the process of generating this header.

1.  **Start the Frontend and Backend Servers**:
    -   Backend: `npm start` in the `server` directory.
    -   Frontend: `npm run dev` in the `clientv2` directory.

2.  **Navigate to the Auth Test Page**:
    -   Open your browser and go to `http://localhost:8080/auth-test`.

3.  **Connect Your Wallet**:
    -   Click the "Connect Wallet" button and approve the connection in your Polkadot{.js} browser extension (e.g., Talisman).

4.  **Select an Admin Account**:
    -   From the dropdown menu, choose an account whose address is present in the `ADMIN_WALLETS` list in your `.env` file.

5.  **Generate the Signature**:
    -   Click the "Generate Signature" button.

6.  **Copy the Header Value**:
    -   A Base64 encoded string will appear on the page. Copy this entire string. This is the value for your `x-siws-auth` header.

## API Testing with REST Client

The `server/rest-docs/` directory contains `.http` files that can be used with the [VS Code REST Client extension](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) for easy API testing.

-   `projects.http`: Covers general user journeys like discovering projects.
-   `projects-test.http`: Provides an end-to-end test for a project's lifecycle (create, read, update).
-   `auth-test.http`: Specifically for testing the authentication middleware.

To use them, open the file in VS Code and click the "Send Request" link that appears above each request. You can set the `@authToken` variable at the top of the files with the value you generated from the auth test page.

---

## API Endpoints

All endpoints are available under the `/api` prefix.

### Projects

#### `GET /api/projects`

Retrieves a list of all projects. Supports filtering and sorting.

-   **Method**: `GET`
-   **Authentication**: None

**Query Parameters:**

| Parameter           | Type    | Description                                                                                               | Example                                        |
| ------------------- | ------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `search`            | String  | Case-insensitive search for projects by their `projectName`.                                              | `?search=My%20Project`                         |
| `projectState`      | String  | Filters projects by a specific state (e.g., `Hackathon Submission`, `Milestone Delivered`, `Abandoned`).     | `?projectState=Milestone%20Delivered`          |
| `bountiesProcessed` | Boolean | Filters projects based on whether their bounties have been processed. Can be `true` or `false`.             | `?bountiesProcessed=true`                      |
| `sortBy`            | String  | The field to sort by. Currently supports `updatedAt`. Defaults to `updatedAt`.                            | `?sortBy=updatedAt`                            |
| `sortOrder`         | String  | The order for sorting. Can be `asc` (ascending) or `desc` (descending). Defaults to `desc`.                 | `?sortOrder=asc`                               |

**Example Request:**

```http
GET http://localhost:2000/api/projects?projectState=Milestone%20Delivered&sortOrder=asc
```

---

#### `POST /api/projects`

Creates a new project.

-   **Method**: `POST`
-   **Authentication**: **Required (Admin)**
-   **Headers**:
    -   `Content-Type: application/json`
    -   `x-siws-auth: <Your-Base64-Encoded-Signature>`

**Example Body:**

```json
{
  "projectName": "My Awesome New Project",
  "teamMembers": [{
    "name": "Admin Lead",
    "walletAddress": "5DAAnuX2qToh7223z2J5tV6a2UqXG1nS1g4G2g1eZA1Lz9aU"
  }],
  "description": "This is a test project created via the API.",
  "hackathon": {
    "id": "test-hack-2025",
    "name": "Test Hack 2025",
    "endDate": "2025-12-31T23:59:59Z"
  },
  "projectRepo": "https://github.com/test/repo",
  "projectState": "Hackathon Submission"
}
```

---

#### `GET /api/projects/:projectId`

Retrieves a single project by its unique ID.

-   **Method**: `GET`
-   **Authentication**: None

**Example Request:**

```http
GET http://localhost:2000/api/projects/my-awesome-new-project-a1b2c3
```

---

#### `PATCH /api/projects/:projectId`

Updates an existing project.

-   **Method**: `PATCH`
-   **Authentication**: **Required (Admin or Project Team Member)**
-   **Headers**:
    -   `Content-Type: application/json`
    -   `x-siws-auth: <Your-Base64-Encoded-Signature>`

A user is considered a team member if their wallet address is listed in the `teamMembers` array of the project.

**Example Body:**

You can send any subset of the project's fields to update.

```json
{
  "projectState": "Milestone Delivered",
  "bountiesProcessed": true,
  "description": "An updated description for the project."
}
```

**Example Request:**

```http
PATCH http://localhost:2000/api/projects/my-awesome-new-project-a1b2c3
```

---

#### `POST /api/projects/:projectId/team`

Replaces the team members array for a project.

-   **Method**: `POST`
-   **Authentication**: **Required (Admin or Project Team Member)**
-   **Headers**:
    -   `Content-Type: application/json`
    -   `x-siws-auth: <Your-Base64-Encoded-Signature>`

**Example Body:**

```json
{
  "teamMembers": [
    {
      "name": "Alice Johnson",
      "walletAddress": "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      "role": "Lead Developer",
      "github": "alicejohnson"
    },
    {
      "name": "Bob Smith",
      "walletAddress": "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
      "role": "Backend Developer"
    }
  ]
}
```

**Example Request:**

```http
POST http://localhost:2000/api/projects/my-awesome-new-project-a1b2c3/team
```

---

#### `PATCH /api/projects/:projectId/m2-agreement`

Updates the M2 Agreement (roadmap) for a project in the M2 Accelerator Program.

-   **Method**: `PATCH`
-   **Authentication**: **Required (Admin or Project Team Member)**
-   **Headers**:
    -   `Content-Type: application/json`
    -   `x-siws-auth: <Your-Base64-Encoded-Signature>`

**Notes:**
- Team members can only edit the M2 Agreement during Weeks 1-4 of the accelerator program (frontend enforces this)
- Automatically adds `lastUpdatedBy: 'team'` and `lastUpdatedDate` timestamp
- Preserves existing fields like `agreedDate` and `mentorName`

**Example Body:**

```json
{
  "agreedFeatures": [
    "Multi-chain portfolio aggregation with real-time updates",
    "Historical performance charts with multiple time ranges",
    "Transaction history explorer with advanced filtering",
    "Portfolio analytics dashboard with ROI calculations"
  ],
  "documentation": [
    "Complete README with setup instructions",
    "API documentation for all endpoints",
    "Architecture diagram showing system components",
    "User guide with screenshots"
  ],
  "successCriteria": "Application must track assets across 20+ parachains with <5 second latency, support 50+ tokens, handle 1000+ transactions without performance issues, and provide 99%+ accurate portfolio calculations."
}
```

**Example Request:**

```http
PATCH http://localhost:2000/api/projects/polkadot-portfolio-tracker-a1b2c3/m2-agreement
Content-Type: application/json
x-siws-auth: <Your-Base64-Signature>

{
  "agreedFeatures": ["Feature 1", "Feature 2"],
  "documentation": ["Doc 1", "Doc 2"],
  "successCriteria": "Success criteria text"
}
```

**Response:**

```json
{
  "status": "success",
  "data": {
    "_id": "polkadot-portfolio-tracker-a1b2c3",
    "projectName": "Polkadot Portfolio Tracker",
    "m2Agreement": {
      "agreedDate": "2025-10-28T10:00:00.000Z",
      "agreedFeatures": ["Feature 1", "Feature 2"],
      "documentation": ["Doc 1", "Doc 2"],
      "successCriteria": "Success criteria text",
      "lastUpdatedBy": "team",
      "lastUpdatedDate": "2025-11-08T12:30:00.000Z"
    }
  }
}
```

---

### Health Check

#### `GET /api/health`

A simple health check endpoint to verify that the server is running.

-   **Method**: `GET`
-   **Authentication**: None

**Example Response:**

```json
{
  "status": "UP"
}
```