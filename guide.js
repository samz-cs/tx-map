// Guide and welcome modal logic extracted from index.html

// Start Intro.js guide when clicking the Guide button
window.startGuide = function startGuide() {
  const intro = introJs();
  let extraGuideOverlay = null;
  const removeSecondaryHighlight = () => { if (extraGuideOverlay) { try { extraGuideOverlay.remove(); } catch {} extraGuideOverlay = null; } };
  const addSecondaryHighlight = (targetEl) => {
    if (!targetEl) return;
    removeSecondaryHighlight();
    const r = targetEl.getBoundingClientRect();
    const o = document.createElement('div');
    o.style.position = 'fixed';
    o.style.left = (r.left - 4) + 'px';
    o.style.top = (r.top - 4) + 'px';
    o.style.width = (r.width + 8) + 'px';
    o.style.height = (r.height + 8) + 'px';
    o.style.border = '6px solid #25DB9E';
    o.style.borderRadius = '8px';
    o.style.pointerEvents = 'none';
    o.style.zIndex = '100000';
    document.body.appendChild(o);
    extraGuideOverlay = o;
  };

  const steps = [
    {
      element: document.querySelector('#map'),
      intro: `Navigation: <br> 1. Left-click hold and drag to move <br> 
      2. Scroll to zoom <br> 
      3. Right-click hold (two finger click on Mac) and drag to rotate/tilt`,
      position: 'left'
    },
    // Color mode overview
    {
      element: document.querySelector('#colorModeBox'),
      intro: `Color mode lets you switch between Dem Margin and Shift (20→24).`
    },
    // Dem Margin focused step (outline only the Dem radio control)
    {
      element: (function(){ const el = document.querySelector('#colorModeBox input[value="margin"]'); return el ? el.parentElement : document.querySelector('#colorModeBox'); })(),
      intro: `Dem Margin: colors indicate margin of victory. <br>
      Deeper blue = larger Dem margin <br>
      Deeper red = larger Rep margin`
    },
    // Shift focused step (outline only the Shift radio control)
    {
      element: (function(){ const el = document.querySelector('#colorModeBox input[value="shift"]'); return el ? el.parentElement : document.querySelector('#colorModeBox'); })(),
      intro: `Shift (20→24): shows margin change from 2020 to 2024. <br>
      Blue = moved toward Dem <br>
      Red = moved toward Rep`
    },
    {
      element: document.querySelector('#filterBox'),
      intro: `Filters: set demographic and totals criteria. <br>
      Scroll and press Apply or the "Enter" key to filter the map.`
    },
    // Hover-only step
    {
      element: document.querySelector('#hoverBox'),
      intro: `Hover Box: shows info for the area under your cursor.`,
      position: 'right'
    },
    // Zoom-only step
    {
      element: document.querySelector('#zoomBox'),
      intro: `Zoom indicator: shows current zoom level.`,
      position: 'left'
    },
    // Combined highlight step (adds secondary outline to zoom box)
    {
      element: document.querySelector('#hoverBox'),
      intro: `Hover + Zoom together: Zoom < 8 it shows County info; zoom > 8 it shows Precinct info.`,
      position: 'right',
      hoverZoomCombined: true
    },
    {
      element: document.querySelector('#threeDHeader .collapse-btn'),
      intro: 'Minimize buttons: collapse or expand boxes.',
      position: 'left'
    },
    {
      element: document.querySelector('#threeDBox'),
      intro: `3D mode: choose a metric, set heights and contrast, then click Apply to extrude precincts. <br>
      Heights are based on the selected demographic's proportions.`,
      position: 'top'
    },
    // 3D Height controls
    {
      element: document.querySelector('#threeDMaxHeight'),
      intro: `Height controls: Max height sets the tallest precinct. <br>
      Increase max height when zooming out. Decrease when viewing smaller areas.`,
      position: 'top'
    },
    // 3D Contrast control
    {
      element: document.querySelector('#threeDContrast'),
      intro: `Contrast (γ): <br>
      Higher contrast value increases separation between short and tall precincts; <br>
      Contrast value of 1 is linear scaling. <br>
      Contrast value of < 1 compresses height differences. <br><br>
      Use a higher value when metrics are similar in height and you want to see more difference.
      `,
      position: 'top'
    },
    {
      element: document.querySelector('#threeDClear'),
      intro: `Press Clear to go back to 2D mode.`,
      position: 'left'
      
    }
  ];

  intro.setOptions({
    steps,
    showStepNumbers: false,
    exitOnOverlayClick: false,
    overlayOpacity: 0,
    disableInteraction: false,
    scrollToElement: false,
    nextLabel: 'Next',
    prevLabel: 'Back',
    doneLabel: 'Done'
  });

  intro.onbeforechange((el) => {
    removeSecondaryHighlight();
    // Scroll the 3D panel before height/contrast steps so outlines align
    if (el && (el.id === 'threeDMaxHeight' || el.id === 'threeDContrast')) {
      const cont = document.getElementById('threeDContent');
      if (cont) {
        try { cont.scrollTop = cont.scrollHeight; } catch {}
      }
    }
  });
  intro.onafterchange((el) => {
    const idx = intro._currentStep || 0;
    const step = steps[idx];
    if (step && step.hoverZoomCombined) {
      const zoomEl = document.getElementById('zoomBox');
      addSecondaryHighlight(zoomEl);
    } else {
      removeSecondaryHighlight();
    }
  });
  intro.onexit(removeSecondaryHighlight);
  intro.oncomplete(removeSecondaryHighlight);

  intro.start();
};

// Show welcome modal on load
(function bindWelcomeModal() {
  const welcome = document.getElementById('welcomeModal');
  const showWelcome = () => { if (welcome) welcome.style.display = 'flex'; };
  const hideWelcome = () => { if (welcome) welcome.style.display = 'none'; };
  window.addEventListener('load', showWelcome);
  const wSkip = document.getElementById('welcomeSkip');
  const wGuide = document.getElementById('welcomeGuide');
  if (wSkip) wSkip.addEventListener('click', hideWelcome);
  if (wGuide) wGuide.addEventListener('click', () => { hideWelcome(); window.startGuide(); });
})();
