# Admin Wallet Not Working in Production

## Problem

When trying to connect an admin wallet on the production site (`stadium-nu.vercel.app/admin`), you see:
- "Connection failed: Admin account not found"
- Your wallet addresses are listed
- Expected admin addresses shows empty or doesn't match

## Root Cause

The `VITE_ADMIN_ADDRESSES` environment variable is **not set** in your Vercel production environment, or it's set incorrectly.

**Important:** Vite environment variables are baked into the build at **build time**, not runtime. This means:
- Changing `.env` locally doesn't affect production
- You must set it in **Vercel Dashboard** → **Environment Variables**
- You must **redeploy** after changing it

## Solution

### Step 1: Get Your Wallet Address

1. Connect your Polkadot wallet extension
2. Copy one of your wallet addresses (the one you want to use as admin)
3. Example: `5GE6ptWSLAgSgoDzBDsFgZi1cauUCmEpEgtddyphkL5GGQcF`

### Step 2: Set Environment Variable in Vercel

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project (the client app)
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:
   - **Name:** `VITE_ADMIN_ADDRESSES`
   - **Value:** Your wallet address (comma-separated if multiple)
     ```
     5GE6ptWSLAgSgoDzBDsFgZi1cauUCmEpEgtddyphkL5GGQcF
     ```
   - **Environment:** Select **Production** (and Preview if you want)
5. Click **Save**

### Step 3: Redeploy

**Critical:** After changing environment variables, you must redeploy:

1. Go to **Deployments** tab
2. Find the latest deployment
3. Click **⋯** (three dots) → **Redeploy**
4. Wait for the build to complete (1-2 minutes)

**OR** trigger a new deployment by:
- Pushing a commit to your main branch (if Vercel auto-deploys)
- Or running `vercel --prod` from CLI

### Step 4: Verify

1. Open your production site: `https://stadium-nu.vercel.app/admin`
2. Open browser console (F12)
3. Run: `import.meta.env.VITE_ADMIN_ADDRESSES`
4. It should show your wallet address
5. Try connecting your wallet again

## Multiple Admin Addresses

To add multiple admin addresses, separate them with commas (no spaces):

```
VITE_ADMIN_ADDRESSES=5GE6ptWSLAgSgoDzBDsFgZi1cauUCmEpEgtddyphkL5GGQcF,5Di7WRCjywLjV53hVjdBekPo2mLtyZAxQYenvW1vKfMNCyo9
```

## Troubleshooting

### Still not working after redeploy?

1. **Hard refresh** your browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. **Clear browser cache** for the site
3. **Check console** for `VITE_ADMIN_ADDRESSES` value
4. **Verify** the address matches exactly (case-insensitive, but check for typos)

### Address format

- Polkadot addresses are long strings (48+ characters)
- Make sure there are no extra spaces or newlines
- The address should match exactly what your wallet extension shows

### Check Vercel build logs

1. Go to **Deployments** → latest deployment → **Build Logs**
2. Search for `VITE_ADMIN_ADDRESSES`
3. Verify it's being set correctly during build

## Local Development

For local development, set it in `client/.env`:

```bash
VITE_ADMIN_ADDRESSES=5GE6ptWSLAgSgoDzBDsFgZi1cauUCmEpEgtddyphkL5GGQcF
```

Then restart your dev server (`npm run dev`).

## Related Files

- `client/src/lib/constants.ts` - Reads `VITE_ADMIN_ADDRESSES` and normalizes addresses
- `client/src/pages/AdminPage.tsx` - Admin authentication logic
- `client/.env.example` - Example env file (not used in production)
