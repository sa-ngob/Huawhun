// ═══════════════════════════════════════════════════════════════
// PostgREST API Utility — Hanoi Lab Pro
// ═══════════════════════════════════════════════════════════════

const BASE = '/api';

const headers = {
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
};

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} ${path} failed: ${res.status} ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// ─── Daily Results ─────────────────────────────────────────────
export const api = {
  // Daily Results
  async getDailyResults() {
    return req('GET', '/daily_results?order=created_at.desc');
  },
  async addDailyResult(data) {
    const rows = await req('POST', '/daily_results', {
      formula_id:  data.formulaId,
      date:        data.date,
      tv_top:      data.tvTop,
      tv_bottom:   data.tvBottom,
      special:     data.special || '',
      normal:      data.normal  || '',
      vip:         data.vip     || '',
      sum_val:     data.sum,
      final_digit: data.finalDigit,
      swipe:       data.swipe,
    });
    const row = rows[0];
    return { ...data, id: row.id };
  },
  async updateDailyResult(id, prizes) {
    await req('PATCH', `/daily_results?id=eq.${id}`, {
      special: prizes.special || '',
      normal:  prizes.normal  || '',
      vip:     prizes.vip     || '',
    });
  },
  async deleteDailyResult(id) {
    await req('DELETE', `/daily_results?id=eq.${id}`);
  },

  // Historical Data
  async getHistoricalData() {
    return req('GET', '/historical_data?order=date.desc');
  },
  async upsertHistoricalRows(rows) {
    // PostgREST upsert by unique key (date)
    await req('POST', '/historical_data?on_conflict=date', rows.map(r => ({
      date:      r.date,
      tv_top:    r.tvTop    || r.tv_top    || '',
      tv_bottom: r.tvBottom || r.tv_bottom || '',
      special:   r.special  || '',
      normal:    r.normal   || '',
      vip:       r.vip      || '',
    })));
  },
  async updateHistoricalPrizes(date, prizes) {
    await req('PATCH', `/historical_data?date=eq.${date}`, {
      special: prizes.special || '',
      normal:  prizes.normal  || '',
      vip:     prizes.vip     || '',
    });
  },

  // Formulas
  async getFormulas() {
    return req('GET', '/formulas?order=sort_order.asc');
  },
  async upsertFormula(formula) {
    await req('POST', '/formulas?on_conflict=id', {
      id:         formula.id,
      name:       formula.name,
      expression: formula.expression,
      sort_order: formula.sortOrder || 0,
    });
  },
  async deleteFormula(id) {
    await req('DELETE', `/formulas?id=eq.${id}`);
  },

  // App Settings
  async getSetting(key) {
    const rows = await req('GET', `/app_settings?key=eq.${key}`);
    return rows[0]?.value ?? null;
  },
  async setSetting(key, value) {
    await req('POST', `/app_settings?on_conflict=key`, { key, value: String(value) });
  },
};

// ─── Data shape converters (DB → App) ──────────────────────────
export function dbToResult(row) {
  return {
    id:          row.id,
    formulaId:   row.formula_id,
    date:        row.date,
    tvTop:       row.tv_top,
    tvBottom:    row.tv_bottom,
    special:     row.special,
    normal:      row.normal,
    vip:         row.vip,
    sum:         row.sum_val,
    finalDigit:  row.final_digit,
    swipe:       row.swipe,
  };
}

export function dbToHistorical(row) {
  return {
    date:       row.date,
    tvTop:      row.tv_top,
    tvBottom:   row.tv_bottom,
    special:    row.special,
    normal:     row.normal,
    vip:        row.vip,
  };
}

export function dbToFormula(row) {
  return {
    id:         row.id,
    name:       row.name,
    expression: row.expression,
  };
}
