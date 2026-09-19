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
  /* Two icon systems, on purpose, and the AE ICON SWAP MACHINE's own size floor
     is the reason. The illustrated room art is a scene; under about 64px it turns
     to mush. So the art rides the sheet and the Desk cards where it is big, and
     the dock - 21px on dark glass - gets bold filled glyphs that hold at that size.
     Thin strokes were the mistake; weight is what reads small. */
  var I = {
    desk:    'M2.75 4.5h18.5a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H2.75a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Zm.25 2v9h18v-9H3Z|M8.5 19h7a1 1 0 0 1 0 2h-7a1 1 0 0 1 0-2Z@M5.5 12.2h2v2.3h-2zM10.9 9.4h2v5.1h-2zM16.3 7h2v7.5h-2z',
    write:   'M17.9 1.7a3.1 3.1 0 0 1 4.4 4.4l-1.2 1.2-4.4-4.4 1.2-1.2ZM15.3 4.3l4.4 4.4-9.5 9.5-5.9 1.5 1.5-5.9 9.5-9.5Z@M3 20.3h18a.95.95 0 0 1 0 1.9H3a.95.95 0 0 1 0-1.9Z',
    notes:   'M11.1 5.1v14.6C8.4 18.3 5.6 18 2.8 18.6a.9.9 0 0 1-1.1-.9V5.2a.9.9 0 0 1 .6-.85C5.2 3.4 8.2 3.7 11.1 5.1Z@M12.9 5.1v14.6c2.7-1.4 5.5-1.7 8.3-1.1a.9.9 0 0 0 1.1-.9V5.2a.9.9 0 0 0-.6-.85C18.8 3.4 15.8 3.7 12.9 5.1Z',
    blast:   'M14.6 3.4a.9.9 0 0 1 1.4.75v15.7a.9.9 0 0 1-1.4.75L8.6 16.4H5.3A2.3 2.3 0 0 1 3 14.1V9.9a2.3 2.3 0 0 1 2.3-2.3h3.3l6-4.2Z|M6.1 16.4h2.5l.7 4a1.1 1.1 0 0 1-1.08 1.3h-.8a1.1 1.1 0 0 1-1.09-.94l-.23-4.36Z@M18.7 8a1.05 1.05 0 0 1 1.47.25 6.6 6.6 0 0 1 0 7.5 1.05 1.05 0 1 1-1.72-1.2 4.5 4.5 0 0 0 0-5.1A1.05 1.05 0 0 1 18.7 8Z',
    list:    'M3.6 5.2a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Zm0 5.2a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Zm0 5.2a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2Z@M8.4 5.9h12.4a.9.9 0 0 1 0 1.8H8.4a.9.9 0 0 1 0-1.8Zm0 5.2h12.4a.9.9 0 0 1 0 1.8H8.4a.9.9 0 0 1 0-1.8Zm0 5.2h12.4a.9.9 0 0 1 0 1.8H8.4a.9.9 0 0 1 0-1.8Z',
    cal:     'M4.2 4.4h15.6A2.2 2.2 0 0 1 22 6.6v13.2a2.2 2.2 0 0 1-2.2 2.2H4.2A2.2 2.2 0 0 1 2 19.8V6.6a2.2 2.2 0 0 1 2.2-2.2ZM4 10.4v9.4h16v-9.4H4Z@M7.2 1.4a1 1 0 0 1 1 1v1.6h-2V2.4a1 1 0 0 1 1-1Zm9.6 0a1 1 0 0 1 1 1v1.6h-2V2.4a1 1 0 0 1 1-1ZM7.6 13.4h2.4v2.4H7.6z',
    docs:    'M6 2.2h7L19 8.2v12.4a1.8 1.8 0 0 1-1.8 1.8H6a1.8 1.8 0 0 1-1.8-1.8V4A1.8 1.8 0 0 1 6 2.2Z@M13.4 2.4 19 8h-4.8a.8.8 0 0 1-.8-.8V2.4Z',
    records: 'M12 2.4c4.5 0 8 1.3 8 3v2.2c0 1.7-3.5 3-8 3s-8-1.3-8-3V5.4c0-1.7 3.5-3 8-3Z@M20 10.6v2.8c0 1.7-3.5 3-8 3s-8-1.3-8-3v-2.8c1.7 1.2 4.7 1.8 8 1.8s6.3-.6 8-1.8Zm0 5.4v2.6c0 1.7-3.5 3-8 3s-8-1.3-8-3V16c1.7 1.2 4.7 1.8 8 1.8s6.3-.6 8-1.8Z',
    people:  'M9 11.3a3.9 3.9 0 1 0 0-7.8 3.9 3.9 0 0 0 0 7.8Zm-7 8.6c0-3.7 3.1-6.2 7-6.2s7 2.5 7 6.2a.9.9 0 0 1-.9.9H2.9a.9.9 0 0 1-.9-.9Z@M16.7 11.1a3.1 3.1 0 1 0 0-6.2 3.1 3.1 0 0 0 0 6.2Zm1 2.1c2.5.4 4.3 2.4 4.3 4.9a.8.8 0 0 1-.8.8h-3.4c0-2.3-1-4.3-2.6-5.5.8-.2 1.6-.3 2.5-.2Z',
    quality: 'M12 1.9l2.3 2 3-.4 1.1 2.8 2.8 1.1-.4 3 2 2.3-2 2.3.4 3-2.8 1.1-1.1 2.8-3-.4-2.3 2-2.3-2-3 .4-1.1-2.8-2.8-1.1.4-3-2-2.3 2-2.3-.4-3 2.8-1.1L6.7 3.5l3 .4 2.3-2Z@M16.4 8.6a1.1 1.1 0 0 1 0 1.56l-4.7 4.7a1.1 1.1 0 0 1-1.56 0l-2.3-2.3a1.1 1.1 0 1 1 1.56-1.56l1.52 1.52 3.92-3.92a1.1 1.1 0 0 1 1.56 0Z',
    more:    'M5 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Zm7 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4Z',
    up:      'M12 2.6a1.2 1.2 0 0 1 .87.37l6.4 6.4a1.2 1.2 0 0 1-1.74 1.66L13.2 6.7V20.2a1.2 1.2 0 0 1-2.4 0V6.7l-4.33 4.33a1.2 1.2 0 1 1-1.74-1.66l6.4-6.4A1.2 1.2 0 0 1 12 2.6Z',
    save:    'M5 3.4h11.2L20.6 7.8V19a1.8 1.8 0 0 1-1.8 1.8H5A1.8 1.8 0 0 1 3.2 19V5.2A1.8 1.8 0 0 1 5 3.4Zm2.8 0v5h7.6v-5H7.8Z@M7.4 12.6h9.2v8.2H7.4z',
    check:   'M20.5 5.9a1.3 1.3 0 0 1 0 1.84l-9.6 9.6a1.3 1.3 0 0 1-1.84 0l-4.5-4.5a1.3 1.3 0 0 1 1.84-1.84l3.58 3.58 8.68-8.68a1.3 1.3 0 0 1 1.84 0Z',
    sun:     'M12 6.6a5.4 5.4 0 1 1 0 10.8 5.4 5.4 0 0 1 0-10.8Z@M12 .9a1.1 1.1 0 0 1 1.1 1.1v1.8a1.1 1.1 0 0 1-2.2 0V2A1.1 1.1 0 0 1 12 .9Zm0 18.2a1.1 1.1 0 0 1 1.1 1.1V22a1.1 1.1 0 0 1-2.2 0v-1.8a1.1 1.1 0 0 1 1.1-1.1ZM23.1 12a1.1 1.1 0 0 1-1.1 1.1h-1.8a1.1 1.1 0 0 1 0-2.2H22a1.1 1.1 0 0 1 1.1 1.1Zm-18.2 0a1.1 1.1 0 0 1-1.1 1.1H2a1.1 1.1 0 0 1 0-2.2h1.8A1.1 1.1 0 0 1 4.9 12Zm14.9-7.8a1.1 1.1 0 0 1 0 1.56l-1.3 1.3a1.1 1.1 0 0 1-1.56-1.56l1.3-1.3a1.1 1.1 0 0 1 1.56 0ZM7.06 16.94a1.1 1.1 0 0 1 0 1.56l-1.3 1.3A1.1 1.1 0 0 1 4.2 18.24l1.3-1.3a1.1 1.1 0 0 1 1.56 0Zm12.74 2.86a1.1 1.1 0 0 1-1.56 0l-1.3-1.3a1.1 1.1 0 0 1 1.56-1.56l1.3 1.3a1.1 1.1 0 0 1 0 1.56ZM7.06 7.06a1.1 1.1 0 0 1-1.56 0L4.2 5.76A1.1 1.1 0 0 1 5.76 4.2l1.3 1.3a1.1 1.1 0 0 1 0 1.56Z',
    moon:    'M20.6 14.9A9.2 9.2 0 0 1 9.1 3.4a.95.95 0 0 0-1.3-1.1 10.4 10.4 0 1 0 13.9 13.9.95.95 0 0 0-1.1-1.3Z'
  };
  /* 'a|a2@b' — solid parts before @, the lighter accent after */
  function icon(k) {
    var raw = I[k] || I.more, parts = raw.split('@');
    var out = '<svg viewBox="0 0 24 24" aria-hidden="true">';
    parts[0].split('|').forEach(function (d) { out += '<path class="a" fill-rule="evenodd" d="' + d + '"/>'; });
    if (parts[1]) parts[1].split('|').forEach(function (d) { out += '<path class="b" d="' + d + '"/>'; });
    return out + '</svg>';
  }
  /* the real thing, for anywhere it is drawn big enough to survive */
  function art(id) { return '/nd/os/icons/' + id + '.svg'; }

  var ROOMS = [
    { id:'desk',    label:'Desk',     href:'/nd/os/',          icon:'desk',    live:true,  blurb:'Who came, from where, what sold.' },
    { id:'write',   label:'Write',    href:'/nd/write/',       icon:'write',   live:true,  blurb:'Write a note and publish it.' },
    { id:'notes',   label:'Notes',    href:'/nd/blog/?in=os',        icon:'notes',   live:true,  blurb:'The posts, as everyone sees them.' },
    { id:'blast',   label:'Blastpack', href:'/nd/os/blast/',   icon:'blast',   live:true,  blurb:'The Media Network. Queue a post; Blastpack sends it.' },
    { id:'list',    label:'List',     href:'/nd/os/list/',     icon:'list',    live:true,  blurb:'One list, not four places.' },
    { id:'cal',     label:'Calendar', href:'/nd/os/calendar/', icon:'cal',     live:true,  blurb:'Everything with a time, in one month.' },
    { id:'docs',    label:'Docs',     href:'/nd/os/docs/',     icon:'docs',    live:true,  blurb:'Write a real document. It saves itself.' },
    { id:'records', label:'Records',  href:'/nd/os/records/',  icon:'records', live:true,  blurb:'Folders, files, and what was decided.' },
    { id:'people',  label:'People',   href:'/nd/os/people/',   icon:'people',  live:true,  blurb:'Everyone who gave you their email.' },
    { id:'jobs',    label:'Jobs',     href:'/nd/os/jobs/',     icon:'jobs',    live:true,  blurb:'The board. Every job is priced like the house does.' },
    { id:'books',   label:'Books',    href:'/nd/os/books/',    icon:'books',   live:true,  blurb:'Your estimates and what you spent.' },
    { id:'files',   label:'Files',    href:'/nd/os/files/',    icon:'files',   live:true,  blurb:'Photos, video, PDFs. Upload once, link anywhere.' },
    // Her quality department (Anthony, Sep 18 2026): two schools that differ greatly, a Pacemaker, and a Head she talks to.
    { id:'quality', label:'Quality',  href:'/nd/os/quality/',  icon:'quality', live:true,  blurb:'Two schools read it. The Head tells you what to do.' },
    // Her one door into AE OS (Anthony, Sep 18 2026): the time clock, and nothing past it.
    // live flips to true the day /timeclock.html lands on the hub.
    { id:'clock',   label:'Clock',    href:'https://aexperiences.studio/timeclock.html', icon:'clock', live:false, blurb:'Clock in and out on the AE OS time clock.' }
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

  /* ---- one sign-in: AE OS ----------------------------------------------
     Anthony, Sep 18 2026: "if you are signed into one, you are the other... it's
     like a mini hub within my hub... a private office for Jessica." So ND OS has no
     password of its own. Signed into AE OS in this browser, a room bounces once to
     aexperiences.studio/os-pass.html, comes back with a one-time pass, and trades it
     at /api/nd-auth for a session that lives in the shared AE OS store. On the phone
     app, which may not see the AE OS sign-in, the same card takes her AE OS email and
     password, and AE OS checks them. A second brand is a copy of this folder with
     BRAND changed and one line in os-pass.mjs on the hub. */
  var HUB = 'https://aexperiences.studio', BRAND = 'nd', WHO_LS = 'nd:os:who', TRIED = 'nd:sso:tried';
  var WHO = ''; try { WHO = localStorage.getItem(WHO_LS) || ''; } catch (e) {}
  auth.who = function () { return WHO; };
  function installed() {
    try { return !!(navigator.standalone || (global.matchMedia && matchMedia('(display-mode: standalone)').matches)); }
    catch (e) { return false; }
  }
  function passUrl() {
    return HUB + '/os-pass.html?brand=' + BRAND + '&back=' +
      encodeURIComponent(location.origin + location.pathname + location.search);
  }
  function gated() { return !!(document.getElementById('gate') || document.getElementById('lockbar')); }
  function signedIn(j) {
    KEY = j.token; WHO = (j.who && j.who.name) || '';
    try { localStorage.setItem(LS, KEY); localStorage.setItem(WHO_LS, WHO); sessionStorage.removeItem(TRIED); } catch (e) {}
    location.replace(location.pathname + location.search);   // every room re-reads the key on load
  }
  function trade(payload, sayEl) {
    if (sayEl) sayEl.textContent = 'Checking with AE OS…';
    return fetch('/api/nd-auth', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().catch(function(){ return { ok:false }; }); })
      .catch(function () { return { ok:false, error:'OFFLINE' }; })
      .then(function (j) {
        if (j && j.ok && j.token) return signedIn(j);
        var t = j && j.error === 'AEOS_NO' ? 'That is not your AE OS email and password.'
              : j && j.error === 'NOT_YOURS' ? 'That AE OS seat does not open ND OS.'
              : j && j.error === 'SLOW_DOWN' ? 'Too many tries. Wait fifteen minutes.'
              : j && j.error === 'PASS_USED' ? 'That sign-in expired. Tap Sign in with AE OS again.'
              : j && j.error === 'OFFLINE' ? MSG.OFFLINE : 'AE OS did not answer. Try again in a moment.';
        if (sayEl) sayEl.textContent = t; else say(t, true);
      });
  }
  auth.out = function () {
    var t = KEY;
    fetch('/api/nd-auth', { method:'POST', headers:{'content-type':'application/json','x-nd-key':t}, body:'{"out":true}' })
      .catch(function(){}).then(function () {
        WHO = ''; try { localStorage.removeItem(WHO_LS); sessionStorage.setItem(TRIED,'1'); } catch (e) {}
        auth.clear('Signed out.'); location.reload();
      });
  };

  /* coming back from AE OS with a pass */
  var PASS = /[#&]aeos=([A-Za-z0-9_-]{20,80})/.exec(location.hash || '');
  if (PASS) {
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    trade({ pass: PASS[1] });
  } else if (!KEY && gated() && !installed()) {
    /* nobody here yet: ask AE OS once per tab. Signed in there, she is back in a blink. */
    var tried = '1'; try { tried = sessionStorage.getItem(TRIED); sessionStorage.setItem(TRIED, '1'); } catch (e) {}
    if (!tried) location.replace(passUrl());
  }

  /* every room's lock card becomes the AE OS sign-in, in one place */
  function dressGate() {
    var key = document.getElementById('key'); if (!key) return;
    var card = key.closest('.gate, .lockbar'); if (!card) return;
    var row = key.parentNode, btn = document.getElementById('unlock');
    row.hidden = true; row.style.display = 'none';
    if (btn) { btn.hidden = true; btn.style.display = 'none'; }
    var note = card.querySelector('p.muted'); 
    if (note) note.textContent = 'Same sign-in as AE OS. Signed in there, you are signed in here.';
    else card.firstChild && (card.firstChild.nodeType === 3) && (card.firstChild.textContent = 'Sign in with AE OS to schedule. ');
    var sayEl = card.querySelector('#gateSay') || (function(){ var p=document.createElement('p'); p.className='say';
      p.style.cssText='min-height:20px;font-size:13.5px;font-weight:600;color:var(--nd-terra-d)'; card.appendChild(p); return p; })();
    var box = document.createElement('div'); box.className = 'aeos-in';
    box.innerHTML =
        '<a class="btn solid" id="aeosGo" style="width:100%;display:flex;justify-content:center;margin:16px 0 14px" href="' + passUrl() + '">Sign in with AE OS</a>'
      + '<form id="aeosForm" autocomplete="on" style="margin:0">'
      +   '<div style="font-size:12.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;opacity:.7;margin:4px 0 8px">Or your AE OS email and password</div>'
      +   '<label for="aeosEmail">Email</label><input id="aeosEmail" name="email" type="email" autocomplete="username" inputmode="email" autocapitalize="off" spellcheck="false">'
      +   '<label for="aeosPw" style="margin-top:10px;display:block">Password</label><input id="aeosPw" name="password" type="password" autocomplete="current-password" enterkeyhint="go">'
      +   '<button class="btn" type="submit" style="width:100%;margin-top:12px">Sign in</button>'
      + '</form>';
    card.insertBefore(box, sayEl);
    box.querySelector('#aeosForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var em = box.querySelector('#aeosEmail').value.trim(), pw = box.querySelector('#aeosPw').value;
      if (!em || !pw) { sayEl.textContent = 'Both boxes, please.'; return; }
      trade({ email: em, password: pw }, sayEl).then(function(){ box.querySelector('#aeosPw').value=''; });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', dressGate); else dressGate();

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
    // the dock would otherwise sit on the sheet's own last row
    if (dock) dock.classList.toggle('hide', open);
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
    var rs = '<span class="grip"></span><div class="sheethead"><h3>ND OS</h3>'
           + '<button class="lamp" id="ndLamp" type="button" aria-label="Light or dark"></button></div>'
           + '<div class="rooms">';
    for (var k = 0; k < ROOMS.length; k++) {
      var q = ROOMS[k];
      rs += '<a href="' + q.href + '" class="' + (q.live ? '' : 'soon') + '"'
          + (q.id === activeId ? ' aria-current="page"' : '') + '>'
          + '<img class="art" src="' + art(q.id) + '" alt="" loading="lazy">'
          + '<span>' + q.label + '</span></a>';
    }
    rs += '</div>' + (KEY ? '<button class="out" id="ndOut" type="button" style="background:none;border:0;font:inherit;cursor:pointer">'
        + (WHO ? 'Signed in as ' + WHO.replace(/[<>&"]/g,'') + ' &middot; ' : '') + 'Sign out</button>' : '')
        + '<a class="out" href="/nd/">Back to the site</a>';
    sheet.innerHTML = rs;
    document.body.appendChild(scrim); document.body.appendChild(sheet);

    dock.querySelector('#ndMore').addEventListener('click', function () { openSheet(!sheet.classList.contains('up')); });
    var outBtn = sheet.querySelector('#ndOut'); if (outBtn) outBtn.addEventListener('click', function () { auth.out(); });
    theme();  // paints the lamp now that it is in the page
    sheet.querySelector('#ndLamp').addEventListener('click', function (e) { e.stopPropagation(); flipTheme(); });
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

    /* The dock used to hide itself on scroll. It is gone: on a phone, a
       navigation that disappears is a navigation you cannot find, and the
       page already leaves room for it. It stays put. */

    /* the Owner's Manual rides along into every room (Anthony, Sep 19 2026: "her system should have a
       manual written into it"). One file, /nd/os/nd-manual.js; it injects its own ? button. */
    if (!document.getElementById('ndManualJs')) { var mj = document.createElement('script'); mj.id = 'ndManualJs'; mj.src = '/nd/os/nd-manual.js'; mj.defer = true; document.head.appendChild(mj); }

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

  /* ---- light or dark -----------------------------------------------------
     The front of house is light on purpose - classroom pastels, and that is not
     up for debate. The back end is where she works at night with a kid asleep
     in the next room, so it opens dark and remembers whichever she picks. */
  var THEME_KEY = 'nd:os:theme';
  function theme(next) {
    if (next) { try { localStorage.setItem(THEME_KEY, next); } catch (e) {} }
    var now = next || (function () {
      try { return localStorage.getItem(THEME_KEY) || 'dark'; } catch (e) { return 'dark'; }
    })();
    document.documentElement.setAttribute('data-os-theme', now);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', now === 'dark' ? '#1E1A17' : '#F3EEE5');
    var lamp = document.getElementById('ndLamp');
    if (lamp) {
      lamp.innerHTML = icon(now === 'dark' ? 'sun' : 'moon');
      lamp.title = now === 'dark' ? 'Switch to light' : 'Switch to dark';
    }
    bus.emit('theme', { theme: now });
    return now;
  }
  function flipTheme() {
    return theme(document.documentElement.getAttribute('data-os-theme') === 'dark' ? 'light' : 'dark');
  }
  theme();

  global.NDOS = { bus:bus, rooms:ROOMS, room:room, icon:icon, art:art, auth:auth, net:net, why:why,
                  say:say, mount:mount, prime:setPrime, sheet:function(b){openSheet(b);},
                  theme:theme, flipTheme:flipTheme };
})(window);
