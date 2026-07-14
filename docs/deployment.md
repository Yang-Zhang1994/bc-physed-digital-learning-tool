# Deployment — BC PhysEd (SmartChef-style)

Same split as SmartChef: **Vite React on Vercel** + **Express on Render** + **MongoDB Atlas** (you already use Atlas locally).

## Architecture

| Component | Host | Notes |
| --- | --- | --- |
| React client | Vercel | Root Directory = `client`, Build = `npm run build`, Output = `dist` |
| Express API | Render | Use `render.yaml` Blueprint or manual web service (`rootDir: server`) |
| Database | MongoDB Atlas | Set `MONGO_URI` on the API service |

## 1. Deploy API (Render)

1. Push this repo to GitHub (ensure `.env` is **not** committed).
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → select this repo  
   **or** **New Web Service** → Root Directory `server`  
   - Build: `npm install && npm run build`  
   - Start: `npm start`  
   - Health check: `/health`
3. Environment variables on the service:
   - `MONGO_URI` — Atlas connection string (add `/bc-physed` database name in the path if missing)
   - `JWT_SECRET` — long random string
   - `CLIENT_ORIGIN` — your Vercel URL, e.g. `https://bc-physed.vercel.app` (update after step 2)
4. Deploy and copy the public URL, e.g. `https://bc-physed-api.onrender.com`
5. Confirm: `curl https://YOUR-API.onrender.com/health` → `{"ok":true}`

Free Render services sleep after idle; first request can take 30–60s.

## 2. Deploy client (Vercel)

1. [Vercel](https://vercel.com) → **Add New Project** → import this GitHub repo.
2. **Root Directory:** `client`
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`
5. Environment variable (**Production**):
   - `VITE_API_URL` = `https://YOUR-API.onrender.com` (no trailing slash)
6. Deploy. Copy the Vercel URL.
7. Go back to Render → set `CLIENT_ORIGIN` to that Vercel URL → **Manual Deploy** so CORS matches.

## 3. Smoke test

1. Open the Vercel site.
2. Register a **student** → choose pet → open game map → enter a module.
3. Register a **teacher** → `/teacher` dashboard loads.

## Local vs production

| | Local | Production |
| --- | --- | --- |
| Client API | `client/.env` → `VITE_API_URL=http://localhost:5000` | Vercel `VITE_API_URL` → Render |
| Server CORS | `CLIENT_ORIGIN=http://localhost:5173` | `CLIENT_ORIGIN=https://….vercel.app` |

## Security

- Never commit `server/.env` or `client/.env`.
- If an Atlas password was ever shared in chat/logs, **rotate it** in Atlas and update Render `MONGO_URI`.
