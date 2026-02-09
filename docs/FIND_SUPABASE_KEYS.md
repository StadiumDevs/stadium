# How to find your Supabase service_role key

## Steps

1. **Go to [Supabase Dashboard](https://supabase.com/dashboard)** and sign in.

2. **Select your project** ("Stadium" / `hxojfhlrtffcvksxkvwf`).

3. **Open Project Settings**:
   - Click the **⚙️ Settings** icon (gear) in the left sidebar, or
   - Click your project name at the top → **Settings**.

4. **Go to API**:
   - In Settings, click **API** in the left menu.

5. **Find Project API keys**:
   - Scroll to **"Project API keys"**.
   - You’ll see:
     - **`anon` `public`** — public key (don’t use this for server scripts)
     - **`service_role` `secret`** — **this is what you need**

6. **Copy the service_role key**:
   - Click the **👁️ eye icon** next to `service_role` to reveal it.
   - Click **Copy** (or select and copy).
   - ⚠️ **Keep this secret** — it bypasses Row Level Security (RLS).

---

## Your Supabase URLs

Based on your project ID `hxojfhlrtffcvksxkvwf`:

- **Project URL:** `https://hxojfhlrtffcvksxkvwf.supabase.co`
- **API URL (for REST):** `https://hxojfhlrtffcvksxkvwf.supabase.co/rest/v1`
- **Service role key:** (get from Dashboard → Settings → API → service_role secret)

---

## Use in scripts

```bash
export SUPABASE_URL="https://hxojfhlrtffcvksxkvwf.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-from-dashboard"
```

Then run your migration:

```bash
cd server
npm run db:mongo-to-supabase
```

---

## Security note

The **service_role** key has full database access and bypasses RLS. Use it only:
- In server-side scripts (like migrations)
- In your Railway backend (as env var)
- Never expose it in client-side code or public repos
