-- Payments Schema
-- Migration: 00008_payments
-- Stripe integration for book generation payments

-- =============================================================================
-- 1. PAYMENT STATUS ENUM
-- =============================================================================

CREATE TYPE payment_status AS ENUM (
  'pending',      -- Checkout session created, awaiting payment
  'completed',    -- Payment successful
  'failed',       -- Payment failed
  'refunded',     -- Payment refunded
  'expired'       -- Checkout session expired
);

-- =============================================================================
-- 2. PAYMENTS TABLE
-- =============================================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Stripe identifiers
  stripe_checkout_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_customer_id TEXT,

  -- Product details
  edition TEXT NOT NULL CHECK (edition IN ('standard', 'masterwork')),
  book_length INT NOT NULL CHECK (book_length IN (30, 60, 120, 300)),
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Associated job (created after payment succeeds)
  vibe_job_id UUID REFERENCES vibe_jobs(id) ON DELETE SET NULL,

  -- Preview data stored for post-payment job creation
  preview_data JSONB NOT NULL,

  -- Status tracking
  status payment_status NOT NULL DEFAULT 'pending',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Error info for failed payments
  error_message TEXT
);

-- =============================================================================
-- 3. INDEXES
-- =============================================================================

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_stripe_session ON payments(stripe_checkout_session_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_vibe_job ON payments(vibe_job_id);
CREATE INDEX idx_payments_created ON payments(created_at DESC);

-- =============================================================================
-- 4. UPDATED_AT TRIGGER
-- =============================================================================

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 5. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (user_id = auth.uid());

-- Users can create payments (checkout sessions)
CREATE POLICY "Users can create payments" ON payments
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Service role can update payments (for webhooks)
-- Note: This uses the service role key, not user auth
CREATE POLICY "Service role can update payments" ON payments
  FOR UPDATE USING (true);

-- =============================================================================
-- 6. COMMENTS
-- =============================================================================

COMMENT ON TABLE payments IS 'Stripe payment records for book generation purchases';
COMMENT ON COLUMN payments.edition IS 'standard = draft mode, masterwork = polished + audio';
COMMENT ON COLUMN payments.preview_data IS 'Stores genre, prompt, preview, length, sliders for job creation after payment';
COMMENT ON COLUMN payments.vibe_job_id IS 'Linked after successful payment when job is created';
