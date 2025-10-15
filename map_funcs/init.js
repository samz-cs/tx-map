import { loadCsvIndex } from '../csv.js';
import { addBaseLayers, addCountyLayers, placeResultsBelowRoads, updateFillPaint } from '../layers.js';
import { initFilterBindings, applyMapFilters } from './filters.js';
import { renderTotals } from './totals.js';
import { init3DMode } from './mode_3d.js';
import { initShiftColorUI, refreshColorMode } from './shift_mode.js';
import { bindPrecinctHover, bindCountyHover } from './hover.js';
import { appState } from './state.js';

export async function init(mapboxgl) {
  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-99.341389, 31.330556],
    zoom: 6.1,
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
      init3DMode(map);
      initShiftColorUI(map);
      refreshColorMode(map);
      // Collapsible left column boxes
      try {
        const sBtn = document.getElementById('summaryToggle');
        const sContent = document.getElementById('summaryContent');
        const sBox = document.getElementById('summaryBox');
        if (sBtn && sContent && sBox) {
          sBtn.addEventListener('click', () => {
            const isOpen = sContent.style.display !== 'none';
            sContent.style.display = isOpen ? 'none' : 'block';
            sBtn.textContent = isOpen ? '+' : '−';
            sBox.classList.toggle('collapsed', isOpen);
          });
        }
        const hBtn = document.getElementById('hoverToggle');
        const hContent = document.getElementById('hoverContent');
        const hBox = document.getElementById('hoverBox');
        if (hBtn && hContent && hBox) {
          hBtn.addEventListener('click', () => {
            const isOpen = hContent.style.display !== 'none';
            hContent.style.display = isOpen ? 'none' : 'block';
            hBtn.textContent = isOpen ? '+' : '−';
            hBox.classList.toggle('collapsed', isOpen);
          });
        }
        // Reposition right boxes: Filter directly under Color mode, 3D directly under Filter
        const repositionRightBoxes = () => {
          const colorModeBox = document.getElementById('colorModeBox');
          const filterBox = document.getElementById('filterBox');
          const threeDBox = document.getElementById('threeDBox');
          const gap = 2;
          if (colorModeBox && filterBox) {
            const cRect = colorModeBox.getBoundingClientRect();
            const filterTop = cRect.top + cRect.height + gap;
            filterBox.style.top = `${filterTop}px`;
          }
          if (filterBox && threeDBox) {
            const fRect = filterBox.getBoundingClientRect();
            const threeDTop = fRect.top + fRect.height + gap;
            threeDBox.style.top = `${threeDTop}px`;
          }
        };

        const boxToggle = (headerId, contentId, boxId) => {
          const btn = document.getElementById(headerId);
          const content = document.getElementById(contentId);
          const box = document.getElementById(boxId);
          if (!btn || !content || !box) return;
          const toggleBtn = btn.querySelector('button');
          if (!toggleBtn) return;
          toggleBtn.addEventListener('click', () => {
            const isOpen = content.style.display !== 'none';
            content.style.display = isOpen ? 'none' : 'block';
            toggleBtn.textContent = isOpen ? '+' : '−';
            if (!isOpen) {
              box.classList.remove('collapsed');
              // expand width to standard
              if (boxId === 'filterBox') box.style.width = '360px';
              if (boxId === 'threeDBox') box.style.width = '240px';
            } else {
              box.classList.add('collapsed');
              // collapse to title width
              box.style.width = 'max-content';
            }
            repositionRightBoxes();
          });
        };
        boxToggle('filterHeader','filterContent','filterBox');
        boxToggle('threeDHeader','threeDContent','threeDBox');
        repositionRightBoxes();
      } catch {}
    });
    // Keep zoomBox in sync and enforce outline mode on zoom
    const updateZoomIndicator = () => {
      const box = document.getElementById('zoomBox');
      if (box) box.textContent = `Zoom: ${map.getZoom().toFixed(1)}`;
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


