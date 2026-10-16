// Keeps prices, totals, savings, dates and WhatsApp messages on the pages in sync with the
// values you set in the admin page. If nothing is set (or the database is unreachable), the
// defaults baked into price-defaults.js are used, so the pages always show a sensible price.
(function () {
  var D = window.CDT_DEFAULTS;
  var root = document.documentElement;
  if (!D) { root.classList.remove('pp'); return; }
  var cfg = window.CDT_CONFIG || {};

  var S = { pre: D.pre, full: D.full, lock: D.lock, switch: D.switch, launch: D.launch, services: {} };
  D.services.forEach(function (s) { S.services[s.id] = s.price; });

  function money(v) { return '₦' + Number(v).toLocaleString('en-US'); }
  function ord(d) {
    var s = ['th', 'st', 'nd', 'rd'], v = d % 100;
    return d + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function dateText(dt, tz) {
    var m = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: tz }).format(dt);
    var d = parseInt(new Intl.DateTimeFormat('en-US', { day: 'numeric', timeZone: tz }).format(dt), 10);
    return m + ' ' + ord(d);
  }
  function vals() {
    var total = 0;
    for (var k in S.services) total += S.services[k];
    return { pre: S.pre, full: S.full, lock: S.lock, total: total, save_pre: total - S.pre, save_full: total - S.full };
  }
  function lookup(key, v) {
    return key.indexOf('svc:') === 0 ? S.services[key.slice(4)] : v[key];
  }

  function apply() {
    var v = vals(), i;
    var els = document.querySelectorAll('[data-p]');
    for (i = 0; i < els.length; i++) {
      var n = lookup(els[i].getAttribute('data-p'), v);
      if (typeof n === 'number' && isFinite(n)) els[i].textContent = money(n);
    }
    var ds = document.querySelectorAll('[data-d]');
    for (i = 0; i < ds.length; i++) {
      try {
        ds[i].textContent = ds[i].getAttribute('data-d') === 'switch'
          ? dateText(new Date(S.switch), 'Africa/Lagos')
          : dateText(new Date(S.launch + 'T12:00:00Z'), 'UTC');
      } catch (e) { /* keep default text */ }
    }
    var links = document.querySelectorAll('[data-wa-tpl]');
    for (i = 0; i < links.length; i++) {
      var t = links[i].getAttribute('data-wa-tpl').replace(/\{([^}]+)\}/g, function (m, key) {
        var x = lookup(key, v);
        return typeof x === 'number' ? money(x) : m;
      });
      links[i].href = 'https://wa.me/' + D.wa + '?text=' + encodeURIComponent(t);
    }
  }

  function p2(x) { return (x < 10 ? '0' : '') + x; }
  function tick() {
    var ms = new Date(S.switch) - new Date();
    var el = document.getElementById('count');
    if (isNaN(ms)) return;
    if (ms <= 0) {
      root.setAttribute('data-phase', 'post');
      if (el) el.textContent = '';
      return;
    }
    root.setAttribute('data-phase', 'pre');
    if (el) {
      var s = Math.floor(ms / 1000);
      el.textContent = 'Pre-order closes in ' + Math.floor(s / 86400) + 'd ' + p2(Math.floor(s % 86400 / 3600)) + 'h ' +
        p2(Math.floor(s % 3600 / 60)) + 'm ' + p2(s % 60) + 's';
    }
  }

  function isNum(x) { return typeof x === 'number' && isFinite(x) && x >= 0; }
  function merge(v) {
    if (!v) return;
    ['pre', 'full', 'lock'].forEach(function (k) { if (isNum(v[k])) S[k] = v[k]; });
    if (typeof v.switch === 'string' && !isNaN(new Date(v.switch))) S.switch = v.switch;
    if (typeof v.launch === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.launch)) S.launch = v.launch;
    if (v.services) {
      for (var id in S.services) { if (isNum(v.services[id])) S.services[id] = v.services[id]; }
    }
  }

  var started = false;
  function done() {
    apply();
    tick();
    if (!started) { started = true; setInterval(tick, 1000); }
    root.classList.remove('pp');
  }

  var hasDb = cfg.SUPABASE_URL && cfg.SUPABASE_URL.indexOf('YOUR_') !== 0;
  if (!hasDb) { done(); return; }

  fetch(cfg.SUPABASE_URL + '/rest/v1/site_settings?key=eq.pricing&select=value', {
    headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + cfg.SUPABASE_ANON_KEY }
  })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (rows) { if (rows && rows[0]) merge(rows[0].value); })
    .catch(function () { /* use defaults */ })
    .then(done);
})();
