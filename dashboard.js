/* dashboard.js - filters, the same four summary numbers as the report, and charts that all respond to the filters.
   Filters are kept in the address bar so a view can be shared by its link. */
(function () {
  'use strict';
  var F = NFL, C = Charts;
  F.initTheme();
  C.initTips();

  var DEFAULTS = { from: '', to: '', team: 'All', role: 'All', site: 'All', measure: 'rate' };
  var ALL = [], state = {}, seasons = [], teamNames = [];
  var $ = function (id) { return document.getElementById(id); };
  var pp = function (x) { return (x * 100).toFixed(1); };

  F.load().then(function (rows) {
    ALL = rows;
    seasons = Array.from(new Set(rows.map(function (r) { return r.season; }))).sort();
    teamNames = Array.from(new Set(rows.map(function (r) { return r.team; }))).sort();
    DEFAULTS.from = String(seasons[0]); DEFAULTS.to = String(seasons[seasons.length - 1]);
    fill('f-from', seasons.map(String), seasons.map(String));
    fill('f-to', seasons.map(String), seasons.map(String));
    fill('f-team', ['All'].concat(teamNames), ['All teams'].concat(teamNames));
    readURL();
    ['from', 'to', 'team', 'role', 'site', 'measure'].forEach(function (k) {
      $('f-' + k).addEventListener('change', function () { state[k] = this.value; fix(); render(); });
    });
    $('reset').addEventListener('click', function () { state = Object.assign({}, DEFAULTS); fix(); render(); });
    document.addEventListener('themechange', render);
    render();
  }).catch(function (e) {
    $('viewline').textContent = 'Could not load the data: ' + e.message + '. Open this page from the published site (or a local web server), not as a file.';
  });

  function fill(id, values, labels) {
    $(id).innerHTML = values.map(function (v, i) { return '<option value="' + F.esc(v) + '">' + F.esc(labels[i]) + '</option>'; }).join('');
  }
  function readURL() {
    state = Object.assign({}, DEFAULTS);
    var q = new URLSearchParams(location.search);
    Object.keys(DEFAULTS).forEach(function (k) { if (q.has(k)) state[k] = q.get(k); });
    fix();
  }
  // keep the filter values valid and show them in the controls and the address bar
  function fix() {
    if (seasons.indexOf(Number(state.from)) < 0) state.from = DEFAULTS.from;
    if (seasons.indexOf(Number(state.to)) < 0) state.to = DEFAULTS.to;
    if (Number(state.from) > Number(state.to)) { var t = state.from; state.from = state.to; state.to = t; }
    if (state.team !== 'All' && teamNames.indexOf(state.team) < 0) state.team = 'All';
    if (['All', 'Favorite', 'Underdog'].indexOf(state.role) < 0) state.role = 'All';
    if (['All', 'Home', 'Away', 'Neutral'].indexOf(state.site) < 0) state.site = 'All';
    if (['rate', 'miss'].indexOf(state.measure) < 0) state.measure = 'rate';
    Object.keys(DEFAULTS).forEach(function (k) { $('f-' + k).value = state[k]; });
    var q = new URLSearchParams();
    Object.keys(DEFAULTS).forEach(function (k) { if (state[k] !== DEFAULTS[k]) q.set(k, state[k]); });
    try { history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q.toString() : '')); } catch (e) {}
  }

  function card(label, value, note) {
    return '<div class="card"><div class="label">' + label + '</div><div class="value">' + value + '</div><div class="note">' + note + '</div></div>';
  }

  function render() {
    var from = Number(state.from), to = Number(state.to);
    // rows used by every chart except the team overview, which ignores the Team filter on purpose
    var base = ALL.filter(function (r) {
      return r.season >= from && r.season <= to && (state.role === 'All' || r.role === state.role) && (state.site === 'All' || r.site === state.site);
    });
    var rows = state.team === 'All' ? base : base.filter(function (r) { return r.team === state.team; });
    var S = F.summary(rows), miss = state.measure === 'miss';

    $('viewline').textContent = 'Showing ' + from + (to !== from ? '–' + to : '') + ' · ' + (state.team === 'All' ? 'all teams' : state.team) + ' · ' +
      (state.role === 'All' ? 'all roles' : state.role + 's') + ' · ' + (state.site === 'All' ? 'all sites' : state.site.toLowerCase() + ' games') + ' · ' + F.num(rows.length) + ' team-games';

    // ---- the same four summary numbers, same labels as the report
    $('cards').innerHTML =
      card('Team-games counted', F.num(S.games), 'One team in one regular-season game; each game counts twice.') +
      card('Underdog cover rate', F.pct(S.underdog), S.underdogN ? 'Share of underdog team-games that beat the spread (' + F.num(S.underdogN) + ' games).' : 'No underdog games in this view.') +
      card('Home cover rate', F.pct(S.home), S.homeN ? 'Share of home team-games that beat the spread; neutral sites excluded (' + F.num(S.homeN) + ' games).' : 'No home games in this view.') +
      card('Average miss vs. spread (points)', F.fix(S.miss, 1), 'Average of |final margin + spread| over all team-games in the view.');

    // ---- chart 1: every team (ignores the Team filter; the selected team is highlighted)
    var teams = F.group(base, function (r) { return r.team; });
    teams.forEach(function (t) { t.v = miss ? t.miss : t.rate; var c = F.ci(t.rate, t.n); t.lo = c[0]; t.up = c[1]; });
    teams.sort(function (a, b) { return b.v - a.v; });
    var items = teams.map(function (t) {
      var o = { label: t.key, value: t.v, hi: t.key === state.team,
        tip: t.key + ': ' + (miss ? 'average miss ' + F.fix(t.miss, 2) + ' points' : 'covered ' + t.covers + ' of ' + t.n + ' (' + pp(t.rate) + '%), 95% range ' + pp(t.lo) + '% to ' + pp(t.up) + '%') + ' · ' + t.n + ' team-games' };
      if (!miss) { o.lo = t.lo; o.up = t.up; }
      return o;
    });
    var vmin = Math.min.apply(null, teams.map(function (t) { return t.v; })), vmax = Math.max.apply(null, teams.map(function (t) { return t.v; }));
    var dom = miss ? [Math.floor(vmin - 0.5), Math.ceil(vmax + 0.5)]
                   : [Math.max(0, Math.floor((Math.min(0.5, vmin) - 0.03) / 0.05) * 0.05), Math.min(1, Math.ceil((Math.max(0.5, vmax) + 0.03) / 0.05) * 0.05)];
    $('c-team').innerHTML = '<h3>' + (miss ? 'Average miss vs. spread by team' : 'Cover rate by team') + '</h3>' +
      '<div class="legend"><span>Team</span>' + (state.team !== 'All' ? '<span class="b2">Selected team</span>' : '') + (miss ? '' : '<span class="ln">50% (coin flip)</span>') + '</div>' +
      C.dotPlot(items, { min: dom[0], max: dom[1], ref: miss ? undefined : 0.5, refLabel: '50%',
        fmt: miss ? function (v) { return v; } : function (v) { return Math.round(v * 100) + '%'; },
        xTitle: miss ? 'Average miss (points)' : 'Share of games that beat the spread (line shows 95% range)',
        aria: (miss ? 'Average miss' : 'Cover rate') + ' for each team in the current view' }) +
      '<p class="small" style="margin:6px 0 0">Shows every team; the Team filter only highlights one.</p>';

    // ---- chart 2: by season (all filters)
    var bySeason = F.group(rows, function (r) { return r.season; });
    var sm = {}; bySeason.forEach(function (g) { sm[g.key] = g; });
    var xs = seasons.filter(function (s) { return s >= from && s <= to; });
    var series, legend, lo, hi, ref;
    if (miss) {
      series = [{ name: 'Average miss', cls: 's1', points: xs.map(function (s) { var g = sm[s]; return { x: s, y: g ? g.miss : null, tip: s + ': average miss ' + (g ? F.fix(g.miss, 2) : 'n/a') + ' points' + (g ? ' (' + g.n + ' team-games)' : '') }; }) }];
      legend = '';
      var vals = series[0].points.map(function (p) { return p.y; }).filter(function (v) { return v !== null; });
      lo = vals.length ? Math.floor(Math.min.apply(null, vals) - 0.5) : 8; hi = vals.length ? Math.ceil(Math.max.apply(null, vals) + 0.5) : 12;
    } else {
      var seasonRate = function (s, key) {
        var g = sm[s]; if (!g) return null;
        var sub = g.rows.filter(function (r) { return key === 'role' ? r.role === 'Underdog' : r.site === 'Home'; });
        return sub.length ? { v: F.rate(sub), n: sub.length } : null;
      };
      series = [
        { name: 'Underdog cover rate', cls: 's1', points: xs.map(function (s) { var d = seasonRate(s, 'role'); return { x: s, y: d ? d.v : null, tip: s + ' underdogs: ' + (d ? pp(d.v) + '% of ' + d.n + ' team-games' : 'no games') }; }) },
        { name: 'Home cover rate', cls: 's2', points: xs.map(function (s) { var d = seasonRate(s, 'site'); return { x: s, y: d ? d.v : null, tip: s + ' home teams: ' + (d ? pp(d.v) + '% of ' + d.n + ' team-games' : 'no games') }; }) }
      ];
      legend = '<div class="legend"><span>Underdog cover rate</span><span class="b2">Home cover rate</span><span class="ln">50%</span></div>';
      var all = [].concat.apply([], series.map(function (s) { return s.points.map(function (p) { return p.y; }); })).filter(function (v) { return v !== null; });
      lo = all.length ? Math.max(0, Math.floor((Math.min(0.5, Math.min.apply(null, all)) - 0.03) / 0.05) * 0.05) : 0.4;
      hi = all.length ? Math.min(1, Math.ceil((Math.max(0.5, Math.max.apply(null, all)) + 0.03) / 0.05) * 0.05) : 0.6;
      ref = 0.5;
    }
    $('c-season').innerHTML = '<h3>' + (miss ? 'Average miss by season' : 'Cover rate by season') + '</h3>' + legend +
      C.lineChart(series, { xs: xs, min: lo, max: hi, ref: ref, refLabel: '50%', fmt: miss ? function (v) { return v; } : function (v) { return Math.round(v * 100) + '%'; },
        yTitle: miss ? 'Average miss (points)' : 'Share of games that beat the spread', aria: (miss ? 'Average miss' : 'Cover rate') + ' by season in the current view' });

    // ---- chart 3: role and site (all filters)
    var role = {}, site = {};
    F.group(rows, function (r) { return r.role; }).forEach(function (g) { role[g.key] = g; });
    F.group(rows, function (r) { return r.site; }).forEach(function (g) { site[g.key] = g; });
    var spec = [['Favorite', role.Favorite, 'c-bar2'], ['Underdog', role.Underdog, 'c-bar1'], ['Home team', site.Home, 'c-bar2'], ['Away team', site.Away, 'c-bar1']];
    var gv = function (g) { return g ? (miss ? g.miss : g.rate) : null; };
    var gi = spec.map(function (s) {
      var v = gv(s[1]);
      return { label: s[0], value: v, cls: s[2], tip: s[0] + ': ' + (s[1] ? (miss ? 'average miss ' + F.fix(s[1].miss, 2) + ' points' : 'covered ' + s[1].covers + ' of ' + F.num(s[1].n) + ' (' + pp(s[1].rate) + '%)') : 'no games') };
    });
    var gvals = gi.map(function (d) { return d.value; }).filter(function (v) { return v !== null; });
    var gmin, gmax, gref;
    if (miss) { var mm = F.missOf(rows); gref = mm === null ? 10 : mm; gmin = gvals.length ? Math.floor(Math.min(gref, Math.min.apply(null, gvals)) - 0.5) : 8; gmax = gvals.length ? Math.ceil(Math.max(gref, Math.max.apply(null, gvals)) + 0.5) : 12; }
    else { gref = 0.5; gmin = gvals.length ? Math.max(0, Math.floor((Math.min(0.5, Math.min.apply(null, gvals)) - 0.02) / 0.02) * 0.02) : 0.44; gmax = gvals.length ? Math.min(1, Math.ceil((Math.max(0.5, Math.max.apply(null, gvals)) + 0.02) / 0.02) * 0.02) : 0.56; }
    $('c-group').innerHTML = '<h3>' + (miss ? 'Average miss by role and site' : 'Cover rate by role and site') + '</h3>' +
      '<div class="legend"><span class="b2">Favorite or home</span><span>Underdog or away</span><span class="ln">' + (miss ? 'Average of the view' : '50%') + '</span></div>' +
      C.groupBars(gi, { min: gmin, max: gmax, ref: gref, refLabel: miss ? 'View average' : '50%',
        fmt: miss ? function (v, label) { return label ? F.fix(v, 1) : v; } : function (v, label) { return label ? pp(v) + '%' : Math.round(v * 100) + '%'; },
        xTitle: miss ? 'Average miss (points)' : 'Share of games that beat the spread', aria: 'Bars by role and site in the current view' });

    // ---- chart 4: persistence (all filters)
    var pers = F.persistence(rows, 5), fit = pers.fit;
    var pts = pers.pairs.map(function (p) { return { x: p.x, y: p.y, tip: p.team + ' ' + p.season + ' → ' + (p.season + 1) + ': ' + pp(p.x) + '% then ' + pp(p.y) + '%' }; });
    $('c-persist').innerHTML = '<h3>Does a cover rate carry over to the next season?</h3>' +
      '<p class="small" style="margin:0 0 6px">' + (fit ? pers.pairs.length + ' team-season pairs; correlation ' + F.fix(fit.r, 2) + ', slope ' + F.fix(fit.slope, 2) + '.' :
        pers.pairs.length + ' team-season pairs: too few to compute a correlation (needs two consecutive seasons in the view).') + ' A team-season needs at least 5 games in the view.</p>' +
      C.scatter(pts, { min: 0, max: 1, fmt: function (v) { return Math.round(v * 100) + '%'; }, fit: fit, xTitle: 'Cover rate in season t', yTitle: 'Cover rate in season t+1',
        aria: 'Scatter of cover rate against the same team’s next-season cover rate' });

    // ---- table of the numbers behind the view (all filters)
    var tg = F.group(rows, function (r) { return r.team; }).sort(function (a, b) { return b.rate - a.rate; });
    var trows = tg.map(function (t) { return [t.key, F.num(t.n), F.num(t.covers), pp(t.rate) + '%', F.fix(t.miss, 2)]; });
    var tot = rows.length ? [['All teams in view', F.num(rows.length), F.num(rows.reduce(function (a, r) { return a + r.covered; }, 0)), pp(F.rate(rows)) + '%', F.fix(F.missOf(rows), 2)]] : [];
    $('table').innerHTML = C.table(['Team', 'Team-games', 'Covered', 'Cover rate', 'Average miss (pts)'], tot.concat(trows));
  }
})();
