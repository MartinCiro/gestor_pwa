export const EXPORT_DELIMITER = ',';
const BOM = '\ufeff';
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const ALIASES: Record<string, string[]> = {
  tipificacion: ['tipificacion', 'titulo', 'nombre', 'texto', 'asunto', 'name', 'title'],
  descripcion:  ['descripcion', 'detalle', 'resultado', 'nota', 'observacion', 'description'],
  fecha:        ['fecha', 'date', 'created', 'creado', 'fecha registro'],
};
const resolveColumn = (header: string) => {
  const h = normalize(header);
  for (const [field, aliases] of Object.entries(ALIASES)) if (h === field || aliases.includes(h)) return field;
  return null;
};
export function detectDelimiter(text: string) {
  const firstLine = text.replace(/^\uFEFF/, '').split(/\r?\n/)[0] ?? '';
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0, '|': 0 };
  let inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch]++;
  }
  const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return winner && winner[1] > 0 ? winner[0] : ',';
}
function splitRows(text: string, delim: string) {
  const rows: string[][] = []; let row: string[] = []; let field = ''; let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) { if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; } else field += ch; continue; }
    if (ch === '"') inQuotes = true;
    else if (ch === delim) { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}
export function parseCSV(raw: string) {
  const text = raw.replace(/^\uFEFF/, '');
  const delimiter = detectDelimiter(text);
  const grid = splitRows(text, delimiter).filter(r => r.some(c => c.trim() !== ''));
  if (grid.length === 0) return { rows: [], delimiter, headers: [], mapped: {} };
  const headers = grid[0].map(h => h.trim());
  const mapped: Record<string, string | null> = {};
  headers.forEach(h => { const f = resolveColumn(h); if (f && mapped[f] === undefined) mapped[f] = h; });
  const rows = grid.slice(1).map(cells => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (cells[i] ?? '').trim(); });
    return obj;
  });
  return { rows, delimiter, headers, mapped };
}
const escapeField = (value: unknown, delim: string) => {
  const s = value === null || value === undefined ? '' : String(value);
  return new RegExp(`["\r\n${delim === '|' ? '\\|' : delim}]`).test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export function toCSV(rows: Record<string, unknown>[], columns: string[], delimiter: string = EXPORT_DELIMITER) {
  const header = columns.map(c => escapeField(c, delimiter)).join(delimiter);
  const body = rows.map(r => columns.map(c => escapeField(r[c], delimiter)).join(delimiter));
  return BOM + [header, ...body].join('\r\n');
}
export function downloadFile(content: string, filename: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}