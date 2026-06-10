-- ============================================================
-- WEALTH COMMAND CENTER — COMPLETE SCHEMA (v2 All-in-One)
-- Jalankan SELURUH file ini di Supabase SQL Editor
-- https://app.supabase.com/project/_/sql/new
-- ============================================================

-- ============================================================
-- 1. TABLES (CREATE IF NOT EXISTS — aman dijalankan ulang)
-- ============================================================

-- Income entries
CREATE TABLE IF NOT EXISTS income_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('freelance', 'bounty', 'affiliate', 'investasi', 'lain')),
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget categories
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  allocated BIGINT NOT NULL DEFAULT 0,
  month DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget transactions
CREATE TABLE IF NOT EXISTS budget_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRM deals
CREATE TABLE IF NOT EXISTS crm_deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  value BIGINT,
  project_type TEXT,
  stage TEXT NOT NULL CHECK (stage IN ('Lead', 'Negosiasi', 'Aktif', 'Selesai', 'Tidak Jadi')),
  deadline DATE,
  last_contact DATE,
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time logs
CREATE TABLE IF NOT EXISTS time_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES crm_deals(id) ON DELETE SET NULL,
  project_name TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio transactions
CREATE TABLE IF NOT EXISTS portfolio_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('beli', 'jual')),
  price BIGINT NOT NULL,
  lot INTEGER NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio holdings (snapshot)
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

-- DCA schedules
CREATE TABLE IF NOT EXISTS dca_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  budget BIGINT NOT NULL,
  day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 28),
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DCA executions
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

-- OKRs
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

-- Key Results
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

-- Prompts (Prompt Vault)
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

-- Subscriptions
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

-- Proposals
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

-- Leads (webhook)
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  project_type TEXT,
  budget TEXT,
  message TEXT,
  source_url TEXT,
  is_converted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User settings
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  target_monthly_income BIGINT DEFAULT 0,
  working_days_per_month INTEGER DEFAULT 20,
  working_hours_per_day INTEGER DEFAULT 6,
  overhead_per_month BIGINT DEFAULT 0,
  current_net_worth BIGINT DEFAULT 0,
  monthly_saving BIGINT DEFAULT 0,
  expected_return_percent DECIMAL DEFAULT 10,
  monthly_expense BIGINT DEFAULT 0,
  radar_keywords TEXT[] DEFAULT '{}',
  notification_email TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_income_entries_user ON income_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_income_entries_date ON income_entries(date);
CREATE INDEX IF NOT EXISTS idx_budget_categories_user ON budget_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_transactions_user ON budget_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_user ON crm_deals(user_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_user ON time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_user ON portfolio_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_user ON portfolio_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_dca_schedules_user ON dca_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_dca_executions_user ON dca_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_dca_executions_schedule ON dca_executions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_okrs_user ON okrs(user_id);
CREATE INDEX IF NOT EXISTS idx_key_results_okr ON key_results(okr_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reviews_user ON weekly_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_user ON prompts(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_user ON proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_user ON leads(user_id);

-- ============================================================
-- 3. ROW LEVEL SECURITY — Enable
-- ============================================================
ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dca_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE dca_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. POLICIES (drop dulu biar aman kalau sudah ada)
-- ============================================================

-- income_entries
DROP POLICY IF EXISTS "Own income_entries" ON income_entries;
CREATE POLICY "Own income_entries" ON income_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- budget_categories
DROP POLICY IF EXISTS "Own budget_categories" ON budget_categories;
CREATE POLICY "Own budget_categories" ON budget_categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- budget_transactions
DROP POLICY IF EXISTS "Own budget_transactions" ON budget_transactions;
CREATE POLICY "Own budget_transactions" ON budget_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- crm_deals
DROP POLICY IF EXISTS "Own crm_deals" ON crm_deals;
CREATE POLICY "Own crm_deals" ON crm_deals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- time_logs
DROP POLICY IF EXISTS "Own time_logs" ON time_logs;
CREATE POLICY "Own time_logs" ON time_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- portfolio_transactions
DROP POLICY IF EXISTS "Own portfolio_transactions" ON portfolio_transactions;
CREATE POLICY "Own portfolio_transactions" ON portfolio_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- portfolio_holdings
DROP POLICY IF EXISTS "Own portfolio_holdings" ON portfolio_holdings;
CREATE POLICY "Own portfolio_holdings" ON portfolio_holdings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- dca_schedules
DROP POLICY IF EXISTS "Own dca_schedules" ON dca_schedules;
CREATE POLICY "Own dca_schedules" ON dca_schedules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- dca_executions
DROP POLICY IF EXISTS "Own dca_executions" ON dca_executions;
CREATE POLICY "Own dca_executions" ON dca_executions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- okrs
DROP POLICY IF EXISTS "Own okrs" ON okrs;
CREATE POLICY "Own okrs" ON okrs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- key_results
DROP POLICY IF EXISTS "Own key_results" ON key_results;
CREATE POLICY "Own key_results" ON key_results FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- weekly_reviews
DROP POLICY IF EXISTS "Own weekly_reviews" ON weekly_reviews;
CREATE POLICY "Own weekly_reviews" ON weekly_reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- prompts
DROP POLICY IF EXISTS "Own prompts" ON prompts;
CREATE POLICY "Own prompts" ON prompts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- subscriptions
DROP POLICY IF EXISTS "Own subscriptions" ON subscriptions;
CREATE POLICY "Own subscriptions" ON subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- proposals
DROP POLICY IF EXISTS "Own proposals" ON proposals;
CREATE POLICY "Own proposals" ON proposals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- leads (public insert untuk webhook)
DROP POLICY IF EXISTS "Own leads select" ON leads;
DROP POLICY IF EXISTS "Public leads insert" ON leads;
CREATE POLICY "Own leads select" ON leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Public leads insert" ON leads FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Own leads update" ON leads;
CREATE POLICY "Own leads update" ON leads FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Own leads delete" ON leads;
CREATE POLICY "Own leads delete" ON leads FOR DELETE USING (auth.uid() = user_id);

-- user_settings
DROP POLICY IF EXISTS "Own user_settings" ON user_settings;
CREATE POLICY "Own user_settings" ON user_settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5. FUNCTIONS & TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_crm_deals_updated_at ON crm_deals;
CREATE TRIGGER update_crm_deals_updated_at BEFORE UPDATE ON crm_deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_okrs_updated_at ON okrs;
CREATE TRIGGER update_okrs_updated_at BEFORE UPDATE ON okrs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_prompts_updated_at ON prompts;
CREATE TRIGGER update_prompts_updated_at BEFORE UPDATE ON prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
