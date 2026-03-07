-- ═══════════════════════════════════════════════════════════════
-- HANOI LAB PRO — PostgreSQL Schema
-- ═══════════════════════════════════════════════════════════════

-- Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────────
-- 1. FORMULAS — สูตรคำนวณ
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS formulas (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,
    expression  VARCHAR(500) NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  formulas IS 'สูตรคำนวณแนวทางรูด';
COMMENT ON COLUMN formulas.expression IS 'เช่น [B1]+[B2], [T1]+[T3]  — ใช้ token [T1-T3]=บน, [B1-B2]=ล่าง';

-- ────────────────────────────────────────────────────────────────
-- 2. HISTORICAL_DATA — ผลฮานอยย้อนหลัง (ใช้ Backtest)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS historical_data (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    draw_date   DATE NOT NULL UNIQUE,          -- วันที่ออกผล
    tv_top      CHAR(3) NOT NULL,              -- ผลบน 3 หลัก
    tv_bottom   CHAR(2) NOT NULL,              -- ผลล่าง 2 หลัก
    special     VARCHAR(10),                   -- นอยพิเศษ (เช่น 402-24)
    normal      VARCHAR(10),                   -- นอยปกติ
    vip         VARCHAR(10),                   -- นอย VIP
    source      VARCHAR(50) DEFAULT 'manual',  -- 'manual' | 'csv_import'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  historical_data IS 'ผลหวยฮานอยย้อนหลัง สำหรับทดสอบสูตร';
COMMENT ON COLUMN historical_data.tv_top    IS 'ผลบน 3 ตัว เช่น 898';
COMMENT ON COLUMN historical_data.tv_bottom IS 'ผลล่าง 2 ตัว เช่น 69';
COMMENT ON COLUMN historical_data.special   IS 'เลขนอยพิเศษ เช่น 402-24';

CREATE INDEX IF NOT EXISTS idx_historical_date ON historical_data (draw_date DESC);

-- ────────────────────────────────────────────────────────────────
-- 3. DAILY_RESULTS — บันทึกประจำวัน
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_results (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    formula_id   UUID REFERENCES formulas(id) ON DELETE SET NULL,
    result_date  DATE NOT NULL,
    tv_top       CHAR(3) NOT NULL,
    tv_bottom    CHAR(2) NOT NULL,
    special      VARCHAR(10),
    normal       VARCHAR(10),
    vip          VARCHAR(10),
    -- คำนวณ
    formula_sum  INT,                          -- ผลรวม raw
    final_digit  SMALLINT CHECK (final_digit BETWEEN 0 AND 9),  -- เลขท้าย (0-9)
    swipe        VARCHAR(5),                   -- แนวทางรูด เช่น "4-5"
    is_hit       BOOLEAN DEFAULT false,        -- ถูกหรือไม่
    notes        TEXT,                         -- หมายเหตุ
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  daily_results IS 'บันทึกผลและคำนวณรายวัน';
COMMENT ON COLUMN daily_results.swipe    IS 'แนวทางรูด เช่น 4-5 (digit-pair)';
COMMENT ON COLUMN daily_results.is_hit   IS 'true = สูตรเข้า, false = หลุด';

CREATE INDEX IF NOT EXISTS idx_daily_date      ON daily_results (result_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_formula   ON daily_results (formula_id);
CREATE INDEX IF NOT EXISTS idx_daily_swipe     ON daily_results (swipe);

-- ────────────────────────────────────────────────────────────────
-- 4. BACKTEST_RUNS — บันทึก Backtest แต่ละครั้ง
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS backtest_runs (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    formula_id    UUID REFERENCES formulas(id) ON DELETE CASCADE,
    total_days    INT NOT NULL DEFAULT 0,
    hit_count     INT NOT NULL DEFAULT 0,
    accuracy_pct  NUMERIC(5,2),               -- % ความแม่นยำ
    date_from     DATE,
    date_to       DATE,
    run_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE backtest_runs IS 'ผลสรุปการ Backtest แต่ละสูตร';

-- ────────────────────────────────────────────────────────────────
-- 5. VIEW: backtest_summary — สรุปสถิติสูตรทั้งหมด
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW backtest_summary AS
SELECT
    f.id            AS formula_id,
    f.name          AS formula_name,
    f.expression,
    COUNT(h.id)     AS total_days,
    SUM(CASE
        WHEN (
            (h.special IS NOT NULL AND h.special != '' AND (
                SPLIT_PART(d.swipe, '-', 1) = ANY(STRING_TO_ARRAY(h.special, '-')) OR
                SPLIT_PART(d.swipe, '-', 2) = ANY(STRING_TO_ARRAY(h.special, '-'))
            )) OR
            (h.normal IS NOT NULL AND h.normal != '' AND (
                SPLIT_PART(d.swipe, '-', 1) = ANY(STRING_TO_ARRAY(h.normal, '-')) OR
                SPLIT_PART(d.swipe, '-', 2) = ANY(STRING_TO_ARRAY(h.normal, '-'))
            )) OR
            (h.vip IS NOT NULL AND h.vip != '' AND (
                SPLIT_PART(d.swipe, '-', 1) = ANY(STRING_TO_ARRAY(h.vip, '-')) OR
                SPLIT_PART(d.swipe, '-', 2) = ANY(STRING_TO_ARRAY(h.vip, '-'))
            ))
        ) THEN 1 ELSE 0
    END)            AS hits,
    ROUND(
        SUM(CASE WHEN d.is_hit THEN 1 ELSE 0 END)::NUMERIC /
        NULLIF(COUNT(d.id), 0) * 100, 1
    )               AS accuracy_pct
FROM formulas f
LEFT JOIN daily_results d ON d.formula_id = f.id
LEFT JOIN historical_data h ON h.draw_date = d.result_date
GROUP BY f.id, f.name, f.expression;

-- ────────────────────────────────────────────────────────────────
-- 6. FUNCTION: auto-update updated_at timestamp
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_formulas_updated_at
    BEFORE UPDATE ON formulas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
