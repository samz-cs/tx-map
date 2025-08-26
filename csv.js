export const csvByGeoid = new Map();
export let csvLoaded = false;

export function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export async function loadCsvIndex(url) {
  const res = await fetch(url);
  if (!res.ok) return;
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return;
  const headers = splitCSVLine(lines[0]).map((h) => h.trim());
  const idxGeoid = headers.findIndex((h) => h.toLowerCase() === 'geoid');
  for (let i = 1; i < lines.length; i++) {
    const parts = splitCSVLine(lines[i]);
    if (parts.length === 0) continue;
    const row = {};
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]] = parts[c] !== undefined ? parts[c] : '';
    }
    const geoid = idxGeoid >= 0 ? row[headers[idxGeoid]] : row['GEOID'] || row['geoid'];
    if (!geoid) continue;
    csvByGeoid.set(String(geoid), row);
  }
  csvLoaded = true;
}

export function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function derive2024FromCsvRow(row) {
  if (!row) return null;
  const dem = num(row['votes_dem']);
  const rep = num(row['votes_rep']);
  const total = num(row['votes_total']);
  const margin = total > 0 ? (dem - rep) / total : NaN;
  const demPct = total > 0 ? dem / total : 0;
  const repPct = total > 0 ? rep / total : 0;
  return { dem, rep, total, margin, demPct, repPct };
}

export function deriveCustomFromRow(row, params) {
  if (!row) return null;
  // VAP counts
  const vap = num(row['vap']);
  const anglovap = num(row['anglovap']);
  const asianvap = num(row['asianvap']);
  const blackvap = num(row['blackvap']);
  const hispvap = num(row['hispvap']);
  const others = Math.max(0, vap - (anglovap + asianvap + blackvap + hispvap));

  // Turnout and dem% per group
  const groups = {
    anglo: { t: params.anglo.turnout, d: params.anglo.dem, n: anglovap },
    asian: { t: params.asian.turnout, d: params.asian.dem, n: asianvap },
    black: { t: params.black.turnout, d: params.black.dem, n: blackvap },
    hisp:  { t: params.hisp.turnout,  d: params.hisp.dem,  n: hispvap  },
    other: { t: 0.40, d: 0.50, n: others }, // neutral defaults for residual
  };

  let demVotes = 0, repVotes = 0, totalVotes = 0;
  for (const g of Object.values(groups)) {
    const turnout = Math.max(0, Math.min(1, g.t || 0));
    const demShare = Math.max(0, Math.min(1, g.d || 0));
    const votes = g.n * turnout;
    totalVotes += votes;
    demVotes += votes * demShare;
    repVotes += votes * (1 - demShare);
  }
  const margin = totalVotes > 0 ? (demVotes - repVotes) / totalVotes : NaN;
  return { dem: demVotes, rep: repVotes, total: totalVotes, margin };
}

export function aggregateCounty(rows, renderMode, params) {
  let dem = 0, rep = 0, total = 0;
  for (const row of rows) {
    let data;
    if (renderMode === '2024') data = derive2024FromCsvRow(row);
    else if (renderMode === 'custom') data = deriveCustomFromRow(row, params);
    if (!data) continue;
    dem += data.dem; rep += data.rep; total += data.total;
  }
  const margin = total > 0 ? (dem - rep) / total : NaN;
  return { dem, rep, total, margin };
}
