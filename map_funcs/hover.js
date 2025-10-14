import { csvByGeoid, derive2024FromCsvRow, aggregateCounty } from '../csv.js';
import { formatNumber, normalizeCountyName } from '../ui.js';
import { appState } from './state.js';

export function bindPrecinctHover() {
  const { map, popup } = appState;
  map.on('mousemove', 'results_layer', (e) => {
    if (e.features.length === 0) return;
    if (map.getZoom() <= 8) {
      try { map.setFilter('hover-outline', ['==', ['get', 'GEOID'], '']); } catch {}
      return;
    }
    const p = e.features[0].properties;
    const geoid = p.GEOID != null ? String(p.GEOID) : '';
    const row = csvByGeoid.get(geoid);
    const county = p.County || 'Unknown';
    const densityStr = p.density || '—';
    const data = derive2024FromCsvRow(row);
    const marginStr = data && Number.isFinite(data.margin)
      ? `${((data.margin) * 100 >= 0 ? '+' : '')}${((data.margin) * 100).toFixed(1)}%` : '—';
    // 2020 vs 2024 shift (pp)
    const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
    const dem20 = n(row && row['20_biden']);
    const rep20 = n(row && row['20_trump']);
    const t20 = n(row && row['20_total']);
    const margin20Pct = t20 > 0 ? ((dem20 - rep20) / t20) * 100 : n(row && row['pct_dem_lead_20']) * 100;
    const margin24Pct = data && Number.isFinite(data.margin) ? data.margin * 100 : NaN;
    const shiftStr = Number.isFinite(margin24Pct) && Number.isFinite(margin20Pct)
      ? `${((margin24Pct - margin20Pct) >= 0 ? '+' : '')}${(margin24Pct - margin20Pct).toFixed(1)} pp`
      : '—';
    const votesDemStr = data ? formatNumber(Math.round(data.dem)) : 'N/A';
    const votesRepStr = data ? formatNumber(Math.round(data.rep)) : 'N/A';
    const totalStr = data ? formatNumber(Math.round(data.total)) : 'N/A';
    const html = `
      <div class="precinct-title">${county}</div>
      <div class="info-row"><span>Density:</span><span>${densityStr}</span></div>
      <div class="info-row"><span>GEOID:</span><span>${geoid}</span></div>
      ${row && row.area_sqmi != null && row.area_sqmi !== '' ? `<div class=\"info-row\"><span>Area:</span><span>${Number(row.area_sqmi).toFixed(2)} sq mi</span></div>` : ''}
      <div class="info-row"><span>Dem margin (2024):</span><span>${marginStr}</span></div>
      <div class="info-row"><span>Shift 20→24:</span><span>${shiftStr}</span></div>
      <div class="info-row"><span>Dem votes:</span><span>${votesDemStr}</span></div>
      <div class="info-row"><span>Rep votes:</span><span>${votesRepStr}</span></div>
      <div class="info-row"><span>Total votes:</span><span>${totalStr}</span></div>
    `;
    // Write into fixed hover box
    const fixed = document.getElementById('hoverContent');
    if (fixed) fixed.innerHTML = html;
    // still maintain outline and hovered state
    try {
      const extrudeExists = !!map.getLayer('extrusion_layer');
      const extrudeVisible = extrudeExists && map.getLayoutProperty('extrusion_layer', 'visibility') !== 'none';
      if (!extrudeVisible) map.setFilter('hover-outline', ['==', ['get', 'GEOID'], geoid]);
      else map.setFilter('hover-outline', ['==', ['get', 'GEOID'], '']);
    } catch {}
    try {
      if (appState.hoveredGeoid && appState.hoveredGeoid !== geoid) {
        map.setFeatureState({ source: 'route', sourceLayer: 'TX_24_with_counties', id: appState.hoveredGeoid }, { hovered: false });
      }
      map.setFeatureState({ source: 'route', sourceLayer: 'TX_24_with_counties', id: geoid }, { hovered: true });
      appState.hoveredGeoid = geoid;
    } catch {}
    // Ensure county outline is hidden in precinct mode
    try { map.setFilter('county-hover-outline', ['==', ['get', 'GEOID'], '']); } catch {}
  });
  map.on('mouseleave', 'results_layer', () => {
    // keep fixed box content; only clear outline
    try { map.setFilter('hover-outline', ['==', ['get', 'GEOID'], '']); } catch {}
    try {
      if (appState.hoveredGeoid) {
        map.setFeatureState({ source: 'route', sourceLayer: 'TX_24_with_counties', id: appState.hoveredGeoid }, { hovered: false });
        appState.hoveredGeoid = null;
      }
    } catch {}
  });

  // Global mousemove to clear precinct outline when not over a precinct
  map.on('mousemove', (e) => {
    if (map.getZoom() > 8) {
      let feats = [];
      try { feats = map.queryRenderedFeatures(e.point, { layers: ['results_layer'] }) || []; } catch {}
      if (!feats || feats.length === 0) {
        try {
          const extrudeExists = !!map.getLayer('extrusion_layer');
          const extrudeVisible = extrudeExists && map.getLayoutProperty('extrusion_layer', 'visibility') !== 'none';
          if (!extrudeVisible) map.setFilter('hover-outline', ['==', ['get', 'GEOID'], '']);
        } catch {}
      }
    }
  });
}

export function bindCountyHover() {
  const { map, popup } = appState;
  const pickCountyKey = (props) => {
    const keys = ['GEOID','GEOIDFP','FIPS','COUNTYFP','NAME','NAME20','NAMELSAD','COUNTY','county','name'];
    for (const k of keys) if (props && props[k] != null && String(props[k]).length) return k;
    return null;
  };
  const pickCountyName = (props) => {
    const keys = ['NAMELSAD','NAME','COUNTY','County','name','NAME20','NAMELSAD20'];
    for (const k of keys) if (props && props[k] != null && String(props[k]).length) return String(props[k]);
    return '';
  };

  const showCounty = (f, lngLat) => {
    const key = pickCountyKey(f.properties);
    if (!key) return;
    const value = String(f.properties[key]);
    try { map.setFilter('county-hover-outline', ['==', ['get', key], value]); } catch {}
    const countyName = pickCountyName(f.properties) || value;
    const normalized = normalizeCountyName(countyName);
    const rows = [];
    for (const [, row] of csvByGeoid) {
      const rn = normalizeCountyName(row['County'] || row['county'] || '');
      if (rn && rn === normalized) rows.push(row);
    }
    const agg = aggregateCounty(rows);
    const marginStr = Number.isFinite(agg.margin)
      ? `${((agg.margin) * 100 >= 0 ? '+' : '')}${((agg.margin) * 100).toFixed(1)}%` : '—';
    // County-level 20→24 shift (pp)
    let dem20 = 0, rep20 = 0, t20 = 0, fallback20 = 0, fallbackCount = 0;
    for (const r of rows) {
      const d20 = Number(r['20_biden']); const rr20 = Number(r['20_trump']); const tt20 = Number(r['20_total']);
      if (Number.isFinite(d20) && Number.isFinite(rr20) && Number.isFinite(tt20)) {
        dem20 += d20; rep20 += rr20; t20 += tt20;
      } else {
        const m20 = Number(r['pct_dem_lead_20']);
        if (Number.isFinite(m20)) { fallback20 += m20; fallbackCount += 1; }
      }
    }
    const margin20Pct = t20 > 0 ? ((dem20 - rep20) / t20) * 100
      : (fallbackCount > 0 ? (fallback20 / fallbackCount) * 100 : NaN);
    const margin24Pct = Number.isFinite(agg.margin) ? agg.margin * 100 : NaN;
    const shiftStr = Number.isFinite(margin24Pct) && Number.isFinite(margin20Pct)
      ? `${((margin24Pct - margin20Pct) >= 0 ? '+' : '')}${(margin24Pct - margin20Pct).toFixed(1)} pp`
      : '—';
    const html = `
      <div class="precinct-title">${countyName} (county)</div>
      <div class="info-row"><span>Dem margin (2024):</span><span>${marginStr}</span></div>
      <div class="info-row"><span>Shift 20→24:</span><span>${shiftStr}</span></div>
      <div class="info-row"><span>Dem votes:</span><span>${formatNumber(Math.round(agg.dem))}</span></div>
      <div class="info-row"><span>Rep votes:</span><span>${formatNumber(Math.round(agg.rep))}</span></div>
      <div class="info-row"><span>Total votes:</span><span>${formatNumber(Math.round(agg.total))}</span></div>
    `;
    const fixed = document.getElementById('hoverContent');
    if (fixed) fixed.innerHTML = html;
  };

  map.on('mousemove', 'counties-fill', (e) => {
    if (!e.features || e.features.length === 0) return;
    if (map.getZoom() > 8) return;
    showCounty(e.features[0], e.lngLat);
  });
  map.on('mousemove', 'county-hover-outline', (e) => {
    if (!e.features || e.features.length === 0) return;
    if (map.getZoom() > 8) return;
    showCounty(e.features[0], e.lngLat);
  });
  map.on('mouseleave', 'counties-fill', () => { try { map.setFilter('county-hover-outline', ['==', ['get', 'GEOID'], '']); } catch {} });
  map.on('mouseleave', 'county-hover-outline', () => { try { map.setFilter('county-hover-outline', ['==', ['get', 'GEOID'], '']); } catch {} });

  // Global mousemove to clear county outline when not over a county
  map.on('mousemove', (e) => {
    if (map.getZoom() <= 8) {
      let feats = [];
      try { feats = map.queryRenderedFeatures(e.point, { layers: ['counties-fill','county-hover-outline'] }) || []; } catch {}
      if (!feats || feats.length === 0) {
        try { map.setFilter('county-hover-outline', ['==', ['get', 'GEOID'], '']); } catch {}
      }
    }
  });
}


