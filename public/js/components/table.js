// public/js/components/table.js
// Safe-by-default table cell rendering.
// Pass plain strings/numbers and they will be escaped.
// To inject markup on purpose, pass { html: "<span class='pill …'>…</span>" }.
// showing data in rows and columns in table form: like different patient data in table form
const escapeHtml = s =>
  // Escape special HTML characters in the given string
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
// to show data in each cell of the table
const cellHtml = v => {
  if (v && typeof v === 'object' && 'html' in v) return v.html;
  return escapeHtml(v ?? '');
};
// to show data in rows of the table
// rows: array of rows, each row is an array of cell values
export function rowsHtml(rows){
  return rows
    .map(r => `<tr>${r.map(c => `<td>${cellHtml(c)}</td>`).join('')}</tr>`)
    .join('');
}
