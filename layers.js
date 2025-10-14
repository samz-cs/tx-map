export function addBaseLayers(map) {
  console.log("addBaseLayers called")
  map.addSource('route', { type: 'vector', url: 'mapbox://tosamuel.aybsj38o', promoteId: 'GEOID' });
  console.log("source added")
  map.addLayer({
    id: 'results_layer',
    type: 'fill',
    source: 'route',
    'source-layer': 'TX_24_with_counties',
    paint: { 'fill-opacity': 1.0 },
    // slot: 'bottom',
    // explicit reordering will be handled after load
  });

  map.addLayer({
    id: 'hover-outline',
    type: 'line',
    source: 'route',
    'source-layer': 'TX_24_with_counties',
    paint: { 'line-color': '#000', 'line-width': 4, 'line-opacity': 1 },
    filter: ['==', ['get', 'GEOID'], ''],
    slot: 'top',
  });

  
}


export function setFillPaintMargin(map) {
  const csvMargin = ['feature-state', 'csv_margin_active'];
  const margin24 = ['to-number', ['coalesce', ['get', 'pct_dem_lead'], 0]];
  const fillValue = ['coalesce', csvMargin, margin24];
  const expr = ['step', fillValue,
    '#b83b3b', -0.75, '#d67272', -0.5, '#eba1a1', -0.25, '#ffe6e6',
    0, '#d9f0ff', 0.25, '#a3cde5', 0.5, '#5d9fcc', 0.75, '#2a6db0'
  ];
  // 2D should NOT show green hover; keep margin palette on 2D layer
  try { map.setPaintProperty('results_layer', 'fill-color', expr); } catch {}
  try { map.setPaintProperty('results_layer', 'fill-color-transition', { duration: 0 }); } catch {}
  // 3D hover green for extrusions only
  const hoverExpr3D = ['case', ['boolean', ['feature-state', 'hovered'], false], '#006400', expr];
  try { if (map.getLayer('extrusion_layer')) map.setPaintProperty('extrusion_layer', 'fill-extrusion-color', hoverExpr3D); } catch {}
  try { if (map.getLayer('extrusion_layer')) map.setPaintProperty('extrusion_layer', 'fill-extrusion-color-transition', { duration: 0 }); } catch {}
}

export function setFillPaintShift(map) {
  // Shift palette thresholds at 5%, 10%, 15% (fractions 0.05, 0.10, 0.15)
  const shiftVal = ['to-number', ['coalesce', ['feature-state', 'csv_margin_active'], 0]];
  const expr = ['step', shiftVal,
    // < -15%
    '#b83b3b',
    -0.15, '#d67272',
    -0.10, '#eba1a1',
    -0.05, '#ffe6e6',
    0.0, '#d9f0ff',
    0.05, '#a3cde5',
    0.10, '#5d9fcc',
    0.15, '#2a6db0'
  ];
  // 2D should NOT show green hover; keep shift palette on 2D layer
  try { map.setPaintProperty('results_layer', 'fill-color', expr); } catch {}
  try { map.setPaintProperty('results_layer', 'fill-color-transition', { duration: 0 }); } catch {}
  // 3D hover green for extrusions only
  const hoverExpr3D = ['case', ['boolean', ['feature-state', 'hovered'], false], '#006400', expr];
  try { if (map.getLayer('extrusion_layer')) map.setPaintProperty('extrusion_layer', 'fill-extrusion-color', hoverExpr3D); } catch {}
  try { if (map.getLayer('extrusion_layer')) map.setPaintProperty('extrusion_layer', 'fill-extrusion-color-transition', { duration: 0 }); } catch {}
}

// Backward compatibility alias
export const updateFillPaint = setFillPaintMargin;

// Counties source and hover outline
export function addCountyLayers(map) {
  // Vector tileset containing Texas county polygons
  if (!map.getSource('counties')) {
    map.addSource('counties', { type: 'vector', url: window.APP_CONFIG.COUNTY_SOURCE_URL });
  }

  // Invisible fill to capture mouse events over counties
  if (!map.getLayer('counties-fill')) {
    map.addLayer({
      id: 'counties-fill',
      type: 'fill',
      source: 'counties',
      'source-layer': window.APP_CONFIG.COUNTY_SOURCE_LAYER,
      paint: { 'fill-opacity': 0.01 },
      // keep this high so it can capture pointer events above basemap
      slot: 'top',
    });
  }

  // Hover outline for counties
  if (!map.getLayer('county-hover-outline')) {
    map.addLayer({
      id: 'county-hover-outline',
      type: 'line',
      source: 'counties',
      'source-layer': window.APP_CONFIG.COUNTY_SOURCE_LAYER,
      paint: { 'line-color': '#000', 'line-width': 3, 'line-opacity': 0.9 },
      filter: ['==', ['get', window.APP_CONFIG.COUNTY_KEY_PROPERTY], ''],
      slot: 'top',
    });
  }
}

export function placeResultsBelowRoads(map) {
  try {
    const style = map.getStyle();
    if (!style || !Array.isArray(style.layers)) return;
    let beforeId = null;
    for (const layer of style.layers) {
      if (!layer || !layer.id) continue;
      const id = layer.id;
      const type = layer.type;
      if (id.includes('road')) { beforeId = id; break; }
      if (type === 'symbol') { beforeId = id; break; }
    }
    if (beforeId && map.getLayer('results_layer')) {
      map.moveLayer('results_layer', beforeId);
    }
    // Keep hover outlines on top for visibility
    const lastLayerId = style.layers[style.layers.length - 1]?.id;
    if (lastLayerId) {
      // Ensure county hit layer sits high for pointer events
      if (map.getLayer('counties-fill')) map.moveLayer('counties-fill', lastLayerId);
      // Then put outlines last
      if (map.getLayer('hover-outline')) map.moveLayer('hover-outline', lastLayerId);
      if (map.getLayer('county-hover-outline')) map.moveLayer('county-hover-outline', lastLayerId);
    }
  } catch {}
}
