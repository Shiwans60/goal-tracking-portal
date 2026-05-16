# Deploy Frontend → Vercel

## Prerequisites
- Vercel account at https://vercel.com
- Vercel CLI: `npm i -g vercel`
- GitHub repository connected to Vercel

---

## One-time Vercel Project Setup

```bash
cd frontend
vercel login
vercel link        # follow prompts to create/link project
vercel env add VITE_API_BASE_URL          # e.g. https://atomquest-api.onrender.com
vercel env add VITE_GOOGLE_CLIENT_ID      # from Google Cloud Console
```

## Manual Deploy
```bash
cd frontend
npm run build:prod
vercel --prod
```

## GitHub Actions (Automated — runs on every push to main)
Set the following **GitHub Secrets** in your repository settings:

| Secret | Description |
|---|---|
| `VERCEL_TOKEN` | From https://vercel.com/account/tokens |
| `VERCEL_ORG_ID` | From `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID` | From `.vercel/project.json` after `vercel link` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `API_BASE_URL` | Your Render backend URL |

## Vercel Settings (vercel.json)
Create `frontend/vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

## Google OAuth: Authorised Redirect URIs
In Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client:
- Add your Vercel domain: `https://your-app.vercel.app`
- Add: `http://localhost:4200` (for local dev)

## Verification
1. Visit your Vercel URL
2. You should see the AtomQuest login screen
3. Check browser console — no CORS errors
