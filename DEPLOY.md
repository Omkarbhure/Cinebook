# CineBook — Deployment Guide

## ✅ What's already done
- MongoDB Atlas connected and all data migrated (90 movies, 132 theaters, 2070 shows, 24 users, 25 bookings)
- CORS updated to accept Vercel URLs
- `render.yaml` created for Render deployment
- `vercel.json` created for Vercel deployment
- `.gitignore` updated to protect secrets

---

## Step 1 — Push to GitHub

```bash
cd C:\Users\ASUS\OneDrive\Desktop\Cinebook
git add .
git commit -m "feat: production deployment setup"
git push
```

---

## Step 2 — Deploy Backend on Render

1. Go to https://render.com → Sign up / Login with GitHub
2. Click **New** → **Web Service**
3. Connect your GitHub repo → select the `Cinebook` repo
4. Settings:
   - **Name:** `cinebook-api`
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add these **Environment Variables** (get values from your local `server/.env`):

| Key | Where to find value |
|-----|---------------------|
| `NODE_ENV` | `production` |
| `MONGO_URI` | Your Atlas connection string |
| `JWT_SECRET` | From server/.env |
| `JWT_EXPIRE` | `7d` |
| `EMAIL_USER` | From server/.env |
| `EMAIL_PASS` | From server/.env |
| `GOOGLE_CLIENT_ID` | From server/.env |
| `GOOGLE_CLIENT_SECRET` | From server/.env |
| `TWILIO_ACCOUNT_SID` | From server/.env |
| `TWILIO_AUTH_TOKEN` | From server/.env |
| `TWILIO_VERIFY_SID` | From server/.env |
| `CLOUDINARY_CLOUD_NAME` | From server/.env |
| `CLOUDINARY_API_KEY` | From server/.env |
| `CLOUDINARY_API_SECRET` | From server/.env |
| `CLIENT_URL` | *(set after Vercel deploy — your Vercel URL)* |
| `TMDB_API_KEY` | From server/.env |

6. Click **Create Web Service**
7. Wait for deploy — copy your Render URL e.g. `https://cinebook-api.onrender.com`

---

## Step 3 — Deploy Frontend on Vercel

1. Go to https://vercel.com → Sign up / Login with GitHub
2. Click **Add New** → **Project**
3. Import your GitHub repo
4. Settings:
   - **Root Directory:** `client`
   - **Framework:** Next.js (auto-detected)
5. Add these **Environment Variables**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://cinebook-api.onrender.com/api` *(your Render URL)* |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` *(your Vercel URL)* |

6. Click **Deploy**
7. Copy your Vercel URL e.g. `https://cinebook.vercel.app`

---

## Step 4 — Update CLIENT_URL on Render

1. Go back to Render → your cinebook-api service → **Environment**
2. Update `CLIENT_URL` to your Vercel URL: `https://cinebook.vercel.app`
3. Click **Save Changes** — Render will auto-redeploy

---

## Step 5 — Update Google OAuth (if using Google login)

1. Go to https://console.cloud.google.com
2. APIs & Services → Credentials → your OAuth client
3. Add to **Authorized JavaScript origins:**
   - `https://cinebook.vercel.app`
4. Add to **Authorized redirect URIs:**
   - `https://cinebook.vercel.app`
5. Save

---

## ✅ Done! Your app is live.

- Frontend: `https://cinebook.vercel.app`
- Backend API: `https://cinebook-api.onrender.com`
- Admin login: `admin` / `admin123`

> **Note:** Render free tier sleeps after 15 min of inactivity. First request after sleep takes ~30 seconds to wake up.
