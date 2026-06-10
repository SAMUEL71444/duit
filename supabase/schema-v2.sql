-- ============================================================
-- SCHEMA UPDATE v2 — Tambah tabel yang belum ada
-- Jalankan SELURUH file ini di Supabase SQL Editor
-- https://app.supabase.com/project/_/sql/new
-- ============================================================

-- ============================================================
-- TABEL BARU YANG DIBUTUHKAN APP (belum ada di schema lama)
-- ============================================================

-- Portfolio holdings (snapshot kepemilikan saham)
CREATE TABLE IF NOT EXISTS portfolio_holdings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  lot INTEGER NOT NULL DEFAULT 0,
  avg_price BIGINT NOT NULL DEFAULT 0,
  current_price BIGINT,
  change_pct DECIMAL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ticker)
);

-- DCA executions (catat setiap beli DCA)
CREATE TABLE IF NOT EXISTS dca_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES dca_schedules(id) ON DELETE CASCADE,
  executed_date DATE NOT NULL,
  price_per_share BIGINT NOT NULL,
  shares_bought INTEGER NOT NULL,
  total_cost BIGINT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tambah kolom yang belum ada di dca_schedules
ALTER TABLE dca_schedules ADD COLUMN IF NOT EXISTS notes TEXT;

-- OKRs (objectives)
CREATE TABLE IF NOT EXISTS okrs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  quarter TEXT NOT NULL DEFAULT 'Q1',
  year INTEGER NOT NULL DEFAULT 2025,
  status TEXT NOT NULL DEFAULT 'on-track' CHECK (status IN ('on-track', 'at-risk', 'off-track', 'completed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Key Results (untuk OKR)
CREATE TABLE IF NOT EXISTS key_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  okr_id UUID REFERENCES okrs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target DECIMAL NOT NULL DEFAULT 100,
  current DECIMAL NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'angka',
  is_done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly Reviews
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  achievements TEXT,
  challenges TEXT,
  next_week_goals TEXT,
  mood_score INTEGER CHECK (mood_score >= 1 AND mood_score <= 5),
  ai_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Prompts (Prompt Vault) — tabel baru pakai nama 'prompts' bukan 'prompt_vault'
CREATE TABLE IF NOT EXISTS prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'coding',
  tags TEXT[] DEFAULT '{}',
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions (Subscription Audit)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cost BIGINT NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  category TEXT NOT NULL DEFAULT 'other',
  is_active BOOLEAN DEFAULT TRUE,
  next_billing DATE,
  last_used DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Proposals (Proposal Generator saved library)
CREATE TABLE IF NOT EXISTS proposals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  project_type TEXT,
  budget_range TEXT,
  duration TEXT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_user ON portfolio_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_dca_executions_user ON dca_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_dca_executions_schedule ON dca_executions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_okrs_user ON okrs(user_id);
CREATE INDEX IF NOT EXISTS idx_key_results_okr ON key_results(okr_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_user ON weekly_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_user ON prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_user ON proposals(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dca_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

-- portfolio_holdings policies
DROP POLICY IF EXISTS "Own portfolio_holdings" ON portfolio_holdings;
CREATE POLICY "Own portfolio_holdings" ON portfolio_holdings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- dca_executions policies
DROP POLICY IF EXISTS "Own dca_executions" ON dca_executions;
CREATE POLICY "Own dca_executions" ON dca_executions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- okrs policies
DROP POLICY IF EXISTS "Own okrs" ON okrs;
CREATE POLICY "Own okrs" ON okrs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- key_results policies
DROP POLICY IF EXISTS "Own key_results" ON key_results;
CREATE POLICY "Own key_results" ON key_results FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- weekly_reviews policies
DROP POLICY IF EXISTS "Own weekly_reviews" ON weekly_reviews;
CREATE POLICY "Own weekly_reviews" ON weekly_reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- prompts policies
DROP POLICY IF EXISTS "Own prompts" ON prompts;
CREATE POLICY "Own prompts" ON prompts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- subscriptions policies
DROP POLICY IF EXISTS "Own subscriptions" ON subscriptions;
CREATE POLICY "Own subscriptions" ON subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- proposals policies
DROP POLICY IF EXISTS "Own proposals" ON proposals;
CREATE POLICY "Own proposals" ON proposals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- AUTO UPDATE updated_at TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS update_okrs_updated_at ON okrs;
CREATE TRIGGER update_okrs_updated_at BEFORE UPDATE ON okrs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prompts_updated_at ON prompts;
CREATE TRIGGER update_prompts_updated_at BEFORE UPDATE ON prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
