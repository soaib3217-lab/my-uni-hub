-- ==============================================================================
-- 🚀 SUPABASE DATABASE MIGRATION: RLS ENABLEMENT & TRAFFIC TRACKING
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. ADD TRAFFIC TRACKING COLUMNS TO STUDENTS TABLE
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS traffic_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_visited_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_user_agent TEXT;

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
-- 4. POLICIES FOR FOLDERS
-- ------------------------------------------------------------------------------
-- Allow anyone (public/anon) to read folders
DROP POLICY IF EXISTS "Public folders are viewable by everyone" ON folders;
CREATE POLICY "Public folders are viewable by everyone" 
ON folders FOR SELECT 
TO public 
USING (true);

-- Allow creating new folders
DROP POLICY IF EXISTS "Allow folder creation" ON folders;
CREATE POLICY "Allow folder creation" 
ON folders FOR INSERT 
TO public 
WITH CHECK (true);

-- Allow folder deletion (if needed)
DROP POLICY IF EXISTS "Allow folder deletion" ON folders;
CREATE POLICY "Allow folder deletion" 
ON folders FOR DELETE 
TO public 
USING (true);

-- ------------------------------------------------------------------------------
-- 5. POLICIES FOR COURSES (FILES / STUDY MATERIALS)
-- ------------------------------------------------------------------------------
-- Allow anyone (public/anon) to read courses and materials
DROP POLICY IF EXISTS "Public courses are viewable by everyone" ON courses;
CREATE POLICY "Public courses are viewable by everyone" 
ON courses FOR SELECT 
TO public 
USING (true);

-- Allow inserting courses / uploading files
DROP POLICY IF EXISTS "Allow course insert" ON courses;
CREATE POLICY "Allow course insert" 
ON courses FOR INSERT 
TO public 
WITH CHECK (true);

-- Allow deleting courses
DROP POLICY IF EXISTS "Allow course delete" ON courses;
CREATE POLICY "Allow course delete" 
ON courses FOR DELETE 
TO public 
USING (true);

-- ------------------------------------------------------------------------------
-- 6. POLICIES FOR STUDENTS (SECURITY HARDENING)
-- ------------------------------------------------------------------------------
-- CRITICAL: We DO NOT grant SELECT/UPDATE on students to the public/anon role.
-- This prevents anyone from scraping password hashes, emails, or OTP codes via the browser.
-- Next.js server-side API routes will access `students` using SUPABASE_SERVICE_ROLE_KEY,
-- which automatically bypasses RLS safely on the server.

-- ------------------------------------------------------------------------------
-- 7. POLICIES FOR TRAFFIC_LOGS
-- ------------------------------------------------------------------------------
-- Traffic logs are managed purely via server-side service_role API.
-- No public policies needed, keeping traffic logs private and untamperable.
