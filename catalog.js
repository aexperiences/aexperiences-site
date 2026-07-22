/*   Both the store grid (products.html) and the product sheet (app.html) read this file.
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

    { id:'showroom', name:'Showroom Hub', tag:'Used-car dealers', genre:'business', state:'live',
      acc:'#1c5568', url:'https://ae-showroom-hub.vercel.app', pricing:'/hubs/showroom.html',
      blurb:'Inventory, sales desk, leads and recon for independent and boutique used-car dealers.',
      price:'$450/mo', priceNote:'3 tiers · annual $4,500/yr (2 months free)',
      svg:'<path d="M6 32V24l4-10a4 4 0 0 1 4-2.6h20A4 4 0 0 1 38 14l4 10v8"/><path d="M6 32h6M42 32h-6"/><circle cx="15" cy="32" r="4"/><circle cx="33" cy="32" r="4"/>' },

    { id:'driveline', name:'Driveline Hub', tag:'Franchise dealerships', genre:'business', state:'live',
      acc:'#24507e', url:'https://ae-bigauto-hub.vercel.app', pricing:'/hubs/driveline.html',
      blurb:'Sales, service and parts for a franchise dealership — one dealership OS instead of six.',
      price:'$950/mo', priceNote:'3 tiers · annual $9,500/yr (2 months free)',
      svg:'<path d="M6 32V24l4-10a4 4 0 0 1 4-2.6h20A4 4 0 0 1 38 14l4 10v8"/><path d="M6 32h6M42 32h-6"/><circle cx="15" cy="32" r="4"/><circle cx="33" cy="32" r="4"/>' },

    { id:'motorcade', name:'Motorcade Hub', tag:'Dealer groups & national online', genre:'business', state:'live',
      acc:'#182f4d', url:'https://ae-motorcade-hub.vercel.app', pricing:'/hubs/motorcade.html',
      blurb:'Multi-rooftop inventory, group desk, service and online sales — one command center.',
      price:'$1,200/mo', priceNote:'3 tiers · annual $12,000/yr (2 months free)',
      svg:'<path d="M6 32V24l4-10a4 4 0 0 1 4-2.6h20A4 4 0 0 1 38 14l4 10v8"/><path d="M6 32h6M42 32h-6"/><circle cx="15" cy="32" r="4"/><circle cx="33" cy="32" r="4"/>' },

    { id:'targeted', name:'Targeted Hub', tag:'Marketing agencies & studios', genre:'business', state:'live',
      acc:'#d97a2e', url:'https://ae-targeted-showroom.vercel.app', pricing:'/hubs/targeted.html',
      blurb:'CRM, pipeline, estimator and campaigns for a marketing agency or studio — on one branded hub.',
      price:'$450/mo', priceNote:'3 tiers · annual $4,500/yr (2 months free)',
      svg:'<circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="9"/><circle cx="24" cy="24" r="3"/>' },

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
      acc:'#5c8a5f', url:'https://espolearning.com/handwriting', img:'/logo-learning.png', mark:'/marks/espolearning-icon.png',
      blurb:'Handwriting, reading, math and writing for young kids. No fail states, no red marks, nothing collected.',
      price:'Free to try', priceNote:'Paid plans not switched on yet' },

    { id:'espo-genius', name:'ESPO Genius', tag:'Plain-English paperwork', genre:'money', state:'live',
      acc:'#7a6fd6', url:'https://espogenius.com/espo-iep-genius-app', img:'/logo-genius.png',
      blurb:'The forms and fine print nobody explains — IEPs, benefits, care paperwork — translated into plain English.',
      price:'Free right now', priceNote:'Paid plans not switched on yet' },

    { id:'espo-drama', name:'ESPO Drama', tag:'Theater & dramatic arts', genre:'arts', state:'live',
      acc:'#c8794f', url:'https://espodrama.com/', img:'/logo-drama.png',
      blurb:'Write with Roz your coach, run lines from a real play library, scan your own script, warm up, and learn every job in the room — for actors, writers and theater teachers, ages 5 to 90.',
      price:'Free right now', priceNote:'Paid plans not switched on yet' },

    { id:'esposocial', name:'ESPOsocial', tag:'Private groups & video', genre:'social', state:'dev',
      acc:'#5a5fd6', url:'https://esposocial.com/', img:'/logo-social.png',
      blurb:'A quiet place for a real group — private chat, live video, and Tag for the conversations that do not fit a live call.',
      price:'Free right now', priceNote:'Paid plans not switched on yet' },

    { id:'the-narcs', name:'The Narcs', tag:'Fine print, decoded', genre:'money', state:'live',
      acc:'#2f8f7a', url:'https://marketnarc.com/thenarc-app', img:'/logo-narcs.png',
      blurb:'Two tools in one app: The Narc reads the fine print you were handed, MarketNarc watches the tickers you own.',
      price:'Free right now', priceNote:'Paid plans not switched on yet' },

    { id:'neuro-divulge', name:'Neuro Divulge', tag:'Regulation tools', genre:'mind', state:'live',
      acc:'#a85f38', url:'https://neurodivulge.com/', img:'/logo-nd.png',
      blurb:'Practical regulation tools for ADHD and autistic brains — built by someone who needs them.',
      price:'$9 per tool', priceNote:'One-time · free starter checklist included' },

    { id:'aefunkmaster', name:'AEfunkmaster', tag:'Music studio & looper', genre:'arts', state:'live',
      acc:'#e0a83a', img:'/ae-disc.png', url:'/apps/aefunkmaster/',
      shots:['/shots/aefunkmaster.png','/shots/aefunkmaster-2.png','/shots/aefunkmaster-desktop.png'],
      blurb:'A real studio in your browser, in plain English: a true drum kit, real-instrument keys, a bar-synced looper, your microphone, a mixing desk — and "Put it on wax" to make it sound like a record. Nothing uploaded, nothing collected.',
      price:'Free right now', priceNote:'Pricing set: $4.99/mo · $29.99/yr — payments not switched on yet' },

    /* ─────────── ESPO REMAKES — live, in-shop apps (/apps/<name>/) ─────────── */
    { id:'espovocab', name:'ESPOvocab', tag:'Words worth keeping', genre:'learning', state:'live',
      acc:'#1E2A24', mark:M+'espovocab.svg', family:'ESPOgraduate', url:'/apps/espovocab/',
      shots:['/shots/espovocab.png'],
      blurb:'A word a day that actually sticks — etymology, a journal, your own word list. No ads, works offline, export free.',
      price:'Free right now', priceNote:'Plus coming: $1.99/mo · $14.99/yr — not switched on yet' },

    { id:'espotendency', name:'ESPOtendency', tag:'Mood & habits', genre:'mind', state:'live',
      acc:'#232946', mark:M+'espotendency.svg', family:'ESPOmindpeace', url:'/apps/espotendency/',
      shots:['/shots/espotendency.png'],
      blurb:'A 10-second daily check-in and one tiny win at a time. Everything stays on your device — no account, no cloud.',
      price:'Free right now', priceNote:'Plus coming: $1.99/mo · $19.99/yr — core stays free forever' },

    { id:'esponest', name:'ESPOnest', tag:'Baby tracker', genre:'family', state:'live',
      acc:'#2E1F3A', mark:M+'esponest.svg', family:'ESPOfam', url:'/apps/esponest/',
      shots:['/shots/esponest.png'],
      blurb:'Sleep, feeds and diapers in one tap at 3am — nap-window estimate, growth log, free export, zero trackers.',
      price:'Free right now', priceNote:'Plus coming: $2.99/mo · $24.99/yr — logging + export free forever' },

    { id:'espohystory', name:'ESPOhystory', tag:'History, but hysterical', genre:'learning', state:'live',
      acc:'#8a5a2b', mark:'/apps/espohystory/icon.svg', family:'ESPO Learning', url:'/apps/espohystory/',
      blurb:'K–6 history told funny — 35 read-along stories that highlight each word as they read aloud.',
      price:'Free right now', priceNote:'Paid plans not switched on yet' },

    /* ─────────── IN DEVELOPMENT — no price, no buy path, notify-me only ─────────── */

    { id:'esporegulator', name:'ESPOregulator', tag:'Emotional skills', genre:'mind', state:'live',
      acc:'#2B2350', mark:M+'esporegulator.svg', family:'ESPOmindpeace', url:'/apps/esporegulator/',
      blurb:'Five-minute practice for anger, stress and anxiety — a real skills ladder plus right-now SOS tools. Skills, not affirmations.',
      price:'Free right now', priceNote:'Plus coming: $1.99/mo · $19.99/yr — Level 1 + every SOS tool free forever' },

    { id:'espotrek', name:'ESPOtrek', tag:'Trip planner', genre:'travel', state:'live',
      acc:'#12303E', mark:M+'espotrek.svg', family:'ESPOtravel', url:'/apps/espotrek/',
      blurb:'Days, stops, one-tap map routes, a budget that splits itself, and a printable one-pager — offline by default.',
      price:'Free right now', priceNote:'Plus coming: $2.99/mo · $24.99/yr — offline, export & print free forever' },

    { id:'esponatlparks', name:'ESPOnatlparks', tag:'Park passport', genre:'travel', state:'live',
      acc:'#173428', mark:M+'esponatlparks.svg', family:'ESPOtravel', url:'/apps/esponatlparks/',
      blurb:'All 63 National Parks in a passport that stamps OFFLINE — one tap logs the visit, no signal required, never lost.',
      price:'Free right now', priceNote:'Plus coming: $2.99/mo · $24.99/yr — the 63, your stamps & export free forever' },

    { id:'esposign', name:'ESPOsign', tag:'Sign it yourself', genre:'money', state:'live',
      acc:'#2A1A4A', mark:M+'esposign.svg', family:'ESPO Genius', url:'/apps/esposign/',
      blurb:'Sign leases, school forms, waivers and contracts right in your browser — your document never leaves your device.',
      price:'Free right now', priceNote:'Plus coming: $2.99/mo · $24.99/yr unlimited — vs DocuSign’s $120/yr for 5 documents' },

    { id:'espovineyard', name:'ESPOvineyard', tag:'Wine journal · 21+', genre:'savor', state:'live',
      acc:'#2E0D19', mark:M+'espovineyard.svg', family:'ESPOsavor', age:'21+', url:'/apps/espovineyard/',
      blurb:'A calm wine journal with a real Wine Country Notebook inside — no ads, no marketplace, a cellar that is actually yours.',
      price:'Free right now', priceNote:'Plus coming: $2.99/mo · $24.99/yr — journal, cellar & Notebook stay free' },

    { id:'esporacket', name:'ESPOracket', tag:'Tennis & pickleball', genre:'sport', state:'live',
      acc:'#101C2C', mark:M+'esporacket.svg', family:'ESPOcenter', url:'/apps/esporacket/',
      blurb:'Load your match film, tag every point, tap a tag to jump straight to the moment — on any device, footage never uploaded.',
      price:'Free right now', priceNote:'Plus coming: $2.99/mo · $24.99/yr — every price on the page, no hidden tiers' }
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
