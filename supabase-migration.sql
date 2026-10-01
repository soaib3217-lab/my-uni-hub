-- ==============================================================================
-- 🚀 SUPABASE DATABASE MIGRATION: ENTERPRISE-GRADE RLS HARDENING
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. ADD TRAFFIC TRACKING COLUMNS TO STUDENTS TABLE
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS traffic_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_visited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_user_agent TEXT,
ADD COLUMN IF NOT EXISTS otp_code TEXT,
ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMPTZ;

-- 2. CREATE TRAFFIC LOGS TABLE FOR INDIVIDUAL AUDIT HISTORY
CREATE TABLE IF NOT EXISTS traffic_logs (
    id BIGSERIAL PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    visited_at TIMESTAMPTZ DEFAULT NOW(),
    user_agent TEXT
);

-- 3. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 4. POLICIES FOR FOLDERS (READ-ONLY FOR PUBLIC)
-- ------------------------------------------------------------------------------
-- Remove dangerous public insert/delete policies
DROP POLICY IF EXISTS "Allow folder creation" ON folders;
DROP POLICY IF EXISTS "Allow folder deletion" ON folders;

-- Allow anyone (public/anon) to read folders
DROP POLICY IF EXISTS "Public folders are viewable by everyone" ON folders;
CREATE POLICY "Public folders are viewable by everyone" 
ON folders FOR SELECT 
TO public 
USING (true);

-- Mutations (INSERT, UPDATE, DELETE) are exclusively handled by Next.js server-side
-- API endpoints using the SUPABASE_SERVICE_ROLE_KEY to enforce authentication.

-- ------------------------------------------------------------------------------
-- 5. POLICIES FOR COURSES / STUDY MATERIALS (READ-ONLY FOR PUBLIC)
-- ------------------------------------------------------------------------------
-- Remove dangerous public insert/delete policies that allowed anyone to wipe materials
DROP POLICY IF EXISTS "Allow course insert" ON courses;
DROP POLICY IF EXISTS "Allow course delete" ON courses;

-- Allow anyone (public/anon) to view study materials
DROP POLICY IF EXISTS "Public courses are viewable by everyone" ON courses;
CREATE POLICY "Public courses are viewable by everyone" 
ON courses FOR SELECT 
TO public 
USING (true);

-- Mutations (INSERT, UPDATE, DELETE) are exclusively handled by Next.js server-side
-- API endpoints (/api/courses) using SUPABASE_SERVICE_ROLE_KEY to enforce ownership and admin checks.

-- ------------------------------------------------------------------------------
-- 6. POLICIES FOR STUDENTS (HIGH-SECURITY LOCKDOWN)
-- ------------------------------------------------------------------------------
-- CRITICAL: We DO NOT grant SELECT/UPDATE on students to the public/anon role.
-- This prevents anyone from scraping password hashes, emails, or OTP codes via the browser.
-- Next.js server-side API routes access `students` using SUPABASE_SERVICE_ROLE_KEY.
DROP POLICY IF EXISTS "Public students viewable" ON students;
DROP POLICY IF EXISTS "Public students modify" ON students;

-- ------------------------------------------------------------------------------
-- 7. POLICIES FOR TRAFFIC_LOGS (AUDIT PRIVACY)
-- ------------------------------------------------------------------------------
-- Traffic logs are managed purely via server-side service_role API.
-- No public policies exist, keeping student device footprints and IP/UA audit logs private.
DROP POLICY IF EXISTS "Public traffic logs viewable" ON traffic_logs;
DROP POLICY IF EXISTS "Public traffic logs insert" ON traffic_logs;
