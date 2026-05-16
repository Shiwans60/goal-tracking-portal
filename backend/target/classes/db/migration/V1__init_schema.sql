-- ============================================================
-- V1__init_schema.sql
-- AtomQuest Goal Tracker — Base Schema
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ENUMs ────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('ROLE_EMPLOYEE', 'ROLE_MANAGER', 'ROLE_ADMIN');
CREATE TYPE goal_status AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'REWORK');
CREATE TYPE uom_type AS ENUM ('NUMERIC_MIN', 'NUMERIC_MAX', 'PERCENTAGE_MIN', 'PERCENTAGE_MAX', 'TIMELINE', 'ZERO_BASED');
CREATE TYPE goal_progress AS ENUM ('NOT_STARTED', 'ON_TRACK', 'COMPLETED', 'AT_RISK');
CREATE TYPE cycle_status AS ENUM ('UPCOMING', 'ACTIVE', 'CLOSED');
CREATE TYPE quarter AS ENUM ('Q1', 'Q2', 'Q3', 'Q4');

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL UNIQUE,
    name          VARCHAR(255) NOT NULL,
    picture       VARCHAR(500),
    role          user_role   NOT NULL DEFAULT 'ROLE_EMPLOYEE',
    manager_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
    department    VARCHAR(255),
    active        BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_manager ON users(manager_id);
CREATE INDEX idx_users_role    ON users(role);

-- ── Cycles ───────────────────────────────────────────────────
CREATE TABLE cycles (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    year            INTEGER     NOT NULL,
    start_date      DATE        NOT NULL,
    end_date        DATE        NOT NULL,
    status          cycle_status NOT NULL DEFAULT 'UPCOMING',
    goal_open_date  DATE,
    q1_open_date    DATE,
    q2_open_date    DATE,
    q3_open_date    DATE,
    q4_open_date    DATE,
    created_by      UUID        REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Goals ────────────────────────────────────────────────────
CREATE TABLE goals (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cycle_id        UUID        NOT NULL REFERENCES cycles(id),
    thrust_area     VARCHAR(255) NOT NULL,
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    uom_type        uom_type    NOT NULL,
    target          NUMERIC(15,4),
    target_date     DATE,
    weightage       NUMERIC(5,2) NOT NULL,
    status          goal_status  NOT NULL DEFAULT 'DRAFT',
    locked          BOOLEAN     NOT NULL DEFAULT FALSE,
    is_shared       BOOLEAN     NOT NULL DEFAULT FALSE,
    parent_goal_id  UUID        REFERENCES goals(id) ON DELETE SET NULL,
    submitted_at    TIMESTAMPTZ,
    approved_at     TIMESTAMPTZ,
    approved_by     UUID        REFERENCES users(id),
    rejection_note  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_goals_employee ON goals(employee_id);
CREATE INDEX idx_goals_cycle    ON goals(cycle_id);
CREATE INDEX idx_goals_status   ON goals(status);
CREATE INDEX idx_goals_parent   ON goals(parent_goal_id);

-- ── Check-ins ────────────────────────────────────────────────
CREATE TABLE checkins (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id         UUID        NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    quarter         quarter     NOT NULL,
    cycle_id        UUID        NOT NULL REFERENCES cycles(id),
    achievement     NUMERIC(15,4),
    completion_date DATE,
    progress        goal_progress NOT NULL DEFAULT 'NOT_STARTED',
    progress_score  NUMERIC(8,4),
    submitted_by    UUID        REFERENCES users(id),
    checked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (goal_id, quarter, cycle_id)
);

CREATE INDEX idx_checkins_goal    ON checkins(goal_id);
CREATE INDEX idx_checkins_quarter ON checkins(quarter);

-- ── Check-in Comments ────────────────────────────────────────
CREATE TABLE checkin_comments (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    checkin_id  UUID        NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
    author_id   UUID        NOT NULL REFERENCES users(id),
    comment     TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_checkin ON checkin_comments(checkin_id);

-- ── Audit Logs ───────────────────────────────────────────────
CREATE TABLE audit_logs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     VARCHAR(100) NOT NULL,
    entity_id       UUID        NOT NULL,
    action          VARCHAR(100) NOT NULL,
    performed_by    UUID        REFERENCES users(id),
    old_value       JSONB,
    new_value       JSONB,
    ip_address      VARCHAR(45),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user   ON audit_logs(performed_by);

-- ── Unlock Requests ──────────────────────────────────────────
CREATE TABLE unlock_requests (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id         UUID        NOT NULL REFERENCES goals(id),
    requested_by    UUID        NOT NULL REFERENCES users(id),
    reason          TEXT        NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    resolved_by     UUID        REFERENCES users(id),
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Seed: Default Admin Cycle ─────────────────────────────────
INSERT INTO cycles (name, year, start_date, end_date, status,
                    goal_open_date, q1_open_date, q2_open_date, q3_open_date, q4_open_date)
VALUES ('FY 2025-26', 2025,
        '2025-04-01', '2026-03-31',
        'ACTIVE',
        '2025-05-01', '2025-07-01', '2025-10-01', '2026-01-01', '2026-03-01');
