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
      acc:'#c8794f', url:'https://ae-realestate-hub.vercel.app', pricing:'/hubs/real-estate.html',
      blurb:'Run a real-estate practice from one place — listings, clients, calendar, and the paperwork that follows a deal.',
      price:'$450/mo', priceNote:'3 tiers · annual $4,500/yr (2 months free)',
      svg:'<path d="M7 22 24 8l17 14"/><path d="M11 20v19h26V20"/><circle cx="24" cy="29" r="3.2"/><path d="M24 32.2V37"/>' },

    { id:'draftline', name:'Draftline Hub', tag:'Architecture', genre:'business', state:'live',
      acc:'#5c8a5f', url:'https://ae-architecture-hub.vercel.app', pricing:'/hubs/architecture.html',
      blurb:'Projects, drawing sets, consultants and clients in one studio hub — built around how a practice actually runs.',
      price:'$550/mo', priceNote:'3 tiers · annual $5,500/yr (2 months free)',
      svg:'<path d="M24 7 11 41M24 7l13 34"/><circle cx="24" cy="7" r="2.6"/><path d="M24 7v11"/><path d="M16 30h16"/>' },

    { id:'datum', name:'Datum Hub', tag:'Engineering', genre:'business', state:'live',
      acc:'#18b0ba', url:'https://ae-engineering-hub.vercel.app', pricing:'/hubs/engineering.html',
      blurb:'Job tracking, submittals, field notes and billing for an engineering firm — one system instead of six.',
      price:'$650/mo', priceNote:'3 tiers · annual $6,500/yr (2 months free)',
      svg:'<path d="M6 40 24 9l18 31zM6 40h36"/><path d="M24 9 16 40M24 9l8 31M13 30h22"/>' },

    { id:'marquee', name:'Marquee Hub', tag:'Live theater', genre:'business', state:'live',
      acc:'#e0b24a', url:'https://ae-theater-hub.vercel.app', pricing:'/hubs/theater.html',
      blurb:'Box office, seasons, casts, crews and volunteers — the whole theater, running on one spine.',
      price:'$650/mo', priceNote:'3 tiers · annual $6,500/yr (2 months free)',
      svg:'<path d="M9 17h30l-3 22H12z"/><path d="M9 17 24 7l15 10"/><circle cx="19" cy="27" r="2"/><circle cx="29" cy="27" r="2"/>' },

    { id:'reel', name:'Reel Hub', tag:'Film & production', genre:'business', state:'live',
      acc:'#8a6fd6', url:'https://ae-cinema-hub.vercel.app', pricing:'/hubs/cinema.html',
      blurb:'Productions, crew, call sheets, gear and post — from greenlight to delivery.',
      price:'$500/mo', priceNote:'3 tiers · annual $5,000/yr (2 months free)',
      svg:'<rect x="7" y="14" width="24" height="20" rx="3"/><path d="M31 22l10-6v16l-10-6z"/>' },

    { id:'encore', name:'Encore Hub', tag:'Concerts & venues', genre:'business', state:'live',
      acc:'#d65f8a', url:'https://ae-concert-hub.vercel.app', pricing:'/hubs/concerts.html',
      blurb:'Shows, ticketing, artists, riders and settlement — the venue back office in one place.',
      price:'$600/mo', priceNote:'3 tiers · annual $6,000/yr (2 months free)',
      svg:'<path d="M18 34V12l18-4v22"/><circle cx="14" cy="34" r="4.5"/><circle cx="32" cy="30" r="4.5"/>' },

    { id:'cartwheel', name:'Cartwheel Hub', tag:'Kids gyms & programs', genre:'business', state:'live',
      acc:'#4aa3d6', url:'https://ae-gym-hub.vercel.app', pricing:'/hubs/kids-gym.html',
      blurb:'Classes, enrollment, waivers, parents and payments — for gyms, camps and kids programs.',
      price:'$400/mo', priceNote:'3 tiers · annual $4,000/yr (2 months free)',
      svg:'<circle cx="24" cy="24" r="15"/><path d="M24 9v30M9 24h30"/><path d="M13 13l22 22M35 13L13 35"/>' },

    /* ─────────── ESPO FAMILY — live today ─────────── */
    { id:'espo-music', name:'ESPO Music', tag:'Instrument coaching', genre:'arts', state:'live',
      acc:'#e0a83a', url:'https://espomusic.com/', img:'/logo-music.png',
      blurb:'Five instruments — guitar, piano, harp, ukulele, bass — each with a real coach that listens and responds.',
      price:'$3.33/mo per app', priceNote:'All five instruments $39.99/yr — best value' },

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

    /* ─────────── IN DEVELOPMENT — no price, no buy path, notify-me only ─────────── */
    { id:'espovocab', name:'ESPOvocab', tag:'Words worth keeping', genre:'learning', state:'dev',
      acc:'#1E2A24', mark:M+'espovocab.svg', family:'ESPOgraduate',
      blurb:'A word a day that actually sticks — with a place to write what you did with it.' },

    { id:'espotendency', name:'ESPOtendency', tag:'Mood & habits', genre:'mind', state:'dev',
      acc:'#232946', mark:M+'espotendency.svg', family:'ESPOmindpeace',
      blurb:'Track how you are actually doing, and get moving on the days that start badly.' },

    { id:'esponest', name:'ESPOnest', tag:'Baby tracker', genre:'family', state:'dev',
      acc:'#2E1F3A', mark:M+'esponest.svg', family:'ESPOfam',
      blurb:'Sleep, feeds and growth — and a nap predictor that learns your actual baby.' },

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

  root.AEShop = { CATALOG: CATALOG, GENRES: GENRES, byId: byId, live: live, dev: dev, activeGenres: activeGenres };
})(window);
