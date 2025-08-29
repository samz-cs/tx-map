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
      cmp(bachOp, bachplus, bachVal)
    );
  };
}

export function applyMapFilters() {
  const { map } = appState;
  if (!appState.currentFilter) {
    try { map.setFilter('results_layer', null); } catch {}
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
  // Update totals for current predicate
  renderTotals();
}

export function initFilterBindings() {
  const inputs = [
    'f-hisp-op','f-hisp-val','f-asian-op','f-asian-val','f-black-op','f-black-val','f-anglo-op','f-anglo-val','f-margin-op','f-margin-val','f-college-op','f-college-val','f-bach-op','f-bach-val'
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


