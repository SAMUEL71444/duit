-- ============================================================
-- NUCLEAR FIX — Drop & Recreate tabel dengan grant LENGKAP
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- ============================================================
-- DROP semua tabel baru yang PostgREST tidak bisa lihat
-- ============================================================
DROP TABLE IF EXISTS key_results CASCADE;
DROP TABLE IF EXISTS okrs CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;
DROP TABLE IF EXISTS portfolio_holdings CASCADE;
DROP TABLE IF EXISTS weekly_reviews CASCADE;
DROP TABLE IF EXISTS prompts CASCADE;
DROP TABLE IF EXISTS dca_executions CASCADE;

-- ============================================================
-- RECREATE dengan grant LENGKAP ke semua role PostgREST
-- ============================================================

-- 1. okrs
CREATE TABLE okrs (
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
GRANT ALL ON TABLE okrs TO postgres, authenticator, anon, authenticated, service_role;
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own okrs" ON okrs;
CREATE POLICY "Own okrs" ON okrs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. key_results
CREATE TABLE key_results (
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
GRANT ALL ON TABLE key_results TO postgres, authenticator, anon, authenticated, service_role;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own key_results" ON key_results;
CREATE POLICY "Own key_results" ON key_results FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. proposals
CREATE TABLE proposals (
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
GRANT ALL ON TABLE proposals TO postgres, authenticator, anon, authenticated, service_role;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own proposals" ON proposals;
CREATE POLICY "Own proposals" ON proposals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. portfolio_holdings
CREATE TABLE portfolio_holdings (
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
GRANT ALL ON TABLE portfolio_holdings TO postgres, authenticator, anon, authenticated, service_role;
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own portfolio_holdings" ON portfolio_holdings;
CREATE POLICY "Own portfolio_holdings" ON portfolio_holdings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. weekly_reviews
CREATE TABLE weekly_reviews (
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
GRANT ALL ON TABLE weekly_reviews TO postgres, authenticator, anon, authenticated, service_role;
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own weekly_reviews" ON weekly_reviews;
CREATE POLICY "Own weekly_reviews" ON weekly_reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. prompts
CREATE TABLE prompts (
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
GRANT ALL ON TABLE prompts TO postgres, authenticator, anon, authenticated, service_role;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own prompts" ON prompts;
CREATE POLICY "Own prompts" ON prompts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. dca_executions
CREATE TABLE dca_executions (
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
GRANT ALL ON TABLE dca_executions TO postgres, authenticator, anon, authenticated, service_role;
ALTER TABLE dca_executions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own dca_executions" ON dca_executions;
CREATE POLICY "Own dca_executions" ON dca_executions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Grant sequences juga
-- ============================================================
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, authenticator;

-- ============================================================
-- Force reload 2x
-- ============================================================
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(2);
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Konfirmasi akhir — harus muncul 7 tabel
-- ============================================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('okrs','key_results','proposals','portfolio_holdings','weekly_reviews','prompts','dca_executions')
ORDER BY table_name;
