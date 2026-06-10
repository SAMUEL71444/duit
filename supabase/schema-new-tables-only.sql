-- ============================================================
-- ONLY NEW TABLES — Run ini di Supabase SQL Editor
-- Hanya membuat tabel yang BELUM ADA. Aman 100%.
-- ============================================================

-- 1. portfolio_holdings
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
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own portfolio_holdings" ON portfolio_holdings;
CREATE POLICY "Own portfolio_holdings" ON portfolio_holdings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. dca_executions
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
ALTER TABLE dca_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own dca_executions" ON dca_executions;
CREATE POLICY "Own dca_executions" ON dca_executions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. okrs
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
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own okrs" ON okrs;
CREATE POLICY "Own okrs" ON okrs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. key_results
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
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own key_results" ON key_results;
CREATE POLICY "Own key_results" ON key_results FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. weekly_reviews
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
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own weekly_reviews" ON weekly_reviews;
CREATE POLICY "Own weekly_reviews" ON weekly_reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. prompts
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
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own prompts" ON prompts;
CREATE POLICY "Own prompts" ON prompts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. subscriptions
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
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own subscriptions" ON subscriptions;
CREATE POLICY "Own subscriptions" ON subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. proposals
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
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own proposals" ON proposals;
CREATE POLICY "Own proposals" ON proposals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Konfirmasi
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('portfolio_holdings','dca_executions','okrs','key_results','weekly_reviews','prompts','subscriptions','proposals')
ORDER BY table_name;
