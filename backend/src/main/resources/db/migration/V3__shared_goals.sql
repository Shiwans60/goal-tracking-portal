-- ============================================================
-- V3__shared_goals.sql
-- Phase 6 — Shared Goals Schema
-- ============================================================

CREATE TABLE shared_goals (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_goal_id      UUID         NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    recipient_id        UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_goal_id   UUID         REFERENCES goals(id) ON DELETE SET NULL,
    recipient_weightage NUMERIC(5,2) NOT NULL DEFAULT 0,
    assigned_by         UUID         REFERENCES users(id),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (parent_goal_id, recipient_id)
);

CREATE INDEX idx_shared_parent    ON shared_goals(parent_goal_id);
CREATE INDEX idx_shared_recipient ON shared_goals(recipient_id);
CREATE INDEX idx_shared_assigner  ON shared_goals(assigned_by);

COMMENT ON TABLE shared_goals IS
  'Links a shared/departmental goal template to individual employee recipients';

COMMENT ON COLUMN shared_goals.parent_goal_id IS
  'The template goal created by the manager/admin (isShared=true on goals table)';

COMMENT ON COLUMN shared_goals.recipient_goal_id IS
  'The auto-created goal on the recipient''s sheet (also isShared=true, parentGoal set)';

COMMENT ON COLUMN shared_goals.recipient_weightage IS
  'Weightage the recipient has set for this goal on their sheet (editable by recipient only)';