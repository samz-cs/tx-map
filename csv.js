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

export function aggregateCounty(rows) {
  let dem = 0, rep = 0, total = 0;
  for (const row of rows) {
    const data = derive2024FromCsvRow(row);
    if (!data) continue;
    dem += data.dem; rep += data.rep; total += data.total;
  }
  const margin = total > 0 ? (dem - rep) / total : NaN;
  return { dem, rep, total, margin };
}
