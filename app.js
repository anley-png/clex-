const $ = s => document.querySelector(s);
let B, hist = [], redoS = [], cur = [0, 0], ext = [0, 0], editing = false, clip = null, drag = false;
const newSheet = n => ({ name: n, data: {}, fmt: {}, charts: [] });
(function load() {
  try {
    const j = JSON.parse(localStorage.getItem('sheet2') || 'null'); if (j && j.sheets) { B = j; return; }
    const o = JSON.parse(localStorage.getItem('sheet') || 'null');
    if (o) { const s = newSheet('Sheet1'); s.data = o.data || {}; for (const k in o.fmt || {}) s.fmt[k] = o.fmt[k] === 1 ? { b: 1 } : o.fmt[k]; B = { sheets: [s], active: 0 }; return; }
  } catch (e) {}
  B = { sheets: [newSheet('Sheet1')], active: 0 };
})();
const S = () => B.sheets[B.active];
data = S().data; fmt = S().fmt;
const save = () => { try { localStorage.setItem('sheet2', JSON.stringify(B)); } catch (e) {} };
const state = () => JSON.stringify({ data, fmt, charts: S().charts });
const snap = () => { hist.push(state()); if (hist.length > 100) hist.shift(); redoS = []; };
const restore = s => { Object.assign(S(), JSON.parse(s)); data = S().data; fmt = S().fmt; save(); render(); };
const undo = () => { if (hist.length) { redoS.push(state()); restore(hist.pop()); } };
const redo = () => { if (redoS.length) { hist.push(state()); restore(redoS.pop()); } };

// ---------- grid ----------
const grid = $('#grid'), fx = $('#fx'), addr = $('#addr');
grid.innerHTML = '<thead><tr><th class="r"></th>' + [...Array(COLS)].map((_, c) => `<th>${colName(c)}</th>`).join('') + '</tr></thead><tbody>' +
  [...Array(ROWS)].map((_, r) => `<tr><th class="r">${r + 1}</th>` + [...Array(COLS)].map((_, c) => `<td data-k="${key(c, r)}"></td>`).join('') + '</tr>').join('') + '</tbody>';
const cells = [...grid.querySelectorAll('tbody tr')].map(tr => [...tr.querySelectorAll('td')]);
const FONTS = { sans: 'system-ui,sans-serif', serif: 'Georgia,serif', mono: 'ui-monospace,Consolas,monospace' };
const rg = () => ({ c1: Math.min(cur[0], ext[0]), r1: Math.min(cur[1], ext[1]), c2: Math.max(cur[0], ext[0]), r2: Math.max(cur[1], ext[1]) });
const each = f => { const g = rg(); for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) f(key(c, r), c, r); };

function paint(td) {
  const k = td.dataset.k, f = fmt[k] || {}, d = display(k);
  td.className = (d.num && !f.al ? 'num ' : '') + (d.err ? 'err ' : '') + (f.note ? 'note' : '');
  td.title = f.note || '';
  td.style.cssText = (f.b ? 'font-weight:700;' : '') + (f.i ? 'font-style:italic;' : '') + (f.u ? 'text-decoration:underline;' : '') + (f.color ? `color:${f.color};` : '') + (f.bg ? `background:${f.bg};` : '') + (f.al ? `text-align:${f.al};` : '') + (f.ff ? `font-family:${FONTS[f.ff]};` : '') + (f.fs ? `font-size:${f.fs}px;` : '') + (f.bd ? 'border:1px solid #222;' : '');
  if (f.cb) { td.textContent = ''; const i = document.createElement('input'); i.type = 'checkbox'; i.checked = value(k) === true; td.appendChild(i); }
  else if (f.link && /^https?:\/\//i.test(f.link)) { td.textContent = ''; const a = document.createElement('a'); a.href = f.link; a.target = '_blank'; a.rel = 'noopener'; a.textContent = d.text || f.link; td.appendChild(a); }
  else { let t = d.text; if (f.nf && d.num) { try { t = TEXT(value(k), f.nf); } catch (e) {} } td.textContent = t; }
}
function paintSel() {
  const g = rg();
  cells.forEach((row, r) => row.forEach((td, c) => { td.classList.toggle('in', c >= g.c1 && c <= g.c2 && r >= g.r1 && r <= g.r2); td.classList.toggle('sel', c === cur[0] && r === cur[1]); }));
  const a = key(...cur), f = fmt[a] || {};
  addr.textContent = g.c1 === g.c2 && g.r1 === g.r2 ? a : key(g.c1, g.r1) + ':' + key(g.c2, g.r2);
  if (!editing) fx.value = data[a] || '';
  for (const p of ['b', 'i', 'u']) document.querySelector(`[data-act=${p}]`).classList.toggle('on', !!f[p]);
}
function render() {
  calc(); calc();
  cells.forEach(row => row.forEach(td => { if (!td.querySelector('input:not([type=checkbox])')) paint(td); }));
  renderCharts(); renderTabs(); paintSel();
}
function select(c, r, x) {
  c = Math.max(0, Math.min(COLS - 1, c)); r = Math.max(0, Math.min(ROWS - 1, r)); ext = [c, r]; if (!x) cur = [c, r];
  paintSel(); cells[r][c].scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function commit(k, v) { v === '' ? delete data[k] : data[k] = v; save(); }
function edit(initial) {
  const k = key(...cur), td = cells[cur[1]][cur[0]]; editing = true;
  const inp = document.createElement('input'); inp.value = initial ?? (data[k] || ''); td.textContent = ''; td.appendChild(inp); inp.focus();
  if (initial !== undefined) inp.setSelectionRange(inp.value.length, inp.value.length);
  const finish = mv => { if (!editing) return; editing = false; if (inp.value !== (data[k] || '')) { snap(); commit(k, inp.value); } inp.remove(); render(); if (mv) select(cur[0] + mv[0], cur[1] + mv[1]); grid.focus(); };
  inp.onkeydown = e => {
    if (e.key === 'Enter') { e.preventDefault(); finish([0, 1]); } else if (e.key === 'Tab') { e.preventDefault(); finish([e.shiftKey ? -1 : 1, 0]); }
    else if (e.key === 'Escape') { editing = false; inp.remove(); render(); grid.focus(); }
  };
  inp.onblur = () => finish();
}
grid.tabIndex = 0;
grid.addEventListener('mousedown', e => { const td = e.target.closest('td'); if (!td || editing || e.target.matches('a')) return; const [c, r] = parseKey(td.dataset.k); select(c, r, e.shiftKey); drag = true; });
grid.addEventListener('mouseover', e => { const td = e.target.closest('td'); if (drag && td) { const [c, r] = parseKey(td.dataset.k); select(c, r, true); } });
document.addEventListener('mouseup', () => drag = false);
grid.addEventListener('dblclick', e => { if (e.target.closest('td') && !editing && !e.target.matches('input,a')) edit(); });
grid.addEventListener('change', e => { if (e.target.type !== 'checkbox') return; const k = e.target.closest('td').dataset.k; snap(); commit(k, e.target.checked ? 'TRUE' : 'FALSE'); render(); });
fx.addEventListener('keydown', e => { if (e.key === 'Enter') { snap(); commit(key(...cur), fx.value); render(); grid.focus(); } });

// ---------- formatting ----------
function setFmt(p) {
  snap(); each(k => { const n = { ...fmt[k], ...p }; for (const x in n) if (n[x] === undefined || n[x] === false || n[x] === '') delete n[x]; Object.keys(n).length ? fmt[k] = n : delete fmt[k]; });
  save(); render();
}
const toggle = p => setFmt({ [p]: !(fmt[key(...cur)] || {})[p] });
function clearSel() { snap(); each(k => delete data[k]); save(); render(); }

// ---------- clipboard ----------
function copyData() {
  const m = [], t = [], g = rg();
  for (let r = g.r1; r <= g.r2; r++) { const row = [], tr = []; for (let c = g.c1; c <= g.c2; c++) { const k = key(c, r); row.push({ v: data[k] || '', f: fmt[k] }); tr.push(display(k).text); } m.push(row); t.push(tr.join('\t')); }
  clip = { t: t.join('\n'), m }; return clip.t;
}
function pasteText(text) {
  text = text.replace(/\r/g, '').replace(/\n$/, ''); const rows = text.split('\n').map(r => r.split('\t')), m = clip && clip.t === text ? clip.m : null;
  snap();
  rows.forEach((row, i) => row.forEach((v, j) => {
    const c = cur[0] + j, r = cur[1] + i; if (c >= COLS || r >= ROWS) return; const k = key(c, r), s = m ? m[i][j] : { v };
    s.v === '' ? delete data[k] : data[k] = s.v; if (m) s.f ? fmt[k] = { ...s.f } : delete fmt[k];
  }));
  save(); render();
}
const skip = e => editing || e.target.matches('input,select,textarea') && e.target !== grid;
document.addEventListener('copy', e => { if (skip(e)) return; e.preventDefault(); e.clipboardData.setData('text/plain', copyData()); });
document.addEventListener('cut', e => { if (skip(e)) return; e.preventDefault(); e.clipboardData.setData('text/plain', copyData()); clearSel(); });
document.addEventListener('paste', e => { if (skip(e)) return; e.preventDefault(); pasteText(e.clipboardData.getData('text')); });
document.addEventListener('keydown', e => {
  if (editing || e.target === fx || e.target.matches('input,select,textarea')) return;
  const m = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (m && k === 'z') { e.preventDefault(); undo(); } else if (m && k === 'y') { e.preventDefault(); redo(); }
  else if (m && ['b', 'i', 'u'].includes(k)) { e.preventDefault(); toggle(k); }
  else if (m) return;
  else {
    const mv = { arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0] }[k];
    if (mv) { e.preventDefault(); e.shiftKey ? select(ext[0] + mv[0], ext[1] + mv[1], true) : select(cur[0] + mv[0], cur[1] + mv[1]); }
    else if (k === 'enter' || k === 'f2') { e.preventDefault(); edit(); }
    else if (k === 'delete' || k === 'backspace') clearSel();
    else if (e.key.length === 1) { e.preventDefault(); edit(e.key); }
  }
});

// ---------- charts ----------
const PAL = ['#1f6b4f', '#c9742b', '#3d6fb6', '#b84a62', '#8a7bb8', '#c2a43a'];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function chartSVG(ch) {
  const [c1, r1, c2, r2] = ch.rng, M = [];
  for (let r = r1; r <= r2; r++) { const row = []; for (let c = c1; c <= c2; c++) { let v; try { v = value(key(c, r)); } catch (e) { v = ''; } row.push(v); } M.push(row); }
  const lab = M[0].length > 1 && M.slice(1).every(r => typeof r[0] !== 'number'), s0 = lab ? 1 : 0;
  const hdr = M.length > 1 && M[0].slice(s0).some(v => typeof v === 'string' && v !== '');
  const rows = M.slice(hdr ? 1 : 0), cats = rows.map((r, i) => lab ? String(r[0]) : String(i + 1));
  let names = M[0].slice(s0).map((v, i) => hdr && v !== '' ? String(v) : 'Series ' + (i + 1));
  let S2 = names.map((_, j) => rows.map(r => +r[s0 + j] || 0)); if (ch.type === 'pie') { S2 = [S2[0]]; names = [names[0]]; }
  const n = cats.length, all = S2.flat(), W = 340, H = 220, L = 40, T = 12, R = 10, Bt = 26, pw = W - L - R, ph = H - T - Bt;
  let svg = '', legend = (ch.type === 'pie' ? cats : names).map((x, i) => `<span><i style="background:${PAL[i % 6]}"></i>${esc(x)}</span>`).join('');
  if (ch.type === 'pie') {
    const tot = S2[0].reduce((s, v) => s + Math.abs(v), 0) || 1, cx = W / 2, cy = H / 2, rad = 90; let a = -Math.PI / 2;
    svg = S2[0].map((v, i) => { const da = Math.abs(v) / tot * 2 * Math.PI, a1 = a + da, p = da >= 2 * Math.PI - 1e-6 ? `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${PAL[i % 6]}"/>` : `<path d="M${cx} ${cy}L${cx + rad * Math.cos(a)} ${cy + rad * Math.sin(a)}A${rad} ${rad} 0 ${da > Math.PI ? 1 : 0} 1 ${cx + rad * Math.cos(a1)} ${cy + rad * Math.sin(a1)}Z" fill="${PAL[i % 6]}" stroke="#fff"/>`; a = a1; return p; }).join('');
  } else {
    const mx = Math.max(1e-9, ...all), mn = Math.min(0, ...all), sp = mx - mn || 1, horiz = ch.type === 'bar';
    const Y = v => T + ph * (1 - (v - mn) / sp), X = v => L + pw * ((v - mn) / sp);
    if (horiz) {
      const gh = ph / n, bh = gh * .8 / S2.length;
      svg = `<line x1="${X(0)}" x2="${X(0)}" y1="${T}" y2="${T + ph}" stroke="currentColor"/>` + S2.map((s, j) => s.map((v, i) => `<rect x="${Math.min(X(v), X(0))}" y="${T + i * gh + gh * .1 + j * bh}" width="${Math.abs(X(v) - X(0))}" height="${bh}" fill="${PAL[j % 6]}"/>`).join('')).join('') + cats.map((c, i) => `<text x="${L - 4}" y="${T + i * gh + gh / 2 + 3}" font-size="9" text-anchor="end" fill="currentColor">${esc(c.slice(0, 6))}</text>`).join('');
    } else {
      const gw = pw / n, bw = gw * .8 / S2.length, st = Math.ceil(n / 6);
      svg = `<line x1="${L}" x2="${L + pw}" y1="${Y(0)}" y2="${Y(0)}" stroke="currentColor"/><line x1="${L}" x2="${L}" y1="${T}" y2="${T + ph}" stroke="currentColor"/>`;
      svg += ch.type === 'line' ? S2.map((s, j) => `<polyline fill="none" stroke="${PAL[j % 6]}" stroke-width="2" points="${s.map((v, i) => `${L + pw * (i + .5) / n},${Y(v)}`).join(' ')}"/>` + s.map((v, i) => `<circle cx="${L + pw * (i + .5) / n}" cy="${Y(v)}" r="3" fill="${PAL[j % 6]}"/>`).join('')).join('')
        : S2.map((s, j) => s.map((v, i) => `<rect x="${L + i * gw + gw * .1 + j * bw}" y="${Math.min(Y(v), Y(0))}" width="${bw}" height="${Math.abs(Y(v) - Y(0))}" fill="${PAL[j % 6]}"/>`).join('')).join('');
      svg += cats.map((c, i) => i % st ? '' : `<text x="${L + gw * (i + .5)}" y="${H - 8}" font-size="9" text-anchor="middle" fill="currentColor">${esc(c.slice(0, 8))}</text>`).join('');
    }
    if (!horiz) svg += `<text x="${L - 4}" y="${T + 8}" font-size="9" text-anchor="end" fill="currentColor">${+mx.toPrecision(3)}</text><text x="${L - 4}" y="${T + ph}" font-size="9" text-anchor="end" fill="currentColor">${+mn.toPrecision(3)}</text>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${ch.type} chart">${svg}</svg><div class="lg">${legend}</div>`;
}
function renderCharts() {
  const box = $('#charts'), cs = S().charts; box.hidden = !cs.length;
  box.innerHTML = cs.map((c, i) => `<div class="ch"><h4><span>${c.type} chart: ${key(c.rng[0], c.rng[1])}:${key(c.rng[2], c.rng[3])}</span><button data-del="${i}" aria-label="Remove chart">×</button></h4>${chartSVG(c)}</div>`).join('');
}
$('#charts').addEventListener('click', e => { const i = e.target.dataset.del; if (i !== undefined) { snap(); S().charts.splice(+i, 1); save(); render(); } });

// ---------- sheets ----------
function renderTabs() {
  $('#sheets').innerHTML = B.sheets.map((s, i) => `<button data-s="${i}" class="${i === B.active ? 'on' : ''}">${esc(s.name)}</button>`).join('') + '<button data-s="new" title="Add sheet">+</button><button data-s="ren" title="Rename sheet">Rename</button><button data-s="del" title="Delete sheet">Delete</button>';
}
function useSheet(i) { B.active = i; data = S().data; fmt = S().fmt; hist = []; redoS = []; cur = [0, 0]; ext = [0, 0]; save(); render(); }
$('#sheets').addEventListener('click', e => {
  const s = e.target.dataset.s; if (s === undefined) return;
  if (s === 'new') { B.sheets.push(newSheet('Sheet' + (B.sheets.length + 1))); useSheet(B.sheets.length - 1); }
  else if (s === 'ren') { const n = prompt('Sheet name', S().name); if (n && n.trim()) { S().name = n.trim().slice(0, 24); save(); renderTabs(); } }
  else if (s === 'del') { if (B.sheets.length > 1 && confirm(`Delete "${S().name}"?`)) { B.sheets.splice(B.active, 1); useSheet(Math.max(0, B.active - 1)); } }
  else useSheet(+s);
});

// ---------- ribbon ----------
$('#tabs').addEventListener('click', e => { const t = e.target.dataset.t; if (!t) return; document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b === e.target)); document.querySelectorAll('#ribbon section').forEach(s => s.hidden = s.id !== 'r-' + t); });
const q = s => /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
const ACT = {
  undo, redo, copy: () => { document.execCommand('copy'); }, cut: () => { document.execCommand('cut'); },
  paste: async () => { try { pasteText(await navigator.clipboard.readText()); } catch (e) { alert('Your browser blocked the paste button. Press Ctrl+V instead.'); } },
  b: () => toggle('b'), i: () => toggle('i'), u: () => toggle('u'),
  color: v => setFmt({ color: v }), bg: v => setFmt({ bg: v }), ff: v => v && setFmt({ ff: v }), fs: v => v && setFmt({ fs: +v }),
  al: v => setFmt({ al: v }), nf: v => v && setFmt({ nf: v === 'g' ? '' : v }), bd: v => setFmt({ bd: v === '1' }),
  clearFmt: () => { snap(); each(k => delete fmt[k]); save(); render(); },
  table: () => { const g = rg(); if (g.r1 === g.r2) return alert('Select the cells for the table first.'); snap(); each((k, c, r) => { const n = { ...fmt[k], bd: true }; if (r === g.r1) { n.bg = '#1f6b4f'; n.color = '#ffffff'; n.b = true; } else { n.bg = (r - g.r1) % 2 ? '#e8f1ec' : '#ffffff'; } fmt[k] = n; }); save(); render(); },
  chart: t => { const g = rg(); if (g.c1 === g.c2 && g.r1 === g.r2) return alert('Select the cells with your data first (include headers).'); snap(); S().charts.push({ type: t, rng: [g.c1, g.r1, g.c2, g.r2] }); save(); render(); },
  checkbox: () => { snap(); each(k => { fmt[k] = { ...fmt[k], cb: true }; if (data[k] === undefined) data[k] = 'FALSE'; }); save(); render(); },
  link: () => { const u = prompt('Link address (https://...)', (fmt[key(...cur)] || {}).link || 'https://'); if (u === null) return; if (u && !/^https?:\/\//i.test(u)) return alert('The link must start with http:// or https://'); setFmt({ link: u }); },
  comment: () => { const n = prompt('Comment (leave empty to remove)', (fmt[key(...cur)] || {}).note || ''); if (n !== null) setFmt({ note: n }); },
  sym: v => { if (!v) return; const k = key(...cur); snap(); commit(k, (data[k] || '') + v); render(); },
  open: () => $('#file').click(),
  export: () => {
    let mr = 0, mc = 0; Object.keys(data).forEach(k => { const [c, r] = parseKey(k); mr = Math.max(mr, r); mc = Math.max(mc, c); });
    const rows = []; for (let r = 0; r <= mr; r++) { const row = []; for (let c = 0; c <= mc; c++) row.push(q(display(key(c, r)).text)); rows.push(row.join(',')); }
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' })), download: S().name + '.csv' }); a.click(); URL.revokeObjectURL(a.href);
  },
  clearAll: () => { if (confirm('Clear this whole sheet?')) { snap(); S().data = {}; S().fmt = {}; S().charts = []; data = S().data; fmt = S().fmt; save(); render(); } },
};
function runAct(el, val) { const [n, arg] = el.dataset.act.split(':'); (ACT[n] || (() => {}))(arg ?? val); if (el.tagName === 'SELECT') el.selectedIndex = 0; }
$('#ribbon').addEventListener('click', e => { const b = e.target.closest('button[data-act]'); if (b) { runAct(b); grid.focus(); } });
$('#ribbon').addEventListener('change', e => { if (e.target.matches('select')) { runAct(e.target, e.target.value); grid.focus(); } });
$('#ribbon').addEventListener('input', e => { if (e.target.type === 'color') ACT[e.target.dataset.act](e.target.value); });
$('#file').onchange = async () => {
  const f = $('#file').files[0]; if (!f) return; const t = await f.text(); snap(); S().data = {}; data = S().data;
  let r = 0, c = 0, v = '', inQ = false; const push = () => { if (v !== '' && r < ROWS && c < COLS) data[key(c, r)] = v; v = ''; };
  for (let i = 0; i < t.length; i++) { const ch = t[i]; if (inQ) { if (ch === '"' && t[i + 1] === '"') { v += '"'; i++; } else if (ch === '"') inQ = false; else v += ch; } else if (ch === '"') inQ = true; else if (ch === ',') { push(); c++; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && t[i + 1] === '\n') i++; push(); r++; c = 0; } else v += ch; }
  push(); $('#file').value = ''; save(); render(); select(0, 0);
};
render();
