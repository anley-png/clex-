try { const s = JSON.parse(localStorage.getItem('sheet') || '{}'); data = s.data || {}; fmt = s.fmt || {}; } catch (e) {}
const save = () => { try { localStorage.setItem('sheet', JSON.stringify({ data, fmt })); } catch (e) {} };
let cur = [0, 0], editing = false;

// ---------- grid ----------
const grid = document.getElementById('grid'), fx = document.getElementById('fx'), addr = document.getElementById('addr');
grid.innerHTML = '<thead><tr><th class="r"></th>' + [...Array(COLS)].map((_, c) => `<th>${colName(c)}</th>`).join('') + '</tr></thead><tbody>' +
  [...Array(ROWS)].map((_, r) => `<tr><th class="r">${r + 1}</th>` + [...Array(COLS)].map((_, c) => `<td data-k="${key(c, r)}"></td>`).join('') + '</tr>').join('') + '</tbody>';
const cell = k => grid.querySelector(`td[data-k="${k}"]`);

function render() {
  calc(); calc();
  grid.querySelectorAll('td').forEach(td => {
    if (td.querySelector('input')) return;
    const k = td.dataset.k, d = display(k);
    td.textContent = d.text;
    td.className = (d.num ? 'num ' : '') + (d.err ? 'err ' : '') + (fmt[k] ? 'b ' : '') + (k === key(...cur) ? 'sel' : '');
  });
  fx.value = data[key(...cur)] || '';
  addr.textContent = key(...cur);
  document.getElementById('bold').classList.toggle('on', !!fmt[key(...cur)]);
}
function select(c, r) {
  cur = [Math.max(0, Math.min(COLS - 1, c)), Math.max(0, Math.min(ROWS - 1, r))];
  render(); cell(key(...cur)).scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function commit(k, v) { v === '' ? delete data[k] : data[k] = v; save(); }
function edit(initial) {
  const k = key(...cur), td = cell(k); editing = true;
  const inp = document.createElement('input');
  inp.value = initial ?? (data[k] || ''); td.textContent = ''; td.appendChild(inp); inp.focus();
  if (initial !== undefined) inp.setSelectionRange(inp.value.length, inp.value.length);
  const finish = (move) => { if (!editing) return; editing = false; commit(k, inp.value); inp.remove(); move ? select(cur[0] + move[0], cur[1] + move[1]) : render(); grid.focus(); };
  inp.onkeydown = e => {
    if (e.key === 'Enter') { e.preventDefault(); finish([0, 1]); }
    else if (e.key === 'Tab') { e.preventDefault(); finish([e.shiftKey ? -1 : 1, 0]); }
    else if (e.key === 'Escape') { editing = false; inp.remove(); render(); grid.focus(); }
  };
  inp.onblur = () => finish();
}
grid.tabIndex = 0;
grid.addEventListener('mousedown', e => { const td = e.target.closest('td'); if (td && !editing) { const [c, r] = parseKey(td.dataset.k); select(c, r); } });
grid.addEventListener('dblclick', e => { if (e.target.closest('td') && !editing) edit(); });
document.addEventListener('keydown', e => {
  if (editing || e.target === fx) return;
  const mv = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
  if (mv) { e.preventDefault(); select(cur[0] + mv[0], cur[1] + mv[1]); }
  else if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); edit(); }
  else if (e.key === 'Delete' || e.key === 'Backspace') { commit(key(...cur), ''); render(); }
  else if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); toggleBold(); }
  else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { e.preventDefault(); edit(e.key); }
});
fx.addEventListener('keydown', e => { if (e.key === 'Enter') { commit(key(...cur), fx.value); render(); grid.focus(); } });

// ---------- toolbar ----------
function toggleBold() { const k = key(...cur); fmt[k] ? delete fmt[k] : fmt[k] = 1; save(); render(); }
document.getElementById('bold').onclick = toggleBold;
document.getElementById('clearBtn').onclick = () => { if (confirm('Clear the whole sheet?')) { data = {}; fmt = {}; save(); render(); } };
const q = s => /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
document.getElementById('exportBtn').onclick = () => {
  let maxR = 0, maxC = 0; Object.keys(data).forEach(k => { const [c, r] = parseKey(k); maxR = Math.max(maxR, r); maxC = Math.max(maxC, c); });
  const rows = []; for (let r = 0; r <= maxR; r++) { const row = []; for (let c = 0; c <= maxC; c++) row.push(q(display(key(c, r)).text)); rows.push(row.join(',')); }
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })), download: 'sheet.csv' });
  a.click(); URL.revokeObjectURL(a.href);
};
const importBtn = document.getElementById('importBtn'), file = document.getElementById('file');
importBtn.onclick = () => file.click();
file.onchange = async () => {
  const f = file.files[0]; if (!f) return;
  const t = await f.text(); data = {}; fmt = {};
  let r = 0, c = 0, v = '', inQ = false;
  const push = () => { if (v !== '' && r < ROWS && c < COLS) data[key(c, r)] = v; v = ''; };
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (inQ) { if (ch === '"' && t[i + 1] === '"') { v += '"'; i++; } else if (ch === '"') inQ = false; else v += ch; }
    else if (ch === '"') inQ = true;
    else if (ch === ',') { push(); c++; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; push(); r++; c = 0; }
    else v += ch;
  }
  push(); save(); file.value = ''; select(0, 0);
};
select(0, 0);
