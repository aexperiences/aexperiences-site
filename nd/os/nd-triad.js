/* ============================================================================
   ND OS  ·  THE AE TRIAD, on the bus  ·  Accelerated Experiences LLC · Sep 2026
   ----------------------------------------------------------------------------
   The same backbone every AE product runs on, wired into her OS.

     Two sealed opposing lenses argue. They never confer — opposing reads are
     the point. A Pacemaker gates their argument on an EARNED confidence bar and
     either releases one clean answer, or says "not yet" and shows what it is
     still waiting on. It never fabricates a result and never bluffs a number.

   Every department is a pure function of facts you hand it. No network, no
   model, no guessing — which is exactly why it can be trusted to say no.

     NDTRIAD.ask('publish', {title,dek,body})   -> ruling
     NDTRIAD.ask('desk',    {people,days,perDay,money})
     NDTRIAD.ask('reach',   {when, platform})

   A ruling: { dept, released, verdict, because[], lenses:[{name,side,says[]}],
               confidence, bar, waiting[] }
   It also lands on the bus as triad:finding then triad:released|triad:held, so
   any room can listen without asking anybody for it.
   ========================================================================== */
(function (global) {
  'use strict';
  var bus = (global.NDOS && global.NDOS.bus) || { emit: function () {} };

  function pct(n) { return Math.max(0, Math.min(100, Math.round(n))); }

  /* ---- PUBLISH — Voice argues for it, Ready argues it is not done --------- */
  function publish(f) {
    var title = String(f.title || '').trim();
    var dek = String(f.dek || '').trim();
    var body = String(f.body || '').trim();
    var words = body ? body.split(/\s+/).length : 0;
    var paras = body.split(/\n\s*\n/).filter(function (p) { return p.trim(); }).length;
    var sents = body.split(/[.!?]+\s/).filter(function (s) { return s.trim().length > 3; });
    var lens = [], guard = [], block = [], wait = [];

    /* Voice — the upside lens. It only ever argues FOR. */
    if (/\b(I|I'm|I've|we|we're|my|our)\b/.test(body)) lens.push('It is written in your own voice.');
    if (/\?/.test(body)) lens.push('You ask the reader something — that pulls people in.');
    if (/'/.test(body) || /\b(don't|it's|that's|we're|can't)\b/i.test(body))
      lens.push('It sounds spoken, not stiff.');
    if (words >= 250) lens.push('There is enough here to be worth somebody’s time (' + words + ' words).');
    if (sents.length > 4) {
      var lens5 = sents.map(function (s) { return s.split(/\s+/).length; });
      var mn = Math.min.apply(null, lens5), mx = Math.max.apply(null, lens5);
      if (mx - mn > 12) lens.push('Your sentences change length — that is what makes writing readable.');
    }
    if (/^#{2,3}\s/m.test(body) || /^[-*]\s/m.test(body))
      lens.push('It is broken up, so a tired parent can scan it.');
    if (!lens.length) lens.push('There is something here. It just has not found its voice yet.');

    /* Ready — the guard lens. It only ever argues it is NOT finished. */
    if (!title) { block.push('It needs a title.'); }
    else if (title.length < 8) guard.push('The title is very short — will it mean anything on a list?');
    if (!dek) guard.push('No line under the title. That line is what makes someone open it.');
    if (words < 60) { block.push('There are only ' + words + ' words. That is a note to yourself, not a post.'); }
    else if (words < 150) guard.push('It is short (' + words + ' words). Short is fine if it is finished.');
    if (paras < 2 && words > 120) guard.push('It is one solid block. A blank line between thoughts would help.');
    if (/\b(TODO|TK|XXX|\[\.\.\.\]|lorem)\b/i.test(body)) block.push('There is a placeholder still in the text.');
    if (/\[[^\]]*\]\((?!https?:|\/|mailto:)[^)]*\)/.test(body)) guard.push('A link looks unfinished.');
    if (body && !/[.!?"'’”)]\s*$/.test(body)) guard.push('It stops mid-thought at the end.');

    /* Pacemaker — the bar: nothing blocking, and enough of Voice earned. */
    var conf = pct(38 + lens.length * 12 - guard.length * 9 - block.length * 40);
    var bar = 55;
    var released = block.length === 0 && conf >= bar;
    if (block.length) wait = block.slice();
    else if (!released) wait = guard.slice();

    return {
      dept: 'publish', released: released, confidence: conf, bar: bar,
      verdict: released
        ? (guard.length ? 'Ready. Two small things you could fix first.' : 'Ready. Hit publish.')
        : (block.length ? 'Not yet — ' + block[0].toLowerCase().replace(/\.$/, '') + '.'
                        : 'Close. It has not cleared the bar yet.'),
      because: released ? lens.slice(0, 3) : wait.slice(0, 3),
      waiting: wait,
      lenses: [
        { name: 'Voice', side: 'for', says: lens },
        { name: 'Ready', side: 'against', says: block.concat(guard) }
      ]
    };
  }

  /* ---- DESK — Signal reads the numbers, Noise says the sample is too thin -- */
  function desk(f) {
    var people = Number(f.people || 0);
    var hits = Number(f.hits || 0);
    var per = f.perDay || [];
    var money = f.money || {};
    var live = per.filter(function (d) { return d.hits > 0; }).length;
    var sig = [], noise = [], wait = [];

    var half = Math.floor(per.length / 2) || 1;
    var early = per.slice(0, half).reduce(function (a, d) { return a + d.hits; }, 0);
    var late = per.slice(half).reduce(function (a, d) { return a + d.hits; }, 0);

    if (hits) sig.push(hits + ' page view' + (hits === 1 ? '' : 's') + ' from ' + people + ' ' + (people === 1 ? 'person' : 'people') + '.');
    if (f.topPage) sig.push('Most-read page: ' + f.topPage + '.');
    if (f.topFrom && f.topFrom !== 'direct') sig.push('Most of them arrived from ' + f.topFrom + '.');
    else if (hits) sig.push('They are typing the address in, not clicking a link.');
    if (late > early * 1.35 && early > 0) sig.push('The second half of the window beat the first.');
    if (money && money.ready && money.live) sig.push(money.live + ' paid subscription' + (money.live === 1 ? '' : 's') + ' carrying the ND label.');

    /* Noise — the guard. The bar exists so nobody draws a line through four dots. */
    var BAR_PEOPLE = 25, BAR_DAYS = 5;
    if (people < BAR_PEOPLE) { noise.push('Only ' + people + ' people so far. A trend needs about ' + BAR_PEOPLE + '.'); wait.push('' + (BAR_PEOPLE - people) + ' more people'); }
    if (live < BAR_DAYS) { noise.push('Only ' + live + ' day' + (live === 1 ? '' : 's') + ' has any traffic at all.'); wait.push((BAR_DAYS - live) + ' more days with visitors'); }
    if (!hits) noise.push('Nothing has been recorded in this window yet.');
    if (money && !money.ready) noise.push('Payments are not reporting here yet, so the money line is blank on purpose.');

    var conf = pct((people / BAR_PEOPLE) * 55 + (live / BAR_DAYS) * 35 + (hits ? 10 : 0));
    var released = people >= BAR_PEOPLE && live >= BAR_DAYS;

    return {
      dept: 'desk', released: released, confidence: conf, bar: 100,
      verdict: released
        ? 'There is enough here to read.'
        : (hits ? 'Too early to mean anything — and that is fine.' : 'Nothing to read yet. The counter is running.'),
      because: released ? sig.slice(0, 3) : noise.slice(0, 2),
      waiting: wait,
      lenses: [
        { name: 'Signal', side: 'for', says: sig },
        { name: 'Noise', side: 'against', says: noise }
      ]
    };
  }

  /* ---- REACH — Timing wants it out now, Fit asks whether this is the place -- */
  /* The windows below are the general published findings on social timing, not
     numbers measured on her accounts. They are labelled that way everywhere they
     appear, and the Pacemaker will not pretend otherwise. Once the Desk clears
     its own bar, her real numbers replace them. */
  var WINDOWS = {
    instagram: { days: [1,2,3,4], hours: [[11,13],[19,21]], note: 'Reels do best late morning and again after bedtime.' },
    tiktok:    { days: [2,3,4,5], hours: [[6,9],[19,23]],   note: 'Early morning and late evening carry the most watch time.' },
    facebook:  { days: [1,2,3,4], hours: [[9,12],[19,21]],  note: 'Groups move in the morning; parents scroll again at night.' },
    youtube:   { days: [4,5,6],   hours: [[14,16],[18,21]], note: 'Afternoon uploads catch the evening session.' },
    pinterest: { days: [5,6,0],   hours: [[20,23]],         note: 'Weekend nights are when planning happens.' }
  };
  var DAYNAME = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  function reach(f) {
    var when = f.when ? new Date(f.when) : new Date();
    var plat = String(f.platform || 'instagram').toLowerCase();
    var w = WINDOWS[plat] || WINDOWS.instagram;
    var d = when.getDay(), h = when.getHours();
    var inHour = w.hours.some(function (r) { return h >= r[0] && h < r[1]; });
    var goodDay = w.days.indexOf(d) > -1;
    var timing = [], fit = [], wait = [];

    if (inHour) timing.push('You are inside a window for ' + plat + ' right now.');
    if (goodDay) timing.push(DAYNAME[d] + ' is one of the stronger days there.');
    timing.push(w.note);

    if (!inHour) {
      var next = w.hours[0];
      for (var i = 0; i < w.hours.length; i++) if (w.hours[i][0] > h) { next = w.hours[i]; break; }
      var t = next[0] > h ? 'today at ' + next[0] + ':00' : 'tomorrow at ' + next[0] + ':00';
      fit.push('Outside the window. The next one is ' + t + '.');
      wait.push(t);
    }
    if (!goodDay) fit.push(DAYNAME[d] + ' is not one of its stronger days.');
    fit.push('These are general published findings, not your numbers. Yours take over once the Desk has enough.');

    var conf = pct((inHour ? 55 : 15) + (goodDay ? 30 : 5) + 10);
    var released = inHour && goodDay;

    return {
      dept: 'reach', released: released, confidence: conf, bar: 85,
      verdict: released ? 'Good moment to post.' : (inHour ? 'Fine, not the best day.' : 'Hold it — ' + (wait[0] || 'wait for the window') + '.'),
      because: (released ? timing : fit).slice(0, 3),
      waiting: wait,
      lenses: [
        { name: 'Timing', side: 'for', says: timing },
        { name: 'Fit', side: 'against', says: fit }
      ]
    };
  }

  var DEPTS = { publish: publish, desk: desk, reach: reach };

  function ask(dept, facts) {
    var fn = DEPTS[dept];
    if (!fn) return { dept: dept, released: false, verdict: 'No such department.', because: [], lenses: [], confidence: 0, waiting: [] };
    var ruling = fn(facts || {});
    bus.emit('triad:finding', ruling, true);
    bus.emit(ruling.released ? 'triad:released' : 'triad:held', ruling, true);
    return ruling;
  }

  global.NDTRIAD = { ask: ask, windows: WINDOWS, depts: Object.keys(DEPTS) };
})(window);
