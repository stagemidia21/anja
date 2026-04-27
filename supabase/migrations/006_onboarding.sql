-- Controle de onboarding por usuário
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;

-- Marca todos os usuários existentes como já onboardados
-- (não queremos redirecionar quem já usa o app)
UPDATE profiles SET onboarded_at = NOW() WHERE onboarded_at IS NULL;
