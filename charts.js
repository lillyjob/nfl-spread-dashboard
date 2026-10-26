/* charts.js - small SVG chart helpers (no libraries). Colors come from CSS variables in style.css. */
(function (root) {
  'use strict';
  var C = {};
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  function niceTicks(lo, hi, count) {
    var span = hi - lo, raw = span / count, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var step = [1, 2, 2.5, 5, 10].map(function (m) { return m * mag; }).filter(function (s) { return s >= raw; })[0];
    var t = [], v = Math.ceil(lo / step - 1e-9) * step;
    for (; v <= hi + 1e-9; v += step) t.push(Math.round(v * 1e6) / 1e6);
    return t;
  }
  C.niceTicks = niceTicks;

  function empty(w, h, msg) {
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(msg) + '"><text x="' + w / 2 + '" y="' + h / 2 +
      '" text-anchor="middle" class="c-label">' + esc(msg) + '</text></svg>';
  }

  /* Dot plot: one dot per category, sorted by value; optional 95% range whiskers and a reference line.
     items: [{label, value, tip, hi:boolean, lo, up}] */
  C.dotPlot = function (items, o) {
    if (!items.length) return empty(640, 120, 'No games match these filters');
    var W = 640, rowH = 20, top = 28, bottom = 36, left = 96, right = 20, H = top + bottom + rowH * items.length;
    var lo = o.min, hi = o.max;
    var x = function (v) { return left + (v - lo) / (hi - lo) * (W - left - right); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria) + '">';
    niceTicks(lo, hi, 5).forEach(function (t) {
      s += '<line class="c-grid" x1="' + x(t) + '" x2="' + x(t) + '" y1="' + top + '" y2="' + (H - bottom) + '"/>' +
        '<text class="c-tick" x="' + x(t) + '" y="' + (H - bottom + 16) + '" text-anchor="middle">' + o.fmt(t) + '</text>';
    });
    if (o.ref !== undefined) {
      s += '<line class="c-ref" x1="' + x(o.ref) + '" x2="' + x(o.ref) + '" y1="' + top + '" y2="' + (H - bottom) + '"/>' +
        '<text class="c-label" x="' + x(o.ref) + '" y="' + (top - 10) + '" text-anchor="middle">' + esc(o.refLabel || '') + '</text>';
    }
    s += '<text class="c-label" x="' + (left + (W - left - right) / 2) + '" y="' + (H - 4) + '" text-anchor="middle">' + esc(o.xTitle) + '</text>';
    items.forEach(function (d, i) {
      var y = top + rowH * i + rowH / 2;
      s += '<text class="c-text" x="' + (left - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + esc(d.label) + '</text>';
      if (d.lo !== undefined) {
        s += '<line class="c-whisk" x1="' + x(Math.max(lo, d.lo)) + '" x2="' + x(Math.min(hi, d.up)) + '" y1="' + y + '" y2="' + y + '"/>';
      }
      s += '<circle class="' + (d.hi ? 'c-dot2' : 'c-dot1') + '" cx="' + x(d.value) + '" cy="' + y + '" r="5"/>';
      s += '<rect class="hit" data-tip="' + esc(d.tip) + '" x="' + left + '" y="' + (y - rowH / 2) + '" width="' + (W - left - right) + '" height="' + rowH + '" fill="transparent"/>';
    });
    return s + '</svg>';
  };

  /* Line chart over seasons. series: [{name, cls, points:[{x, y, tip}]}] (y may be null) */
  C.lineChart = function (series, o) {
    var W = 640, H = 300, left = 56, right = 24, top = 30, bottom = 44;
    var pts = [].concat.apply([], series.map(function (s) { return s.points.filter(function (p) { return p.y !== null && !isNaN(p.y); }); }));
    if (!pts.length) return empty(W, 140, 'No games match these filters');
    var xs = o.xs, lo = o.min, hi = o.max;
    var x = function (v) { return left + (xs.length === 1 ? 0.5 : xs.indexOf(v) / (xs.length - 1)) * (W - left - right); };
    var y = function (v) { return H - bottom - (v - lo) / (hi - lo) * (H - top - bottom); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria) + '">';
    niceTicks(lo, hi, 5).forEach(function (t) {
      s += '<line class="c-grid" x1="' + left + '" x2="' + (W - right) + '" y1="' + y(t) + '" y2="' + y(t) + '"/>' +
        '<text class="c-tick" x="' + (left - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + o.fmt(t) + '</text>';
    });
    xs.forEach(function (v, i) {
      if (xs.length > 8 && i % 2 === 1 && i !== xs.length - 1) return;
      s += '<text class="c-tick" x="' + x(v) + '" y="' + (H - bottom + 18) + '" text-anchor="middle">' + v + '</text>';
    });
    if (o.ref !== undefined) {
      s += '<line class="c-ref" x1="' + left + '" x2="' + (W - right) + '" y1="' + y(o.ref) + '" y2="' + y(o.ref) + '"/>' +
        '<text class="c-label" x="' + (W - right) + '" y="' + (y(o.ref) - 6) + '" text-anchor="end">' + esc(o.refLabel || '') + '</text>';
    }
    s += '<text class="c-label" x="' + (left + (W - left - right) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">Season</text>';
    s += '<text class="c-label" x="14" y="' + (top + (H - top - bottom) / 2) + '" text-anchor="middle" transform="rotate(-90 14 ' + (top + (H - top - bottom) / 2) + ')">' + esc(o.yTitle) + '</text>';
    series.forEach(function (se) {
      var path = '', pen = false;
      se.points.forEach(function (p) {
        if (p.y === null || isNaN(p.y)) { pen = false; return; }
        path += (pen ? 'L' : 'M') + x(p.x).toFixed(1) + ' ' + y(p.y).toFixed(1); pen = true;
      });
      s += '<path class="c-line ' + se.cls + '" d="' + path + '"/>';
      se.points.forEach(function (p) {
        if (p.y === null || isNaN(p.y)) return;
        s += '<circle class="c-pt ' + se.cls + '" cx="' + x(p.x) + '" cy="' + y(p.y) + '" r="4"/>' +
          '<circle class="hit" data-tip="' + esc(p.tip) + '" cx="' + x(p.x) + '" cy="' + y(p.y) + '" r="12" fill="transparent"/>';
      });
    });
    return s + '</svg>';
  };

  /* Scatter with 50% reference lines and an optional fitted line. points: [{x, y, tip}] */
  C.scatter = function (points, o) {
    var W = 640, H = 420, left = 60, right = 24, top = 24, bottom = 50;
    if (!points.length) return empty(W, 140, 'No team-seasons match these filters');
    var lo = o.min, hi = o.max;
    var x = function (v) { return left + (v - lo) / (hi - lo) * (W - left - right); };
    var y = function (v) { return H - bottom - (v - lo) / (hi - lo) * (H - top - bottom); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria) + '">';
    niceTicks(lo, hi, 6).forEach(function (t) {
      s += '<line class="c-grid" x1="' + left + '" x2="' + (W - right) + '" y1="' + y(t) + '" y2="' + y(t) + '"/>' +
        '<line class="c-grid" x1="' + x(t) + '" x2="' + x(t) + '" y1="' + top + '" y2="' + (H - bottom) + '"/>' +
        '<text class="c-tick" x="' + (left - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + o.fmt(t) + '</text>' +
        '<text class="c-tick" x="' + x(t) + '" y="' + (H - bottom + 18) + '" text-anchor="middle">' + o.fmt(t) + '</text>';
    });
    s += '<line class="c-ref" x1="' + left + '" x2="' + (W - right) + '" y1="' + y(0.5) + '" y2="' + y(0.5) + '"/>' +
      '<line class="c-ref" x1="' + x(0.5) + '" x2="' + x(0.5) + '" y1="' + top + '" y2="' + (H - bottom) + '"/>';
    s += '<text class="c-label" x="' + (left + (W - left - right) / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(o.xTitle) + '</text>';
    s += '<text class="c-label" x="14" y="' + (top + (H - top - bottom) / 2) + '" text-anchor="middle" transform="rotate(-90 14 ' + (top + (H - top - bottom) / 2) + ')">' + esc(o.yTitle) + '</text>';
    if (o.fit) {
      var a = Math.max(lo, 0), b = Math.min(hi, 1);
      s += '<line class="c-fit" x1="' + x(a) + '" x2="' + x(b) + '" y1="' + y(o.fit.intercept + o.fit.slope * a) + '" y2="' + y(o.fit.intercept + o.fit.slope * b) + '"/>';
    }
    points.forEach(function (p) {
      s += '<circle class="c-sc" cx="' + x(p.x) + '" cy="' + y(p.y) + '" r="4.5"/>' +
        '<circle class="hit" data-tip="' + esc(p.tip) + '" cx="' + x(p.x) + '" cy="' + y(p.y) + '" r="9" fill="transparent"/>';
    });
    return s + '</svg>';
  };

  /* Horizontal bars for a few labelled groups. items: [{label, value, tip, n}] ; value may be null */
  C.groupBars = function (items, o) {
    var W = 640, rowH = 34, top = 30, bottom = 36, left = 120, right = 60, H = top + bottom + rowH * items.length;
    var lo = o.min, hi = o.max;
    var x = function (v) { return left + (v - lo) / (hi - lo) * (W - left - right); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.aria) + '">';
    niceTicks(lo, hi, 5).forEach(function (t) {
      s += '<line class="c-grid" x1="' + x(t) + '" x2="' + x(t) + '" y1="' + top + '" y2="' + (H - bottom) + '"/>' +
        '<text class="c-tick" x="' + x(t) + '" y="' + (H - bottom + 16) + '" text-anchor="middle">' + o.fmt(t) + '</text>';
    });
    s += '<text class="c-label" x="' + (left + (W - left - right) / 2) + '" y="' + (H - 4) + '" text-anchor="middle">' + esc(o.xTitle) + '</text>';
    items.forEach(function (d, i) {
      var y = top + rowH * i + 6, h = rowH - 12;
      s += '<text class="c-text" x="' + (left - 8) + '" y="' + (y + h / 2 + 4) + '" text-anchor="end">' + esc(d.label) + '</text>';
      if (d.value === null || isNaN(d.value)) {
        s += '<text class="c-label" x="' + (left + 6) + '" y="' + (y + h / 2 + 4) + '">no games in this view</text>';
      } else {
        var x0 = x(o.ref), x1 = x(d.value);
        s += '<rect class="' + (d.cls || 'c-bar1') + '" x="' + Math.min(x0, x1) + '" y="' + y + '" width="' + Math.max(1, Math.abs(x1 - x0)) + '" height="' + h + '" rx="3"/>' +
          '<text class="c-text" x="' + (Math.max(x0, x1) + 6) + '" y="' + (y + h / 2 + 4) + '">' + o.fmt(d.value, true) + '</text>' +
          '<rect class="hit" data-tip="' + esc(d.tip) + '" x="' + left + '" y="' + (y - 3) + '" width="' + (W - left - right) + '" height="' + (h + 6) + '" fill="transparent"/>';
      }
    });
    s += '<line class="c-ref" x1="' + x(o.ref) + '" x2="' + x(o.ref) + '" y1="' + top + '" y2="' + (H - bottom) + '"/>' +
      '<text class="c-label" x="' + x(o.ref) + '" y="' + (top - 10) + '" text-anchor="middle">' + esc(o.refLabel) + '</text>';
    return s + '</svg>';
  };

  /* Tooltip: any element with class "hit" and data-tip inside a .chart gets a tooltip. */
  C.initTips = function () {
    var tip = document.getElementById('tip');
    if (!tip) { tip = document.createElement('div'); tip.id = 'tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    document.addEventListener('mousemove', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('.hit') : null;
      if (!t) { tip.style.display = 'none'; return; }
      tip.textContent = t.getAttribute('data-tip');
      tip.style.display = 'block';
      var x = e.clientX + 14, y = e.clientY + 14;
      if (x + tip.offsetWidth > window.innerWidth - 8) x = e.clientX - tip.offsetWidth - 14;
      tip.style.left = Math.max(4, x) + 'px'; tip.style.top = Math.max(4, y) + 'px';
    });
  };

  /* Accessible data table under a chart. */
  C.table = function (headers, rows) {
    return '<table class="data"><thead><tr>' + headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rows.map(function (r) {
        return '<tr>' + r.map(function (c, i) { return (i === 0 ? '<th scope="row">' : '<td>') + esc(c) + (i === 0 ? '</th>' : '</td>'); }).join('') + '</tr>';
      }).join('') + '</tbody></table>';
  };

  root.Charts = C;
})(window);
