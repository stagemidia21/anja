/**
 * Aplica o schema SQL no Supabase via pg connection string
 * Uso: node scripts/apply-schema.mjs
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://szsspwvvicfzxwspwpbe.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6c3Nwd3Z2aWNmenh3c3B3cGJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTU5MzI1MiwiZXhwIjoyMDkxMTY5MjUyfQ.KGLvPRatEHpVVtq7d6i1pVT7w7CX2xSOy1IVaRhwnAg';

const sql = readFileSync('supabase/migrations/00001_initial_schema.sql', 'utf8');

// Supabase REST API não executa SQL bruto — usar fetch direto no endpoint de admin
const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/pg_query`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'apikey': SERVICE_KEY,
  },
  body: JSON.stringify({ sql }),
});

if (!response.ok) {
  // Tentar via direct db connection info
  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text);
  console.log('\n--- INSTRUÇÃO MANUAL ---');
  console.log('Cole o conteúdo de supabase/migrations/00001_initial_schema.sql');
  console.log('no SQL Editor: https://supabase.com/dashboard/project/szsspwvvicfzxwspwpbe/sql/new');
} else {
  console.log('Schema aplicado com sucesso!');
}
