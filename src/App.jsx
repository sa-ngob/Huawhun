import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Trash2, History,
  TrendingUp, Layers,
  BarChart3, Upload, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, FlaskConical,
  Edit3, X, Save, Download
} from 'lucide-react';

const INITIAL_HISTORICAL = [
  { date: '2026-02-10', tvTop: '898', tvBottom: '69', special: '402-24', normal: '390-87', vip: '123-45' },
  { date: '2026-02-09', tvTop: '640', tvBottom: '87', special: '672-39', normal: '901-98', vip: '116-03' },
  { date: '2026-02-08', tvTop: '142', tvBottom: '43', special: '052-44', normal: '977-61', vip: '063-59' },
  { date: '2026-02-07', tvTop: '944', tvBottom: '47', special: '187-23', normal: '385-16', vip: '282-78' },
  { date: '2026-02-06', tvTop: '887', tvBottom: '85', special: '273-50', normal: '133-78', vip: '598-00' },
  { date: '2026-02-05', tvTop: '455', tvBottom: '61', special: '696-22', normal: '268-14', vip: '009-17' },
  { date: '2026-02-04', tvTop: '377', tvBottom: '83', special: '882-83', normal: '517-20', vip: '061-36' },
  { date: '2026-02-03', tvTop: '092', tvBottom: '81', special: '040-55', normal: '648-55', vip: '189-67' },
  { date: '2026-02-02', tvTop: '031', tvBottom: '30', special: '038-93', normal: '461-58', vip: '082-81' },
  { date: '2026-02-01', tvTop: '791', tvBottom: '37', special: '373-45', normal: '377-03', vip: '651-65' },
];

const PAIR_MAP = { 0: 2, 1: 7, 2: 0, 3: 8, 4: 5, 5: 4, 6: 9, 7: 1, 8: 3, 9: 6 };

/* ──────────────── LOCAL STORAGE HOOK ──────────────── */
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (e) { console.warn('localStorage error:', e); }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

const getSingleDigit = (num) => {
  if (num < 10) return num;
  const s = num.toString().split('').map(Number).reduce((a, b) => a + b, 0);
  return s >= 10 ? getSingleDigit(s) : s;
};

const evaluateFormula = (top, bottom, expr) => {
  try {
    if (!top || !bottom || top.length < 3 || bottom.length < 2) return 0;
    let expression = expr
      .replace(/\[T1\]/g, top[0]).replace(/\[T2\]/g, top[1]).replace(/\[T3\]/g, top[2])
      .replace(/\[B1\]/g, bottom[0]).replace(/\[B2\]/g, bottom[1]);
    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${expression}`)();
    return Math.abs(Math.round(result));
  } catch { return 0; }
};

const checkHit = (swipe, spec, norm, v) => {
  if (!swipe) return false;
  const digits = swipe.split('-');
  const combined = `${spec || ''}-${norm || ''}-${v || ''}`;
  return digits.some(d => combined.includes(d));
};

/* ──────────────── CSV PARSER ──────────────── */
const parseCSV = (text) => {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return null;
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
    if (obj.date) rows.push({
      date: obj.date,
      tvTop: obj.tvtop || obj.tv_top || obj.top || '',
      tvBottom: obj.tvbottom || obj.tv_bottom || obj.bottom || '',
      special: obj.special || '',
      normal: obj.normal || '',
      vip: obj.vip || '',
    });
  }
  return rows.length ? rows : null;
};

/* ════════════════════════════════════════════════
   PRIZE EDIT MODAL — popup แก้ไขผลรางวัล
   ════════════════════════════════════════════════ */
function PrizeEditModal({ target, swipe, onSave, onClose }) {
  const [form, setForm] = useState({
    special: target?.special || '',
    normal:  target?.normal  || '',
    vip:     target?.vip     || '',
  });
  const firstRef = useRef(null);

  // Focus first input & block body scroll
  useEffect(() => {
    firstRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  const FIELDS = [
    { key: 'special', label: 'นอยพิเศษ', icon: '🥇', color: 'from-amber-400 to-orange-400', ring: 'focus:ring-amber-200 focus:border-amber-400', bg: 'bg-amber-50' },
    { key: 'normal',  label: 'นอยปกติ',  icon: '🥈', color: 'from-sky-400 to-blue-400',    ring: 'focus:ring-sky-200 focus:border-sky-400',    bg: 'bg-sky-50'  },
    { key: 'vip',     label: 'นอย VIP',   icon: '👑', color: 'from-purple-400 to-violet-500', ring: 'focus:ring-purple-200 focus:border-purple-400', bg: 'bg-purple-50' },
  ];

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Modal box */}
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
        style={{ animation: 'modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-white font-black text-lg">
              <Edit3 className="w-5 h-5" />
              แก้ไขผลรางวัล
            </div>
            {target?.date && (
              <p className="text-indigo-200 text-xs mt-0.5 font-medium">
                วันที่ {target.date}
                {swipe && <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full font-mono">รูด: {swipe}</span>}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-[11px] text-slate-400 font-medium uppercase tracking-widest">
            รูปแบบ: ตัวเลข-ตัวเลข เช่น <span className="font-mono text-indigo-500">402-24</span>
          </p>

          {FIELDS.map(({ key, label, icon, color, ring, bg }, i) => {
            const isHit = checkHit(swipe, form[key], '', '');
            return (
              <div key={key}>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1.5">
                  <span className={`w-6 h-6 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-sm`}>
                    {icon}
                  </span>
                  {label}
                  {isHit && (
                    <span className="ml-auto inline-flex items-center gap-1 bg-green-100 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> เข้า!
                    </span>
                  )}
                </label>
                <input
                  ref={i === 0 ? firstRef : null}
                  type="text"
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={`กรอก${label}...`}
                  className={`w-full ${bg} border-2 border-slate-100 rounded-2xl px-4 py-3 text-sm font-mono font-bold text-slate-700 outline-none ring-4 ring-transparent ${ring} transition-all ${isHit ? 'border-green-300 bg-green-50' : ''}`}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                />
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:from-indigo-700 hover:to-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            บันทึก
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.88) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ──────────────── PRIZE BADGES (clickable) ──────────────── */
function PrizeBadges({ swipe, special, normal, vip, onEdit }) {
  const items = [
    { val: special, label: 'พ', key: 'special' },
    { val: normal,  label: 'ก', key: 'normal'  },
    { val: vip,     label: 'V', key: 'vip'     },
  ];
  return (
    <button
      onClick={onEdit}
      title="คลิกเพื่อแก้ไขผลรางวัล"
      className="flex flex-wrap gap-1 group/prizes cursor-pointer"
    >
      {items.map(({ val, label }, i) => {
        const isHit = checkHit(swipe, val || '', '', '');
        return (
          <span key={i}
            className={`text-[10px] px-2 py-0.5 rounded-lg font-bold transition-all
              group-hover/prizes:ring-2 group-hover/prizes:ring-indigo-300 group-hover/prizes:ring-offset-1
              ${isHit
                ? 'bg-green-100 text-green-700 ring-1 ring-green-300'
                : 'bg-slate-100 text-slate-400 group-hover/prizes:bg-slate-200'
              }`}
          >
            {label}: {val || '–'}
          </span>
        );
      })}
      {/* Edit hint icon */}
      <span className="opacity-0 group-hover/prizes:opacity-100 transition-opacity text-indigo-400 flex items-center ml-0.5">
        <Edit3 className="w-3 h-3" />
      </span>
    </button>
  );
}

/* ──────────────── COMPONENTS ──────────────── */

function WinRateCard({ stats }) {
  const pct = parseFloat(stats.accuracy);
  const color = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div className="relative flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-8 rounded-3xl shadow-2xl shadow-indigo-300 min-w-[180px] overflow-hidden pulse-glow">
      <div className="absolute inset-0 opacity-10">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute rounded-full border border-white"
            style={{ width: `${(i + 1) * 40}px`, height: `${(i + 1) * 40}px`, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
        ))}
      </div>
      <span className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1 z-10">Win Rate</span>
      <div className="text-6xl font-black z-10" style={{ color }}>{stats.accuracy}%</div>
      <span className="text-indigo-200 text-[11px] mt-2 z-10">จากสถิติ {stats.total} งวด</span>
      <div className="flex gap-3 mt-3 z-10">
        <span className="bg-green-500/20 text-green-300 text-xs px-2 py-0.5 rounded-full font-bold">✓ {stats.hits}</span>
        <span className="bg-red-400/20 text-red-300 text-xs px-2 py-0.5 rounded-full font-bold">✗ {stats.total - stats.hits}</span>
      </div>
    </div>
  );
}

function FormulaEditor({ formulas, setFormulas, activeFormulaId, setActiveFormulaId }) {
  const current = formulas.find(f => f.id === activeFormulaId) || formulas[0];

  const addFormula = () => {
    const newF = { id: `f${Date.now()}`, name: 'สูตรใหม่', expression: '[B1]+[B2]' };
    setFormulas([...formulas, newF]);
    setActiveFormulaId(newF.id);
  };

  const removeFormula = (id) => {
    if (formulas.length <= 1) return;
    const next = formulas.filter(f => f.id !== id);
    setFormulas(next);
    if (activeFormulaId === id) setActiveFormulaId(next[0].id);
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-indigo-50 border border-indigo-50 p-5 md:p-7 mb-6">
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="flex-1 w-full min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">สูตรที่กำลังทดสอบ</span>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {formulas.map(f => (
              <div key={f.id} className="relative group">
                <button
                  onClick={() => setActiveFormulaId(f.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all pr-8 ${activeFormulaId === f.id
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-500'}`}
                >
                  {f.name}
                </button>
                {formulas.length > 1 && (
                  <button onClick={() => removeFormula(f.id)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-current opacity-50 hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-black">✕</span>
                  </button>
                )}
              </div>
            ))}
            <button onClick={addFormula}
              className="w-8 h-8 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-400 transition-all">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={current?.name || ''}
              onChange={e => setFormulas(formulas.map(f => f.id === activeFormulaId ? { ...f, name: e.target.value } : f))}
              placeholder="ชื่อสูตร"
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all"
            />
            <div className="relative">
              <input
                type="text"
                value={current?.expression || ''}
                onChange={e => setFormulas(formulas.map(f => f.id === activeFormulaId ? { ...f, expression: e.target.value } : f))}
                placeholder="[B1]+[B2]"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-mono text-lg font-bold text-indigo-700 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all pr-36"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-400 hidden sm:block">
                [T1-3]=บน · [B1-2]=ล่าง
              </span>
            </div>
            <p className="text-[11px] text-slate-400 ml-1 sm:hidden">[T1-3] = ตัวบน · [B1-2] = ตัวล่าง</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────── DAILY TAB ──────────────── */
function DailyTab({ results, setResults, formulas, activeFormulaId, formData, setFormData }) {
  const currentFormula = formulas.find(f => f.id === activeFormulaId) || formulas[0];
  const [editTarget, setEditTarget] = useState(null); // { id, date, special, normal, vip, swipe }

  const handleAdd = () => {
    if (!formData.tvTop || !formData.tvBottom) return;
    const sum = evaluateFormula(formData.tvTop, formData.tvBottom, currentFormula.expression);
    const digit = getSingleDigit(sum);
    const swipe = `${digit}-${PAIR_MAP[digit]}`;
    setResults([{
      id: Date.now(),
      formulaId: activeFormulaId,
      ...formData,
      sum, finalDigit: digit, swipe
    }, ...results]);
    setFormData(d => ({ ...d, tvTop: '', tvBottom: '', special: '', normal: '', vip: '' }));
  };

  const handlePrizeSave = (newPrizes) => {
    setResults(rs => rs.map(r =>
      r.id === editTarget.id ? { ...r, ...newPrizes } : r
    ));
  };

  const [showForm, setShowForm] = useState(true);

  return (
    <>
      {/* Prize Edit Modal */}
      {editTarget && (
        <PrizeEditModal
          target={editTarget}
          swipe={editTarget.swipe}
          onSave={handlePrizeSave}
          onClose={() => setEditTarget(null)}
        />
      )}

      <div className="flex flex-col lg:flex-row gap-6 animate-fadein">
        {/* Form panel */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
            <button
              onClick={() => setShowForm(v => !v)}
              className="w-full flex items-center justify-between px-6 py-4 font-bold text-slate-700 hover:bg-slate-50 transition-colors lg:cursor-default"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-500" /> บันทึกผลวันนี้
              </span>
              <span className="lg:hidden">{showForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
            </button>

            <div className={`px-6 pb-6 space-y-3 ${showForm ? 'block' : 'hidden lg:block'}`}>
              <input
                type="date"
                value={formData.date}
                onChange={e => setFormData(d => ({ ...d, date: e.target.value }))}
                className="w-full p-3 bg-slate-50 rounded-xl text-sm border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
              />
              <div className="grid grid-cols-2 gap-2">
                <input type="text" maxLength={3} placeholder="บน (3 หลัก)"
                  value={formData.tvTop}
                  onChange={e => setFormData(d => ({ ...d, tvTop: e.target.value }))}
                  className="p-3 bg-slate-50 rounded-xl text-center font-bold text-sm border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <input type="text" maxLength={2} placeholder="ล่าง (2)"
                  value={formData.tvBottom}
                  onChange={e => setFormData(d => ({ ...d, tvBottom: e.target.value }))}
                  className="p-3 bg-indigo-50 rounded-xl text-center font-bold text-indigo-700 text-sm border border-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div className="border-t border-slate-50 pt-2 space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ผลรางวัล (ตรวจสอบ)</p>
                {[
                  { key: 'special', label: 'นอยพิเศษ' },
                  { key: 'normal',  label: 'นอยปกติ' },
                  { key: 'vip',     label: 'นอย VIP' },
                ].map(({ key, label }) => (
                  <input key={key} type="text" placeholder={label}
                    value={formData[key]}
                    onChange={e => setFormData(d => ({ ...d, [key]: e.target.value }))}
                    className="w-full p-2.5 bg-slate-50 rounded-xl text-xs border border-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                ))}
              </div>
              <button
                onClick={handleAdd}
                className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:from-indigo-700 hover:to-indigo-600 transition-all active:scale-95"
              >
                คำนวณและบันทึก
              </button>
            </div>
          </div>
        </div>

        {/* Results table */}
        <div className="flex-1 min-w-0 bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-300">
              <History className="w-16 h-16 mb-4" />
              <p className="font-bold text-lg">ยังไม่มีบันทึก</p>
              <p className="text-sm mt-1">กรอกข้อมูลแล้วกด &quot;คำนวณและบันทึก&quot;</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="w-full text-left min-w-[540px]">
                <thead className="bg-slate-50">
                  <tr className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                    <th className="px-5 py-4">วันที่ / สูตร</th>
                    <th className="px-5 py-4">TV บน-ล่าง</th>
                    <th className="px-5 py-4 text-center">แนวทางรูด</th>
                    <th className="px-5 py-4">
                      ผลรางวัล
                      <span className="ml-1 text-indigo-300 font-normal normal-case">(คลิกแก้ไข)</span>
                    </th>
                    <th className="px-5 py-4 text-center">สถานะ</th>
                    <th className="px-5 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {results.map(res => {
                    const hit = checkHit(res.swipe, res.special, res.normal, res.vip);
                    const fName = formulas.find(f => f.id === res.formulaId)?.name || '';
                    return (
                      <tr key={res.id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="text-sm font-bold text-slate-700">{res.date}</div>
                          <div className="text-[10px] text-indigo-400 font-medium">{fName}</div>
                        </td>
                        <td className="px-5 py-4 font-mono font-bold text-slate-700">
                          <span className="text-slate-500">{res.tvTop}</span>
                          <span className="text-slate-300 mx-1">-</span>
                          <span className="text-indigo-600">{res.tvBottom}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="bg-amber-50 text-indigo-700 font-black px-4 py-1.5 rounded-xl border border-amber-200 text-lg tracking-widest">
                            {res.swipe}
                          </span>
                        </td>
                        {/* ── Clickable prize badges ── */}
                        <td className="px-5 py-4">
                          <PrizeBadges
                            swipe={res.swipe}
                            special={res.special}
                            normal={res.normal}
                            vip={res.vip}
                            onEdit={() => setEditTarget({ id: res.id, date: res.date, special: res.special, normal: res.normal, vip: res.vip, swipe: res.swipe })}
                          />
                        </td>
                        <td className="px-5 py-4 text-center">
                          {hit ? (
                            <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 font-bold text-xs px-3 py-1 rounded-full ring-1 ring-green-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> เข้า
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-300 text-xs px-3 py-1 rounded-full">
                              <AlertCircle className="w-3.5 h-3.5" /> หลุด
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button onClick={() => setResults(r => r.filter(x => x.id !== res.id))}
                            className="text-slate-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ──────────────── BACKTEST TAB ──────────────── */
/* ──────────────── EXPORT CSV ──────────────── */
const exportBacktestCSV = (rows, formulaName) => {
  const headers = ['วันที่', 'TV บน', 'TV ล่าง', 'แนวทางรูด', 'นอยพิเศษ', 'นอยปกติ', 'นอย VIP', 'สถานะ'];
  const csvRows = rows.map(r => [
    r.date,
    r.tvTop,
    r.tvBottom,
    r.swipe,
    r.special || '',
    r.normal  || '',
    r.vip     || '',
    r.isHit ? 'เข้า' : 'หลุด',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

  // BOM prefix → Excel อ่าน UTF-8 ภาษาไทยได้ถูกต้อง
  const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  link.href     = url;
  link.download = `backtest_${formulaName}_${date}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

function BacktestTab({ historicalData, setHistoricalData, backtestStats, formulaName }) {
  const fileRef = useRef(null);
  const [editTarget, setEditTarget] = useState(null); // { date, special, normal, vip, swipe }

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      if (parsed) setHistoricalData(parsed);
      else alert('ไม่สามารถอ่านไฟล์ CSV ได้ กรุณาตรวจสอบ header: date,tvTop,tvBottom,special,normal,vip');
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handlePrizeSave = (newPrizes) => {
    setHistoricalData(rows => rows.map(r =>
      r.date === editTarget.date ? { ...r, ...newPrizes } : r
    ));
  };

  return (
    <>
      {/* Prize Edit Modal for backtest */}
      {editTarget && (
        <PrizeEditModal
          target={editTarget}
          swipe={editTarget.swipe}
          onSave={handlePrizeSave}
          onClose={() => setEditTarget(null)}
        />
      )}

      <div className="space-y-6 animate-fadein">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-700">
            <BarChart3 className="w-5 h-5 text-indigo-500" />
            Backtest สถิติย้อนหลัง
          </h2>
          <div className="flex items-center gap-2">
            {/* Export CSV */}
            <button
              onClick={() => exportBacktestCSV(backtestStats.rows, formulaName)}
              disabled={backtestStats.rows.length === 0}
              className="inline-flex items-center gap-2 text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-2xl text-sm font-bold hover:bg-emerald-100 transition-all border border-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            {/* Import CSV */}
            <button onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 text-indigo-600 bg-indigo-50 px-4 py-2.5 rounded-2xl text-sm font-bold hover:bg-indigo-100 transition-all border border-indigo-100">
              <Upload className="w-4 h-4" /> นำเข้า CSV
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'ทั้งหมด', value: backtestStats.total, color: 'bg-slate-50 text-slate-600' },
            { label: 'เข้า',    value: backtestStats.hits,  color: 'bg-green-50 text-green-600' },
            { label: 'หลุด',    value: backtestStats.total - backtestStats.hits, color: 'bg-red-50 text-red-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`${color} rounded-2xl px-4 py-3 text-center font-bold`}>
              <div className="text-2xl font-black">{value}</div>
              <div className="text-xs font-medium opacity-70">{label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <div className="table-wrapper">
            <table className="w-full text-left min-w-[560px]">
              <thead className="bg-slate-50">
                <tr className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                  <th className="px-5 py-4">วันที่</th>
                  <th className="px-5 py-4">ผลนอย TV</th>
                  <th className="px-5 py-4 text-center">คำนวณรูด</th>
                  <th className="px-5 py-4">
                    ผลรางวัลอื่น
                    <span className="ml-1 text-indigo-300 font-normal normal-case">(คลิกแก้ไข)</span>
                  </th>
                  <th className="px-5 py-4 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {backtestStats.rows.map((day, idx) => (
                  <tr key={idx} className={`transition-colors ${day.isHit ? 'bg-green-50/40 hover:bg-green-50' : 'hover:bg-indigo-50/20'}`}>
                    <td className="px-5 py-4 text-sm font-medium text-slate-500">{day.date}</td>
                    <td className="px-5 py-4 font-mono font-bold">
                      <span className="text-slate-500">{day.tvTop}</span>
                      <span className="text-slate-300 mx-1">-</span>
                      <span className="text-indigo-600">{day.tvBottom}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="font-mono font-black text-indigo-600 bg-white border border-indigo-100 px-3 py-1.5 rounded-xl text-lg tracking-widest">
                        {day.swipe}
                      </span>
                    </td>
                    {/* ── Clickable prize badges ── */}
                    <td className="px-5 py-4">
                      <PrizeBadges
                        swipe={day.swipe}
                        special={day.special}
                        normal={day.normal}
                        vip={day.vip}
                        onEdit={() => setEditTarget({ date: day.date, special: day.special, normal: day.normal, vip: day.vip, swipe: day.swipe })}
                      />
                    </td>
                    <td className="px-5 py-4 text-center">
                      {day.isHit ? (
                        <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 font-bold text-xs px-3 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" /> เข้า
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 text-xs px-3 py-1 rounded-full">
                          <AlertCircle className="w-3.5 h-3.5" /> หลุด
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

/* ──────────────── MAIN APP ──────────────── */
export default function App() {
  // ── Persisted state (saved to localStorage automatically) ──
  const [historicalData, setHistoricalData] = useLocalStorage('hanoi_historical', INITIAL_HISTORICAL);
  const [formulas, setFormulas] = useLocalStorage('hanoi_formulas', [
    { id: 'f1', name: 'สูตรหลัก (ล่าง)', expression: '[B1] + [B2]' },
    { id: 'f2', name: 'สูตรเน้นบน', expression: '[T1] + [T3]' },
  ]);
  const [activeFormulaId, setActiveFormulaId] = useLocalStorage('hanoi_activeFormula', 'f1');
  const [results, setResults] = useLocalStorage('hanoi_results', [
    { id: 1, formulaId: 'f1', date: '2026-02-11', tvTop: '445', tvBottom: '22', special: '114-00', normal: '552-32', vip: '', sum: 4, finalDigit: 4, swipe: '4-5' },
  ]);

  // ── Non-persisted (UI state) ──
  const [activeTab, setActiveTab] = useState('daily');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    tvTop: '', tvBottom: '', special: '', normal: '', vip: ''
  });

  const currentFormula = formulas.find(f => f.id === activeFormulaId) || formulas[0];

  const backtestStats = useMemo(() => {
    let hits = 0;
    const rows = historicalData.map(day => {
      const sum = evaluateFormula(day.tvTop, day.tvBottom, currentFormula.expression);
      const digit = getSingleDigit(sum);
      const swipe = `${digit}-${PAIR_MAP[digit]}`;
      const isHit = checkHit(swipe, day.special, day.normal, day.vip);
      if (isHit) hits++;
      return { ...day, swipe, isHit };
    });
    return {
      total: historicalData.length,
      hits,
      accuracy: historicalData.length > 0 ? ((hits / historicalData.length) * 100).toFixed(1) : '0.0',
      rows,
    };
  }, [historicalData, currentFormula, activeFormulaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const TABS = [
    { id: 'daily',    label: 'บันทึกประจำวัน', icon: <History className="w-4 h-4" /> },
    { id: 'backtest', label: 'ทดลองหาสูตร',     icon: <FlaskConical className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-400 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-indigo-700 tracking-tight leading-none">HANOI LAB PRO</h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest hidden sm:block">
                ระบบวิเคราะห์สถิติ · ทดสอบสูตรแม่นยำ
              </p>
            </div>
          </div>

          {/* Nav tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${activeTab === t.id
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Formula Editor + Win Rate */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          <div className="flex-1 min-w-0">
            <FormulaEditor
              formulas={formulas}
              setFormulas={setFormulas}
              activeFormulaId={activeFormulaId}
              setActiveFormulaId={setActiveFormulaId}
            />
          </div>
          <div className="lg:self-center">
            <WinRateCard stats={backtestStats} />
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'daily' ? (
          <DailyTab
            results={results}
            setResults={setResults}
            formulas={formulas}
            activeFormulaId={activeFormulaId}
            formData={formData}
            setFormData={setFormData}
          />
        ) : (
          <BacktestTab
            historicalData={historicalData}
            setHistoricalData={setHistoricalData}
            backtestStats={backtestStats}
            formulaName={currentFormula?.name || 'สูตร'}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-[11px] text-slate-400 font-medium">
        HANOI LAB PRO · ระบบช่วยวิเคราะห์สถิติ · ไม่ใช่คำแนะนำทางการเงิน
      </footer>
    </div>
  );
}
