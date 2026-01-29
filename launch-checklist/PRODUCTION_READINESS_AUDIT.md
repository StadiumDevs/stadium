# Production Readiness Audit - Stadium App

> Comprehensive checklist of issues, improvements, and cleanup needed before production launch

**Generated:** 2025-01-11  
**Status:** Pre-Production Review

---

## 🚨 Critical Issues (Must Fix Before Launch)

### 1. Mock Data Still Active
**Location:** `client/src/lib/api.ts`
```typescript
// TEMPORARY: Mock mode flag - set to true when server is down
const USE_MOCK_DATA = false;
```
**Action Required:**
- ✅ Verify `USE_MOCK_DATA = false` is set
- ⚠️ Remove all mock data logic entirely for production
- ⚠️ Remove mock imports and conditional branches

**Files to Clean:**
- `client/src/lib/mockApi.ts` - Delete or move to `/tests`
- `client/src/lib/mockData.ts` - Delete or move to `/tests`
- `client/src/lib/mockWinners.ts` - Delete or move to `/tests`
- `client/src/lib/api.ts` - Remove lines 3-4, 78-103, 123-138, 164-203, 216-265, 295-328, 339-378, 389-410, 436-486

---

### 2. Development-Only Routes Exposed
**Location:** `server/api/routes/m2-program.routes.js:30-32`
```javascript
// --- Development-only test payment (no auth) ---
if (process.env.NODE_ENV === 'development') {
  router.post('/dev-test-payment', projectController.testPayment);
}
```
**Action Required:**
- ✅ This is properly guarded
- ⚠️ **Ensure `NODE_ENV=production` is set in production environment**
- ⚠️ Add explicit test to verify this route is NOT available in production

---

### 3. Missing Environment Variable Examples
**Action Required:**
- ❌ No `.env.example` file exists in root, client, or server
- Create `.env.example` files with all required variables (without values)

**Create:** `server/.env.example`
```bash
# Database
MONGO_URI=

# Server
PORT=2000
NODE_ENV=production

# Authentication
EXPECTED_DOMAIN=
DISABLE_SIWS_DOMAIN_CHECK=false

# Polkadot Network
NETWORK_ENV=mainnet
MULTISIG_ADDRESS=
AUTHORIZED_SIGNERS=
```

**Create:** `client/.env.example`
```bash
# API
VITE_API_BASE_URL=

# Polkadot
VITE_NETWORK_ENV=mainnet
```

---

### 4. Hardcoded Localhost References
**Locations:**
- `server/server.js:13` - CORS allowedOrigins includes localhost URLs

**Action Required:**
- ✅ Already using environment check (`NODE_ENV === 'production'`)
- ⚠️ Verify production CORS only allows production domains
- ⚠️ Add production domain to allowed origins

---

### 5. Console.log Statements in Production Code
**Found in 16 client files:**
- `client/src/pages/HomePage.tsx`
- `client/src/pages/M2ProgramPage.tsx`
- `client/src/pages/AdminPage.tsx`
- `client/src/pages/PastProjects.tsx`
- `client/src/lib/api.ts`
- And 11 more...

**Action Required:**
- Remove all `console.log` statements
- Replace with proper logging service if needed
- Keep only critical `console.error` for production errors

**Recommended Tool:**
```bash
# Find all console.log in client
grep -r "console\.log" client/src --exclude-dir=node_modules

# Consider using a logger like winston or pino for server
```

---

## ⚠️ High Priority Issues

### 6. TODOs in Production Code

**Location:** `server/server.js:29`
```javascript
// TODO: Remove after frontend migration is stable
app.use('/api/projects', m2ProgramRoutes);
```
**Action:** 
- ✅ Keep backward compatibility route OR
- ❌ Remove if all clients are updated to use `/api/m2-program`

**Location:** `server/api/repositories/project.repository.js:91`
```javascript
// TODO: Add team member sub route for simple adding without resubmitting the member data
```
**Action:** 
- Implement feature OR
- Remove TODO if not needed for launch

**Location:** `server/scripts/migration.js:154`
```javascript
// TODO: find a solution for this admin panel should trigger an update and abandon the project if no milestone 2 is delivered
```
**Action:** 
- Document as known limitation OR
- Implement admin panel feature

**Location:** `client/src/pages/M2ProgramPage.tsx:236`
```javascript
// TODO: Filter by current user's mentored teams when auth is implemented
```
**Action:**
- Implement feature OR
- Remove TODO if not needed for launch

---

### 7. Duplicate Components (High Similarity)

**EditTeamModal.tsx vs UpdateTeamModal.tsx**
- Both handle team member editing
- Similar validation logic
- Different form approaches (react-hook-form vs manual state)

**Action Required:**
- Consolidate into single component
- Use `EditTeamModal.tsx` (more robust with zod validation)
- Remove or deprecate `UpdateTeamModal.tsx`
- Update all imports

**Consolidation Impact:**
- Reduces bundle size
- Easier maintenance
- Consistent UX

---

### 8. Unused/Development Files

**Test/Documentation Files in Production:**
- `server/rest-docs/` - HTTP test files (3 files)
- Should be in `.gitignore` or clearly marked as dev-only

**Action Required:**
```bash
# Add to server/.gitignore
/rest-docs/
```

**Migration Data:**
- `server/migration-data/*` - Already in `.gitignore` ✅
- Ensure no sensitive data is committed

---

### 9. Missing Error Handling

**Location:** Various API endpoints
- Some endpoints return generic errors without proper user messages
- Error details exposed in development mode

**Action Required:**
- Review all controller error responses
- Ensure no sensitive info leaks in production
- Add proper error codes and messages
- Consider using error monitoring (Sentry, etc.)

---

## 📋 Medium Priority Issues

### 10. Missing Production Optimizations

**Client Build:**
```json
// client/package.json
"build": "tsc && vite build"
```

**Add Production Optimizations:**
```json
"build": "tsc && vite build --mode production",
"build:analyze": "vite build --mode production && vite-bundle-visualizer"
```

**Action Required:**
- Add bundle size analysis
- Enable code splitting
- Optimize images
- Add service worker for PWA (optional)

---

### 11. No Health Check for Frontend

**Current:** Only backend has health check at `/api/health`

**Action Required:**
- Add frontend build info endpoint
- Add version endpoint
- Consider status page for monitoring

---

### 12. Missing Rate Limiting

**Location:** `server/server.js`
- No rate limiting middleware

**Action Required:**
```bash
npm install express-rate-limit
```

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Apply to all routes
app.use('/api/', limiter);

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20
});
app.use('/api/m2-program/:projectId/submit-m2', authLimiter);
```

---

### 13. No Request Body Size Limits

**Current:** `express.json()` without size limits

**Action Required:**
```javascript
app.use(express.json({ limit: '10mb' })); // Adjust as needed
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

---

### 14. Missing Security Headers

**Action Required:**
```bash
npm install helmet
```

```javascript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for some Polkadot.js features
}));
```

---

### 15. No Database Connection Retry Logic

**Location:** `server/db.js`
```javascript
await mongoose.connect(process.env.MONGO_URI);
```

**Action Required:**
```javascript
const connectWithRetry = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      console.log("✅ Connected to MongoDB Atlas");
      return;
    } catch (err) {
      console.error(`❌ Mongoose connection attempt ${i + 1} failed:`, err);
      if (i < retries - 1) {
        console.log(`Retrying in 5 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        throw err;
      }
    }
  }
};
```

---

## 🔧 Code Quality Issues

### 16. Inconsistent Error Handling Patterns

**Found:** Mix of try-catch, promises, async/await
**Action:** Standardize error handling across codebase

---

### 17. No TypeScript on Server

**Current:** Server uses JavaScript
**Consideration:** Migrate to TypeScript for type safety
**Priority:** Low (post-launch)

---

### 18. Missing Input Sanitization

**Action Required:**
- Add input sanitization for all user inputs
- Prevent XSS, SQL injection, NoSQL injection
- Consider using `express-validator` or `joi`

```bash
npm install express-validator
```

---

### 19. No API Versioning

**Current:** `/api/m2-program`
**Consideration:** Add versioning for future API changes
**Example:** `/api/v1/m2-program`

---

### 20. Missing API Documentation

**Action Required:**
- Add OpenAPI/Swagger documentation
- Document all endpoints, request/response formats
- Add example requests

```bash
npm install swagger-ui-express swagger-jsdoc
```

---

## 📊 Performance Issues

### 21. No Database Indexes

**Check:** Verify MongoDB indexes are created
**Location:** `server/models/Project.js`, `MultisigTransaction.js`

**Action Required:**
```javascript
// Add indexes for common queries
ProjectSchema.index({ 'hackathon.id': 1 });
ProjectSchema.index({ m2Status: 1 });
ProjectSchema.index({ projectState: 1 });
ProjectSchema.index({ 'teamMembers.walletAddress': 1 });
ProjectSchema.index({ projectName: 'text', description: 'text' }); // Text search
```

---

### 22. No Query Result Caching

**Action Required:**
- Add Redis for caching frequent queries
- Cache project lists, hackathon data
- Invalidate cache on updates

---

### 23. Large Bundle Size (Client)

**Action Required:**
- Analyze bundle with `vite-bundle-visualizer`
- Lazy load routes with React.lazy
- Code split large libraries (Polkadot.js)
- Tree shake unused Radix UI components

---

## 🔐 Security Issues

### 24. No HTTPS Enforcement

**Action Required:**
- Ensure HTTPS in production
- Add redirect from HTTP to HTTPS
- Set secure cookie flags

```javascript
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

---

### 25. Exposed Error Stack Traces

**Location:** `server/api/controllers/project.controller.js`
```javascript
details: process.env.NODE_ENV === 'development' ? error.message : undefined
```

**Action:** ✅ Already handled, verify `NODE_ENV=production` is set

---

### 26. No CSRF Protection

**Action Required:**
- Add CSRF tokens for state-changing operations
- Or rely on SameSite cookies + custom headers

---

### 27. No Request Logging in Production

**Current:** Basic console.log logging
**Action Required:**
- Add structured logging (Winston, Pino)
- Log to file or external service
- Include request ID, user, timestamp
- Rotate logs

---

## 📝 Documentation Issues

### 28. Missing Production Deployment Guide

**Action Required:**
- Add `DEPLOYMENT.md` with:
  - Environment setup
  - CI/CD pipeline
  - Monitoring setup
  - Rollback procedures
  - Scaling considerations

---

### 29. Missing API Documentation

**Current:** Basic `docs/API_DOCS.md`
**Action Required:**
- Generate OpenAPI spec
- Add Postman collection
- Document authentication flow
- Add example requests/responses

---

### 30. No Troubleshooting Guide

**Action Required:**
- Common errors and solutions
- Debug mode instructions
- Log locations
- Health check endpoints

---

## 🧪 Testing Issues

### 31. No Automated Tests

**Action Required:**
- Add unit tests for critical business logic
- Add integration tests for API endpoints
- Add E2E tests for critical user flows

**Recommended:**
- Backend: Jest + Supertest
- Frontend: Vitest + Testing Library

---

### 32. No Load Testing

**Action Required:**
- Test API under load
- Test database performance
- Test concurrent user scenarios
- Identify bottlenecks

**Tools:**
- Apache JMeter
- Artillery
- k6

---

## 🚀 Deployment Checklist

### Environment Variables
- [ ] Create production `.env` files
- [ ] Set `NODE_ENV=production`
- [ ] Configure production MongoDB URI
- [ ] Set production CORS domains
- [ ] Configure Polkadot network (mainnet)
- [ ] Set authorized signer addresses
- [ ] Configure SIWS domain

### Security
- [ ] Enable HTTPS
- [ ] Add rate limiting
- [ ] Add helmet security headers
- [ ] Enable CORS only for production domains
- [ ] Remove development routes
- [ ] Remove console.log statements
- [ ] Add input validation
- [ ] Add CSRF protection

### Performance
- [ ] Add database indexes
- [ ] Enable gzip compression
- [ ] Add caching headers
- [ ] Optimize bundle size
- [ ] Add CDN for static assets
- [ ] Enable HTTP/2

### Monitoring
- [ ] Add error tracking (Sentry)
- [ ] Add APM (New Relic, DataDog)
- [ ] Add uptime monitoring
- [ ] Set up log aggregation
- [ ] Add alerting rules
- [ ] Create status page

### Database
- [ ] Backup strategy
- [ ] Connection pooling
- [ ] Index optimization
- [ ] Query optimization
- [ ] Sharding strategy (if needed)

### Code Cleanup
- [ ] Remove mock data files
- [ ] Remove TODO comments
- [ ] Remove unused dependencies
- [ ] Remove duplicate components
- [ ] Remove development scripts
- [ ] Remove test files from build

---

## 📦 Files to Remove/Move

### Delete from Production Build:
```
client/src/lib/mockApi.ts
client/src/lib/mockData.ts
client/src/lib/mockWinners.ts
server/rest-docs/*
```

### Move to Tests Directory:
```
server/scripts/generate-test-account.js
server/scripts/test-transaction.js
```

### Consolidate/Remove:
```
client/src/components/UpdateTeamModal.tsx (duplicate of EditTeamModal.tsx)
```

---

## 🎯 Priority Order

### P0 (Before Launch - Critical):
1. Remove mock data logic
2. Verify `NODE_ENV=production`
3. Create `.env.example` files
4. Remove console.log statements
5. Add rate limiting
6. Add security headers
7. Enable HTTPS enforcement

### P1 (First Week Post-Launch):
8. Consolidate duplicate components
9. Resolve TODOs
10. Add error monitoring
11. Add database indexes
12. Add request logging
13. Add bundle size optimization

### P2 (First Month):
14. Add automated tests
15. Add API documentation
16. Add health checks
17. Implement caching
18. Add load testing

### P3 (Post-Launch Improvements):
19. Migrate server to TypeScript
20. Add API versioning
21. Add advanced monitoring
22. Performance optimizations

---

## 📊 Estimated Work

- **Critical Issues (P0):** 8-16 hours
- **High Priority (P1):** 16-24 hours
- **Medium Priority (P2):** 24-40 hours
- **Low Priority (P3):** 40+ hours

**Minimum for Production Launch:** P0 + P1 (24-40 hours)

---

## ✅ Success Criteria

### Before Launch:
- [ ] All P0 issues resolved
- [ ] All console.log removed
- [ ] Mock data removed
- [ ] Security headers enabled
- [ ] Rate limiting active
- [ ] HTTPS enforced
- [ ] Error monitoring live
- [ ] Backups configured
- [ ] Monitoring dashboards ready
- [ ] Rollback plan documented

### Post-Launch:
- [ ] 99.9% uptime
- [ ] <2s API response time
- [ ] <3s page load time
- [ ] No security vulnerabilities
- [ ] Positive user feedback

---

**Last Updated:** 2025-01-11  
**Next Review:** Before production deployment

