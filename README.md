# AtomQuest — Goal Setting & Tracking Portal

> **Hackathon 1.0** | Full-stack web portal for organisational goal lifecycle management.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 17 + Angular Material + Apache ECharts |
| Backend | Spring Boot 3.x (Java 21) + Spring Security + OAuth2 |
| Database | PostgreSQL (Neon) |
| Auth | Google OAuth2 + JWT |
| Export | Apache POI (Excel) |
| Email | Spring Mail + SMTP |
| Charts | Apache ECharts |
| Docs | Swagger / OpenAPI 3 |
| Infra | Docker Compose (local) |
| CI/CD | GitHub Actions |
| Hosting | Vercel (frontend) · Render (backend) · Neon (DB) |

---

## Monorepo Structure

```
atomquest/
├── frontend/           # Angular application
├── backend/            # Spring Boot application
├── docs/               # Architecture diagrams & API docs
├── .github/workflows/  # CI/CD pipelines
├── docker-compose.yml  # Local dev orchestration
├── .env.example        # Environment variable template
└── README.md
```

---

## Quick Start (Local)

### Prerequisites
- Java 21+
- Node 20+ / npm 10+
- Docker & Docker Compose
- Angular CLI (`npm i -g @angular/cli`)

### 1. Clone & configure environment
```bash
git clone https://github.com/your-org/atomquest.git
cd atomquest
cp .env.example .env
# Fill in your values in .env
```

### 2. Start all services with Docker Compose
```bash
docker-compose up -d
```

### 3. Run backend (dev mode)
```bash
cd backend
./mvnw spring-boot:run
# API: http://localhost:8080
# Swagger: http://localhost:8080/swagger-ui.html
```

### 4. Run frontend (dev mode)
```bash
cd frontend
npm install
ng serve
# App: http://localhost:4200
```

---

## User Roles

| Role | Access |
|---|---|
| **Employee** | Create/submit goals, log quarterly achievements |
| **Manager (L1)** | Approve/reject goals, conduct check-ins, view team dashboard |
| **Admin / HR** | Cycle management, org hierarchy, audit logs, unlock goals |

---

## Demo Credentials
See `.env.example` — seed data creates these on first run:

| Role | Email |
|---|---|
| Admin | admin@company.com |
| Manager | manager@company.com |
| Employee | employee@company.com |

---

## Architecture Diagram
See [`docs/architecture.md`](docs/architecture.md)

---

## API Documentation
Swagger UI: `http://localhost:8080/swagger-ui.html`
OpenAPI JSON: `http://localhost:8080/v3/api-docs`

---

## Deployment

| Service | Platform | Guide |
|---|---|---|
| Frontend | Vercel | `docs/deploy-frontend.md` |
| Backend | Render | `docs/deploy-backend.md` |
| Database | Neon PostgreSQL | `docs/deploy-database.md` |

---

## License
MIT
