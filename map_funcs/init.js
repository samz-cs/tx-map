import { loadCsvIndex } from '../csv.js';
import { addBaseLayers, addCountyLayers, placeResultsBelowRoads, updateFillPaint } from '../layers.js';
import { initFilterBindings, applyMapFilters } from './filters.js';
import { renderTotals } from './totals.js';
import { bindPrecinctHover, bindCountyHover } from './hover.js';
import { appState } from './state.js';

export async function init(mapboxgl) {
  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-99.341389, 31.330556],
    zoom: 5.5,
    maxZoom: 16,
  });
  appState.map = map;
  appState.popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });

  const csvPromise = loadCsvIndex('./demographics.csv')
    .then(() => console.log('csv loaded'))
    .catch((e) => console.error('CSV load failed', e));

  const setup = () => {
    addBaseLayers(map);
    addCountyLayers(map);
    updateFillPaint(map);
    map.once('idle', () => {
      applyMapFilters();
      placeResultsBelowRoads(map);
      initFilterBindings();
      renderTotals();
    });
    // Keep zoomBox in sync and enforce outline mode on zoom
    const updateZoomIndicator = () => {
      const box = document.getElementById('zoomBox');
      if (box) box.textContent = `Zoom: ${map.getZoom().toFixed(1)}`;
      const notice = document.getElementById('zoomNotice');
      if (notice) notice.style.display = map.getZoom() < 5 ? 'block' : 'none';
      // clear conflicting outlines when crossing threshold
      if (map.getZoom() > 8) {
        try { map.setFilter('county-hover-outline', ['==', ['get', 'GEOID'], '']); } catch {}
      } else {
        try { map.setFilter('hover-outline', ['==', ['get', 'GEOID'], '']); } catch {}
      }
    };
    map.on('zoom', updateZoomIndicator);
    map.on('zoomend', updateZoomIndicator);
    updateZoomIndicator();
    bindPrecinctHover();
    bindCountyHover();
  };

  map.on('style.load', setup);
  if (map.isStyleLoaded && map.isStyleLoaded()) setup();
  await csvPromise;
}


