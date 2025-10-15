import { csvByGeoid } from '../csv.js';
import { appState } from './state.js';
import { renderTotals } from './totals.js';

export function compileFilterFromUI() {
  const get = (id) => document.getElementById(id);
  const readNum = (id) => {
    const el = get(id);
    if (!el) return NaN;
    const s = (el.value ?? '').trim();
    if (s === '') return NaN;
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };
  const hispOp = get('f-hisp-op')?.value; const hispVal = readNum('f-hisp-val');
  const asianOp = get('f-asian-op')?.value; const asianVal = readNum('f-asian-val');
  const blackOp = get('f-black-op')?.value; const blackVal = readNum('f-black-val');
  const angloOp = get('f-anglo-op')?.value; const angloVal = readNum('f-anglo-val');
  const marginOp = get('f-margin-op')?.value; const marginVal = readNum('f-margin-val');
  const collegeOp = get('f-college-op')?.value; const collegeVal = readNum('f-college-val');
  const bachOp = get('f-bach-op')?.value; const bachVal = readNum('f-bach-val');
  const incOp = get('f-avg_hh_income-op')?.value; const incVal = readNum('f-avg_hh_income-val');
  const shiftOp = get('f-shift-op')?.value; const shiftVal = readNum('f-shift-val');
  const totalOp = get('f-total-op')?.value; const totalVal = readNum('f-total-val');
  const turnoutOp = get('f-turnout-op')?.value; const turnoutVal = readNum('f-turnout-val');

  return function predicateForGeoid(geoid) {
    const row = csvByGeoid.get(String(geoid));
    if (!row) return false;
    const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
    const vap = Math.max(1, n(row['vap']));
    const hisp = (n(row['hispvap']) / vap) * 100;
    const asian = (n(row['asianvap']) / vap) * 100;
    const black = (n(row['blackvap']) / vap) * 100;
    const anglo = (n(row['anglovap']) / vap) * 100;
    const college = (n(row['college_enroll']) / vap) * 100;
    const bachplus = (n(row['bachelors_up_total_sum']) / vap) * 100;
    const d24 = n(row['votes_dem']);
    const r24 = n(row['votes_rep']);
    const t24 = n(row['votes_total']);
    const marginPct = t24 > 0 ? ((d24 - r24) / t24) * 100 : 0;
    const turnoutPct = vap > 0 ? (t24 / vap) * 100 : 0;
    // shift from 2020 margin% to 2024 margin%
    const dem20 = n(row['20_biden']);
    const rep20 = n(row['20_trump']);
    const t20 = n(row['20_total']);
    const margin20Pct = t20 > 0 ? ((dem20 - rep20) / t20) * 100 : n(row['pct_dem_lead_20']) * 100;
    const shift2020to2024 = marginPct - margin20Pct;
    const income = n(row['avg_hh_income']);

    const cmp = (op, left, right) => {
      if (!op || !Number.isFinite(right)) return true;
      return op === '>' ? left > right : left < right;
    };

    return (
      cmp(hispOp, hisp, hispVal) &&
      cmp(asianOp, asian, asianVal) &&
      cmp(blackOp, black, blackVal) &&
      cmp(angloOp, anglo, angloVal) &&
      cmp(marginOp, marginPct, marginVal) &&
      cmp(collegeOp, college, collegeVal) &&
      cmp(bachOp, bachplus, bachVal) &&
      cmp(incOp, income, incVal) &&
      cmp(shiftOp, shift2020to2024, shiftVal) &&
      cmp(totalOp, t24, totalVal) &&
      cmp(turnoutOp, turnoutPct, turnoutVal)
    );
  };
}

export function applyMapFilters() {
  const { map } = appState;
  if (!appState.currentFilter) {
    try { map.setFilter('results_layer', null); } catch {}
    try { if (map.getLayer('extrusion_layer')) map.setFilter('extrusion_layer', null); } catch {}
    // Show statewide totals when no filter is active
    renderTotals();
    return;
  }
  const allow = [];
  for (const [geoid] of csvByGeoid) {
    try { if (appState.currentFilter(geoid)) allow.push(String(geoid)); } catch {}
  }
  const expr = ['in', ['get', 'GEOID'], ['literal', allow]];
  try { map.setFilter('results_layer', expr); } catch {}
  try { if (map.getLayer('extrusion_layer')) map.setFilter('extrusion_layer', expr); } catch {}
  // Update totals for current predicate
  renderTotals();
}

export function initFilterBindings() {
  const inputs = [
    'f-hisp-op','f-hisp-val','f-asian-op','f-asian-val','f-black-op','f-black-val','f-anglo-op','f-anglo-val','f-margin-op','f-margin-val','f-college-op','f-college-val','f-bach-op','f-bach-val',
    'f-avg_hh_income-op','f-avg_hh_income-val','f-shift-op','f-shift-val','f-total-op','f-total-val','f-turnout-op','f-turnout-val'
  ];
  const apply = () => { appState.currentFilter = compileFilterFromUI(); applyMapFilters(); };
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') apply(); });
    el.addEventListener('change', () => apply());
  });
  const btnApply = document.getElementById('applyFilters');
  if (btnApply) btnApply.addEventListener('click', apply);
  const btnClear = document.getElementById('clearFilters');
  if (btnClear) btnClear.addEventListener('click', () => {
    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id.endsWith('-op')) {
        // leave operator as-is
      } else {
        el.value = '';
      }
    });
    appState.currentFilter = null;
    applyMapFilters();
  });
}


