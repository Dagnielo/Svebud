-- Migration 011 — AI-insikter cache + rate limiting för /statistik
-- Körs manuellt via Supabase Dashboard SQL Editor (per CLAUDE.md)

CREATE TABLE IF NOT EXISTS ai_insikter_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  användar_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  insikter JSONB,
  skapad TIMESTAMPTZ DEFAULT NOW(),
  antal_avslutade_anbud INTEGER,
  tvingad BOOLEAN DEFAULT false
);

ALTER TABLE ai_insikter_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_insikter_egna" ON ai_insikter_cache;
CREATE POLICY "ai_insikter_egna" ON ai_insikter_cache
  FOR ALL USING (användar_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_ai_insikter_user
  ON ai_insikter_cache(användar_id, skapad DESC);
