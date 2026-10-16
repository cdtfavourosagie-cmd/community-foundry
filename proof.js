// Loads reviews from Supabase and shows them as one sideways-scrolling row of equal-size cards.
// Long reviews get a "Read more" that opens a scrollable area inside that one card.
// If the setup is missing or the fetch fails, the section simply stays hidden.
(function () {
  var cfg = window.CDT_CONFIG || {};
  var sec = document.getElementById('proof');
  if (!sec) return;
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.indexOf('YOUR_') === 0) return;

  var site = sec.getAttribute('data-site') || 'foundry';
  var track = sec.querySelector('.proof-track');
  var prev = sec.querySelector('.proof-prev');
  var next = sec.querySelector('.proof-next');
  var url = cfg.SUPABASE_URL + '/rest/v1/testimonials' +
    '?select=id,name,title,quote,photo_url' +
    '&show_on=cs.%7B' + encodeURIComponent(site) + '%7D' +
    '&order=position.asc.nullslast,created_at.desc&limit=100';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function initials(name) {
    var p = String(name || '').trim().split(/\s+/);
    return ((p[0] || '').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase();
  }

  function card(r) {
    var c = el('figure', 'proof-card');
    c.setAttribute('role', 'listitem');

    var who = el('div', 'proof-who');
    var frame = el('div', 'proof-frame');
    if (r.photo_url) {
      var img = document.createElement('img');
      img.src = r.photo_url;
      img.alt = r.name;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 58;
      img.height = 58;
      frame.appendChild(img);
    } else {
      frame.appendChild(el('span', 'proof-initials', initials(r.name)));
    }
    who.appendChild(frame);
    var cap = el('figcaption', 'proof-cap');
    cap.appendChild(el('strong', '', r.name));
    if (r.title) cap.appendChild(el('span', '', r.title));
    who.appendChild(cap);
    c.appendChild(who);

    var body = el('div', 'proof-body');
    var q = el('blockquote', 'proof-quote', r.quote);
    body.appendChild(q);
    var btn = el('button', 'proof-read', 'Read more');
    btn.type = 'button';
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function () {
      var open = c.classList.toggle('open');
      btn.textContent = open ? 'Show less' : 'Read more';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { q.tabIndex = 0; } else { q.removeAttribute('tabindex'); q.scrollTop = 0; }
    });
    body.appendChild(btn);
    c.appendChild(body);
    return c;
  }

  // Show "Read more" only on cards whose text does not fit.
  function measure() {
    var cards = track.querySelectorAll('.proof-card');
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if (c.classList.contains('open')) continue;
      var q = c.querySelector('.proof-quote');
      c.classList.toggle('clip', q.scrollHeight > q.clientHeight + 2);
    }
  }

  function arrows() {
    if (!prev || !next) return;
    prev.disabled = track.scrollLeft < 8;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
  }

  function step(dir) {
    var c = track.querySelector('.proof-card');
    var w = c ? c.getBoundingClientRect().width + 20 : 300;
    track.scrollBy({ left: dir * w, behavior: 'smooth' });
  }

  fetch(url, {
    headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + cfg.SUPABASE_ANON_KEY }
  })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (rows) {
      if (!rows || !rows.length) return;
      rows.forEach(function (r) { track.appendChild(card(r)); });
      sec.hidden = false;
      measure();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
      window.addEventListener('resize', measure);
      track.addEventListener('scroll', arrows, { passive: true });
      if (prev) prev.addEventListener('click', function () { step(-1); });
      if (next) next.addEventListener('click', function () { step(1); });
      track.addEventListener('keydown', function (e) {
        if (e.target !== track) return;
        if (e.key === 'ArrowRight') { step(1); e.preventDefault(); }
        if (e.key === 'ArrowLeft') { step(-1); e.preventDefault(); }
      });
      arrows();
      var hint = sec.querySelector('.proof-hint');
      if (hint && track.scrollWidth <= track.clientWidth + 2) hint.hidden = true;
    })
    .catch(function () { /* keep hidden */ });
})();
