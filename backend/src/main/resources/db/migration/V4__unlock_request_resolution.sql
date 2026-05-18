-- ============================================================
-- V4__unlock_request_resolution.sql
-- Phase 10 — Add resolution_note to unlock_requests table
-- (The table was created in V1, this adds the missing column)
-- ============================================================

ALTER TABLE unlock_requests
    ADD COLUMN IF NOT EXISTS resolution_note TEXT;

-- Ensure the column order is consistent
COMMENT ON TABLE unlock_requests IS
    'Goal unlock requests submitted by employees; resolved by admins';
COMMENT ON COLUMN unlock_requests.resolution_note IS
    'Admin note when approving or denying the unlock request';