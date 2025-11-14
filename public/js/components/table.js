// public/js/components/table.js
// Safe-by-default table cell rendering.
// Pass plain strings/numbers and they will be escaped.
// To inject markup on purpose, pass { html: "<span class='pill …'>…</span>" }.

const escapeHtml = s =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const cellHtml = v => {
  if (v && typeof v === 'object' && 'html' in v) return v.html;
  return escapeHtml(v ?? '');
};

export function rowsHtml(rows){
  return rows
    .map(r => `<tr>${r.map(c => `<td>${cellHtml(c)}</td>`).join('')}</tr>`)
    .join('');
}
