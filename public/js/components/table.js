export function rowsHtml(rows){
  return rows.map(r=> `<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('');
}
