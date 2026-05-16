-- ============================================================
-- V2__seed_demo_users.sql
-- Demo accounts for hackathon presentation.
-- Passwords are managed via Google OAuth2; these are placeholder
-- rows so roles & hierarchy are available on first login.
-- ============================================================

-- Admin
INSERT INTO users (id, email, name, role, department, active)
VALUES ('00000000-0000-0000-0000-000000000001',
        'admin@company.com', 'Admin User', 'ROLE_ADMIN', 'HR', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Manager
INSERT INTO users (id, email, name, role, department, manager_id, active)
VALUES ('00000000-0000-0000-0000-000000000002',
        'manager@company.com', 'Manager User', 'ROLE_MANAGER', 'Engineering',
        '00000000-0000-0000-0000-000000000001', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Employee
INSERT INTO users (id, email, name, role, department, manager_id, active)
VALUES ('00000000-0000-0000-0000-000000000003',
        'employee@company.com', 'Employee User', 'ROLE_EMPLOYEE', 'Engineering',
        '00000000-0000-0000-0000-000000000002', TRUE)
ON CONFLICT (email) DO NOTHING;
