# Deploy Backend → Render

## Prerequisites
- Render account at https://render.com
- GitHub repository connected to Render
- Neon PostgreSQL database ready (see `deploy-database.md`)

---

## Create a Web Service on Render

1. **New → Web Service** → connect your GitHub repo
2. **Root Directory**: `backend`
3. **Runtime**: Docker
4. **Dockerfile path**: `backend/Dockerfile`
5. **Instance Type**: Free (Hobby) or Starter for production

## Environment Variables on Render Dashboard

Set all of the following under **Environment → Environment Variables**:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `jdbc:postgresql://<neon-host>/<dbname>?sslmode=require` |
| `DATABASE_USERNAME` | Your Neon username |
| `DATABASE_PASSWORD` | Your Neon password |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | `https://your-api.onrender.com/login/oauth2/code/google` |
| `JWT_SECRET` | Long random 256-bit string (e.g. `openssl rand -hex 32`) |
| `JWT_EXPIRY_MS` | `86400000` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USERNAME` | Your Gmail address |
| `SMTP_PASSWORD` | Gmail App Password (not your login password) |
| `MAIL_FROM` | `noreply@yourcompany.com` |
| `FRONTEND_URL` | `https://your-app.vercel.app` |
| `CORS_ALLOWED_ORIGINS` | `https://your-app.vercel.app` |
| `SPRING_PROFILES_ACTIVE` | `prod` |

## Deploy Hook (for GitHub Actions)
1. Render Dashboard → Service → **Settings → Deploy Hooks**
2. Create a hook and copy the URL
3. Add it as `RENDER_DEPLOY_HOOK_URL` in GitHub Secrets

## Google OAuth: Authorised Redirect URIs
In Google Cloud Console → OAuth Client → Authorised redirect URIs:
- Add: `https://your-api.onrender.com/login/oauth2/code/google`
- Add: `http://localhost:8080/login/oauth2/code/google` (local dev)

## Health Check
Render will automatically use `/api/health` if configured:
- **Health Check Path**: `/api/health`

## Verification
```bash
curl https://your-api.onrender.com/api/health
# Expected: {"status":"UP","service":"AtomQuest Goal Tracker API",...}

curl https://your-api.onrender.com/swagger-ui.html
# Should redirect to Swagger UI
```

## Logs
```bash
# Via Render Dashboard → Logs tab, or:
render logs --service your-service-name
```
