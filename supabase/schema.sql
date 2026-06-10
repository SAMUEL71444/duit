-- ============================================================
-- Personal Wealth Command Center — Supabase Schema
-- Jalankan seluruh file ini di Supabase SQL Editor
-- https://app.supabase.com/project/_/sql/new
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

-- Income entries (C1 Revenue Pulse)
CREATE TABLE IF NOT EXISTS income_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('freelance', 'bounty', 'affiliate', 'investasi', 'lain')),
  date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget categories (C2 Zero-Based Budget)
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  allocated BIGINT NOT NULL DEFAULT 0,
  month DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Budget transactions (C2 Zero-Based Budget)
CREATE TABLE IF NOT EXISTS budget_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES budget_categories(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRM deals (B2 Freelance CRM)
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

-- Time logs (C5 Project Profitability)
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

-- Portfolio transactions (D1 Portfolio Dashboard)
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

-- DCA schedules (D2 DCA Scheduler)
CREATE TABLE IF NOT EXISTS dca_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  budget BIGINT NOT NULL,
  day_of_month INTEGER NOT NULL CHECK (day_of_month >= 1 AND day_of_month <= 28),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OKR goals (C8 OKR Tracker)
CREATE TABLE IF NOT EXISTS okr_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  deadline DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OKR milestones (C8 OKR Tracker)
CREATE TABLE IF NOT EXISTS okr_milestones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES okr_goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date DATE,
  is_completed BOOLEAN DEFAULT FALSE,
  week_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt vault
CREATE TABLE IF NOT EXISTS prompt_vault (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ml', 'uiux', 'engineering', 'security', 'custom')),
  tags TEXT[] DEFAULT '{}',
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Component sandbox
CREATE TABLE IF NOT EXISTS components (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads from webhook
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

CREATE INDEX IF NOT EXISTS idx_income_entries_user_id ON income_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_income_entries_date ON income_entries(date);
CREATE INDEX IF NOT EXISTS idx_budget_categories_user_id ON budget_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_categories_month ON budget_categories(month);
CREATE INDEX IF NOT EXISTS idx_budget_transactions_user_id ON budget_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_user_id ON crm_deals(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_stage ON crm_deals(stage);
CREATE INDEX IF NOT EXISTS idx_time_logs_user_id ON time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_user_id ON portfolio_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_dca_schedules_user_id ON dca_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_okr_goals_user_id ON okr_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_okr_milestones_goal_id ON okr_milestones(goal_id);
CREATE INDEX IF NOT EXISTS idx_prompt_vault_user_id ON prompt_vault(user_id);
CREATE INDEX IF NOT EXISTS idx_components_user_id ON components(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);

-- Full-text search index untuk component sandbox
CREATE INDEX IF NOT EXISTS idx_components_fts ON components USING GIN (
  to_tsvector('english', title || ' ' || COALESCE(notes, '') || ' ' || language)
);

-- ============================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE income_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dca_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE components ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- income_entries policies
CREATE POLICY "Users can view own income_entries" ON income_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own income_entries" ON income_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own income_entries" ON income_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own income_entries" ON income_entries FOR DELETE USING (auth.uid() = user_id);

-- budget_categories policies
CREATE POLICY "Users can view own budget_categories" ON budget_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budget_categories" ON budget_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budget_categories" ON budget_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budget_categories" ON budget_categories FOR DELETE USING (auth.uid() = user_id);

-- budget_transactions policies
CREATE POLICY "Users can view own budget_transactions" ON budget_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own budget_transactions" ON budget_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own budget_transactions" ON budget_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own budget_transactions" ON budget_transactions FOR DELETE USING (auth.uid() = user_id);

-- crm_deals policies
CREATE POLICY "Users can view own crm_deals" ON crm_deals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own crm_deals" ON crm_deals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own crm_deals" ON crm_deals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own crm_deals" ON crm_deals FOR DELETE USING (auth.uid() = user_id);

-- time_logs policies
CREATE POLICY "Users can view own time_logs" ON time_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own time_logs" ON time_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own time_logs" ON time_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own time_logs" ON time_logs FOR DELETE USING (auth.uid() = user_id);

-- portfolio_transactions policies
CREATE POLICY "Users can view own portfolio_transactions" ON portfolio_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own portfolio_transactions" ON portfolio_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolio_transactions" ON portfolio_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolio_transactions" ON portfolio_transactions FOR DELETE USING (auth.uid() = user_id);

-- dca_schedules policies
CREATE POLICY "Users can view own dca_schedules" ON dca_schedules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own dca_schedules" ON dca_schedules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own dca_schedules" ON dca_schedules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own dca_schedules" ON dca_schedules FOR DELETE USING (auth.uid() = user_id);

-- okr_goals policies
CREATE POLICY "Users can view own okr_goals" ON okr_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own okr_goals" ON okr_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own okr_goals" ON okr_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own okr_goals" ON okr_goals FOR DELETE USING (auth.uid() = user_id);

-- okr_milestones policies (via goal ownership)
CREATE POLICY "Users can view own okr_milestones" ON okr_milestones FOR SELECT
  USING (EXISTS (SELECT 1 FROM okr_goals WHERE id = okr_milestones.goal_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own okr_milestones" ON okr_milestones FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM okr_goals WHERE id = okr_milestones.goal_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own okr_milestones" ON okr_milestones FOR UPDATE
  USING (EXISTS (SELECT 1 FROM okr_goals WHERE id = okr_milestones.goal_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own okr_milestones" ON okr_milestones FOR DELETE
  USING (EXISTS (SELECT 1 FROM okr_goals WHERE id = okr_milestones.goal_id AND user_id = auth.uid()));

-- prompt_vault policies
CREATE POLICY "Users can view own prompt_vault" ON prompt_vault FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prompt_vault" ON prompt_vault FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prompt_vault" ON prompt_vault FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own prompt_vault" ON prompt_vault FOR DELETE USING (auth.uid() = user_id);

-- components policies
CREATE POLICY "Users can view own components" ON components FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own components" ON components FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own components" ON components FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own components" ON components FOR DELETE USING (auth.uid() = user_id);

-- leads policies (allow public insert for webhook, owner can read)
CREATE POLICY "Users can view own leads" ON leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can insert leads" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own leads" ON leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own leads" ON leads FOR DELETE USING (auth.uid() = user_id);

-- user_settings policies
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- 4. DEFAULT DATA — Prompt Vault presets
-- ============================================================

-- NOTE: Prompt vault default data akan di-insert per-user saat pertama login
-- via aplikasi (server-side), bukan di sini.

-- ============================================================
-- 5. FUNCTIONS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_crm_deals_updated_at BEFORE UPDATE ON crm_deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prompt_vault_updated_at BEFORE UPDATE ON prompt_vault
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_components_updated_at BEFORE UPDATE ON components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
