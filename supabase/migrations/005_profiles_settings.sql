-- Configurações do perfil do usuário
-- Colunas de horário de trabalho (podem já existir se adicionadas via UI)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_start TEXT DEFAULT '08:00';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_end TEXT DEFAULT '18:00';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lunch_start TEXT DEFAULT '12:00';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lunch_end TEXT DEFAULT '13:00';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS work_days INTEGER[] DEFAULT '{1,2,3,4,5}';

-- ID do Google Calendar do usuário (para multi-tenant)
-- O usuário precisa compartilhar o calendário com a service account
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;
