// Loads reviews from Supabase and shows them as framed cards.
// If the setup is missing or the fetch fails, the section simply stays hidden.
(function () {
  var cfg = window.CDT_CONFIG || {};
  var sec = document.getElementById('proof');
  if (!sec) return;
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.indexOf('YOUR_') === 0) return;

  var site = sec.getAttribute('data-site') || 'foundry';
  var PAGE = 6;
  var url = cfg.SUPABASE_URL + '/rest/v1/testimonials' +
    '?select=id,name,title,quote,photo_url' +
    '&show_on=cs.%7B' + encodeURIComponent(site) + '%7D' +
    '&order=created_at.desc&limit=60';

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
    var frame = el('div', 'proof-frame');
    if (r.photo_url) {
      var img = document.createElement('img');
      img.src = r.photo_url;
      img.alt = r.name;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 96;
      img.height = 96;
      frame.appendChild(img);
    } else {
      frame.appendChild(el('span', 'proof-initials', initials(r.name)));
    }
    c.appendChild(frame);
    c.appendChild(el('blockquote', 'proof-quote', r.quote));
    var cap = el('figcaption', 'proof-cap');
    cap.appendChild(el('strong', '', r.name));
    if (r.title) cap.appendChild(el('span', '', r.title));
    c.appendChild(cap);
    return c;
  }

  fetch(url, {
    headers: { apikey: cfg.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + cfg.SUPABASE_ANON_KEY }
  })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (rows) {
      if (!rows || !rows.length) return;
      var grid = sec.querySelector('.proof-grid');
      var more = sec.querySelector('.proof-more');
      var shown = 0;
      function showNext() {
        rows.slice(shown, shown + PAGE).forEach(function (r) { grid.appendChild(card(r)); });
        shown += PAGE;
        if (more) more.hidden = shown >= rows.length;
      }
      if (more) more.addEventListener('click', showNext);
      showNext();
      sec.hidden = false;
    })
    .catch(function () { /* keep hidden */ });
})();
