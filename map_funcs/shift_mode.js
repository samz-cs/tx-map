import { csvByGeoid } from '../csv.js';
import { setFillPaintShift, setFillPaintMargin } from '../layers.js';

export const colorState = {
  mode: 'margin', // 'margin' | 'shift'
};

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

function computeShiftFraction(row) {
  if (!row) return 0;
  const d20 = num(row['20_biden']);
  const r20 = num(row['20_trump']);
  const t20 = num(row['20_total']);
  const m20 = t20 > 0 ? ((d20 - r20) / t20) : num(row['pct_dem_lead_20']); // fraction
  const m24 = num(row['pct_dem_lead']); // fraction
  return m24 - m20; // fraction, can be negative
}

function applyColorStateToMap(map) {
  const useShift = colorState.mode === 'shift';
  for (const [geoid, row] of csvByGeoid) {
    if (useShift) {
      const shift = computeShiftFraction(row);
      try { map.setFeatureState({ source: 'route', sourceLayer: 'TX_24_with_counties', id: String(geoid) }, { csv_margin_active: shift }); } catch {}
    } else {
      // Clear to fall back to tile property pct_dem_lead
      try { map.setFeatureState({ source: 'route', sourceLayer: 'TX_24_with_counties', id: String(geoid) }, { csv_margin_active: null }); } catch {}
    }
  }
  // Apply appropriate palette
  try {
    if (useShift) setFillPaintShift(map); else setFillPaintMargin(map);
  } catch {}
}

export function initShiftColorUI(map) {
  // Bind to existing static HTML radios inside #colorModeBox
  const box = document.getElementById('colorModeBox');
  if (!box) return;
  const onChange = () => {
    const sel = document.querySelector('input[name="colormode"]:checked');
    colorState.mode = sel ? sel.value : 'margin';
    applyColorStateToMap(map);
  };
  const radios = box.querySelectorAll('input[name="colormode"]');
  radios.forEach((r) => r.addEventListener('change', onChange));
}

export function refreshColorMode(map) {
  applyColorStateToMap(map);
}


