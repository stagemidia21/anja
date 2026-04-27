-- Memória acumulada de conversas da Anja
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_memory TEXT;
