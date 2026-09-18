/* ============================================================================
   ND OS  ·  the bus  ·  Accelerated Experiences LLC · Sep 2026
   ----------------------------------------------------------------------------
   Stood up bus style, on purpose. No room ever calls another room. A room
   publishes what happened and subscribes to what it cares about, and that is
   the only wiring there is. Adding Blast, Calendar, Docs or Records is one
   line in ROOMS plus a page that talks on the bus — nothing else changes,
   which is the whole reason it is built this way.

     NDOS.bus.emit(topic, data)      say it
     NDOS.bus.on(topic, fn)          hear it  (returns an off() )
     NDOS.bus.last(topic)            what was said last, for a late arrival

   Sticky topics replay their last message to whoever subscribes afterwards, so
   a room that mounts late is never out of date. The bus also crosses tabs via
   BroadcastChannel: publish in Write and the Desk in another tab knows.

   Topics in use
     auth:in     {}             a key is held and it worked
     auth:out    {why}          no key, or it stopped working
     net:busy    {on:bool}      a call is in flight   -> dock spinner
     ui:say      {text,bad}     tell the human        -> toast
     post:saved  {post}         a post was written    -> lists refresh
     post:gone   {slug}         a post was deleted
     room:ready  {id}           a room finished mounting
   ========================================================================== */
(function (global) {
  'use strict';

  /* ---- bus --------------------------------------------------------------- */
  var STICKY = { 'auth:in':1, 'auth:out':1, 'net:busy':1, 'post:saved':1, 'post:gone':1 };
  var subs = {}, kept = {}, chan = null;

  try { chan = new BroadcastChannel('nd-os'); } catch (e) { chan = null; }

  function deliver(topic, data) {
    var list = subs[topic] ? subs[topic].slice() : [];
    for (var i = 0; i < list.length; i++) {
      try { list[i](data, topic); } catch (e) { if (global.console) console.error('[bus]', topic, e); }
    }
    var any = subs['*'] ? subs['*'].slice() : [];
    for (var j = 0; j < any.length; j++) { try { any[j](data, topic); } catch (e) {} }
  }

  var bus = {
    on: function (topic, fn) {
      (subs[topic] = subs[topic] || []).push(fn);
      if (STICKY[topic] && kept.hasOwnProperty(topic)) { try { fn(kept[topic], topic); } catch (e) {} }
      return function off() {
        var a = subs[topic] || [], i = a.indexOf(fn);
        if (i > -1) a.splice(i, 1);
      };
    },
    once: function (topic, fn) {
      var off = bus.on(topic, function (d, t) { off(); fn(d, t); });
      return off;
    },
    emit: function (topic, data, localOnly) {
      if (STICKY[topic]) kept[topic] = data;
      deliver(topic, data);
      if (chan && !localOnly) { try { chan.postMessage({ topic: topic, data: data }); } catch (e) {} }
    },
    last: function (topic) { return kept[topic]; }
  };
  if (chan) chan.onmessage = function (e) {
    var m = e && e.data; if (!m || !m.topic) return;
    if (STICKY[m.topic]) kept[m.topic] = m.data;
    deliver(m.topic, m.data);
  };

  /* ---- rooms ------------------------------------------------------------- */
  /* One registry. The dock, the sheet and the Desk all read from it, so a new
     room appears in all three at once. `live:false` shows it greyed as soon. */
  var I = {
    desk:    'M4 6.5h16M4 12h16M4 17.5h10',
    write:   'M4.5 19.5h3.2l9.6-9.6a2.3 2.3 0 0 0-3.2-3.2L4.5 16.3v3.2zM13.8 7.2l3 3',
    notes:   'M6 3.5h9l4 4v13H6zM15 3.5V8h4M9 12.5h7M9 16h5',
    blast:   'M5 14.5V9.5h3l7-4.5v14l-7-4.5H5zM19 8.5a5 5 0 0 1 0 7',
    list:    'M4.5 7h2m0 0 0 0M9 7h10.5M4.5 12h2M9 12h10.5M4.5 17h2M9 17h10.5',
    cal:     'M4.5 6.5h15v13h-15zM4.5 10.5h15M8.5 4v4M15.5 4v4M8 14.5h2M14 14.5h2',
    docs:    'M6.5 3.5h7l4.5 4.5v12h-11.5zM13.5 3.5V8H18M9.5 12.5h5M9.5 16h5',
    records: 'M5 6.5c0-1.4 3.1-2.5 7-2.5s7 1.1 7 2.5v11c0 1.4-3.1 2.5-7 2.5s-7-1.1-7-2.5zM5 6.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5',
    more:    'M6 12h.01M12 12h.01M18 12h.01',
    up:      'M12 19V5M12 5l-6 6M12 5l6 6',
    save:    'M5.5 5.5h10l3 3v10h-13zM8.5 5.5v5h6v-5M8.5 18.5v-5h7v5',
    check:   'M5 12.5l4.5 4.5L19 7.5'
  };
  function icon(k) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (I[k] || I.more) + '"/></svg>';
  }

  var ROOMS = [
    { id:'desk',    label:'Desk',     href:'/nd/os/',          icon:'desk',    live:false, blurb:'Who came, from where, what sold.' },
    { id:'write',   label:'Write',    href:'/nd/write/',       icon:'write',   live:true,  blurb:'Write a note and publish it.' },
    { id:'notes',   label:'Notes',    href:'/nd/blog/',        icon:'notes',   live:true,  blurb:'The posts, as everyone sees them.' },
    { id:'blast',   label:'Blast',    href:'/nd/os/blast/',    icon:'blast',   live:true,  blurb:'Queue a post. Blastpack sends it.' },
    { id:'list',    label:'List',     href:'/nd/os/list/',     icon:'list',    live:true,  blurb:'One list, not four places.' },
    { id:'cal',     label:'Calendar', href:'/nd/os/calendar/', icon:'cal',     live:false, blurb:'What is posting, and when.' },
    { id:'docs',    label:'Docs',     href:'/nd/os/docs/',     icon:'docs',    live:false, blurb:'Write a real document.' },
    { id:'records', label:'Records',  href:'/nd/os/records/',  icon:'records', live:false, blurb:'The hall of records.' }
  ];
  function room(id) { for (var i=0;i<ROOMS.length;i++) if (ROOMS[i].id===id) return ROOMS[i]; return null; }

  /* ---- the key, in one place -------------------------------------------- */
  var LS = 'nd:write:key', KEY = '';
  try { KEY = localStorage.getItem(LS) || ''; } catch (e) {}
  var auth = {
    has: function () { return !!KEY; },
    get: function () { return KEY; },
    set: function (k) { KEY = k || ''; try { KEY ? localStorage.setItem(LS,KEY) : localStorage.removeItem(LS); } catch(e){}
      bus.emit(KEY ? 'auth:in' : 'auth:out', {}); },
    clear: function (why) { KEY=''; try{ localStorage.removeItem(LS); }catch(e){} bus.emit('auth:out',{why:why||''}); }
  };

  /* ---- one way to talk to the server ------------------------------------ */
  /* Every room calls through here, so busy state, dead keys and plain-English
     errors are handled once on the bus instead of in each room. */
  var MSG = {
    NEED_KEY:'That passphrase did not work.',
    NOT_CONFIGURED:'Publishing is not switched on yet — the key is not set on the server.',
    NO_STORE:'The store is not connected yet.',
    NEED_TITLE:'It needs a title first.',
    NEED_SLUG:'That one has no address yet.',
    BAD_JSON:'Something got garbled. Try again.',
    BAD_REPLY:'The server answered with something unreadable.',
    OFFLINE:'No connection. Nothing was lost — your writing is still here.'
  };
  var flying = 0;
  function busy(on) {
    flying += on ? 1 : -1; if (flying < 0) flying = 0;
    bus.emit('net:busy', { on: flying > 0 }, true);
  }
  function net(path, opts) {
    opts = opts || {};
    var init = { method: opts.method || 'GET', headers: {} };
    if (KEY) init.headers['x-nd-key'] = KEY;
    if (opts.json) { init.headers['content-type'] = 'application/json'; init.body = JSON.stringify(opts.json); }
    busy(true);
    return fetch(path, init)
      .then(function (r) {
        return r.json().catch(function () { return { ok:false, error:'BAD_REPLY' }; })
          .then(function (j) { j.__status = r.status; return j; });
      })
      .catch(function () { return { ok:false, error:'OFFLINE', __status:0 }; })
      .then(function (j) {
        busy(false);
        if (!j.ok && j.__status === 401) auth.clear(MSG.NEED_KEY);
        return j;
      });
  }
  function why(j) { return (j && MSG[j.error]) || 'Something went wrong. Try again in a moment.'; }
  function say(text, bad) { bus.emit('ui:say', { text:text, bad:!!bad }, true); }

  /* ---- toast (subscribes; no room ever touches it) ----------------------- */
  var toastEl = null, toastT = null;
  bus.on('ui:say', function (m) {
    if (!m || !m.text) return;
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className='nd-toast';
      toastEl.setAttribute('role','status'); document.body.appendChild(toastEl); }
    toastEl.textContent = m.text;
    toastEl.className = 'nd-toast' + (m.bad ? ' bad' : '');
    void toastEl.offsetWidth; toastEl.classList.add('up');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toastEl.classList.remove('up'); }, m.bad ? 5200 : 3200);
  });

  /* ---- dock + sheet ------------------------------------------------------ */
  var SLOTS = ['desk','write','notes'];           // three rooms + more, prime in the middle
  var dock = null, sheet = null, scrim = null, glide = null, primeBtn = null, prime = null;

  function place(activeId) {
    if (!dock || !glide) return;
    var el = dock.querySelector('[data-room="' + activeId + '"]');
    if (!el) { glide.style.opacity = '0'; return; }
    glide.style.opacity = '';
    glide.style.width = el.offsetWidth + 'px';
    glide.style.transform = 'translateX(' + el.offsetLeft + 'px)';
    dock.classList.add('ready');
  }

  function openSheet(open) {
    if (!sheet) return;
    sheet.classList.toggle('up', open);
    scrim.classList.toggle('up', open);
    sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  function mount(cfg) {
    cfg = cfg || {};
    var activeId = cfg.active || 'desk';
    prime = cfg.primary || null;
    document.body.classList.add('nd-os');

    var slots = SLOTS.slice();
    if (slots.indexOf(activeId) === -1 && room(activeId)) slots[2] = activeId;

    dock = document.createElement('nav');
    dock.className = 'nd-dock'; dock.setAttribute('aria-label','ND OS rooms');
    var html = '<span class="glide"></span>';
    for (var i = 0; i < slots.length; i++) {
      var r = room(slots[i]); if (!r) continue;
      var on = r.id === activeId ? ' on' : '';
      html += '<a class="' + on.trim() + '" data-room="' + r.id + '" href="' + r.href + '"'
            + (r.id === activeId ? ' aria-current="page"' : '') + '>' + icon(r.icon)
            + '<span>' + r.label + '</span></a>';
      if (i === 1) html += '<button class="prime" type="button" id="ndPrime"></button>';
    }
    html += '<button class="" type="button" id="ndMore">' + icon('more') + '<span>More</span></button>';
    dock.innerHTML = html;
    document.body.appendChild(dock);
    glide = dock.querySelector('.glide');
    primeBtn = dock.querySelector('#ndPrime');

    setPrime(prime);

    scrim = document.createElement('div'); scrim.className = 'nd-scrim';
    sheet = document.createElement('div'); sheet.className = 'nd-sheet';
    sheet.setAttribute('role','dialog'); sheet.setAttribute('aria-label','All rooms'); sheet.setAttribute('aria-hidden','true');
    var rs = '<span class="grip"></span><h3>ND OS</h3><div class="rooms">';
    for (var k = 0; k < ROOMS.length; k++) {
      var q = ROOMS[k];
      rs += '<a href="' + q.href + '" class="' + (q.live ? '' : 'soon') + '"'
          + (q.id === activeId ? ' aria-current="page"' : '') + '>' + icon(q.icon)
          + '<span>' + q.label + '</span></a>';
    }
    rs += '</div><a class="out" href="/nd/">Back to the site</a>';
    sheet.innerHTML = rs;
    document.body.appendChild(scrim); document.body.appendChild(sheet);

    dock.querySelector('#ndMore').addEventListener('click', function () { openSheet(!sheet.classList.contains('up')); });
    scrim.addEventListener('click', function () { openSheet(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') openSheet(false); });

    /* drag the sheet down to dismiss — a thumb expects this in 2026 */
    var y0 = null;
    sheet.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; }, { passive: true });
    sheet.addEventListener('touchmove', function (e) {
      if (y0 == null) return; var dy = e.touches[0].clientY - y0;
      if (dy > 0) { sheet.style.transition = 'none'; sheet.style.transform = 'translateY(' + dy + 'px)'; }
    }, { passive: true });
    sheet.addEventListener('touchend', function (e) {
      if (y0 == null) return;
      var dy = (e.changedTouches[0].clientY - y0); y0 = null;
      sheet.style.transition = ''; sheet.style.transform = '';
      if (dy > 70) openSheet(false);
    });

    requestAnimationFrame(function () { place(activeId); });
    window.addEventListener('resize', function () { place(activeId); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ place(activeId); });

    /* the dock gets out of the way when you scroll down to read, and comes
       back the moment you scroll up or stop */
    var lastY = window.scrollY, idle = null;
    window.addEventListener('scroll', function () {
      var y = window.scrollY;
      if (y > lastY + 12 && y > 140) dock.classList.add('hide');
      else if (y < lastY - 6) dock.classList.remove('hide');
      lastY = y;
      clearTimeout(idle); idle = setTimeout(function(){ dock.classList.remove('hide'); }, 900);
    }, { passive: true });

    bus.emit('room:ready', { id: activeId }, true);
    return { place: place, sheet: openSheet, prime: setPrime };
  }

  /* the raised button belongs to the room, not to the dock */
  function setPrime(p) {
    prime = p;
    if (!primeBtn) return;
    if (!p) { primeBtn.style.display = 'none'; return; }
    primeBtn.style.display = '';
    primeBtn.innerHTML = icon(p.icon || 'up');
    primeBtn.setAttribute('aria-label', p.label || 'Go');
    primeBtn.title = p.label || '';
    primeBtn.onclick = function () { if (typeof p.onTap === 'function') p.onTap(); };
  }

  /* busy state is the dock's problem, not the room's */
  bus.on('net:busy', function (m) {
    if (!primeBtn || !prime) return;
    primeBtn.disabled = !!(m && m.on);
    primeBtn.querySelector('svg') && primeBtn.querySelector('svg').classList.toggle('spin', !!(m && m.on));
  });

  global.NDOS = { bus:bus, rooms:ROOMS, room:room, icon:icon, auth:auth, net:net, why:why,
                  say:say, mount:mount, prime:setPrime, sheet:function(b){openSheet(b);} };
})(window);
