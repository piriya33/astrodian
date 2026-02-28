-- =============================================
-- Pekky: Database Schema v2.0
-- Per backend-design-manual.md §3
-- Run this in your Supabase SQL Editor
-- =============================================

-- ===== 1. USER PROFILES (Birth Profiles — max 5 per user) =====
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,              -- "พีร์" (display only, no real name required)
  birth_date_enc TEXT NOT NULL,            -- AES-256-GCM encrypted birth date
  birth_time_enc TEXT NOT NULL,            -- AES-256-GCM encrypted birth time
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  location_name TEXT,                      -- "Bangkok, Thailand"
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can only access their own profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_profiles" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_profiles" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_profiles" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users_delete_own_profiles" ON user_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fast user lookups
CREATE INDEX idx_profiles_user_id ON user_profiles(user_id);


-- ===== 2. READINGS (Saved AI Readings — max 50 per user) =====
CREATE TABLE IF NOT EXISTS readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  mode TEXT NOT NULL,                      -- 'daily', 'detailed', 'blueprint', etc.
  persona TEXT NOT NULL DEFAULT 'expert',
  reading_text TEXT NOT NULL,              -- The AI-generated reading
  astro_data JSONB,                        -- Compact astro summary (planets, mahadasha)
  follow_up_count INT DEFAULT 0,           -- Number of follow-ups used
  amount_sats INT DEFAULT 0,               -- Amount paid (0 = free)
  amount_thb DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT,                     -- 'lightning', 'promptpay', null (free)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Users can only access their own readings
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_readings" ON readings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_readings" ON readings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_readings" ON readings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_readings_user_id ON readings(user_id);
CREATE INDEX idx_readings_created_at ON readings(created_at DESC);


-- ===== 3. PAYMENTS (Payment Ledger) =====
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),  -- nullable for guest payments
  reading_id UUID REFERENCES readings(id),
  method TEXT NOT NULL,                     -- 'lightning' | 'promptpay'
  amount_sats INT NOT NULL,
  amount_thb DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'pending',   -- 'pending' | 'confirmed' | 'failed'
  
  -- Lightning specific
  payment_hash TEXT,
  
  -- PromptPay specific
  pp_ref_id TEXT,                           -- Extracted from slip by AI
  slip_verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

-- Unique indexes for duplicate detection
CREATE UNIQUE INDEX idx_pp_ref_id ON payments(pp_ref_id) WHERE pp_ref_id IS NOT NULL;
CREATE UNIQUE INDEX idx_payment_hash ON payments(payment_hash) WHERE payment_hash IS NOT NULL;

-- RLS: Users see their own payments; guests see nothing (use service role for writes)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_own_payments" ON payments
  FOR SELECT USING (auth.uid() = user_id);
