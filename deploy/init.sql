-- ═══════════════════════════════════════════════════════════════
-- HANOI LAB PRO — Database Schema
-- ═══════════════════════════════════════════════════════════════

-- ── PostgREST anonymous role ──────────────────────────────────
CREATE ROLE web_anon NOLOGIN;
GRANT web_anon TO aidev_techthai;

-- ── API Schema ────────────────────────────────────────────────
CREATE SCHEMA api;
GRANT USAGE ON SCHEMA api TO web_anon;

-- ─────────────────────────────────────────────────────────────
-- 📋 Formulas — สูตรคำนวณ
-- ─────────────────────────────────────────────────────────────
CREATE TABLE api.formulas (
  id          TEXT         PRIMARY KEY,
  name        TEXT         NOT NULL,
  expression  TEXT         NOT NULL,
  sort_order  INTEGER      DEFAULT 0,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON api.formulas TO web_anon;

-- seed default formulas
INSERT INTO api.formulas (id, name, expression, sort_order) VALUES
  ('f1', 'สูตรหลัก (ล่าง)', '[B1] + [B2]', 1),
  ('f2', 'สูตรเน้นบน',       '[T1] + [T3]', 2);

-- ─────────────────────────────────────────────────────────────
-- 📊 App Settings — ค่าตั้งค่าแอป (active formula ฯลฯ)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE api.app_settings (
  key    TEXT  PRIMARY KEY,
  value  TEXT  NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON api.app_settings TO web_anon;

INSERT INTO api.app_settings (key, value) VALUES
  ('active_formula_id', 'f1');

-- ─────────────────────────────────────────────────────────────
-- 📅 Daily Results — บันทึกประจำวัน
-- ─────────────────────────────────────────────────────────────
CREATE TABLE api.daily_results (
  id           BIGSERIAL    PRIMARY KEY,
  formula_id   TEXT         NOT NULL DEFAULT 'f1',
  date         DATE         NOT NULL,
  tv_top       TEXT         NOT NULL DEFAULT '',
  tv_bottom    TEXT         NOT NULL DEFAULT '',
  special      TEXT         DEFAULT '',
  normal       TEXT         DEFAULT '',
  vip          TEXT         DEFAULT '',
  sum_val      INTEGER      DEFAULT 0,
  final_digit  INTEGER      DEFAULT 0,
  swipe        TEXT         DEFAULT '',
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_daily_results_date ON api.daily_results (date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON api.daily_results     TO web_anon;
GRANT USAGE, SELECT ON SEQUENCE api.daily_results_id_seq      TO web_anon;

-- seed one example row
INSERT INTO api.daily_results
  (id, formula_id, date, tv_top, tv_bottom, special, normal, vip, sum_val, final_digit, swipe)
VALUES
  (1, 'f1', '2026-02-11', '445', '22', '114-00', '552-32', '', 4, 4, '4-5');

SELECT setval('api.daily_results_id_seq', 100);

-- ─────────────────────────────────────────────────────────────
-- 📈 Historical Data — ข้อมูล Backtest ย้อนหลัง
-- ─────────────────────────────────────────────────────────────
CREATE TABLE api.historical_data (
  id         BIGSERIAL  PRIMARY KEY,
  date       DATE       UNIQUE NOT NULL,
  tv_top     TEXT       NOT NULL DEFAULT '',
  tv_bottom  TEXT       NOT NULL DEFAULT '',
  special    TEXT       DEFAULT '',
  normal     TEXT       DEFAULT '',
  vip        TEXT       DEFAULT ''
);

CREATE INDEX idx_historical_data_date ON api.historical_data (date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON api.historical_data     TO web_anon;
GRANT USAGE, SELECT ON SEQUENCE api.historical_data_id_seq      TO web_anon;
