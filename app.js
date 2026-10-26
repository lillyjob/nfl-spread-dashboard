/* app.js - shared by both pages: data loading, definitions, statistics, theme.
   Every number on the site is computed here from data/nfl_team_games.csv.
   One row of the file = one team in one regular-season game (see the closing section of the report). */
(function (root) {
  'use strict';
  var NFL = {};

  // ---- settings you edit after the Tableau dashboard is live -------------------
  NFL.AUTHOR = 'Lilly Jo Butler';                      // shown under the title on the report
  NFL.TABLEAU_URL = '';                          // paste the Tableau Public link here
  NFL.TABLEAU_NUMBERS = {                        // paste the four numbers shown in Tableau (as displayed)
    games: '5,586', underdog: '51.0%', home: '48.6%', miss: '10.1'
  };

  // ---- loading ------------------------------------------------------------------
  NFL.parseCSV = function (text) {
    var lines = text.replace(/\r/g, '').split('\n').filter(function (l) { return l.length; });
    var head = lines[0].split(',');
    var numeric = { game_id: 1, season: 1, week: 1, team_score: 1, opp_score: 1, margin: 1, team_spread: 1,
                    cover_margin: 1, spread_miss: 1, covered: 1 };
    var rows = [];
    for (var i = 1; i < lines.length; i++) {
      var p = lines[i].split(','), r = {};
      for (var j = 0; j < head.length; j++) r[head[j]] = numeric[head[j]] ? Number(p[j]) : p[j];
      rows.push(r);
    }
    return rows;
  };
  NFL.load = function () {
    return fetch('nfl_team_games.csv').then(function (r) {
      if (!r.ok) throw new Error('Could not load data/nfl_team_games.csv (' + r.status + ')');
      return r.text();
    }).then(NFL.parseCSV);
  };

  // ---- definitions -----------------------------------------------------------------
  // covered = 1 when final margin + team spread > 0 (pushes are not in the file).
  // spread_miss = |final margin + team spread|, in points.
  function mean(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return a.length ? s / a.length : null; }
  NFL.mean = mean;
  NFL.rate = function (rows) { return mean(rows.map(function (r) { return r.covered; })); };
  NFL.missOf = function (rows) { return mean(rows.map(function (r) { return r.spread_miss; })); };

  // The four summary numbers.
  NFL.summary = function (rows) {
    var dog = rows.filter(function (r) { return r.role === 'Underdog'; });
    var home = rows.filter(function (r) { return r.site === 'Home'; });
    return {
      games: rows.length,
      underdog: NFL.rate(dog), underdogN: dog.length,
      home: NFL.rate(home), homeN: home.length,
      miss: NFL.missOf(rows)
    };
  };

  NFL.group = function (rows, keyFn) {
    var m = {}, order = [];
    rows.forEach(function (r) {
      var k = keyFn(r);
      if (!m[k]) { m[k] = []; order.push(k); }
      m[k].push(r);
    });
    return order.map(function (k) {
      var g = m[k], c = 0;
      g.forEach(function (r) { c += r.covered; });
      return { key: k, n: g.length, covers: c, rate: c / g.length, miss: NFL.missOf(g), rows: g };
    });
  };

  // 95% range for a cover rate (normal approximation)
  NFL.ci = function (p, n) {
    var h = 1.96 * Math.sqrt(p * (1 - p) / n);
    return [p - h, p + h];
  };

  NFL.corr = function (xs, ys) {
    var n = xs.length;
    if (n < 3) return null;
    var mx = mean(xs), my = mean(ys), sxy = 0, sxx = 0, syy = 0;
    for (var i = 0; i < n; i++) {
      sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) * (xs[i] - mx); syy += (ys[i] - my) * (ys[i] - my);
    }
    if (sxx === 0 || syy === 0) return null;
    return { r: sxy / Math.sqrt(sxx * syy), slope: sxy / sxx, intercept: my - (sxy / sxx) * mx, n: n };
  };

  // Persistence: a team's cover rate in season t (x) against season t+1 (y).
  // A team-season needs at least minGames rows in the current view to count.
  NFL.persistence = function (rows, minGames) {
    minGames = minGames || 5;
    var ts = NFL.group(rows, function (r) { return r.team + '|' + r.season; });
    var idx = {};
    ts.forEach(function (g) { if (g.n >= minGames) idx[g.key] = g; });
    var pairs = [];
    Object.keys(idx).forEach(function (k) {
      var parts = k.split('|'), nk = parts[0] + '|' + (Number(parts[1]) + 1);
      if (idx[nk]) pairs.push({ team: parts[0], season: Number(parts[1]), x: idx[k].rate, y: idx[nk].rate,
                                nx: idx[k].n, ny: idx[nk].n });
    });
    var c = NFL.corr(pairs.map(function (p) { return p.x; }), pairs.map(function (p) { return p.y; }));
    return { pairs: pairs, fit: c };
  };

  // Spread of team cover rates against what a fair coin would produce
  NFL.teamNoise = function (rows) {
    var g = NFL.group(rows, function (r) { return r.team; });
    var rates = g.map(function (t) { return t.rate; }), m = mean(rates), v = 0;
    rates.forEach(function (x) { v += (x - m) * (x - m); });
    var expV = mean(g.map(function (t) { return 0.25 / t.n; }));
    return { sd: Math.sqrt(v / rates.length), expected: Math.sqrt(expV), teams: g };
  };

  // Correlation of team cover rates before and after a split season (report only)
  NFL.halves = function (rows, splitSeason) {
    var a = NFL.group(rows.filter(function (r) { return r.season < splitSeason; }), function (r) { return r.team; });
    var b = NFL.group(rows.filter(function (r) { return r.season >= splitSeason; }), function (r) { return r.team; });
    var bm = {}; b.forEach(function (t) { bm[t.key] = t.rate; });
    var xs = [], ys = [];
    a.forEach(function (t) { if (bm[t.key] !== undefined) { xs.push(t.rate); ys.push(bm[t.key]); } });
    return NFL.corr(xs, ys);
  };

  // ---- formatting -------------------------------------------------------------------
  NFL.pct = function (x, d) { return x === null || x === undefined || isNaN(x) ? '—' : (x * 100).toFixed(d === undefined ? 1 : d) + '%'; };
  NFL.num = function (x, d) { return x === null || x === undefined || isNaN(x) ? '—' : Number(x).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  NFL.fix = function (x, d) { return x === null || x === undefined || isNaN(x) ? '—' : Number(x).toFixed(d === undefined ? 1 : d); };
  NFL.esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // ---- theme (dark mode) and navigation ------------------------------------------------
  NFL.initTheme = function () {
    var saved = null;
    try { saved = localStorage.getItem('theme'); } catch (e) {}
    if (saved) document.documentElement.setAttribute('data-theme', saved);
    var btn = document.getElementById('theme-toggle');
    function current() {
      var t = document.documentElement.getAttribute('data-theme');
      if (t) return t;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    function label() { if (btn) btn.textContent = current() === 'dark' ? 'Light mode' : 'Dark mode'; }
    label();
    if (btn) btn.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      label();
      document.dispatchEvent(new Event('themechange'));
    });
  };

  root.NFL = NFL;
  if (typeof module !== 'undefined' && module.exports) module.exports = NFL;
})(typeof window !== 'undefined' ? window : globalThis);
