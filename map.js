import { csvByGeoid, csvLoaded, loadCsvIndex, derive2024FromCsvRow, deriveCustomFromRow, aggregateCounty } from './csv.js';
import { formatNumber, pf, installCustomControls, normalizeCountyName } from './ui.js';
import { addBaseLayers, updateFillPaint, addCountyLayers, placeResultsBelowRoads } from './layers.js';

let map;
let renderMode = '2024'; // '2024' or 'custom'
let customParams = { ...window.APP_CONFIG.CUSTOM_DEFAULTS };
let currentFilter = null; // predicate(geoid) or null
let popup;

export async function initMap(mapboxgl) {
  // Initialize map
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-99.341389, 31.330556], // Texas center
    zoom: 5.5,
    maxZoom: 16,
  });

  // Moving popup for hover info
  popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });



  // Load CSV data
  await loadCsvIndex('./TX_24_with_counties_with_area.csv');

  map.on('style.load', () => {
    addBaseLayers(map);
    addCountyLayers(map);
    updateFillPaint(map, false); // Start with 2024 data

    // Set initial feature states and compute totals
    map.once('idle', () => {
      updateFeatureStatesForVisible();
      computeTotals();
      installCustomControls('sliderBox');
      initCustomBindings();
      // After style/layers are ready, move results below roads/labels
      placeResultsBelowRoads(map);
      // Wire up filter UI
      initFilterBindings();
      // Initial show/hide based on default mode
      const controls = document.getElementById('demo-controls');
      if (controls) controls.style.display = (renderMode === 'custom') ? 'grid' : 'none';
      const filterBox = document.getElementById('filterBox');
      if (filterBox) filterBox.style.display = (renderMode === '2024') ? 'block' : 'none';
    });

    // Update feature states when map moves
    map.on('moveend', updateFeatureStatesForVisible);
    map.on('zoomend', updateFeatureStatesForVisible);

    // Update zoom indicator
    map.on('zoom', updateZoomIndicator);
    map.on('zoomend', updateZoomIndicator);

    // Hover interactions (precincts + counties)
    bindHover();
    bindCountyHover();

    // Mode toggle
    bindModeToggle();

    // Initialize zoom indicator once everything is ready
    updateZoomIndicator();
  });
}

function compileFilterFromUI() {
  const get = (id) => document.getElementById(id);
  const readNum = (id) => {
    const el = get(id);
    if (!el) return NaN;
    const s = (el.value ?? '').trim();
    if (s === '') return NaN; // treat blank as unset
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  };
  const hispOp = get('f-hisp-op')?.value; const hispVal = readNum('f-hisp-val');
  const asianOp = get('f-asian-op')?.value; const asianVal = readNum('f-asian-val');
  const blackOp = get('f-black-op')?.value; const blackVal = readNum('f-black-val');
  const angloOp = get('f-anglo-op')?.value; const angloVal = readNum('f-anglo-val');
  const marginOp = get('f-margin-op')?.value; const marginVal = readNum('f-margin-val');

  return function predicateForGeoid(geoid) {
    const row = csvByGeoid.get(String(geoid));
    if (!row) return false;
    const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
    const vap = Math.max(1, n(row['vap']));
    const hisp = (n(row['hispvap']) / vap) * 100;
    const asian = (n(row['asianvap']) / vap) * 100;
    const black = (n(row['blackvap']) / vap) * 100;
    const anglo = (n(row['anglovap']) / vap) * 100;
    let marginPct;
    if (renderMode === '2024') {
      const d24 = n(row['votes_dem']);
      const r24 = n(row['votes_rep']);
      const t24 = n(row['votes_total']);
      marginPct = t24 > 0 ? ((d24 - r24) / t24) * 100 : 0;
    } else {
      const d = n(row['2026_dem_raw_vote']);
      const r = n(row['2026_rep_raw_vote']);
      const t = n(row['total_26']);
      marginPct = t > 0 ? ((d - r) / t) * 100 : 0;
    }

    const cmp = (op, left, right) => {
      if (!op || !Number.isFinite(right)) return true;
      return op === '>' ? left > right : left < right;
    };

    return (
      cmp(hispOp, hisp, hispVal) &&
      cmp(asianOp, asian, asianVal) &&
      cmp(blackOp, black, blackVal) &&
      cmp(angloOp, anglo, angloVal) &&
      cmp(marginOp, marginPct, marginVal)
    );
  };
}

function applyMapFilters() {
  // If no filter, show all
  if (!currentFilter) { try { map.setFilter('results_layer', null); } catch {} return; }
  // Build allowlist from ALL precincts using CSV, not just currently rendered
  const allow = [];
  for (const [geoid] of csvByGeoid) {
    try {
      if (currentFilter(geoid)) allow.push(String(geoid));
    } catch {}
  }
  const expr = ['in', ['get', 'GEOID'], ['literal', allow]];
  try { map.setFilter('results_layer', expr); } catch {}
}

function initFilterBindings() {
  const inputs = [
    'f-hisp-op','f-hisp-val','f-asian-op','f-asian-val','f-black-op','f-black-val','f-anglo-op','f-anglo-val','f-margin-op','f-margin-val'
  ];
  const apply = () => { currentFilter = compileFilterFromUI(); applyMapFilters(); };
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
    // Clear UI values
    inputs.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      if (id.endsWith('-op')) {
        // leave operator as-is; do not reset
      } else {
        el.value = '';
      }
    });
    currentFilter = null;
    applyMapFilters();
  });
}
function updateFeatureStatesForVisible() {
  if (!csvLoaded) return;
  const features = map.queryRenderedFeatures({ layers: ['results_layer'] });
  for (const feature of features) {
    const geoid = feature.properties.GEOID;
    if (!geoid) continue;
    const row = csvByGeoid.get(String(geoid));
    if (!row) continue;

    // 2024 data
    const d24 = derive2024FromCsvRow(row);
    if (d24) {
      map.setFeatureState({ source: 'route', sourceLayer: 'TX_24_with_counties', id: feature.id }, {
        csv_margin24: d24.margin,
      });
    }

    // Custom data
    const dc = deriveCustomFromRow(row, customParams);
    if (dc) {
      map.setFeatureState({ source: 'route', sourceLayer: 'TX_24_with_counties', id: feature.id }, {
        custom_margin: dc.margin,
      });
    }
  }
  // Re-apply any active filters after feature-state updates
  applyMapFilters();
}

function computeTotals() {
  let totalDem = 0, totalRep = 0, totalVotes = 0;

  for (const [geoid, row] of csvByGeoid) {
    let data;
    if (renderMode === '2024') {
      data = derive2024FromCsvRow(row);
    } else if (renderMode === 'custom') {
      data = deriveCustomFromRow(row, customParams);
    }

    if (data) {
      totalDem += data.dem;
      totalRep += data.rep;
      totalVotes += data.total;
    }
  }

  const demPct = totalVotes > 0 ? (totalDem / totalVotes) * 100 : 0;
  const repPct = totalVotes > 0 ? (totalRep / totalVotes) * 100 : 0;

  const modeLabel = renderMode === '2024' ? '2024 actual' : 'Custom demographics';

  document.getElementById('summaryBox').innerHTML = `
    <div class="title">Statewide totals (${modeLabel})</div>
    <div class="row">
      <span>Dem votes</span>
      <span>${formatNumber(Math.round(totalDem))} (${pf(demPct)})</span>
    </div>
    <div class="row">
      <span>Rep votes</span>
      <span>${formatNumber(Math.round(totalRep))} (${pf(repPct)})</span>
    </div>
    <div class="row">
      <span>Total votes</span>
      <span>${formatNumber(Math.round(totalVotes))}</span>
    </div>
  `;
}

function updateZoomIndicator() {
  const box = document.getElementById('zoomBox');
  if (!box || !map) return;
  const z = map.getZoom();
  box.textContent = `Zoom: ${z.toFixed(1)}`;
  // Ensure hover outline is hidden when zoomed out
  if (z < 8) {
    try { map.setFilter('hover-outline', ['==', ['get', 'GEOID'], '']); } catch {}
    try { map.setFilter('county-hover-outline', ['==', ['get', window.APP_CONFIG.COUNTY_KEY_PROPERTY], '']); } catch {}
  }
}

function bindCountyHover() {
  const { COUNTY_KEY_PROPERTY } = window.APP_CONFIG;

  function pickCountyKey(props) {
    const candidates = [
      COUNTY_KEY_PROPERTY,
      'GEOID', 'GEOIDFP', 'FIPS', 'COUNTYFP',
      'NAME', 'NAME20', 'NAMELSAD', 'COUNTY', 'county', 'name'
    ].filter(Boolean);
    for (const key of candidates) {
      if (props && Object.prototype.hasOwnProperty.call(props, key) && props[key] != null && String(props[key]).length > 0) {
        return key;
      }
    }
    return null;
  }

  function pickCountyName(props) {
    const nameCandidates = [
      'NAMELSAD', 'NAME', 'COUNTY', 'County', 'name', 'NAME20', 'NAMELSAD20'
    ];
    for (const key of nameCandidates) {
      if (props && Object.prototype.hasOwnProperty.call(props, key) && props[key] != null && String(props[key]).length > 0) {
        return String(props[key]);
      }
    }
    return '';
  }

  map.on('mousemove', 'counties-fill', (e) => {
    if (!e.features || e.features.length === 0) return;
    const z = map.getZoom();
    // Only show county outline when zoomed out (< 8)
    if (z >= 8) {
      try { map.setFilter('county-hover-outline', ['==', ['get', COUNTY_KEY_PROPERTY], '']); } catch {}
      return;
    }
    const f = e.features[0];
    updateCountyHoverFromFeature(f, pickCountyKey, pickCountyName, e.lngLat);
  });

  // Also respond when hovering the county outline itself
  map.on('mousemove', 'county-hover-outline', (e) => {
    if (!e.features || e.features.length === 0) return;
    const z = map.getZoom();
    if (z >= 8) return;
    const f = e.features[0];
    updateCountyHoverFromFeature(f, pickCountyKey, pickCountyName, e.lngLat);
  });

  // Fallback: use map-wide mousemove and queryRenderedFeatures, in case layer events don't fire
  map.on('mousemove', (e) => {
    const z = map.getZoom();
    if (z >= 8) return;
    let feats = [];
    try { feats = map.queryRenderedFeatures(e.point, { layers: ['counties-fill'] }) || []; } catch {}
    if (!feats || feats.length === 0) {
      try { map.setFilter('county-hover-outline', ['==', ['get', COUNTY_KEY_PROPERTY], '']); } catch {}
      return;
    }
    updateCountyHoverFromFeature(feats[0], pickCountyKey, pickCountyName, e.lngLat);
  });

  map.on('mouseleave', 'counties-fill', () => {
    try { map.setFilter('county-hover-outline', ['==', ['get', COUNTY_KEY_PROPERTY], '']); } catch {}
    // Hide only if not in precinct mode
    if (map.getZoom() < 8) {
      try { popup.remove(); } catch {}
    }
  });

  map.on('mouseleave', 'county-hover-outline', () => {
    try { map.setFilter('county-hover-outline', ['==', ['get', COUNTY_KEY_PROPERTY], '']); } catch {}
    if (map.getZoom() < 8) {
      try { popup.remove(); } catch {}
    }
  });
}

function updateCountyHoverFromFeature(f, pickCountyKey, pickCountyName, lngLat) {
  const { COUNTY_KEY_PROPERTY } = window.APP_CONFIG;
  const key = pickCountyKey(f.properties);
  if (!key) {
    try { map.setFilter('county-hover-outline', ['==', ['get', COUNTY_KEY_PROPERTY], '']); } catch {}
    return;
  }
  const value = String(f.properties[key]);
  try { map.setFilter('county-hover-outline', ['==', ['get', key], value]); } catch {}

  const countyName = pickCountyName(f.properties) || value;
  const normalized = normalizeCountyName(countyName);
  let rows = [];

  // Prefer FIPS-based join if we can construct a 5-digit county FIPS
  const fipsCandidates = [
    f.properties.GEOID, f.properties.GEOIDFP, f.properties.COUNTYFP, value
  ].filter(Boolean).map(String);
  let fips5 = '';
  for (const cand of fipsCandidates) {
    const digits = cand.replace(/[^0-9]/g, '');
    if (digits.length >= 5) { fips5 = digits.slice(0, 5); break; }
  }
  if (fips5) {
    for (const [geoid, row] of csvByGeoid) {
      const rg = String(row['GEOID'] || row['geoid'] || '');
      if (rg.startsWith(fips5)) rows.push(row);
    }
  }
  // Fallback to name-based match
  if (rows.length === 0) {
    for (const [, row] of csvByGeoid) {
      const rn = normalizeCountyName(row['County'] || row['county'] || '');
      if (rn && rn === normalized) rows.push(row);
    }
  }
  const agg = aggregateCounty(rows, renderMode, customParams);
  const marginStr = Number.isFinite(agg.margin)
    ? `${((agg.margin) * 100 >= 0 ? '+' : '')}${((agg.margin) * 100).toFixed(1)}%`
    : '—';
  const votesDemStr = formatNumber(Math.round(agg.dem));
  const votesRepStr = formatNumber(Math.round(agg.rep));
  const totalStr = formatNumber(Math.round(agg.total));
  const modeLabel = renderMode === '2024' ? '2024' : 'custom';
  const html = `
    <div class="precinct-title">${countyName} (county)</div>
    <div class="info-row"><span>Dem margin (${modeLabel}):</span><span>${marginStr}</span></div>
    <div class="info-row"><span>Dem votes:</span><span>${votesDemStr}</span></div>
    <div class="info-row"><span>Rep votes:</span><span>${votesRepStr}</span></div>
    <div class="info-row"><span>Total votes:</span><span>${totalStr}</span></div>
  `;
  if (lngLat) popup.setLngLat(lngLat).setHTML(html).addTo(map);
}

function bindHover() {
  map.on('mousemove', 'results_layer', (e) => {
    if (e.features.length === 0) return;
    // At low zooms, county hover controls the info box; skip precinct updates
    if (map.getZoom() < 8) {
      try { map.setFilter('hover-outline', ['==', ['get', 'GEOID'], '']); } catch {}
      return;
    }
    const p = e.features[0].properties;
    const geoid = p.GEOID != null ? String(p.GEOID) : '';
    const row = csvByGeoid.get(geoid);

    const county = p.County || 'Unknown';
    const densityStr = p.density || '—';

    let data, modeLabel;
    if (renderMode === '2024') {
      data = derive2024FromCsvRow(row);
      modeLabel = '2024';
    } else if (renderMode === 'custom') {
      data = deriveCustomFromRow(row, customParams);
      modeLabel = 'custom';
    }

    const marginStr = data && Number.isFinite(data.margin) 
      ? `${((data.margin) * 100 >= 0 ? '+' : '')}${((data.margin) * 100).toFixed(1)}%`
      : '—';
    const votesDemStr = data ? formatNumber(Math.round(data.dem)) : 'N/A';
    const votesRepStr = data ? formatNumber(Math.round(data.rep)) : 'N/A';
    const totalStr = data ? formatNumber(Math.round(data.total)) : 'N/A';

    const html = `
      <div class="precinct-title">${county}</div>
      <div class="info-row"><span>Density:</span><span>${densityStr}</span></div>
      <div class="info-row"><span>GEOID:</span><span>${geoid}</span></div>
      ${row && row.area_sqmi != null && row.area_sqmi !== '' ? `<div class=\"info-row\"><span>Area:</span><span>${Number(row.area_sqmi).toFixed(2)} sq mi</span></div>` : ''}
      <div class="info-row"><span>Dem margin (${modeLabel}):</span><span>${marginStr}</span></div>
      <div class="info-row"><span>Dem votes:</span><span>${votesDemStr}</span></div>
      <div class="info-row"><span>Rep votes:</span><span>${votesRepStr}</span></div>
      <div class="info-row"><span>Total votes:</span><span>${totalStr}</span></div>
    `;
    popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
    
    // Only show black border outline at zoom 8 and above
    if (map.getZoom() >= 8) {
      map.setFilter('hover-outline', ['==', ['get', 'GEOID'], geoid]);
    } else {
      map.setFilter('hover-outline', ['==', ['get', 'GEOID'], '']);
    }
  });

  map.on('mouseleave', 'results_layer', () => {
    try { popup.remove(); } catch {}
    map.setFilter('hover-outline', ['==', ['get', 'GEOID'], '']);
  });
}

function bindModeToggle() {
  document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      renderMode = e.target.value;
      updateFillPaint(map, renderMode === 'custom');
      updateFeatureStatesForVisible();
      computeTotals();
      const controls = document.getElementById('demo-controls');
      if (controls) controls.style.display = (renderMode === 'custom') ? 'grid' : 'none';
      const filterBox = document.getElementById('filterBox');
      if (filterBox) filterBox.style.display = (renderMode === '2024') ? 'block' : 'none';
      // Re-apply filters because margin field changes by mode
      applyMapFilters();
    });
  });
}

function initCustomBindings() {
  const { CUSTOM_DEFAULTS } = window.APP_CONFIG;
  
  ['anglo', 'asian', 'black', 'hisp'].forEach(race => {
    const turnoutSlider = document.getElementById(`${race}-turnout`);
    const demSlider = document.getElementById(`${race}-dem`);
    const turnoutVal = document.getElementById(`${race}-turnout-val`);
    const demVal = document.getElementById(`${race}-dem-val`);

    if (turnoutSlider && demSlider && turnoutVal && demVal) {
      // Set initial values as percentages
      turnoutSlider.type = 'number';
      turnoutSlider.min = '0';
      turnoutSlider.max = '100';
      turnoutSlider.step = '1';
      demSlider.type = 'number';
      demSlider.min = '0';
      demSlider.max = '100';
      demSlider.step = '1';
      turnoutSlider.value = String(Math.round(CUSTOM_DEFAULTS[race].turnout * 100));
      demSlider.value = String(Math.round(CUSTOM_DEFAULTS[race].dem * 100));
      turnoutVal.textContent = pf(Number(turnoutSlider.value));
      demVal.textContent = pf(Number(demSlider.value));

      // Bind events
      turnoutSlider.addEventListener('input', (e) => {
        const pct = Math.max(0, Math.min(100, Number(e.target.value)));
        customParams[race].turnout = pct / 100;
        turnoutVal.textContent = pf(pct);
        if (renderMode === 'custom') {
          updateFeatureStatesForVisible();
          computeTotals();
        }
      });

      demSlider.addEventListener('input', (e) => {
        const pct = Math.max(0, Math.min(100, Number(e.target.value)));
        customParams[race].dem = pct / 100;
        demVal.textContent = pf(pct);
        if (renderMode === 'custom') {
          updateFeatureStatesForVisible();
          computeTotals();
        }
      });
    }
  });
}
