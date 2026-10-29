// Formula engine: tokenizer, parser, evaluator, function library.
const COLS = 26, ROWS = 100;
const colName = i => String.fromCharCode(65 + i);
const key = (c, r) => colName(c) + (r + 1);
const parseKey = k => { const m = /^([A-Z])(\d+)$/.exec(k); return m ? [m[1].charCodeAt(0) - 65, +m[2] - 1] : null; };
let data = {}, fmt = {}, spill = {}, SEEN = new Set(), CUR = 'A1';

class XErr { constructor(c) { this.c = c; } }
const E = c => { throw new XErr(c); };
const isE = x => x instanceof XErr;
const flat = a => a.flat(Infinity);
const num = x => { if (isE(x)) throw x; if (x === '' || x == null) return 0; if (typeof x === 'boolean') return +x; if (typeof x === 'number') return x; const n = Number(x); if (x.trim() === '' || isNaN(n)) E('#VALUE!'); return n; };
const str = x => { if (isE(x)) throw x; return typeof x === 'boolean' ? (x ? 'TRUE' : 'FALSE') : x == null ? '' : String(x); };
const bool = x => { if (isE(x)) throw x; if (typeof x === 'string') { const u = x.toUpperCase(); if (u === 'TRUE') return true; if (u === 'FALSE' || x === '') return false; E('#VALUE!'); } return !!x; };
const arr = x => Array.isArray(x) ? x : [[x]];
const chk = v => { if (isE(v)) throw v; return v; };
const nums = a => a.flatMap(x => Array.isArray(x) ? flat(x).map(chk).filter(v => typeof v === 'number') : [num(x)]);
const rank = x => typeof x === 'number' ? 0 : typeof x === 'string' ? 1 : 2;
const cmp = (a, b) => { chk(a); chk(b); if (a === '') a = typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0; if (b === '') b = typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0; if (rank(a) !== rank(b)) return rank(a) - rank(b); if (typeof a === 'string') { a = a.toLowerCase(); b = b.toLowerCase(); } return a < b ? -1 : a > b ? 1 : 0; };
const eq = (a, b) => !isE(a) && !isE(b) && cmp(a, b) === 0;
const wc = s => new RegExp('^' + s.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
const sub = f => (...a) => { try { return f(...a); } catch (e) { if (isE(e)) return e; throw e; } };
const m1 = (a, f) => Array.isArray(a) ? a.map(r => r.map(sub(f))) : f(a);
const m2 = (a, b, f) => {
  if (!Array.isArray(a) && !Array.isArray(b)) return f(a, b);
  const x = arr(a), y = arr(b), R = Math.max(x.length, y.length), C = Math.max(x[0].length, y[0].length);
  return Array.from({ length: R }, (_, i) => Array.from({ length: C }, (_, j) => {
    const p = x[x.length === 1 ? 0 : i]?.[x[0].length === 1 ? 0 : j] ?? new XErr('#N/A'), q = y[y.length === 1 ? 0 : i]?.[y[0].length === 1 ? 0 : j] ?? new XErr('#N/A');
    return sub(f)(p, q);
  }));
};
function crit(c) {
  if (typeof c !== 'string') return x => x === c;
  const m = /^(<=|>=|<>|<|>|=)?([\s\S]*)$/.exec(c), op = m[1] || '=', v = m[2], n = v.trim() !== '' && !isNaN(v) ? +v : null, re = wc(v);
  return x => {
    if (isE(x)) return false;
    const xn = typeof x === 'number' ? x : typeof x === 'string' && x.trim() !== '' && !isNaN(x) ? +x : null;
    if (n !== null) { if (xn === null) return op === '<>'; return op === '=' ? xn === n : op === '<>' ? xn !== n : op === '<' ? xn < n : op === '>' ? xn > n : op === '<=' ? xn <= n : xn >= n; }
    if (typeof x === 'number') return op === '<>';
    const t = re.test(str(x)); return op === '<>' ? !t : op === '=' ? t : false;
  };
}
const sifs = p => { const ok = Array(flat(p[0]).length).fill(true); for (let i = 0; i < p.length; i += 2) { const f = crit(p[i + 1]); flat(p[i]).forEach((v, j) => { if (!f(v)) ok[j] = false; }); } return ok; };
const pick = (vals, ok) => flat(vals).filter((_, i) => ok[i]);
const srt = a => nums(a).sort((x, y) => x - y);
const avg = n => n.length ? n.reduce((s, v) => s + v, 0) / n.length : E('#DIV/0!');
const varr = (n, p) => { if (n.length < (p ? 1 : 2)) E('#DIV/0!'); const m = avg(n); return n.reduce((s, v) => s + (v - m) ** 2, 0) / (n.length - (p ? 0 : 1)); };
const pctl = (a, p) => { const s = srt(a); if (!s.length || p < 0 || p > 1) E('#NUM!'); const k = (s.length - 1) * p, f = Math.floor(k); return s[f] + (s[Math.min(f + 1, s.length - 1)] - s[f]) * (k - f); };
const rnd = (x, d, m) => { const k = 10 ** d; return m(x * k) / k; };
const away = x => x < 0 ? -Math.ceil(-x) : Math.ceil(x);

// dates
const D0 = Date.UTC(1899, 11, 30), DN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], MN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const toD = n => new Date(D0 + Math.floor(num(n)) * 864e5);
const mk = (y, m, d) => (Date.UTC(y, m - 1, d) - D0) / 864e5;
const today = () => { const d = new Date(); return mk(d.getFullYear(), d.getMonth() + 1, d.getDate()); };
const secs = x => Math.round((num(x) - Math.floor(num(x))) * 86400);
const eom = (s, k) => { const d = toD(s), t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + k + 1, 0)); return (t - D0) / 864e5; };
const wd = (d, t = 1) => { const w = toD(d).getUTCDay(); return t === 2 ? (w + 6) % 7 + 1 : t === 3 ? (w + 6) % 7 : w + 1; };
const hol = h => new Set(flat(arr(h ?? [[]])).filter(x => typeof x === 'number'));
const isWork = (d, H) => { const w = toD(d).getUTCDay(); return w && w < 6 && !H.has(d); };
function TEXT(v, f) {
  f = str(f); if (typeof v === 'string' && v.trim() !== '' && !isNaN(v)) v = +v; if (typeof v !== 'number') return str(v);
  if (/[ymdhs]/i.test(f.replace(/"[^"]*"/g, ''))) {
    const d = toD(v), s = secs(v), p = n => String(n).padStart(2, '0');
    return f.replace(/yyyy|yy|mmmm|mmm|mm|m|dddd|ddd|dd|d|hh|h|ss|s/gi, (t, o, all) => {
      const l = t.toLowerCase(), isMin = (l === 'm' || l === 'mm') && (/h+[:\s]*$/i.test(all.slice(0, o)) || /^[:\s]*s/i.test(all.slice(o + t.length)));
      if (isMin) return l === 'mm' ? p(Math.floor(s % 3600 / 60)) : Math.floor(s % 3600 / 60);
      switch (l) { case 'yyyy': return d.getUTCFullYear(); case 'yy': return p(d.getUTCFullYear() % 100); case 'mmmm': return MN[d.getUTCMonth()]; case 'mmm': return MN[d.getUTCMonth()].slice(0, 3); case 'mm': return p(d.getUTCMonth() + 1); case 'm': return d.getUTCMonth() + 1; case 'dddd': return DN[d.getUTCDay()]; case 'ddd': return DN[d.getUTCDay()].slice(0, 3); case 'dd': return p(d.getUTCDate()); case 'd': return d.getUTCDate(); case 'hh': return p(Math.floor(s / 3600)); case 'h': return Math.floor(s / 3600); case 'ss': return p(s % 60); default: return s % 60; }
    });
  }
  if (f.includes('%')) v *= 100;
  const dec = (f.split('.')[1] || '').replace(/[^0#]/g, '').length;
  const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec, useGrouping: f.includes(',') });
  return (v < 0 ? '-' : '') + f.replace(/[0#,.]+/, s).replace(/"/g, '');
}

// financial
const FV = (r, n, p, pv = 0, t = 0) => r === 0 ? -(pv + p * n) : -(pv * (1 + r) ** n + p * (1 + r * t) * ((1 + r) ** n - 1) / r);
const PMT = (r, n, pv, fv = 0, t = 0) => r === 0 ? -(pv + fv) / n : -(pv * (1 + r) ** n + fv) * r / ((1 + r * t) * ((1 + r) ** n - 1));
const IPMT = (r, per, n, pv, fv = 0, t = 0) => { const k = per - 1 - (t ? 1 : 0); return k < 0 ? 0 : FV(r, k, PMT(r, n, pv, fv, t), pv, t) * r; };
const newton = (f, g) => { let x = g; for (let i = 0; i < 100; i++) { const y = f(x), h = 1e-7, d = (f(x + h) - y) / h; if (!d) break; const nx = x - y / d; if (Math.abs(nx - x) < 1e-10) return nx; x = nx; } E('#NUM!'); };
const npv = (r, v) => v.reduce((s, x, i) => s + x / (1 + r) ** (i + 1), 0);

// engineering
const UNITS = { m: ['l', 1], km: ['l', 1000], cm: ['l', .01], mm: ['l', .001], in: ['l', .0254], ft: ['l', .3048], yd: ['l', .9144], mi: ['l', 1609.344], g: ['m', 1], kg: ['m', 1000], lbm: ['m', 453.59237], ozm: ['m', 28.349523125], s: ['t', 1], min: ['t', 60], hr: ['t', 3600], day: ['t', 86400], yr: ['t', 31557600], l: ['v', 1], ml: ['v', .001], gal: ['v', 3.785411784], qt: ['v', .946352946], C: ['T'], F: ['T'], K: ['T'] };
const pc = s => { s = str(s).replace(/\s/g, ''); if (/^[+-]?[\d.]*[ij]$/i.test(s)) { const t = s.slice(0, -1); return [0, t === '' || t === '+' ? 1 : t === '-' ? -1 : +t]; } const m = /^([+-]?[\d.]+(?:E[+-]?\d+)?)([+-][\d.]*)?[ij]?$/i.exec(s); if (!m) E('#NUM!'); return [+m[1], m[2] === undefined ? 0 : m[2] === '+' ? 1 : m[2] === '-' ? -1 : +m[2]]; };
const cs = ([a, b]) => b === 0 ? String(a) : `${a}${b < 0 ? '-' : '+'}${Math.abs(b) === 1 ? '' : Math.abs(b)}i`;
const fact = n => n <= 1 ? 1 : n * fact(n - 1);
const db = (d, f, c) => {
  const H = d[0].map(x => str(x).toLowerCase()), fi = typeof f === 'number' ? f - 1 : H.indexOf(str(f).toLowerCase()); if (fi < 0) E('#VALUE!');
  const ch = c[0].map(x => str(x).toLowerCase());
  return d.slice(1).filter(r => c.slice(1).some(cr => cr.every((cv, j) => cv === '' || ch[j] === '' || crit(cv)(r[H.indexOf(ch[j])])))).map(r => r[fi]);
};
const rowsOf = a => arr(a);
const colsOf = a => arr(a)[0].map((_, j) => arr(a).map(r => r[j]));
const keyOf = r => JSON.stringify(r.map(x => typeof x === 'string' ? x.toLowerCase() : x));
const lookupIdx = (v, vec, mode = 0) => {
  let best = -1;
  vec.forEach((x, i) => { const c = isE(x) ? NaN : cmp(x, v); if (c === 0 && mode === 0) { if (best < 0) best = i; } else if (mode === -1 && c < 0 && (best < 0 || cmp(x, vec[best]) > 0)) best = i; else if (mode === 1 && c > 0 && (best < 0 || cmp(x, vec[best]) < 0)) best = i; });
  if (mode !== 0) { const ex = vec.findIndex(x => !isE(x) && cmp(x, v) === 0); if (ex >= 0) return ex; }
  return best;
};
const mkRef = (a, b) => ({ R: 1, c1: Math.min(a[0], b[0]), r1: Math.min(a[1], b[1]), c2: Math.max(a[0], b[0]), r2: Math.max(a[1], b[1]) });
const num0 = (x, d) => x === undefined || x === '' ? d : num(x);

const FN = {
  // math
  SUM: (...a) => nums(a).reduce((s, v) => s + v, 0), PRODUCT: (...a) => nums(a).reduce((s, v) => s * v, 1),
  SUMIF: (r, c, s) => FN.SUM(pick(s ?? r, sifs([r, c]))), SUMIFS: (s, ...p) => FN.SUM(pick(s, sifs(p))),
  ABS: x => Math.abs(num(x)), INT: x => Math.floor(num(x)),
  ROUND: (x, d = 0) => rnd(num(x), num(d), v => Math.sign(v) * Math.round(Math.abs(v))),
  ROUNDUP: (x, d = 0) => rnd(num(x), num(d), away), ROUNDDOWN: (x, d = 0) => rnd(num(x), num(d), Math.trunc),
  MOD: (n, d) => { n = num(n); d = num(d); if (!d) E('#DIV/0!'); return n - d * Math.floor(n / d); },
  POWER: (a, b) => num(a) ** num(b), SQRT: x => { x = num(x); if (x < 0) E('#NUM!'); return Math.sqrt(x); },
  RAND: () => Math.random(), RANDBETWEEN: (a, b) => Math.floor(num(a) + Math.random() * (num(b) - num(a) + 1)),
  AGGREGATE: (f, o, ...a) => { const n = [, 'AVERAGE', 'COUNT', 'COUNTA', 'MAX', 'MIN', 'PRODUCT', 'STDEV', 'STDEVP', 'SUM', 'VAR', 'VARP', 'MEDIAN'][num(f)]; if (!n) E('#VALUE!'); return FN[n](...a.map(x => Array.isArray(x) ? x.map(r => r.filter(v => !isE(v))) : x)); },
  // statistical
  AVERAGE: (...a) => avg(nums(a)), AVERAGEIF: (r, c, s) => avg(pick(s ?? r, sifs([r, c])).filter(v => typeof v === 'number')),
  AVERAGEIFS: (s, ...p) => avg(pick(s, sifs(p)).filter(v => typeof v === 'number')),
  COUNT: (...a) => a.flatMap(x => Array.isArray(x) ? flat(x).filter(v => typeof v === 'number') : isE(x) ? [] : [x]).filter(v => v !== '' && !isNaN(v)).length,
  COUNTA: (...a) => flat(a).filter(v => v !== '').length,
  COUNTIF: (r, c) => sifs([r, c]).filter(Boolean).length, COUNTIFS: (...p) => sifs(p).filter(Boolean).length,
  MAX: (...a) => { const n = nums(a); return n.length ? Math.max(...n) : 0; }, MIN: (...a) => { const n = nums(a); return n.length ? Math.min(...n) : 0; },
  LARGE: (a, k) => { const s = srt(a); return s[s.length - num(k)] ?? E('#NUM!'); }, SMALL: (a, k) => srt(a)[num(k) - 1] ?? E('#NUM!'),
  MEDIAN: (...a) => { const s = srt(a), m = s.length >> 1; return !s.length ? E('#NUM!') : s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; },
  MODE: (...a) => { const n = nums(a), c = {}; n.forEach(v => c[v] = (c[v] || 0) + 1); const m = Math.max(0, ...Object.values(c)); return m < 2 ? E('#N/A') : n.find(v => c[v] === m); },
  STDEV: (...a) => Math.sqrt(varr(nums(a))), STDEVP: (...a) => Math.sqrt(varr(nums(a), 1)), VAR: (...a) => varr(nums(a)), VARP: (...a) => varr(nums(a), 1),
  RANK: (x, r, o = 0) => { x = num(x); const n = nums([r]); if (!n.includes(x)) E('#N/A'); return 1 + n.filter(v => num(o) ? v < x : v > x).length; },
  PERCENTILE: (a, p) => pctl(a, num(p)),
  // text
  LEFT: (s, n = 1) => str(s).slice(0, num(n)), RIGHT: (s, n = 1) => num(n) ? str(s).slice(-num(n)) : '', MID: (s, a, n) => str(s).substr(num(a) - 1, num(n)), LEN: s => str(s).length,
  FIND: (f, w, s = 1) => { const i = str(w).indexOf(str(f), num(s) - 1); return i < 0 ? E('#VALUE!') : i + 1; },
  SEARCH: (f, w, s = 1) => { const m = new RegExp(wc(str(f)).source.slice(1, -1), 'i').exec(str(w).slice(num(s) - 1)); return m ? m.index + num(s) : E('#VALUE!'); },
  SUBSTITUTE: (t, o, n, k) => { t = str(t); o = str(o); if (!o) return t; if (k === undefined) return t.split(o).join(str(n)); let c = 0; return t.split(o).reduce((s, p, i) => i === 0 ? p : s + (++c === num(k) ? str(n) : o) + p); },
  REPLACE: (t, s, n, r) => { t = str(t); return t.slice(0, num(s) - 1) + str(r) + t.slice(num(s) - 1 + num(n)); },
  TRIM: s => str(s).trim().replace(/ +/g, ' '), UPPER: s => str(s).toUpperCase(), LOWER: s => str(s).toLowerCase(), PROPER: s => str(s).toLowerCase().replace(/(^|[^a-z])([a-z])/g, (_, a, b) => a + b.toUpperCase()),
  CONCAT: (...a) => flat(a).map(str).join(''), TEXT, VALUE: s => { s = str(s).trim(); return s.endsWith('%') && !isNaN(s.slice(0, -1)) ? +s.slice(0, -1) / 100 : num(s); },
  TEXTJOIN: (d, ig, ...a) => flat(a).filter(x => !bool(ig) || x !== '').map(str).join(str(d)),
  // logical
  AND: (...a) => flat(a).filter(x => typeof x !== 'string').every(bool), OR: (...a) => flat(a).filter(x => typeof x !== 'string').some(bool),
  NOT: x => !bool(x), XOR: (...a) => flat(a).filter(x => typeof x !== 'string').filter(bool).length % 2 === 1, TRUE: () => true, FALSE: () => false,
  // lookup
  VLOOKUP: (v, t, c, ap = true) => { t = arr(t); const k = colsOf(t)[0]; let i = bool(ap) ? lookupIdx(v, k, -1) : (typeof v === 'string' && /[*?]/.test(v) ? k.findIndex(x => typeof x === 'string' && wc(v).test(x)) : lookupIdx(v, k)); if (i < 0) E('#N/A'); return t[i][num(c) - 1] ?? E('#REF!'); },
  HLOOKUP: (v, t, r, ap = true) => FN.VLOOKUP(v, colsOf(t), r, ap),
  XLOOKUP: (v, l, r, nf, mode = 0, _s) => { const lv = flat(arr(l)), rr = arr(r), byRow = arr(l).length === 1 && lv.length > 1; let i = num(mode) === 2 ? lv.findIndex(x => typeof x === 'string' && wc(str(v)).test(x)) : lookupIdx(v, lv, num(mode)); if (i < 0) { if (nf !== undefined) return nf; E('#N/A'); } const out = byRow ? colsOf(rr)[i].map(x => [x]) : rr[i]; return byRow ? (out.length === 1 ? out[0][0] : out) : (out.length === 1 ? out[0] : [out]); },
  MATCH: (v, a, t = 1) => { const vec = flat(arr(a)); t = num(t); const i = t === 0 && typeof v === 'string' && /[*?]/.test(v) ? vec.findIndex(x => typeof x === 'string' && wc(v).test(x)) : lookupIdx(v, vec, t === 0 ? 0 : t === 1 ? -1 : 1); return i < 0 ? E('#N/A') : i + 1; },
  INDEX: (a, r = 0, c = 0) => { a = arr(a); r = num(r); c = num(c); if (a.length === 1 && a[0].length > 1 && !c) { c = r; r = 1; } if (r > a.length || c > a[0].length) E('#REF!'); if (!r && !c) return a; if (!r) return a.map(x => [x[c - 1]]); if (!c) return [a[r - 1]]; return a[r - 1][c - 1]; },
  OFFSET: (ref, r, c, h, w) => { if (!ref?.R) E('#VALUE!'); const H = h === undefined ? ref.r2 - ref.r1 + 1 : num(h), W = w === undefined ? ref.c2 - ref.c1 + 1 : num(w), r1 = ref.r1 + num(r), c1 = ref.c1 + num(c); if (r1 < 0 || c1 < 0 || r1 + H > ROWS || c1 + W > COLS) E('#REF!'); return mkRef([c1, r1], [c1 + W - 1, r1 + H - 1]); },
  INDIRECT: t => { const m = /^\$?([A-Z])\$?(\d+)(?::\$?([A-Z])\$?(\d+))?$/.exec(str(t).toUpperCase()); if (!m) E('#REF!'); const a = [m[1].charCodeAt(0) - 65, +m[2] - 1]; return mkRef(a, m[3] ? [m[3].charCodeAt(0) - 65, +m[4] - 1] : a); },
  CHOOSE: (i, ...a) => a[num(i) - 1] ?? E('#VALUE!'),
  ROW: r => r?.R ? (r.r2 > r.r1 ? Array.from({ length: r.r2 - r.r1 + 1 }, (_, i) => [r.r1 + i + 1]) : r.r1 + 1) : parseKey(CUR)[1] + 1,
  COLUMN: r => r?.R ? (r.c2 > r.c1 ? [Array.from({ length: r.c2 - r.c1 + 1 }, (_, i) => r.c1 + i + 1)] : r.c1 + 1) : parseKey(CUR)[0] + 1,
  ROWS: r => r?.R ? r.r2 - r.r1 + 1 : arr(r).length, COLUMNS: r => r?.R ? r.c2 - r.c1 + 1 : arr(r)[0].length,
  TRANSPOSE: a => colsOf(a), HYPERLINK: (u, l) => l === undefined || l === '' ? str(u) : l,
  // date & time
  TODAY: today, NOW: () => { const d = new Date(); return today() + (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400; },
  DATE: (y, m, d) => mk(num(y), num(m), num(d)), TIME: (h, m, s) => (num(h) * 3600 + num(m) * 60 + num(s)) / 86400,
  YEAR: d => toD(d).getUTCFullYear(), MONTH: d => toD(d).getUTCMonth() + 1, DAY: d => toD(d).getUTCDate(),
  HOUR: x => Math.floor(secs(x) / 3600) % 24, MINUTE: x => Math.floor(secs(x) % 3600 / 60), SECOND: x => secs(x) % 60,
  DATEDIF: (a, b, u) => {
    const s = toD(a), e = toD(b); if (num(a) > num(b)) E('#NUM!'); let m = (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + e.getUTCMonth() - s.getUTCMonth(); if (e.getUTCDate() < s.getUTCDate()) m--;
    switch (str(u).toUpperCase()) {
      case 'Y': return Math.floor(m / 12); case 'M': return m; case 'D': return Math.floor(num(b)) - Math.floor(num(a)); case 'YM': return m % 12;
      case 'MD': { let d = e.getUTCDate() - s.getUTCDate(); return d < 0 ? d + new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), 0)).getUTCDate() : d; }
      case 'YD': { let y = e.getUTCFullYear(), x = mk(y, s.getUTCMonth() + 1, s.getUTCDate()); if (x > Math.floor(num(b))) x = mk(y - 1, s.getUTCMonth() + 1, s.getUTCDate()); return Math.floor(num(b)) - x; }
      default: E('#NUM!');
    }
  },
  EDATE: (d, k) => { const s = toD(d), t = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + num(k) + 1, 0)); return mk(t.getUTCFullYear(), t.getUTCMonth() + 1, Math.min(s.getUTCDate(), t.getUTCDate())); },
  EOMONTH: (d, k) => eom(d, num(k)), WEEKDAY: (d, t = 1) => wd(d, num(t)),
  WEEKNUM: d => { const x = toD(d), j = new Date(Date.UTC(x.getUTCFullYear(), 0, 1)), doy = Math.round((x - j) / 864e5); return Math.floor((doy + j.getUTCDay()) / 7) + 1; },
  NETWORKDAYS: (a, b, h) => { const H = hol(h), s = Math.floor(num(a)), e = Math.floor(num(b)); let n = 0; for (let d = Math.min(s, e); d <= Math.max(s, e); d++) if (isWork(d, H)) n++; return s <= e ? n : -n; },
  WORKDAY: (a, k, h) => { const H = hol(h); let d = Math.floor(num(a)), n = num(k); const st = n < 0 ? -1 : 1; while (n) { d += st; if (isWork(d, H)) n -= st; } return d; },
  // financial
  PMT: (r, n, pv, fv, t) => PMT(num(r), num(n), num(pv), num0(fv, 0), num0(t, 0)), FV: (r, n, p, pv, t) => FV(num(r), num(n), num(p), num0(pv, 0), num0(t, 0)),
  PV: (r, n, p, fv, t) => { r = num(r); n = num(n); p = num(p); fv = num0(fv, 0); t = num0(t, 0); return r === 0 ? -(fv + p * n) : -(fv + p * (1 + r * t) * ((1 + r) ** n - 1) / r) / (1 + r) ** n; },
  IPMT: (r, per, n, pv, fv, t) => IPMT(num(r), num(per), num(n), num(pv), num0(fv, 0), num0(t, 0)),
  PPMT: (r, per, n, pv, fv, t) => PMT(num(r), num(n), num(pv), num0(fv, 0), num0(t, 0)) - IPMT(num(r), num(per), num(n), num(pv), num0(fv, 0), num0(t, 0)),
  NPER: (r, p, pv, fv, t) => { r = num(r); p = num(p); pv = num(pv); fv = num0(fv, 0); t = num0(t, 0); return r === 0 ? -(pv + fv) / p : Math.log((p * (1 + r * t) - fv * r) / (p * (1 + r * t) + pv * r)) / Math.log(1 + r); },
  RATE: (n, p, pv, fv, t, g) => { n = num(n); p = num(p); pv = num(pv); fv = num0(fv, 0); t = num0(t, 0); return newton(r => pv * (1 + r) ** n + p * (1 + r * t) * ((1 + r) ** n - 1) / r + fv, num0(g, .1)); },
  NPV: (r, ...v) => npv(num(r), nums(v)), IRR: (v, g) => { const n = nums([v]); return newton(r => n[0] + npv(r, n.slice(1)), num0(g, .1)); },
  XIRR: (v, d, g) => { const n = nums([v]), t = nums([d]); return newton(r => n.reduce((s, x, i) => s + x / (1 + r) ** ((t[i] - t[0]) / 365), 0), num0(g, .1)); },
  SLN: (c, s, l) => (num(c) - num(s)) / num(l),
  DB: (c, s, l, p, m = 12) => { c = num(c); s = num(s); l = num(l); p = num(p); m = num(m); const r = Math.round((1 - (s / c) ** (1 / l)) * 1000) / 1000; let tot = 0, d = 0; for (let i = 1; i <= p; i++) { d = i === 1 ? c * r * m / 12 : (c - tot) * r; if (i === l + 1) d = (c - tot) * r * (12 - m) / 12; tot += d; } return d; },
  DDB: (c, s, l, p, f = 2) => { c = num(c); s = num(s); l = num(l); p = num(p); f = num(f); let tot = 0, d = 0; for (let i = 1; i <= p; i++) { d = Math.max(0, Math.min((c - tot) * f / l, c - s - tot)); tot += d; } return d; },
  // information
  ISBLANK: x => x === '', ISNUMBER: x => typeof x === 'number', ISTEXT: x => typeof x === 'string' && x !== '', NA: () => E('#N/A'),
  TYPE: x => Array.isArray(x) ? 64 : isE(x) ? 16 : typeof x === 'number' ? 1 : typeof x === 'boolean' ? 4 : 2,
  CELL: (t, r) => { const c = r?.R ? [r.c1, r.r1] : parseKey(CUR); switch (str(t).toLowerCase()) { case 'address': return '$' + colName(c[0]) + '$' + (c[1] + 1); case 'row': return c[1] + 1; case 'col': return c[0] + 1; case 'contents': return value(key(...c), SEEN); case 'type': { const v = data[key(...c)]; return v === undefined ? 'b' : v[0] === '=' ? 'v' : isNaN(v) ? 'l' : 'v'; } default: return E('#VALUE!'); } },
  INFO: t => ({ system: 'web', osversion: 'Browser', recalc: 'Automatic', release: '1.0', numfile: 1 })[str(t).toLowerCase()] ?? E('#VALUE!'),
  // engineering
  CONVERT: (n, a, b) => { n = num(n); const x = UNITS[str(a)], y = UNITS[str(b)]; if (!x || !y || x[0] !== y[0]) E('#N/A'); if (x[0] === 'T') { const k = a === 'C' ? n + 273.15 : a === 'F' ? (n - 32) * 5 / 9 + 273.15 : n; return b === 'C' ? k - 273.15 : b === 'F' ? (k - 273.15) * 9 / 5 + 32 : k; } return n * x[1] / y[1]; },
  DEC2BIN: (n, p) => { n = Math.trunc(num(n)); if (n < -512 || n > 511) E('#NUM!'); return (n < 0 ? n + 1024 : n).toString(2).padStart(num0(p, 0), '0'); },
  BIN2DEC: s => { s = str(s); if (!/^[01]{1,10}$/.test(s)) E('#NUM!'); const v = parseInt(s, 2); return s.length === 10 && s[0] === '1' ? v - 1024 : v; },
  HEX2DEC: s => { s = str(s); if (!/^[0-9a-f]{1,10}$/i.test(s)) E('#NUM!'); const v = parseInt(s, 16); return s.length === 10 && v >= 2 ** 39 ? v - 2 ** 40 : v; },
  IMSUM: (...a) => cs(flat(a).map(pc).reduce((s, v) => [s[0] + v[0], s[1] + v[1]], [0, 0])), COMPLEX: (r, i) => cs([num(r), num(i)]),
  BESSELJ: (x, n) => { x = num(x); n = Math.trunc(num(n)); let s = 0; for (let k = 0; k < 40; k++) s += (-1) ** k / (fact(k) * fact(k + n)) * (x / 2) ** (2 * k + n); return s; },
  // web
  ENCODEURL: s => encodeURIComponent(str(s)),
  FILTERXML: (x, p) => { try { const d = new DOMParser().parseFromString(str(x), 'text/xml'), r = d.evaluate(str(p), d, null, 7, null), o = []; for (let i = 0; i < r.snapshotLength; i++) o.push([r.snapshotItem(i).textContent]); return o.length ? (o.length === 1 ? o[0][0] : o) : E('#VALUE!'); } catch (e) { if (isE(e)) throw e; E('#VALUE!'); } },
  // dynamic arrays
  FILTER: (a, inc, ie) => { a = arr(a); const f = flat(arr(inc)).map(bool); const out = f.length === a.length ? a.filter((_, i) => f[i]) : colsOf(a).filter((_, i) => f[i]); const res = f.length === a.length ? out : colsOf(out); return res.length && res[0].length ? res : ie !== undefined ? ie : E('#CALC!'); },
  UNIQUE: (a, byCol, once) => { let r = bool(byCol ?? false) ? colsOf(a) : arr(a); const c = {}; r.forEach(x => c[keyOf(x)] = (c[keyOf(x)] || 0) + 1); const seen = new Set(); r = r.filter(x => { const k = keyOf(x); if (seen.has(k) || (bool(once ?? false) && c[k] > 1)) return false; seen.add(k); return true; }); return bool(byCol ?? false) ? colsOf(r) : r; },
  SORT: (a, i = 1, o = 1, bc = false) => { let r = bool(bc) ? colsOf(a) : arr(a).slice(); r = r.slice().sort((x, y) => num(o) * cmp(x[num(i) - 1], y[num(i) - 1])); return bool(bc) ? colsOf(r) : r; },
  SORTBY: (a, ...k) => { const r = arr(a), idx = r.map((_, i) => i); idx.sort((x, y) => { for (let i = 0; i < k.length; i += 2) { const v = flat(arr(k[i])), o = i + 1 < k.length ? num(k[i + 1]) : 1, c = o * cmp(v[x], v[y]); if (c) return c; } return 0; }); return idx.map(i => r[i]); },
  SEQUENCE: (r, c = 1, s = 1, st = 1) => Array.from({ length: num(r) }, (_, i) => Array.from({ length: num(c) }, (_, j) => num(s) + (i * num(c) + j) * num(st))),
  RANDARRAY: (r = 1, c = 1, mn = 0, mx = 1, int = false) => Array.from({ length: num(r) }, () => Array.from({ length: num(c) }, () => { const v = num(mn) + Math.random() * (num(mx) - num(mn) + (bool(int) ? 1 : 0)); return bool(int) ? Math.floor(v) : v; })),
  TEXTSPLIT: (t, cd, rd) => { const rs = rd === undefined ? [str(t)] : str(t).split(str(rd)), rows = rs.map(x => str(cd) === '' ? [x] : x.split(str(cd))), w = Math.max(...rows.map(r => r.length)); return rows.map(r => Object.assign(Array(w).fill(new XErr('#N/A')), r)); },
  VSTACK: (...a) => a.flatMap(arr), HSTACK: (...a) => { const m = a.map(arr), h = Math.max(...m.map(x => x.length)); return Array.from({ length: h }, (_, i) => m.flatMap(x => x[i] ?? Array(x[0].length).fill(new XErr('#N/A')))); },
  TOCOL: (a, ig = 0, bc = false) => (bool(bc) ? flat(colsOf(a)) : flat(arr(a))).filter(x => !(num(ig) & 1 && x === '')).map(x => [x]), TOROW: (a, ig = 0, bc = false) => [FN.TOCOL(a, ig, bc).map(r => r[0])],
  WRAPROWS: (v, n, p = new XErr('#N/A')) => { const f = flat(arr(v)), o = []; for (let i = 0; i < f.length; i += num(n)) o.push(Object.assign(Array(num(n)).fill(p), f.slice(i, i + num(n)))); return o; },
  WRAPCOLS: (v, n, p) => colsOf(FN.WRAPROWS(v, n, p)),
  TAKE: (a, r, c) => { let x = arr(a); if (r !== undefined && r !== '') x = num(r) < 0 ? x.slice(num(r)) : x.slice(0, num(r)); if (c !== undefined) x = x.map(w => num(c) < 0 ? w.slice(num(c)) : w.slice(0, num(c))); return x; },
  DROP: (a, r, c) => { let x = arr(a); if (r !== undefined && r !== '') x = num(r) < 0 ? x.slice(0, num(r)) : x.slice(num(r)); if (c !== undefined) x = x.map(w => num(c) < 0 ? w.slice(0, num(c)) : w.slice(num(c))); return x; },
  CHOOSEROWS: (a, ...i) => { a = arr(a); return flat(i).map(n => a[num(n) < 0 ? a.length + num(n) : num(n) - 1] ?? E('#VALUE!')); },
  CHOOSECOLS: (a, ...i) => colsOf(FN.CHOOSEROWS(colsOf(a), ...i)),
};
const ALIAS = { CONCATENATE: 'CONCAT', 'PERCENTILE.INC': 'PERCENTILE', 'STDEV.S': 'STDEV', 'STDEV.P': 'STDEVP', 'VAR.S': 'VAR', 'VAR.P': 'VARP', 'RANK.EQ': 'RANK', 'MODE.SNGL': 'MODE' };
const REFF = new Set(['ROW', 'COLUMN', 'ROWS', 'COLUMNS', 'OFFSET', 'CELL']);
const E1 = new Set('ABS INT SQRT UPPER LOWER PROPER TRIM LEN VALUE NOT ISNUMBER ISTEXT ISBLANK YEAR MONTH DAY ROUND ROUNDUP ROUNDDOWN LEFT RIGHT'.split(' '));
const lz = (f) => f;
const LZ = {
  IF: a => { const c = val(ev(a[0])); return bool(c) ? (a[1] ? val(ev(a[1])) : true) : (a[2] ? val(ev(a[2])) : false); },
  IFS: a => { for (let i = 0; i < a.length; i += 2) if (bool(val(ev(a[i])))) return val(ev(a[i + 1])); return E('#N/A'); },
  IFERROR: a => { try { const v = val(ev(a[0])); return isE(v) ? val(ev(a[1])) : v; } catch (e) { if (isE(e)) return val(ev(a[1])); throw e; } },
  IFNA: a => { try { const v = val(ev(a[0])); return isE(v) && v.c === '#N/A' ? val(ev(a[1])) : v; } catch (e) { if (isE(e) && e.c === '#N/A') return val(ev(a[1])); throw e; } },
  ISERROR: a => { try { return isE(val(ev(a[0]))); } catch (e) { if (isE(e)) return true; throw e; } },
  ISERR: a => { try { const v = val(ev(a[0])); return isE(v) && v.c !== '#N/A'; } catch (e) { if (isE(e)) return e.c !== '#N/A'; throw e; } },
  ISNA: a => { try { const v = val(ev(a[0])); return isE(v) && v.c === '#N/A'; } catch (e) { if (isE(e)) return e.c === '#N/A'; throw e; } },
  SWITCH: a => { const x = val(ev(a[0])); let i = 1; for (; i + 1 < a.length; i += 2) if (eq(x, val(ev(a[i])))) return val(ev(a[i + 1])); return i < a.length ? val(ev(a[i])) : E('#N/A'); },
};
for (const n of 'DSUM DCOUNT DAVERAGE DGET DMAX DMIN'.split(' ')) FN[n] = (d, f, c) => {
  const v = db(arr(d), f, arr(c)), n2 = v.filter(x => typeof x === 'number');
  return n === 'DSUM' ? n2.reduce((s, x) => s + x, 0) : n === 'DCOUNT' ? n2.length : n === 'DAVERAGE' ? avg(n2) : n === 'DMAX' ? Math.max(...n2) : n === 'DMIN' ? Math.min(...n2) : v.length === 1 ? v[0] : E(v.length ? '#NUM!' : '#VALUE!');
};

// tokenizer + parser
const TOK = /\s*(?:(\d+\.?\d*(?:E[+-]?\d+)?|\.\d+)|"((?:[^"]|"")*)"|(\$?[A-Za-z]\$?\d+)(?![A-Za-z0-9_(.])|([A-Za-z_][A-Za-z0-9_.]*)|(<=|>=|<>|[-+*\/^&=<>%(),:;]))/iy;
function tokenize(s) {
  const t = []; TOK.lastIndex = 0; const end = s.trimEnd().length;
  while (TOK.lastIndex < end) { const m = TOK.exec(s); if (!m) E('#ERR!'); if (m[1] !== undefined) t.push({ k: 'n', v: +m[1] }); else if (m[2] !== undefined) t.push({ k: 's', v: m[2].replace(/""/g, '"') }); else if (m[3]) t.push({ k: 'r', v: m[3].toUpperCase().replace(/\$/g, '') }); else if (m[4]) t.push({ k: 'i', v: m[4].toUpperCase().replace(/^_XLFN\./, '') }); else t.push({ k: 'o', v: m[5] === ';' ? ',' : m[5] }); }
  return t;
}
function parse(s) {
  const T = tokenize(s); let p = 0; const pk = () => T[p], isOp = (...o) => T[p]?.k === 'o' && o.includes(T[p].v);
  const lvl = (next, ops) => () => { let l = next(); while (isOp(...ops)) { const op = T[p++].v; l = { t: 'bin', op, l, r: next() }; } return l; };
  const prim = () => {
    const t = T[p++]; if (!t) E('#ERR!');
    if (t.k === 'n' || t.k === 's') return { t: 'lit', v: t.v };
    if (t.k === 'r') { const a = parseKey(t.v); if (!a) E('#REF!'); let b = a; if (isOp(':')) { p++; const u = T[p++]; b = u?.k === 'r' ? parseKey(u.v) : E('#REF!'); if (!b) E('#REF!'); } return { t: 'ref', v: mkRef(a, b) }; }
    if (t.k === 'i') { if (isOp('(')) { p++; const args = []; if (!isOp(')')) for (;;) { args.push(isOp(',', ')') ? { t: 'lit', v: '' } : cmpL()); if (isOp(',')) { p++; continue; } break; } if (!isOp(')')) E('#ERR!'); p++; return { t: 'fn', name: t.v, args }; } if (t.v === 'TRUE' || t.v === 'FALSE') return { t: 'lit', v: t.v === 'TRUE' }; E('#NAME?'); }
    if (t.v === '(') { const e = cmpL(); if (!isOp(')')) E('#ERR!'); p++; return e; }
    return E('#ERR!');
  };
  const post = () => { let e = prim(); while (isOp('%')) { p++; e = { t: 'pct', e }; } return e; };
  const un = () => { if (isOp('-', '+')) { const o = T[p++].v; return { t: 'un', o, e: un() }; } return post(); };
  const powL = lvl(un, ['^']), mulL = lvl(powL, ['*', '/']), addL = lvl(mulL, ['+', '-']), catL = lvl(addL, ['&']), cmpL = lvl(catL, ['=', '<>', '<', '>', '<=', '>=']);
  const e = cmpL(); if (p < T.length) E('#ERR!'); return e;
}
const AST = {};
function val(x) {
  if (x && x.R) { if (x.c1 === x.c2 && x.r1 === x.r2) return value(key(x.c1, x.r1), SEEN); const o = []; for (let r = x.r1; r <= x.r2; r++) { const row = []; for (let c = x.c1; c <= x.c2; c++) row.push(sub(value)(key(c, r), SEEN)); o.push(row); } return o; }
  return x;
}
const BIN = {
  '+': (a, b) => num(a) + num(b), '-': (a, b) => num(a) - num(b), '*': (a, b) => num(a) * num(b),
  '/': (a, b) => { b = num(b); if (!b) E('#DIV/0!'); return num(a) / b; }, '^': (a, b) => { const v = num(a) ** num(b); return isNaN(v) ? E('#NUM!') : v; },
  '&': (a, b) => str(a) + str(b), '=': (a, b) => cmp(a, b) === 0, '<>': (a, b) => cmp(a, b) !== 0, '<': (a, b) => cmp(a, b) < 0, '>': (a, b) => cmp(a, b) > 0, '<=': (a, b) => cmp(a, b) <= 0, '>=': (a, b) => cmp(a, b) >= 0,
};
function ev(n) {
  switch (n.t) {
    case 'lit': return n.v; case 'ref': return n.v;
    case 'bin': return m2(val(ev(n.l)), val(ev(n.r)), BIN[n.op]);
    case 'un': return m1(val(ev(n.e)), x => n.o === '-' ? -num(x) : num(x));
    case 'pct': return m1(val(ev(n.e)), x => num(x) / 100);
    case 'fn': {
      const name = ALIAS[n.name] || n.name;
      if (LZ[name]) return LZ[name](n.args);
      const f = FN[name]; if (!f) E('#NAME?');
      const raw = n.args.map(ev); if (REFF.has(name)) return f(...raw);
      const a = raw.map(val);
      if (E1.has(name) && Array.isArray(a[0])) return m1(a[0], x => f(x, ...a.slice(1)));
      return f(...a);
    }
  }
}
function evalFormula(k, seen) {
  const pS = SEEN, pC = CUR; SEEN = seen; CUR = k;
  try { const raw = data[k]; return val(ev(AST[raw] ??= parse(raw.slice(1)))); } finally { SEEN = pS; CUR = pC; }
}
function value(k, seen = new Set()) {
  const raw = data[k];
  if (raw === undefined || raw === '') return k in spill ? spill[k] : '';
  if (raw[0] !== '=') { const u = raw.toUpperCase(); if (u === 'TRUE') return true; if (u === 'FALSE') return false; return raw.trim() === '' || isNaN(raw) ? raw : +raw; }
  if (seen.has(k)) E('#CIRC!');
  const r = evalFormula(k, new Set(seen).add(k));
  return Array.isArray(r) ? r[0][0] : r;
}
function display(k) {
  try {
    const v = value(k); if (isE(v)) return { text: v.c, err: 1 };
    return { text: typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : String(typeof v === 'number' ? +v.toFixed(10) : v), num: typeof v === 'number' };
  } catch (e) { return { text: isE(e) ? e.c : '#ERR!', err: 1 }; }
}
function calc() { // spill array results into empty neighbouring cells
  const ns = {};
  for (const k in data) {
    if (data[k][0] !== '=') continue;
    try {
      const r = evalFormula(k, new Set([k])); if (!Array.isArray(r)) continue;
      const [c, rr] = parseKey(k);
      r.forEach((row, i) => row.forEach((v, j) => { if ((i || j) && c + j < COLS && rr + i < ROWS) { const kk = key(c + j, rr + i); if (data[kk] === undefined) ns[kk] = v; } }));
    } catch (e) {}
  }
  spill = ns;
}
