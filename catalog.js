/* catalog.js — the ONE product catalog for the AE App Shop.
   Both the store grid (products.html) and the product sheet (app.html) read this file.
   Adding a product later = one entry here. Nothing else to touch.

   HONESTY RULES baked into the shape of the data (Accelerated Experiences, LLC):
   - `state:'live'`  — a stranger can open it and use it today. It gets a real link.
   - `state:'dev'`   — being built. NO price, NO buy path, notify-me only. Never dressed as buyable.
   - A price only ever appears on a `live` product. If we don't have a real number, we say so.
   - Never add an entry for something that does not exist.
*/
(function (root) {
  var M = '/marks/';   // the real app marks (1024 icons, SVG)

  var CATALOG = [

    /* ─────────── BUSINESS HUBS — live, sold as a subscription ─────────── */
    { id:'homestead', name:'Homestead Hub', tag:'Real estate', genre:'business', state:'live',
      acc:'#c8794f', url:'/showroom.html?trade=realestate', pricing:'/hubs/real-estate.html',
      blurb:'Run a real-estate practice from one place — listings, clients, calendar, and the paperwork that follows a deal.',
      price:'$450/mo', priceNote:'3 tiers · annual $4,500/yr (2 months free)',
      svg:'<path d="M7 22 24 8l17 14"/><path d="M11 20v19h26V20"/><circle cx="24" cy="29" r="3.2"/><path d="M24 32.2V37"/>' },

    { id:'draftline', name:'Draftline Hub', tag:'Architecture', genre:'business', state:'live',
      acc:'#5c8a5f', url:'/showroom.html?trade=architecture', pricing:'/hubs/architecture.html',
      blurb:'Projects, drawing sets, consultants and clients in one studio hub — built around how a practice actually runs.',
      price:'$550/mo', priceNote:'3 tiers · annual $5,500/yr (2 months free)',
      svg:'<path d="M24 7 11 41M24 7l13 34"/><circle cx="24" cy="7" r="2.6"/><path d="M24 7v11"/><path d="M16 30h16"/>' },

    { id:'datum', name:'Datum Hub', tag:'Engineering', genre:'business', state:'live',
      acc:'#18b0ba', url:'/showroom.html?trade=engineering', pricing:'/hubs/engineering.html',
      blurb:'Job tracking, submittals, field notes and billing for an engineering firm — one system instead of six.',
      price:'$650/mo', priceNote:'3 tiers · annual $6,500/yr (2 months free)',
      svg:'<path d="M6 40 24 9l18 31zM6 40h36"/><path d="M24 9 16 40M24 9l8 31M13 30h22"/>' },

    { id:'marquee', name:'Marquee Hub', tag:'Live theater', genre:'business', state:'live',
      acc:'#e0b24a', url:'/showroom.html?trade=theater', pricing:'/hubs/theater.html',
      blurb:'Box office, seasons, casts, crews and volunteers — the whole theater, running on one spine.',
      price:'$650/mo', priceNote:'3 tiers · annual $6,500/yr (2 months free)',
      svg:'<path d="M9 17h30l-3 22H12z"/><path d="M9 17 24 7l15 10"/><circle cx="19" cy="27" r="2"/><circle cx="29" cy="27" r="2"/>' },

    { id:'reel', name:'Reel Hub', tag:'Film & production', genre:'business', state:'live',
      acc:'#8a6fd6', url:'/showroom.html?trade=cinema', pricing:'/hubs/cinema.html',
      blurb:'Productions, crew, call sheets, gear and post — from greenlight to delivery.',
      price:'$500/mo', priceNote:'3 tiers · annual $5,000/yr (2 months free)',
      svg:'<rect x="7" y="14" width="24" height="20" rx="3"/><path d="M31 22l10-6v16l-10-6z"/>' },

    { id:'encore', name:'Encore Hub', tag:'Concerts & venues', genre:'business', state:'live',
      acc:'#d65f8a', url:'/showroom.html?trade=concerts', pricing:'/hubs/concerts.html',
      blurb:'Shows, ticketing, artists, riders and settlement — the venue back office in one place.',
      price:'$600/mo', priceNote:'3 tiers · annual $6,000/yr (2 months free)',
      svg:'<path d="M18 34V12l18-4v22"/><circle cx="14" cy="34" r="4.5"/><circle cx="32" cy="30" r="4.5"/>' },

    { id:'cartwheel', name:'Cartwheel Hub', tag:'Kids gyms & programs', genre:'business', state:'live',
      acc:'#4aa3d6', url:'/showroom.html?trade=kidsgym', pricing:'/hubs/kids-gym.html',
      blurb:'Classes, enrollment, waivers, parents and payments — for gyms, camps and kids programs.',
      price:'$400/mo', priceNote:'3 tiers · annual $4,000/yr (2 months free)',
      svg:'<circle cx="24" cy="24" r="15"/><path d="M24 9v30M9 24h30"/><path d="M13 13l22 22M35 13L13 35"/>' },

    /* ─────────── ESPO FAMILY — live today ─────────── */
    { id:'espo-music', name:'ESPO Music', tag:'Instrument coaching', genre:'arts', state:'live',
      acc:'#e0a83a', url:'https://espomusic.com/fret', img:'/logo-music.png',
      /* The store sheet IS the product page — url goes INTO the app (never the marketing
         landing). openMap lets the sheet's instrument picker retarget the Open button. */
      openMap:{ fret:'https://espomusic.com/fret', grand:'https://espomusic.com/grand',
                harp:'https://espomusic.com/harp', uke:'https://espomusic.com/uke',
                bass:'https://espomusic.com/bass' },
      shots:['/shots/music-fret.png','/shots/music-grand.png','/shots/music-harp.png','/shots/music-uke.png','/shots/music-bass.png'],
      blurb:'Five instruments — guitar, piano, harmonica, ukulele, bass — each with a real coach that listens and responds.',
      price:'From $5.99/mo',
      priceNote:'One instrument $5.99/mo · All-Access (all 5) $14.99/mo, or $39.99/yr — about $3.33/mo, billed once a year · 3-day free trial on every plan',
      checkout:'https://espomusic.com/api/checkout',
      plans:[
        { label:'Single instrument', sub:'Just the one you want', price:'$5.99/mo', plan:'monthly' },
        { label:'All-Access · monthly', sub:'All 5 instruments', price:'$14.99/mo', plan:'suite_monthly' },
        { label:'All-Access · yearly', sub:'All 5 · about $3.33/mo, billed once a year', price:'$39.99/yr', plan:'yearly', tag:'Best value' }
      ] },

    { id:'espo-learning', name:'ESPO Learning', tag:'Kids · early skills', genre:'learning', state:'live',
      acc:'#5c8a5f', url:'https://espolearning.com/', img:'/logo-learning.png',
      blurb:'Handwriting, reading, math and writing for young kids. No fail states, no red marks, nothing collected.',
      price:'Free to try', priceNote:'Paid plans not switched on yet' },

    { id:'espo-genius', name:'ESPO Genius', tag:'Plain-English paperwork', genre:'money', state:'live',
      acc:'#7a6fd6', url:'https://espogenius.com/', img:'/logo-genius.png',
      blurb:'The forms and fine print nobody explains — IEPs, benefits, care paperwork — translated into plain English.',
      price:'Free right now', priceNote:'Paid plans not switched on yet' },

    { id:'espo-drama', name:'ESPO Drama', tag:'Theater & dramatic arts', genre:'arts', state:'live',
      acc:'#c8794f', url:'https://espodrama.com/', img:'/logo-drama.png',
      blurb:'Scene study, monologue work and a stage full of games — for drama students and the teachers who run the room.',
      price:'Free right now', priceNote:'Paid plans not switched on yet' },

    { id:'esposocial', name:'ESPOsocial', tag:'Private groups & video', genre:'social', state:'live',
      acc:'#5a5fd6', url:'https://esposocial.com/', img:'/logo-social.png',
      blurb:'A quiet place for a real group — private chat, live video, and Tag for the conversations that do not fit a live call.',
      price:'Free right now', priceNote:'Paid plans not switched on yet' },

    { id:'the-narcs', name:'The Narcs', tag:'Fine print, decoded', genre:'money', state:'live',
      acc:'#2f8f7a', url:'https://marketnarc.com/', img:'/logo-narcs.png',
      blurb:'Two tools in one app: The Narc reads the fine print you were handed, MarketNarc watches the tickers you own.',
      price:'Free right now', priceNote:'Paid plans not switched on yet' },

    { id:'neuro-divulge', name:'Neuro Divulge', tag:'Regulation tools', genre:'mind', state:'live',
      acc:'#a85f38', url:'https://neurodivulge.com/', img:'/logo-nd.png',
      blurb:'Practical regulation tools for ADHD and autistic brains — built by someone who needs them.',
      price:'$9 per tool', priceNote:'One-time · free starter checklist included' },

    /* ─────────── ESPO REMAKES — live, in-shop apps (/apps/<name>/) ─────────── */
    { id:'espovocab', name:'ESPOvocab', tag:'Words worth keeping', genre:'learning', state:'live',
      acc:'#1E2A24', mark:M+'espovocab.svg', family:'ESPOgraduate', url:'/apps/espovocab/',
      blurb:'A word a day that actually sticks — etymology, a journal, your own word list. No ads, works offline, export free.',
      price:'Free right now', priceNote:'Plus coming: $1.99/mo · $14.99/yr — not switched on yet' },

    { id:'espotendency', name:'ESPOtendency', tag:'Mood & habits', genre:'mind', state:'live',
      acc:'#232946', mark:M+'espotendency.svg', family:'ESPOmindpeace', url:'/apps/espotendency/',
      blurb:'A 10-second daily check-in and one tiny win at a time. Everything stays on your device — no account, no cloud.',
      price:'Free right now', priceNote:'Plus coming: $1.99/mo · $19.99/yr — core stays free forever' },

    { id:'esponest', name:'ESPOnest', tag:'Baby tracker', genre:'family', state:'live',
      acc:'#2E1F3A', mark:M+'esponest.svg', family:'ESPOfam', url:'/apps/esponest/',
      blurb:'Sleep, feeds and diapers in one tap at 3am — nap-window estimate, growth log, free export, zero trackers.',
      price:'Free right now', priceNote:'Plus coming: $2.99/mo · $24.99/yr — logging + export free forever' },

    /* ─────────── IN DEVELOPMENT — no price, no buy path, notify-me only ─────────── */

    { id:'esporegulator', name:'ESPOregulator', tag:'Emotional skills', genre:'mind', state:'dev',
      acc:'#2B2350', mark:M+'esporegulator.svg', family:'ESPOmindpeace',
      blurb:'Short, practical training for anger, stress and anxiety — skills, not affirmations.' },

    { id:'espotrek', name:'ESPOtrek', tag:'Trip planner', genre:'travel', state:'dev',
      acc:'#12303E', mark:M+'espotrek.svg', family:'ESPOtravel',
      blurb:'Plan the trip, split the budget, map the drive — without six tabs and a group chat.' },

    { id:'esponatlparks', name:'ESPOnatlparks', tag:'National parks guide', genre:'travel', state:'dev',
      acc:'#173428', mark:M+'esponatlparks.svg', family:'ESPOtravel',
      blurb:'Every park, offline — trails, hours and a plan for the day you lose signal.' },

    { id:'esposign', name:'ESPOsign', tag:'Sign, fill, send', genre:'money', state:'dev',
      acc:'#2A1A4A', mark:M+'esposign.svg', family:'ESPO Genius',
      blurb:'Leases, school forms, waivers, contracts — signed and sent without a subscription to a giant.' },

    { id:'espovineyard', name:'ESPOvineyard', tag:'Wine journal', genre:'savor', state:'dev',
      acc:'#2E0D19', mark:M+'espovineyard.svg', family:'ESPOsavor', age:'21+',
      blurb:'Scan the label, remember the bottle, and keep a cellar that is actually yours.' },

    { id:'esporacket', name:'ESPOracket', tag:'Tennis & pickleball', genre:'sport', state:'dev',
      acc:'#101C2C', mark:M+'esporacket.svg', family:'ESPOcenter',
      blurb:'Film the match, tag the points, see what your game actually does.' }
  ];

  var GENRES = [
    { id:'all',      label:'All' },
    { id:'business', label:'Business hubs' },
    { id:'learning', label:'Learning' },
    { id:'mind',     label:'Mind & mood' },
    { id:'family',   label:'Family' },
    { id:'arts',     label:'Music & arts' },
    { id:'money',    label:'Money & fine print' },
    { id:'travel',   label:'Travel' },
    { id:'sport',    label:'Sport' },
    { id:'savor',    label:'Food & drink' },
    { id:'social',   label:'Social' }
  ];

  /* HARD GUARD — nobody gets into something that isn't finished.
     Anything not marked `live` has its link, price and pricing page stripped right here,
     at load, before any page can render it. So even if someone later pastes a URL onto a
     coming-soon entry by accident, the store physically cannot offer a way in.
     A product becomes enterable by one deliberate act: setting state:'live'. */
  for (var _i = 0; _i < CATALOG.length; _i++) {
    if (CATALOG[_i].state !== 'live') {
      delete CATALOG[_i].url;
      delete CATALOG[_i].price;
      delete CATALOG[_i].priceNote;
      delete CATALOG[_i].pricing;
      delete CATALOG[_i].plans;
      delete CATALOG[_i].checkout;
      delete CATALOG[_i].openMap;
      delete CATALOG[_i].shots;
    }
  }

  function byId(id) { for (var i = 0; i < CATALOG.length; i++) if (CATALOG[i].id === id) return CATALOG[i]; return null; }
  function live()  { return CATALOG.filter(function (a) { return a.state === 'live'; }); }
  function dev()   { return CATALOG.filter(function (a) { return a.state === 'dev'; }); }
  // Genres that actually have something in them — never render an empty aisle.
  function activeGenres() {
    return GENRES.filter(function (g) {
      return g.id === 'all' || CATALOG.some(function (a) { return a.genre === g.id; });
    });
  }

  /* TWO AISLES. This is the only distinction a visitor has to understand:
       business — software that runs a company. You and your team. Setup fee + monthly.
       personal — something one person uses. Small price or free.
     Everything else (genre, price, family) is a filter inside an aisle. */
  function aisleOf(a) { return a.genre === 'business' ? 'business' : 'personal'; }
  function inAisle(id) { return CATALOG.filter(function (a) { return aisleOf(a) === id; }); }

  var AISLES = [
    { id:'business', label:'For your business',
      line:'Complete operating systems for a working company — the whole team, one flat monthly.',
      cta:'Every one is a live instance. Walk in and use it before you talk to anyone.' },
    { id:'personal', label:'For you',
      line:'Apps for one person. Open them right now — most are free to try.',
      cta:'No account needed to look around.' }
  ];

  /* LIVE PRICING. The numbers above are a baked-in fallback, not a second source of truth.
     Anthony types a price in the hub; this pulls it in and overwrites the copy here.
     If the service is unreachable the store shows slightly stale prices rather than a blank
     page — a shop with no prices in front of a prospect is worse than a price a day old.
     Only ever touches `live` products: a coming-soon app has no price by design. */
  var PRICE_API = 'https://aexperiences.studio/api/pricing';
  function refreshPrices() {
    return fetch(PRICE_API).then(function (r) {
      if (!r.ok) throw new Error('pricing unavailable');
      return r.json();
    }).then(function (rec) {
      (rec.hubs || []).forEach(function (h) {
        var a = byId(h.id);
        if (!a || a.state !== 'live' || !h.tiers || !h.tiers.length) return;
        var t = h.tiers[0];
        a.price = '$' + Number(t.mo).toLocaleString('en-US') + '/mo';
        a.priceNote = h.tiers.length + ' tiers · from $' + Number(t.build).toLocaleString('en-US')
                    + ' one-time setup · first year $' + Number(t.firstYear).toLocaleString('en-US');
      });
      if (rec.appShop && rec.appShop.build) {
        root.AEShop.appShop = rec.appShop;
      }
      root.AEShop.priceSource = 'live';
      return true;
    }).catch(function () { root.AEShop.priceSource = 'fallback'; return false; });
  }

  root.AEShop = {
    CATALOG: CATALOG, GENRES: GENRES, AISLES: AISLES,
    byId: byId, live: live, dev: dev, activeGenres: activeGenres,
    aisleOf: aisleOf, inAisle: inAisle,
    refreshPrices: refreshPrices, priceSource: 'fallback',
    appShop: { build: 99, terms: 'Half up front, half on delivery', turnaround: '3 days' }
  };
})(window);
