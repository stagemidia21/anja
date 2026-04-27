-- ============================================================
-- 007: Chat sessions (renomeia conversations → chat_sessions)
--      + session_id opcional em messages
--      + push_subscriptions para Web Push
-- ============================================================

-- 1. Cria chat_sessions compatível com a API atual
CREATE TABLE IF NOT EXISTS chat_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title       TEXT        DEFAULT 'Nova conversa',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_sessions_select" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "chat_sessions_insert" ON chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "chat_sessions_update" ON chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "chat_sessions_delete" ON chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id, updated_at DESC);

-- 2. Adiciona session_id às messages (nullable — msgs antigas não têm sessão)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE;

-- Torna conversation_id nullable para compatibilidade futura
ALTER TABLE messages ALTER COLUMN conversation_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_user_nosession ON messages(user_id, created_at) WHERE session_id IS NULL;

-- 3. Adiciona scheduled_at às tasks se ainda não existe
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- 4. Push subscriptions — armazena PushSubscription por usuário/device
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint    TEXT        NOT NULL UNIQUE,
  p256dh      TEXT        NOT NULL,
  auth        TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_sub_select" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "push_sub_insert" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_sub_delete" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_push_sub_user ON push_subscriptions(user_id);
