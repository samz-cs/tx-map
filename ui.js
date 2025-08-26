export function formatNumber(n) {
  return Number.isFinite(n) ? n.toLocaleString('en-US') : 'N/A';
}

export function pct(x) {
  return `${x >= 0 ? '+' : ''}${x.toFixed(1)}%`;
}

export function pp(x) {
  return `${x >= 0 ? '+' : ''}${x.toFixed(1)} pp`;
}

export function pf(x) {
  return `${x.toFixed(1)}%`;
}

export function normalizeCountyName(name) {
  if (!name) return '';
  let s = String(name).trim().toLowerCase();
  s = s.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  if (s.endsWith(' county')) s = s.slice(0, -7).trim();
  return s;
}

export function installCustomControls(containerId = 'sliderBox') {
  const host = document.getElementById(containerId);
  if (!host) return;
  const html = `
    <div id="demo-controls" style="margin-top:8px; display:grid; grid-template-columns: auto 1fr auto; gap:8px; align-items:center;">
      <div style="grid-column: 1 / span 3; font-weight:600; margin-bottom:4px;">Demographic Adjustments</div>
      ${['anglo','asian','black','hisp'].map(key => `
        <div style="grid-column: 1; text-transform:capitalize; font-weight:500;">${key}</div>
        <div style="grid-column: 2; display:flex; gap:8px; align-items:center;">
          <label style="font-size:11px;">Turnout%</label>
          <input type="number" min="0" max="100" step="1" id="${key}-turnout" style="width:80px;"/>
          <label style="font-size:11px;">Dem%</label>
          <input type="number" min="0" max="100" step="1" id="${key}-dem" style="width:80px;"/>
        </div>
        <div style="grid-column: 3; font-size:11px; white-space:nowrap;">
          <span id="${key}-turnout-val"></span> | <span id="${key}-dem-val"></span>
        </div>
      `).join('')}
    </div>
  `;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  host.appendChild(wrapper);
}
