# Deploy Database → Neon PostgreSQL

## Why Neon?
Neon provides serverless PostgreSQL with a generous free tier, branching for dev/prod isolation, and built-in connection pooling — ideal for hackathon projects.

---

## Setup Steps

### 1. Create a Neon Project
1. Sign up at https://neon.tech
2. Create a new project → name it `atomquest`
3. Select region closest to your Render backend (e.g. `us-east-1`)

### 2. Get Connection String
From the Neon dashboard → **Connection Details**:
```
postgresql://username:password@ep-xxxxx.us-east-1.aws.neon.tech/atomquest?sslmode=require
```

Convert this to JDBC format for Spring Boot:
```
jdbc:postgresql://ep-xxxxx.us-east-1.aws.neon.tech/atomquest?sslmode=require
```

### 3. Set Environment Variables
In Render (or your `.env`):
```
DATABASE_URL=jdbc:postgresql://ep-xxxxx.us-east-1.aws.neon.tech/atomquest?sslmode=require
DATABASE_USERNAME=your_neon_username
DATABASE_PASSWORD=your_neon_password
```

---

## Flyway Runs Automatically
When the Spring Boot app starts, Flyway will:
1. Detect `db/migration/` classpath resources
2. Run `V1__init_schema.sql` → creates all tables and ENUMs
3. Run `V2__seed_demo_users.sql` → inserts demo accounts

No manual SQL setup required.

---

## Branching (Recommended)
Neon supports database branching — create a `dev` branch for development and `main` for production:

```bash
# Install Neon CLI
npm i -g neonctl

neonctl auth
neonctl branches create --name dev --project-id your-project-id
```

Use the `dev` branch connection string in your local `.env`.

---

## Connection Pooling
For production, use Neon's built-in **PgBouncer** pooler URL:
```
jdbc:postgresql://ep-xxxxx-pooler.us-east-1.aws.neon.tech/atomquest?sslmode=require
```

Update `DATABASE_URL` on Render to the pooler URL.

---

## Monitoring
- Neon Dashboard → **Monitoring** tab → query counts, CPU, storage
- Check slow queries: Neon → **Query** tab → run `pg_stat_statements`

## Backup
Neon performs automatic backups. To manually export:
```bash
pg_dump "postgresql://user:pass@host/atomquest?sslmode=require" \
  -f atomquest_backup_$(date +%Y%m%d).sql
```
