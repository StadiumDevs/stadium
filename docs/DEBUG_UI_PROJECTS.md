# Troubleshooting: No projects in the UI

Use these steps to find why the UI shows 0 projects.

---

## 1. Check the API from your machine

In a terminal:

```bash
curl -s "https://stadium-production-996a.up.railway.app/api/m2-program?limit=2"
```

You should see JSON with `"status":"success"` and a `"data"` array of projects. If you see that, the API and DB are fine; the issue is between the browser and the API.

---

## 2. Check from the browser (same origin as your app)

Open your **deployed app** (e.g. `https://client-xxx.sachalanskys-projects.vercel.app`), then open **DevTools** (F12 or right‑click → Inspect).

### Console

Paste and run:

```javascript
fetch('https://stadium-production-996a.up.railway.app/api/m2-program?limit=2')
  .then(r => r.json())
  .then(d => console.log('API OK', d.data?.length, 'projects', d))
  .catch(e => console.error('API error', e));
```

- If you see **"API OK 2 projects"** (or similar): the API is reachable and CORS is OK. The problem may be the app’s request URL or how it reads the response.
- If you see **"API error"** or a CORS message: the request from this origin is being blocked (CORS or network).

### Network tab

1. Open the **Network** tab.
2. Reload the page.
3. Filter by **Fetch/XHR** (or search for `m2-program`).
4. Find the request to `m2-program` or `projects`.

Check:

| What to check | What it means |
|---------------|----------------|
| **No request to m2-program** | The app isn’t calling the API (wrong base URL or code path). |
| **Request URL** | Should be `https://stadium-production-996a.up.railway.app/api/m2-program?limit=...`. If it’s `undefined` or `localhost`, the client’s API base URL is wrong. |
| **Status (e.g. 200, 403, 0)** | 200 = OK. 403 = forbidden (e.g. CORS). 0 or (failed) = CORS or network. |
| **Response body** | Open the request → **Response**. You should see `{"status":"success","data":[...]}`. |

---

## 3. Typical causes and fixes

| Symptom | Cause | Fix |
|--------|--------|-----|
| Request URL is `undefined/projects` or `null/...` | `VITE_API_BASE_URL` not set (or wrong) at **build** time. | In **Vercel** → Project → Settings → Environment Variables, set `VITE_API_BASE_URL` = `https://stadium-production-996a.up.railway.app/api` for **Production**, then **redeploy**. |
| Status 0 or CORS error in console | Server not allowing your app’s origin. | Server should allow `https://*.vercel.app`. Redeploy the **Railway** server so the latest CORS config is live. |
| Status 200 but UI still shows 0 projects | Response shape might not match what the UI expects. | In Network tab, open the `m2-program` request → Response. Confirm it has `data` as an **array**. If it’s an object or missing, the backend response shape is wrong. |
| Toast: "Failed to load projects" | Request threw (network, CORS, or non‑2xx). | Check Console for the logged error and Network for the failing request (see above). |

---

## 4. Confirm production env (Vercel)

1. Vercel Dashboard → your project → **Settings** → **Environment Variables**.
2. Ensure **Production** has:
   - `VITE_API_BASE_URL` = `https://stadium-production-996a.up.railway.app/api`
3. **Redeploy** the production deployment (Deployments → … → Redeploy) so the new value is baked into the build.

---

## 5. Quick checklist

- [ ] `curl` to `/api/m2-program?limit=2` returns JSON with `data` array.
- [ ] In the app’s DevTools, the `m2-program` request URL starts with `https://stadium-production-996a.up.railway.app/api`.
- [ ] That request has status **200** and response body has `"data": [ ... ]`.
- [ ] Vercel Production has `VITE_API_BASE_URL` set and you redeployed after setting it.

If all of the above are true and the UI still shows 0 projects, the bug is in how the client reads `response.data` (e.g. wrong key or type). Check the code that does `response?.data` and the actual response shape in the Network tab.
