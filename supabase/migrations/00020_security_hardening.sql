-- Security Hardening Migration
-- Addresses vulnerabilities found by security scan

-- ============================================================================
-- 1. LOGIN RATE LIMITING TABLE
-- Tracks failed login attempts to prevent brute force attacks
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- email or IP address
  identifier_type TEXT NOT NULL CHECK (identifier_type IN ('email', 'ip')),
  action TEXT NOT NULL CHECK (action IN ('login', 'otp', 'password_reset')),
  attempts INT DEFAULT 1,
  first_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_lookup
  ON auth_rate_limits (identifier, identifier_type, action);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_cleanup
  ON auth_rate_limits (last_attempt_at);

-- Enable RLS
ALTER TABLE auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate limits
CREATE POLICY "Service role only" ON auth_rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 2. RATE LIMITING FUNCTIONS
-- ============================================================================

-- Check if an identifier is rate limited
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_identifier_type TEXT,
  p_action TEXT,
  p_max_attempts INT DEFAULT 5,
  p_window_minutes INT DEFAULT 15,
  p_block_minutes INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record auth_rate_limits%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_window_start TIMESTAMPTZ := v_now - (p_window_minutes || ' minutes')::INTERVAL;
BEGIN
  -- Get existing record
  SELECT * INTO v_record
  FROM auth_rate_limits
  WHERE identifier = p_identifier
    AND identifier_type = p_identifier_type
    AND action = p_action
  ORDER BY created_at DESC
  LIMIT 1;

  -- Check if currently blocked
  IF v_record.blocked_until IS NOT NULL AND v_record.blocked_until > v_now THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'blocked', true,
      'blocked_until', v_record.blocked_until,
      'attempts', v_record.attempts,
      'reason', 'Too many attempts. Please try again later.'
    );
  END IF;

  -- If record is old (outside window), reset it
  IF v_record.id IS NOT NULL AND v_record.first_attempt_at < v_window_start THEN
    DELETE FROM auth_rate_limits WHERE id = v_record.id;
    v_record := NULL;
  END IF;

  -- If no record or was reset, create new one
  IF v_record.id IS NULL THEN
    INSERT INTO auth_rate_limits (identifier, identifier_type, action, attempts, first_attempt_at, last_attempt_at)
    VALUES (p_identifier, p_identifier_type, p_action, 1, v_now, v_now)
    RETURNING * INTO v_record;

    RETURN jsonb_build_object(
      'allowed', true,
      'blocked', false,
      'attempts', 1,
      'remaining', p_max_attempts - 1
    );
  END IF;

  -- Increment attempts
  UPDATE auth_rate_limits
  SET attempts = attempts + 1,
      last_attempt_at = v_now,
      blocked_until = CASE
        WHEN attempts + 1 >= p_max_attempts
        THEN v_now + (p_block_minutes || ' minutes')::INTERVAL
        ELSE NULL
      END
  WHERE id = v_record.id
  RETURNING * INTO v_record;

  -- Check if now blocked
  IF v_record.attempts >= p_max_attempts THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'blocked', true,
      'blocked_until', v_record.blocked_until,
      'attempts', v_record.attempts,
      'reason', 'Too many attempts. Please try again later.'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'blocked', false,
    'attempts', v_record.attempts,
    'remaining', p_max_attempts - v_record.attempts
  );
END;
$$;

-- Reset rate limit on successful auth (call after successful login)
CREATE OR REPLACE FUNCTION reset_rate_limit(
  p_identifier TEXT,
  p_identifier_type TEXT,
  p_action TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth_rate_limits
  WHERE identifier = p_identifier
    AND identifier_type = p_identifier_type
    AND action = p_action;
END;
$$;

-- Cleanup old rate limit records (run daily via cron)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM auth_rate_limits
  WHERE last_attempt_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ============================================================================
-- 3. SECURE RPC FUNCTIONS - Prevent enumeration
-- ============================================================================

-- Wrapper for share token validation with rate limiting
CREATE OR REPLACE FUNCTION validate_share_token_secure(
  p_token TEXT,
  p_section_id UUID,
  p_client_ip TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate_check JSONB;
  v_identifier TEXT;
  v_result BOOLEAN;
BEGIN
  -- Use token prefix as identifier to prevent timing attacks
  v_identifier := COALESCE(p_client_ip, LEFT(p_token, 8));

  -- Check rate limit (10 attempts per 5 minutes)
  v_rate_check := check_rate_limit(v_identifier, 'ip', 'share_validate', 10, 5, 15);

  IF NOT (v_rate_check->>'allowed')::BOOLEAN THEN
    RETURN FALSE;
  END IF;

  -- Validate the token
  SELECT EXISTS (
    SELECT 1 FROM book_shares bs
    JOIN sections s ON s.id = p_section_id
    JOIN chapters c ON c.id = s.chapter_id
    WHERE bs.share_token = p_token
      AND bs.book_id = c.book_id
      AND bs.enabled = true
      AND (bs.expires_at IS NULL OR bs.expires_at > NOW())
  ) INTO v_result;

  -- Add small constant delay to prevent timing attacks
  PERFORM pg_sleep(0.05);

  RETURN v_result;
END;
$$;

-- ============================================================================
-- 4. FIX OVERLY PERMISSIVE PAYMENT UPDATE POLICY
-- ============================================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role can update payments" ON payments;

-- Create more restrictive policy
CREATE POLICY "Service role can update payments" ON payments
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 5. AUDIT LOG TABLE
-- Track security-sensitive operations
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_security_audit_user
  ON security_audit_log (user_id, created_at DESC);

-- Index for querying by event type
CREATE INDEX IF NOT EXISTS idx_security_audit_event
  ON security_audit_log (event_type, created_at DESC);

-- Enable RLS - only service role can access
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON security_audit_log
  FOR ALL USING (auth.role() = 'service_role');

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_event_type TEXT,
  p_event_data JSONB DEFAULT '{}',
  p_user_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO security_audit_log (event_type, event_data, user_id, ip_address, user_agent)
  VALUES (p_event_type, p_event_data, p_user_id, p_ip_address, p_user_agent)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ============================================================================
-- 6. STORAGE SECURITY - Add Content-Disposition headers
-- ============================================================================

-- Note: Content-Type sniffing protection for storage objects requires
-- Supabase dashboard configuration. Add these headers in Storage settings:
-- X-Content-Type-Options: nosniff
-- Content-Disposition: attachment (for downloads)

-- ============================================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE auth_rate_limits IS 'Tracks authentication attempts for rate limiting';
COMMENT ON TABLE security_audit_log IS 'Audit log for security-sensitive operations';
COMMENT ON FUNCTION check_rate_limit IS 'Check if an identifier is rate limited for a specific action';
COMMENT ON FUNCTION reset_rate_limit IS 'Reset rate limit counter after successful authentication';
COMMENT ON FUNCTION log_security_event IS 'Log a security event to the audit trail';
