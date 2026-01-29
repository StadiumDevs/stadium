# Pre-Launch Quick Checklist

> Essential tasks before deploying to production

**Target:** Production Ready in 1-2 days

---

## ⚡ Immediate Actions (2-4 hours)

### 1. Remove Mock Data
```bash
# Delete these files
rm client/src/lib/mockApi.ts
rm client/src/lib/mockData.ts
rm client/src/lib/mockWinners.ts

# Remove mock logic from api.ts
# Edit client/src/lib/api.ts:
# - Remove lines 3-4 (USE_MOCK_DATA)
# - Remove all "if (USE_MOCK_DATA)" blocks
```

### 2. Remove Console.log
```bash
# Find all console.log in client
grep -rn "console\.log" client/src --exclude-dir=node_modules

# Replace or remove manually
# Keep only critical console.error for production
```

### 3. Create Environment Examples
```bash
# Create server/.env.example
cat > server/.env.example << 'EOF'
MONGO_URI=
PORT=2000
NODE_ENV=production
EXPECTED_DOMAIN=
DISABLE_SIWS_DOMAIN_CHECK=false
NETWORK_ENV=mainnet
MULTISIG_ADDRESS=
AUTHORIZED_SIGNERS=
EOF

# Create client/.env.example
cat > client/.env.example << 'EOF'
VITE_API_BASE_URL=
VITE_NETWORK_ENV=mainnet
EOF
```

### 4. Add Security Headers
```bash
cd server
npm install helmet express-rate-limit

# Add to server.js (after CORS):
```

```javascript
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.'
});
app.use('/api/', limiter);

// Stricter auth rate limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20
});
app.use('/api/m2-program/:projectId/submit-m2', authLimiter);
app.use('/api/m2-program/:projectId/m2-agreement', authLimiter);
```

### 5. Add Request Size Limits
```javascript
// In server.js
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

### 6. Add HTTPS Redirect
```javascript
// In server.js, before routes
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

## 📝 Configuration (1 hour)

### 7. Production Environment Variables

**Server `.env`:**
```bash
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/database
PORT=2000
NODE_ENV=production
EXPECTED_DOMAIN=yourdomain.com
DISABLE_SIWS_DOMAIN_CHECK=false
NETWORK_ENV=mainnet
MULTISIG_ADDRESS=<your-multisig-address>
AUTHORIZED_SIGNERS=<addr1>,<addr2>,<addr3>
```

**Client `.env`:**
```bash
VITE_API_BASE_URL=https://api.yourdomain.com/api
VITE_NETWORK_ENV=mainnet
```

### 8. Update CORS
```javascript
// server/server.js
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://yourdomain.com', 'https://www.yourdomain.com']
  : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'];
```

---

## 🗑️ Cleanup (30 minutes)

### 9. Remove Development Files
```bash
# Add to server/.gitignore
echo "/rest-docs/" >> server/.gitignore

# Verify migration-data is ignored
grep "migration-data" server/.gitignore
```

### 10. Remove Duplicate Component
```bash
# Option A: Delete UpdateTeamModal
rm client/src/components/UpdateTeamModal.tsx

# Option B: Or keep and consolidate later (mark as TODO)
```

---

## 🔍 Verification (30 minutes)

### 11. Build Test
```bash
# Client
cd client
npm run build
# Verify no errors

# Server
cd ../server
npm run start
# Verify starts correctly
```

### 12. Environment Check
```bash
# Verify NODE_ENV is checked everywhere
grep -r "NODE_ENV.*production" server/

# Should find: server.js, routes, controllers
```

### 13. Route Testing
```bash
# Test health check
curl https://api.yourdomain.com/api/health

# Test public endpoint
curl https://api.yourdomain.com/api/m2-program?limit=1

# Verify dev-only routes are disabled
curl -X POST https://api.yourdomain.com/api/m2-program/dev-test-payment
# Should return 404 or Not Found
```

---

## 📊 Monitoring Setup (1 hour)

### 14. Add Error Monitoring (Optional but Recommended)
```bash
npm install @sentry/node @sentry/react
```

**Server:**
```javascript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// After all middleware, before routes
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// After all routes, before error handlers
app.use(Sentry.Handlers.errorHandler());
```

**Client:**
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  integrations: [new Sentry.BrowserTracing()],
  tracesSampleRate: 1.0,
});
```

### 15. Add Database Indexes
```javascript
// Add to server/models/Project.js after schema definition
ProjectSchema.index({ 'hackathon.id': 1 });
ProjectSchema.index({ m2Status: 1 });
ProjectSchema.index({ projectState: 1 });
ProjectSchema.index({ 'teamMembers.walletAddress': 1 });
ProjectSchema.index({ projectName: 'text', description: 'text' });

// Add to MultisigTransaction.js (already has indexes)
// Verify indexes are created
```

---

## ✅ Final Checklist

Before deploying:

- [ ] Mock data removed
- [ ] Console.log removed (except errors)
- [ ] `.env.example` files created
- [ ] Security headers added (helmet)
- [ ] Rate limiting added
- [ ] Request size limits added
- [ ] HTTPS redirect added (if applicable)
- [ ] Production environment variables set
- [ ] `NODE_ENV=production` set
- [ ] CORS configured for production domain
- [ ] Development routes disabled
- [ ] Build tested successfully
- [ ] API endpoints tested
- [ ] Database indexes added
- [ ] Error monitoring configured
- [ ] Backups configured
- [ ] Monitoring dashboard ready

---

## 🚀 Deploy Commands

```bash
# 1. Build client
cd client
npm run build

# 2. Deploy client (example: Vercel)
vercel --prod

# 3. Deploy server (example: Railway/Render)
# Push to main branch or use platform-specific deploy command

# 4. Verify deployment
curl https://yourdomain.com/
curl https://api.yourdomain.com/api/health

# 5. Check logs for errors
# Use platform logging tools
```

---

## 🆘 Rollback Plan

If issues arise:

1. **Client Issues:**
   ```bash
   vercel rollback
   ```

2. **Server Issues:**
   - Revert to previous deployment
   - Check platform-specific rollback

3. **Database Issues:**
   - MongoDB Atlas has point-in-time recovery
   - Restore from backup if needed

4. **Emergency Contact:**
   - Have team member on call
   - Document emergency procedures

---

## 📊 Post-Launch Monitoring

**First Hour:**
- Monitor error rates every 5 minutes
- Check API response times
- Verify no 500 errors
- Test critical user flows

**First Day:**
- Monitor hourly
- Check database performance
- Review logs for errors
- Gather user feedback

**First Week:**
- Daily monitoring
- Performance analysis
- User feedback review
- Iterate on issues

---

**Estimated Total Time:** 5-7 hours  
**Priority:** Complete before production launch  
**Last Updated:** 2025-01-11

