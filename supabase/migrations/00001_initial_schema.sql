-- ============================================================
-- Anja — Schema inicial do Supabase
-- Migration: 00001_initial_schema
-- Contém: todas as tabelas do MVP, RLS, functions e trigger
-- ============================================================

-- ============================================================
-- TABELA: profiles (extende auth.users)
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  custom_name TEXT,          -- whitelabel (RF-08)
  custom_logo_url TEXT,      -- whitelabel (RF-08)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_delete" ON profiles
  FOR DELETE USING (auth.uid() = id);

-- ============================================================
-- TABELA: user_plans (plano e limites por usuário)
-- ============================================================

CREATE TABLE user_plans (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'essencial', 'executivo', 'agencias')),
  message_limit INTEGER NOT NULL DEFAULT 30,
  task_limit INTEGER NOT NULL DEFAULT 10,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_plans_select" ON user_plans
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "user_plans_insert" ON user_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_plans_update" ON user_plans
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "user_plans_delete" ON user_plans
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TABELA: oauth_tokens (tokens Google OAuth2)
-- ============================================================

CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  access_token TEXT NOT NULL,
  refresh_token TEXT,        -- pode ser NULL se offline access não foi concedido
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oauth_tokens_select" ON oauth_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "oauth_tokens_insert" ON oauth_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "oauth_tokens_update" ON oauth_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "oauth_tokens_delete" ON oauth_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TABELA: conversations (sessões de chat com a Anja)
-- ============================================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations_update" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "conversations_delete" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TABELA: messages (histórico de mensagens — append-only)
-- ============================================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  tool_invocations JSONB,    -- armazena chamadas de tool use para UI inline
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Mensagens são append-only: sem UPDATE ou DELETE por design

-- ============================================================
-- TABELA: tasks (tarefas no kanban)
-- ============================================================

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('alta', 'media', 'baixa')),
  category TEXT,
  status TEXT NOT NULL DEFAULT 'fazer' CHECK (status IN ('fazer', 'fazendo', 'feito')),
  due_date DATE,
  position INTEGER NOT NULL DEFAULT 0,  -- para ordenação no drag-and-drop
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "tasks_insert" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_update" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "tasks_delete" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- TABELA: usage_monthly (contagem de mensagens por período)
-- ============================================================

CREATE TABLE usage_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  year_month TEXT NOT NULL,  -- ex: '2026-04' — chave natural para reset mensal sem cron
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year_month)
);

ALTER TABLE usage_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_monthly_select" ON usage_monthly
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "usage_monthly_insert" ON usage_monthly
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "usage_monthly_update" ON usage_monthly
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "usage_monthly_delete" ON usage_monthly
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES de performance
-- ============================================================

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_usage_monthly_user ON usage_monthly(user_id, year_month);
CREATE INDEX idx_conversations_user ON conversations(user_id, updated_at DESC);

-- ============================================================
-- FUNCTION: check_and_increment_usage
-- Atômica com FOR UPDATE para prevenir race conditions (RF-02.7)
-- SECURITY DEFINER para acessar user_plans sem expor RLS
-- Limites por plano: free=30, essencial=200, executivo/agencias=-1 (ilimitado)
-- ============================================================

CREATE OR REPLACE FUNCTION check_and_increment_usage(
  p_user_id UUID,
  p_year_month TEXT
) RETURNS JSONB AS $$
DECLARE
  v_plan TEXT;
  v_limit INTEGER;
  v_current INTEGER;
BEGIN
  -- Verificar que o chamador é o próprio usuário (segurança)
  IF auth.uid() IS NOT NULL AND auth.uid() != p_user_id THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'error', 'Não autorizado'
    );
  END IF;

  -- Pegar plano e limite do usuário
  SELECT plan, message_limit INTO v_plan, v_limit
  FROM user_plans WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- Usuário sem plano registrado — assumir free com limite padrão
    v_plan := 'free';
    v_limit := 30;
  END IF;

  -- Planos ilimitados (-1 = sem limite): executivo e agencias
  IF v_limit = -1 THEN
    -- Registrar uso sem verificar limite
    INSERT INTO usage_monthly (user_id, year_month, message_count)
    VALUES (p_user_id, p_year_month, 1)
    ON CONFLICT (user_id, year_month)
    DO UPDATE SET
      message_count = usage_monthly.message_count + 1,
      updated_at = NOW();

    SELECT message_count INTO v_current
    FROM usage_monthly
    WHERE user_id = p_user_id AND year_month = p_year_month;

    RETURN jsonb_build_object(
      'allowed', true,
      'current', v_current,
      'limit', -1,
      'plan', v_plan
    );
  END IF;

  -- Garantir que a linha existe para o período antes do lock
  INSERT INTO usage_monthly (user_id, year_month, message_count)
  VALUES (p_user_id, p_year_month, 0)
  ON CONFLICT (user_id, year_month) DO NOTHING;

  -- Pegar contagem atual com lock exclusivo para prevenir race condition
  SELECT message_count INTO v_current
  FROM usage_monthly
  WHERE user_id = p_user_id AND year_month = p_year_month
  FOR UPDATE;

  -- Verificar se o limite foi atingido
  IF v_current >= v_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'current', v_current,
      'limit', v_limit,
      'plan', v_plan
    );
  END IF;

  -- Incrementar atomicamente
  UPDATE usage_monthly
  SET message_count = message_count + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id AND year_month = p_year_month;

  RETURN jsonb_build_object(
    'allowed', true,
    'current', v_current + 1,
    'limit', v_limit,
    'plan', v_plan
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION + TRIGGER: handle_new_user
-- Cria automaticamente profile e user_plan no signup (RF-01)
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );

  INSERT INTO user_plans (user_id, plan, message_limit, task_limit)
  VALUES (NEW.id, 'free', 30, 10);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
