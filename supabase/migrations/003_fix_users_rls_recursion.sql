-- ============================================
-- FIX: Infinite recursion in users RLS policy
-- ============================================
-- The original "Center admins can manage their center's users" policy
-- caused infinite recursion by querying the users table within the policy.
-- This migration fixes it by using SECURITY DEFINER functions.

-- Create helper function to check if current user is a center admin
CREATE OR REPLACE FUNCTION is_center_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (SELECT role = 'center_admin' FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Center admins can manage their center's users" ON users;

-- Recreate with SECURITY DEFINER functions (no recursion)
CREATE POLICY "Center admins can manage their center's users"
    ON users FOR ALL
    USING (
        is_center_admin()
        AND center_id = get_user_center_id()
    );

-- Also ensure users can view their own profile (already exists but let's be safe)
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (id = auth.uid());
