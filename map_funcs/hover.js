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
    const votesDemStr = data ? formatNumber(Math.round(data.dem)) : 'N/A';
    const votesRepStr = data ? formatNumber(Math.round(data.rep)) : 'N/A';
    const totalStr = data ? formatNumber(Math.round(data.total)) : 'N/A';
    const html = `
      <div class="precinct-title">${county}</div>
      <div class="info-row"><span>Density:</span><span>${densityStr}</span></div>
      <div class="info-row"><span>GEOID:</span><span>${geoid}</span></div>
      ${row && row.area_sqmi != null && row.area_sqmi !== '' ? `<div class=\"info-row\"><span>Area:</span><span>${Number(row.area_sqmi).toFixed(2)} sq mi</span></div>` : ''}
      <div class="info-row"><span>Dem margin (2024):</span><span>${marginStr}</span></div>
      <div class="info-row"><span>Dem votes:</span><span>${votesDemStr}</span></div>
      <div class="info-row"><span>Rep votes:</span><span>${votesRepStr}</span></div>
      <div class="info-row"><span>Total votes:</span><span>${totalStr}</span></div>
    `;
    popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
    try { map.setFilter('hover-outline', ['==', ['get', 'GEOID'], geoid]); } catch {}
    // Ensure county outline is hidden in precinct mode
    try { map.setFilter('county-hover-outline', ['==', ['get', 'GEOID'], '']); } catch {}
  });
  map.on('mouseleave', 'results_layer', () => {
    try { appState.popup.remove(); } catch {}
    try { map.setFilter('hover-outline', ['==', ['get', 'GEOID'], '']); } catch {}
  });

  // Global mousemove to clear precinct outline when not over a precinct
  map.on('mousemove', (e) => {
    if (map.getZoom() > 8) {
      let feats = [];
      try { feats = map.queryRenderedFeatures(e.point, { layers: ['results_layer'] }) || []; } catch {}
      if (!feats || feats.length === 0) {
        try { map.setFilter('hover-outline', ['==', ['get', 'GEOID'], '']); } catch {}
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
    const html = `
      <div class="precinct-title">${countyName} (county)</div>
      <div class="info-row"><span>Dem margin (2024):</span><span>${marginStr}</span></div>
      <div class="info-row"><span>Dem votes:</span><span>${formatNumber(Math.round(agg.dem))}</span></div>
      <div class="info-row"><span>Rep votes:</span><span>${formatNumber(Math.round(agg.rep))}</span></div>
      <div class="info-row"><span>Total votes:</span><span>${formatNumber(Math.round(agg.total))}</span></div>
    `;
    popup.setLngLat(lngLat).setHTML(html).addTo(map);
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
  map.on('mouseleave', 'counties-fill', () => { try { popup.remove(); } catch {}; try { map.setFilter('county-hover-outline', ['==', ['get', 'GEOID'], '']); } catch {} });
  map.on('mouseleave', 'county-hover-outline', () => { try { popup.remove(); } catch {}; try { map.setFilter('county-hover-outline', ['==', ['get', 'GEOID'], '']); } catch {} });

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


