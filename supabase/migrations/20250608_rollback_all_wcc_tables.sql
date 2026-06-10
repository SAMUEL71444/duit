-- ============================================================
-- ROLLBACK LENGKAP — hapus SEMUA tabel Wealth Command Center
-- Jalankan di Supabase SQL Editor project yang SALAH / mau dibersihkan
--
-- ⚠️  PERINGATAN: Menghapus SEMUA data app (CRM, revenue, budget, dll.)
--     auth.users TIDAK dihapus — akun login tetap ada
-- ============================================================

-- Anak (punya foreign key) — drop dulu
DROP TABLE IF EXISTS budget_transactions CASCADE;
DROP TABLE IF EXISTS time_logs CASCADE;
DROP TABLE IF EXISTS okr_milestones CASCADE;
DROP TABLE IF EXISTS key_results CASCADE;
DROP TABLE IF EXISTS dca_executions CASCADE;

-- Parent & tabel standalone
DROP TABLE IF EXISTS budget_categories CASCADE;
DROP TABLE IF EXISTS crm_deals CASCADE;
DROP TABLE IF EXISTS okr_goals CASCADE;
DROP TABLE IF EXISTS okrs CASCADE;
DROP TABLE IF EXISTS dca_schedules CASCADE;
DROP TABLE IF EXISTS income_entries CASCADE;
DROP TABLE IF EXISTS portfolio_transactions CASCADE;
DROP TABLE IF EXISTS portfolio_holdings CASCADE;
DROP TABLE IF EXISTS weekly_reviews CASCADE;
DROP TABLE IF EXISTS prompts CASCADE;
DROP TABLE IF EXISTS prompt_vault CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;
DROP TABLE IF EXISTS components CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;

NOTIFY pgrst, 'reload schema';

-- Verifikasi: harus 0 baris (semua tabel WCC sudah hilang)
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'income_entries', 'budget_categories', 'budget_transactions',
    'crm_deals', 'time_logs',
    'portfolio_transactions', 'portfolio_holdings',
    'dca_schedules', 'dca_executions',
    'okr_goals', 'okr_milestones', 'okrs', 'key_results',
    'weekly_reviews', 'prompts', 'prompt_vault',
    'subscriptions', 'proposals',
    'components', 'leads', 'user_settings'
  )
ORDER BY table_name;
