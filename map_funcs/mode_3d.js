import { csvByGeoid } from '../csv.js';
import { setFillPaintMargin, setFillPaintShift } from '../layers.js';
import { colorState } from './shift_mode.js';

// Screen-space compensation reference zoom. Tune to taste.
const HEIGHT_BASE_ZOOM = 9;

// 3D Mode state and helpers
export const threeDState = {
  enabled: false,
  metric: null, // one of keys in metricDefs
  maxHeight: 6000, // in meters (Mapbox uses meters for fill-extrusion-height)
  minHeight: 0,
  contrast: 1.0, // gamma/exponent for contrast (>= 0.1). 1.0 = linear
  // cache of current geoid -> height (m)
  heightsByGeoid: new Map(),
};

// Metric definitions
// Each function should return a numeric value for the given row
// Fractions vs percentages are acceptable; scaling is rank-based to max
const metricDefs = {
  hisp_pct: { label: 'Hispanic%', get: (row) => num(row['hispvap_pct']) },
  asian_pct: { label: 'Asian%', get: (row) => num(row['asianvap_pct']) },
  black_pct: { label: 'Black%', get: (row) => num(row['blackvap_pct']) },
  white_pct: { label: 'White%', get: (row) => num(row['anglovap_pct']) },
  college_student_pct: { label: 'College Student%', get: (row) => num(row['college_enroll_pct']) },
  college_educated_pct: { label: 'College Educated%', get: (row) => num(row['bachelors_up_total_sum_pct']) },
  shift_20_24: { label: 'margin shift (20 → 24)', get: (row) => {
    const d20 = num(row['20_biden']); const r20 = num(row['20_trump']); const t20 = num(row['20_total']);
    const m20 = t20 > 0 ? ((d20 - r20) / t20) : num(row['pct_dem_lead_20']);
    const m24 = num(row['pct_dem_lead']);
    return Math.abs((m24 - m20)); // absolute shift (fraction)
  }},
  dem_margin_pct: { label: 'Dem Margin%', get: (row) => Math.max(0, num(row['pct_dem_lead'])) },
  avg_hh_income: { label: 'Avg Household Income', get: (row) => num(row['avg_hh_income']) },
};

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function computeHeights(metricKey, maxHeight) {
  const def = metricDefs[metricKey];
  const values = [];
  const byGeoid = new Map();
  for (const [geoid, row] of csvByGeoid) {
    const v = def.get(row);
    let val = Number.isFinite(v) ? Math.max(0, v) : 0;
    // When using margin shift, suppress tiny-traffic precincts (< 50 total votes)
    if (metricKey === 'shift_20_24') {
      const tot = num(row['votes_total']);
      if (!Number.isFinite(tot) || tot < 100) val = 0;
    }
    byGeoid.set(String(geoid), val);
    values.push(val);
  }
  const maxVal = Math.max(1e-9, ...values);
  const heights = new Map();
  const contrast = Math.max(0.1, Number(threeDState.contrast) || 1.0);
  for (const [geoid, val] of byGeoid) {
    if (val <= 0) { heights.set(geoid, 0); continue; }
    const span = Math.max(0, maxHeight - Math.max(0, threeDState.minHeight));
    const norm = val / maxVal;
    const adj = Math.pow(norm, contrast);
    const h = adj * span + Math.max(0, threeDState.minHeight);
    heights.set(geoid, h);
  }
  return heights;
}

function ensureExtrusionLayer(map) {
  if (map.getLayer('extrusion_layer')) return;
  try {
    // Insert the extrusion layer in the same slot as labels, just before the first symbol layer
    const style = map.getStyle();
    let beforeId = null;
    let slot = undefined;
    if (style && Array.isArray(style.layers)) {
      const sym = style.layers.find(l => l && l.type === 'symbol');
      if (sym) { beforeId = sym.id; slot = sym.slot; }
    }
    const layerDef = {
      id: 'extrusion_layer',
      type: 'fill-extrusion',
      source: 'route',
      'source-layer': 'TX_24_with_counties',
      paint: {
        'fill-extrusion-opacity': .9,
        'fill-extrusion-height': ['coalesce', ['feature-state', 'extrusion_height'], 0],
        'fill-extrusion-color': '#666666'
      },
    };
    if (slot) layerDef.slot = slot;
    if (beforeId) map.addLayer(layerDef, beforeId); else map.addLayer(layerDef);
  } catch {}
  // Match color to results_layer
  try {
    const colorExpr = map.getPaintProperty('results_layer', 'fill-color');
    if (colorExpr) map.setPaintProperty('extrusion_layer', 'fill-extrusion-color', colorExpr);
  } catch {}
}

function setExtrusionHeightsForVisible(map) {
  // Update extrusion height for visible features based on cached heightsByGeoid
  // Iterate through all known GEOIDs to avoid zoom-dependent sampling
  for (const [geoid, hVal] of threeDState.heightsByGeoid) {
    try { map.setFeatureState({ source: 'route', sourceLayer: 'TX_24_with_counties', id: geoid }, { extrusion_height: hVal }); } catch {}
  }
}

export function init3DMode(map) {
  // Initialize 3D mode UI bindings directly against the 3D box; no shared container required
  const box = document.getElementById('threeDBox');
  if (!box) return;

  // Collapse/expand handled centrally in init.js (boxToggle)

  const apply = () => {
    const input = document.querySelector('input[name="metric3d"]:checked');
    const metricKey = input ? input.value : 'dem_margin_pct';
    const mhEl = document.getElementById('threeDMaxHeight');
    const mh = mhEl ? Number(mhEl.value) : threeDState.maxHeight;
    threeDState.maxHeight = Number.isFinite(mh) ? mh : threeDState.maxHeight;
    const minhEl = document.getElementById('threeDMinHeight');
    const minh = minhEl ? Number(minhEl.value) : threeDState.minHeight;
    threeDState.minHeight = Number.isFinite(minh) ? Math.max(0, minh) : threeDState.minHeight;
    const cEl = document.getElementById('threeDContrast');
    const c = cEl ? Number(cEl.value) : threeDState.contrast;
    threeDState.contrast = Number.isFinite(c) ? Math.max(0.1, c) : threeDState.contrast;
    threeDState.metric = metricKey;
    threeDState.enabled = true;
    ensureExtrusionLayer(map);
    if (!metricKey) {
      try { map.setLayoutProperty('extrusion_layer', 'visibility', 'none'); } catch {}
      return;
    }
    threeDState.heightsByGeoid = computeHeights(metricKey, threeDState.maxHeight);
    try { map.setLayoutProperty('extrusion_layer', 'visibility', 'visible'); } catch {}
    // Ensure extrusion uses the correct palette with 3D hover green immediately
    try { (colorState.mode === 'shift' ? setFillPaintShift : setFillPaintMargin)(map); } catch {}
    // No moveLayer across slots needed; insertion matched symbol slot and order
    setExtrusionHeightsForVisible(map);
  };

  const btnApply = document.getElementById('threeDApply');
  if (btnApply) btnApply.addEventListener('click', apply);
  const btnClear = document.getElementById('threeDClear');
  if (btnClear) btnClear.addEventListener('click', () => {
    threeDState.metric = null; threeDState.enabled = false;
    try { map.setLayoutProperty('extrusion_layer', 'visibility', 'none'); } catch {}
    // Restore 2D palette on results_layer (no 3D hover)
    try { (colorState.mode === 'shift' ? setFillPaintShift : setFillPaintMargin)(map); } catch {}
  });

  // Keep heights in sync on move/zoom/style
  map.on('moveend', () => { if (threeDState.enabled) setExtrusionHeightsForVisible(map); });
  map.on('zoomend', () => { if (threeDState.enabled) setExtrusionHeightsForVisible(map); });
  map.on('style.load', () => { if (threeDState.enabled) { ensureExtrusionLayer(map); setExtrusionHeightsForVisible(map); } });
}


