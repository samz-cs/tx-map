import { csvByGeoid, derive2024FromCsvRow } from '../csv.js';
import { formatNumber, pf } from '../ui.js';
import { appState } from './state.js';

export function renderTotals() {
  let totalDem = 0, totalRep = 0, totalVotes = 0;
  const predicate = appState.currentFilter;

  for (const [, row] of csvByGeoid) {
    if (predicate && !predicate(row.GEOID ?? row.geoid ?? '')) continue;
    const data = derive2024FromCsvRow(row);
    if (!data) continue;
    totalDem += data.dem;
    totalRep += data.rep;
    totalVotes += data.total;
  }

  const demPct = totalVotes > 0 ? (totalDem / totalVotes) * 100 : 0;
  const repPct = totalVotes > 0 ? (totalRep / totalVotes) * 100 : 0;

  const el = document.getElementById('summaryBox');
  if (!el) return;
  el.innerHTML = `
    <div class="title">Statewide totals (2024)</div>
    <div class="row"><span>Dem votes</span><span>${formatNumber(Math.round(totalDem))} (${pf(demPct)})</span></div>
    <div class="row"><span>Rep votes</span><span>${formatNumber(Math.round(totalRep))} (${pf(repPct)})</span></div>
    <div class="row"><span>Total votes</span><span>${formatNumber(Math.round(totalVotes))}</span></div>
  `;
}


