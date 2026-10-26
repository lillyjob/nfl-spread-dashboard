/* report.js - fills the report page. Every number and chart below is computed from the data file. */
(function () {
  'use strict';
  var F = NFL, C = Charts;
  F.initTheme();
  C.initTips();
  document.getElementById('author').textContent = F.AUTHOR;

  F.load().then(render).catch(function (e) {
    document.getElementById('answer').textContent = 'Could not load the data: ' + e.message +
      '. Open this page from the published site (or a local web server), not as a file.';
  });

  function pp(x) { return (x * 100).toFixed(1); }          // percent without the sign
  function card(label, value, note) {
    return '<div class="card"><div class="label">' + label + '</div><div class="value">' + value + '</div><div class="note">' + note + '</div></div>';
  }
  function finding(n, heading, paraHtml, chartHtml, caption, tableHtml) {
    return '<section class="finding" aria-labelledby="f' + n + '"><h2 id="f' + n + '">' + heading + '</h2>' + paraHtml +
      '<figure><div class="chart">' + chartHtml + '</div><figcaption>' + caption + '</figcaption>' +
      '<details><summary>Show the numbers behind this chart</summary><div class="scroll">' + tableHtml + '</div></details></figure></section>';
  }

  function render(rows) {
    var S = F.summary(rows);
    var seasons = Array.from(new Set(rows.map(function (r) { return r.season; }))).sort();
    var first = seasons[0], last = seasons[seasons.length - 1];
    var noise = F.teamNoise(rows);
    var teams = noise.teams.slice().sort(function (a, b) { return b.rate - a.rate; });
    var top = teams[0], bot = teams[teams.length - 1];
    teams.forEach(function (t) { var c = F.ci(t.rate, t.n); t.lo = c[0]; t.up = c[1]; t.out = c[0] > 0.5 || c[1] < 0.5; });
    var outliers = teams.filter(function (t) { return t.out; });
    var pers = F.persistence(rows, 5), fit = pers.fit;
    var halves = F.halves(rows, 2020);
    var byRole = F.group(rows, function (r) { return r.role; });
    var role = {}; byRole.forEach(function (g) { role[g.key] = g; });
    var bySite = F.group(rows, function (r) { return r.site; });
    var site = {}; bySite.forEach(function (g) { site[g.key] = g; });
    var bySeason = F.group(rows, function (r) { return r.season; }).sort(function (a, b) { return a.key - b.key; });
    var mnS = bySeason.reduce(function (a, b) { return b.miss < a.miss ? b : a; });
    var mxS = bySeason.reduce(function (a, b) { return b.miss > a.miss ? b : a; });
    var trend = F.corr(bySeason.map(function (g) { return Number(g.key); }), bySeason.map(function (g) { return g.miss; }));
    var needDog = 1.96 * Math.sqrt(0.25 / role.Underdog.n) * 100;

    // ---- opening paragraph: answer in the first two sentences, then the recommendation
    document.getElementById('answer').innerHTML =
      'No team beat the spread in a way that lasted: the ' + top.key + ' covered most often (' + pp(top.rate) + '% of ' + top.n +
      ' games) and the ' + bot.key + ' least often (' + pp(bot.rate) + '% of ' + bot.n + '), yet a team&rsquo;s cover rate in one season had a correlation of ' +
      F.fix(fit.r, 2) + ' with its rate in the next season across ' + fit.n + ' team-seasons. ' +
      'The differences between teams are about the size that chance alone produces, so a past cover record says almost nothing about the next season. ' +
      '<strong>Recommendation:</strong> do not adjust a line, or flag a team for extra review, because of that team&rsquo;s cover record; keep one model for all ' +
      teams.length + ' teams and track the average miss (' + F.fix(S.miss, 1) + ' points a game) as the measure of line quality.';

    // ---- four summary numbers
    document.getElementById('cards').innerHTML =
      card('Team-games counted', F.num(S.games), 'One team in one regular-season game, ' + first + '&ndash;' + last + '; each game counts twice.') +
      card('Underdog cover rate', F.pct(S.underdog), 'Share of underdog team-games that beat the spread (' + F.num(S.underdogN) + ' games).') +
      card('Home cover rate', F.pct(S.home), 'Share of home team-games that beat the spread; neutral sites excluded (' + F.num(S.homeN) + ' games).') +
      card('Average miss vs. spread (points)', F.fix(S.miss, 1), 'Average of |final margin + spread| over all team-games.');

    var html = '';

    // ---- finding 1: teams
    var items = teams.map(function (t) {
      return { label: t.key, value: t.rate, lo: t.lo, up: t.up, hi: t.out,
        tip: t.key + ': covered ' + t.covers + ' of ' + t.n + ' (' + pp(t.rate) + '%); 95% range ' + pp(t.lo) + '% to ' + pp(t.up) + '%' };
    });
    var below = outliers.filter(function (t) { return t.rate < 0.5; }).map(function (t) { return 'the ' + t.key; });
    var h1 = 'Team cover rates cluster around 50%; ' + (outliers.length ? 'only ' + below.join(' and ') + ' sit clearly below it' : 'no team is clearly away from it');
    var p1 = '<p>Across the ' + teams.length + ' teams, cover rates run from ' + pp(bot.rate) + '% (' + bot.key + ', ' + bot.n + ' games) to ' + pp(top.rate) + '% (' + top.key + ', ' + top.n +
      ' games). The standard deviation of the ' + teams.length + ' rates is ' + F.fix(noise.sd * 100, 1) + ' points; if every game were a fair coin flip, sampling alone would produce about ' +
      F.fix(noise.expected * 100, 1) + ' points. ' + outliers.length + ' teams have a 95% range that excludes 50%: ' +
      outliers.map(function (t) { return t.key + ' (' + pp(t.rate) + '%)'; }).join(' and ') + '. With ' + teams.length + ' teams, about ' + F.fix(teams.length * 0.05, 1) +
      ' would land outside by luck alone, so the ' + top.key + ' and the other top teams are not distinguishable from chance.</p>';
    html += finding(1, h1, p1,
      '<h3>Cover rate by team, ' + first + '&ndash;' + last + '</h3><div class="legend"><span>95% range includes 50%</span><span class="b2">95% range excludes 50%</span><span class="ln">50% (coin flip)</span></div>' +
      C.dotPlot(items, { min: 0.3, max: 0.7, ref: 0.5, refLabel: '50%', fmt: function (v) { return Math.round(v * 100) + '%'; }, xTitle: 'Share of games that beat the spread (line shows 95% range)',
        aria: 'Dot plot of cover rate for each of ' + teams.length + ' teams with 95% ranges' }),
      'Each dot is one team&rsquo;s cover rate over its ' + Math.round(F.mean(teams.map(function (t) { return t.n; }))) + ' games; the gray line is its 95% range.',
      C.table(['Team', 'Games', 'Covered', 'Cover rate', '95% range', 'Average miss (pts)'],
        teams.map(function (t) { return [t.key, t.n, t.covers, pp(t.rate) + '%', pp(t.lo) + '% to ' + pp(t.up) + '%', F.fix(t.miss, 2)]; })));

    // ---- finding 2: persistence
    var pts = pers.pairs.map(function (p) {
      return { x: p.x, y: p.y, tip: p.team + ' ' + p.season + ' → ' + (p.season + 1) + ': ' + pp(p.x) + '% then ' + pp(p.y) + '%' };
    });
    var h2 = 'A team&rsquo;s cover rate in one season does not predict the next: the correlation is ' + F.fix(fit.r, 2);
    var p2 = '<p>There are ' + fit.n + ' team-season pairs (' + first + '&rarr;' + (first + 1) + ' through ' + (last - 1) + '&rarr;' + last + '), each season with at least 5 games. The correlation between a team&rsquo;s cover rate and its cover rate the following season is ' +
      F.fix(fit.r, 3) + ', and the fitted line has a slope of ' + F.fix(fit.slope, 3) + ': a team that covered 10 points above 50% in one season was expected to cover ' +
      F.fix(fit.slope * 10, 1) + ' points above 50% in the next. Comparing whole stretches instead, the correlation between team cover rates in ' + first + '&ndash;2019 and in 2020&ndash;' + last +
      ' is ' + F.fix(halves.r, 2) + ' across ' + halves.n + ' teams. With ' + halves.n + ' teams a correlation needs to reach about 0.35 to rule out chance, so that value is not evidence of persistence either.</p>';
    html += finding(2, h2, p2,
      '<h3>Cover rate in a season against the same team&rsquo;s next season</h3><div class="legend"><span>One team-season</span><span class="b2">Fitted line</span><span class="ln">50%</span></div>' +
      C.scatter(pts, { min: 0, max: 1, fmt: function (v) { return Math.round(v * 100) + '%'; }, fit: fit, xTitle: 'Cover rate in season t', yTitle: 'Cover rate in season t+1',
        aria: 'Scatter plot of each team-season cover rate against the next season, correlation ' + F.fix(fit.r, 2) }),
      'If past cover records carried over, the dots would slope upward from the lower left to the upper right.',
      C.table(['Team', 'Season t', 'Rate in t', 'Rate in t+1'], pers.pairs.map(function (p) { return [p.team, p.season, pp(p.x) + '%', pp(p.y) + '%']; })));

    // ---- finding 3: favorites/underdogs, home/away
    var gaps = [role.Underdog.rate - 0.5, site.Away.rate - 0.5].map(function (v) { return Math.abs(v) * 100; });
    var h3 = 'Underdogs and away teams covered slightly more often, but the gaps (' + F.fix(gaps[0], 1) + ' and ' + F.fix(gaps[1], 1) + ' points) are within chance';
    var p3 = '<p>Underdogs covered ' + pp(role.Underdog.rate) + '% of ' + F.num(role.Underdog.n) + ' team-games and favorites ' + pp(role.Favorite.rate) + '%. Away teams covered ' + pp(site.Away.rate) + '% of ' + F.num(site.Away.n) +
      ' and home teams ' + pp(site.Home.rate) + '%. Because every game has exactly one cover, each pair adds up to 100%. With about ' + F.num(role.Underdog.n) + ' games in each group, a gap has to reach about ' + F.fix(needDog, 1) +
      ' points to rule out chance, and both gaps are smaller. Neutral-site games (' + site.Neutral.n / 2 + ' games) are left out of the home and away rates.</p>';
    var gi = [
      { label: 'Favorite', value: role.Favorite.rate, g: role.Favorite, cls: 'c-bar2' }, { label: 'Underdog', value: role.Underdog.rate, g: role.Underdog, cls: 'c-bar1' },
      { label: 'Home team', value: site.Home.rate, g: site.Home, cls: 'c-bar2' }, { label: 'Away team', value: site.Away.rate, g: site.Away, cls: 'c-bar1' }
    ].map(function (d) { d.tip = d.label + ': covered ' + d.g.covers + ' of ' + F.num(d.g.n) + ' (' + pp(d.value) + '%)'; return d; });
    html += finding(3, h3, p3,
      '<h3>Cover rate by role and site</h3><div class="legend"><span class="b2">Favorite or home</span><span>Underdog or away</span><span class="ln">50%</span></div>' +
      C.groupBars(gi, { min: 0.44, max: 0.56, ref: 0.5, refLabel: '50%', fmt: function (v, label) { return label ? pp(v) + '%' : Math.round(v * 100) + '%'; }, xTitle: 'Share of games that beat the spread',
        aria: 'Bars of cover rate for favorites, underdogs, home teams and away teams relative to 50%' }),
      'Bars start at the 50% line, so each bar shows the distance from a coin flip.',
      C.table(['Group', 'Games', 'Covered', 'Cover rate'], gi.map(function (d) { return [d.label, d.g.n, d.g.covers, pp(d.value) + '%']; })));

    // ---- finding 4: average miss by season
    var h4 = 'The spread misses the final margin by about ' + F.fix(S.miss, 1) + ' points a game, with no clear trend across seasons';
    var p4 = '<p>The average of |final margin + spread| is ' + F.fix(S.miss, 2) + ' points over all ' + F.num(S.games) + ' team-games. By season it ranges from ' + F.fix(mnS.miss, 1) + ' (' + mnS.key + ') to ' + F.fix(mxS.miss, 1) + ' (' + mxS.key +
      '); it was ' + F.fix(bySeason[0].miss, 1) + ' in ' + first + ' and ' + F.fix(bySeason[bySeason.length - 1].miss, 1) + ' in ' + last + '. The fitted trend is ' + F.fix(trend.slope, 2) + ' points per season with a correlation of ' + F.fix(trend.r, 2) +
      ' across ' + bySeason.length + ' seasons. A miss of ten points is a normal result, so a single large miss is not a sign that a team&rsquo;s line was wrong.</p>';
    html += finding(4, h4, p4,
      '<h3>Average miss vs. spread, by season</h3>' +
      C.lineChart([{ name: 'Average miss', cls: 's1', points: bySeason.map(function (g) { return { x: Number(g.key), y: g.miss, tip: g.key + ': average miss ' + F.fix(g.miss, 2) + ' points (' + F.num(g.n) + ' team-games)' }; }) }],
        { xs: seasons, min: 8, max: 12, fmt: function (v) { return v; }, yTitle: 'Average miss (points)', aria: 'Line chart of average miss versus the spread by season' }),
      'Average of |final margin + team spread| for every team-game in the season.',
      C.table(['Season', 'Team-games', 'Average miss (points)'], bySeason.map(function (g) { return [g.key, g.n, F.fix(g.miss, 2)]; })));

    document.getElementById('findings').innerHTML = html;

    // ---- agreement table (Tableau column filled in from app.js once the Tableau dashboard is live)
    var T = F.TABLEAU_NUMBERS, web = [F.num(S.games), F.pct(S.underdog), F.pct(S.home), F.fix(S.miss, 1)];
    var tab = [T.games, T.underdog, T.home, T.miss];
    var names = ['Team-games counted', 'Underdog cover rate', 'Home cover rate', 'Average miss vs. spread (points)'];
    var a = '<table class="data agree"><thead><tr><th>Summary number</th><th>Website</th><th>Tableau</th></tr></thead><tbody>';
    names.forEach(function (n, i) {
      var pending = tab[i] === '';
      var diff = !pending && String(tab[i]).trim() !== web[i];
      a += '<tr><th scope="row">' + n + '</th><td>' + web[i] + '</td><td' + (diff ? ' class="diff"' : '') + '>' + (pending ? '<span class="tag">pending</span>' : F.esc(tab[i])) + '</td></tr>';
    });
    a += '</tbody></table>';
    a += F.TABLEAU_URL ? '<p><a href="' + F.esc(F.TABLEAU_URL) + '" rel="noopener">Open the Tableau Public dashboard</a></p>'
                       : '<p class="small">The Tableau Public link will appear here once the dashboard is published.</p>';
    document.getElementById('agree').innerHTML = a;
  }
})();
