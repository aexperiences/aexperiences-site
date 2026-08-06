/* catalog.js — the ONE product catalog for the AE App Shop.
   Both the store grid (products.html) and the product sheet (app.html) read this file.
   Adding a product later = one entry here. Nothing else to touch.

   HONESTY RULES baked into the shape of the data (Accelerated Experiences, LLC):
   - `state:'live'` — a stranger can open it and use it today. It gets a real link.
   - `state:'dev'` — being built. NO price, NO buy path, notify-me only. Never dressed as buyable.
   - A price only ever appears on a `live` product. If we don't have a real number, we say so.
   - Never add an entry for something that does not exist.
*/
(function (root) {
  var M = '/marks/';   // the real app marks (1024 icons, SVG)

  var CATALOG = [

    /* ─────────── BUSINESS OS — live, sold as a subscription ─────────── */
    { id:'abode', mark:'/os-icons/Abode_OS.png', name:'Abode OS', img:'/Abode_OS.png', tag:'Real estate', genre:'business', state:'live',
      tiers:[ ['Solo / Team',450,2500,'Pipeline + CRM + commissions, DeepSeek AI'], ['Team',950,6000,'Full suite + broker views + marketing + Claude'], ['Brokerage',2400,9900,'Multi-team · compliance · custom + premium AI'] ],
      acc:'#c8794f', url:'/apps/abode/', pricing:'/hubs/real-estate.html',
      blurb:'Run a real-estate practice from one place — listings, clients, calendar, and the paperwork that follows a deal.',
      price:'$450/mo', priceNote:'3 tiers · annual $4,500/yr (2 months free)',
      svg:'<path d="M7 22 24 8l17 14"/><path d="M11 20v19h26V20"/><circle cx="24" cy="29" r="3.2"/><path d="M24 32.2V37"/>' },

    { id:'buttress', mark:'/os-icons/Buttress_OS.png', name:'Buttress OS', img:'/Buttress_OS.png', tag:'Architecture', genre:'business', state:'live',
      tiers:[ ['Studio',550,3500,'Projects + RFIs + billing + Detail Studio'], ['Firm',1200,8400,'Full suite + custom workflows + Claude eyes'], ['Multi-office',2800,14500,'Unlimited + custom modules + white-glove'] ],
      acc:'#5c8a5f', url:'/apps/buttress/', pricing:'/hubs/architecture.html',
      blurb:'Projects, drawing sets, consultants and clients in one studio OS — built around how a practice actually runs.',
      price:'$550/mo', priceNote:'3 tiers · annual $5,500/yr (2 months free)',
      svg:'<path d="M24 7 11 41M24 7l13 34"/><circle cx="24" cy="7" r="2.6"/><path d="M24 7v11"/><path d="M16 30h16"/>' },

    { id:'truss', mark:'/os-icons/Truss_OS.png', name:'Truss OS', img:'/Truss_OS.png', tag:'Engineering', genre:'business', state:'live',
      tiers:[ ['Practice',650,3500,'Projects + submittals + Calc Studio'], ['Firm',1400,9000,'Full suite + QA + premium AI eyes'], ['Multi-discipline',3200,16800,'Unlimited + custom + priority SLA'] ],
      acc:'#18b0ba', url:'/apps/truss/', pricing:'/hubs/engineering.html',
      blurb:'Job tracking, submittals, field notes and billing for an engineering firm — one system instead of six.',
      price:'$650/mo', priceNote:'3 tiers · annual $6,500/yr (2 months free)',
      svg:'<path d="M6 40 24 9l18 31zM6 40h36"/><path d="M24 9 16 40M24 9l8 31M13 30h22"/>' },

    { id:'musical', mark:'/os-icons/Musical_OS.png', name:'Musical OS', img:'/Musical_OS.png', tag:'Live theater', genre:'business', state:'live',
      tiers:[ ['Community',650,4000,'Box office + productions + patrons'], ['Producing',1500,8400,'+ subscriptions · marketing · full house tools'], ['Regional / Multi-venue',3200,13800,'Multi-venue + custom + premium AI'] ],
      acc:'#e0b24a', url:'/apps/musical/', pricing:'/hubs/theater.html',
      blurb:'Box office, season, giving, sponsorship, volunteers and classes — the whole playhouse on one spine, and the only theatre OS that speaks non-profit.',
      price:'$650/mo', priceNote:'3 tiers · annual $6,500/yr (2 months free)',
      svg:'<path d="M9 17h30l-3 22H12z"/><path d="M9 17 24 7l15 10"/><circle cx="19" cy="27" r="2"/><circle cx="29" cy="27" r="2"/>' },

    { id:'8mm', mark:'/os-icons/8mm_OS.png', name:'8mm OS', img:'/8mm_OS.png', tag:'Film & production', genre:'business', state:'live',
      tiers:[ ['Single / Twin',500,3000,'Box office + showtimes + members'], ['Multiplex',1200,7600,'Up to 8 screens + reserved + concessions'], ['Circuit',2800,12200,'Multi-location + custom + premium AI'] ],
      acc:'#8a6fd6', url:'/apps/8mm/', pricing:'/hubs/cinema.html',
      blurb:'Productions, crew, call sheets, gear and post — from greenlight to delivery.',
      price:'$500/mo', priceNote:'3 tiers · annual $5,000/yr (2 months free)',
      svg:'<rect x="7" y="14" width="24" height="20" rx="3"/><path d="M31 22l10-6v16l-10-6z"/>' },

    { id:'amphitheater', mark:'/os-icons/Amphitheater_OS.png', name:'Amphitheater OS', img:'/Amphitheater_OS.png', tag:'Concerts & venues', genre:'business', state:'live',
      tiers:[ ['Club',600,3500,'Box office (GA/reserved/cabaret) + lineup'], ['Venue',1400,7600,'Full suite + marketing + memberships'], ['Group / Promoter',3000,12200,'Multi-venue + custom + priority SLA'] ],
      acc:'#d65f8a', url:'/apps/amphitheater/', pricing:'/hubs/concerts.html',
      blurb:'Shows, ticketing, artists, riders and settlement — the venue back office in one place.',
      price:'$600/mo', priceNote:'3 tiers · annual $6,000/yr (2 months free)',
      svg:'<path d="M18 34V12l18-4v22"/><circle cx="14" cy="34" r="4.5"/><circle cx="32" cy="30" r="4.5"/>' },

    { id:'lilninja', mark:'/os-icons/LilNinja_OS.png', name:'LilNinja OS', img:'/LilNinja_OS.png', tag:'Kids gyms & programs', genre:'business', state:'live',
      tiers:[ ['Studio',400,2500,'Schedule + enrollment + tuition + families'], ['Center',750,6000,'Full suite + coaches + parent portal + your site'], ['Multi-location',1600,9900,'Multi-site + custom + premium AI'] ],
      acc:'#4aa3d6', url:'/apps/lilninja/', pricing:'/hubs/kids-gym.html',
      blurb:'Classes, enrollment, waivers, parents and payments — for gyms, camps and kids programs.',
      price:'$400/mo', priceNote:'3 tiers · annual $4,000/yr (2 months free)',
      svg:'<circle cx="24" cy="24" r="15"/><path d="M24 9v30M9 24h30"/><path d="M13 13l22 22M35 13L13 35"/>' },

    { id:'moments', mark:'/os-icons/Moments_OS.png', name:'Moments OS', img:'/Moments_OS.png', tag:'Photographers & videographers', genre:'business', state:'live',
      tiers:[ ['Starter',99,600,'One person \u2014 shoots, clients, contracts, galleries, invoices, and the video editor'], ['Studio',199,1200,'A second shooter, print sales, usage licensing and a branded client portal'], ['Signature',329,2000,'Commercial work \u2014 larger storage, your own domain, a dedicated environment'] ],
      acc:'#6b5bb5', url:'/apps/moments/', pricing:'/hubs/photo-video.html',
      blurb:'The shoot was eight hours. The job was thirty-seven once you counted culling, editing, driving and the third revision. Moments OS computes what you actually earn an hour \u2014 before you send the quote. Usage licensing, galleries, contracts, e-sign, and a real video editor in every tier.',
      price:'$99/mo', priceNote:'3 tiers \u00b7 Cutlabs video editor included in all of them',
      svg:'<rect x="8" y="16" width="32" height="22" rx="6"/><circle cx="24" cy="27" r="8"/>' },
    { id:'smiley', mark:'/os-icons/Smiley_OS.png', name:'Smiley OS', img:'/Smiley_OS.png', tag:'Dental practices', genre:'business', state:'live',
      tiers:[ ['Solo',350,3200,'One doctor and a hygiene chair \u2014 the whole system where the owner is also the office manager'], ['Practice',750,6400,'Two to four operatories with an office manager \u2014 insurance verification and claims aging come in here'], ['Grandsuite',1500,12000,'Multi-provider, multi-location, the ortho module switched on, branded patient portal'] ],
      acc:'#0e7c93', url:'/apps/smiley/', pricing:'/hubs/dental.html',
      blurb:'Production, the PPO write-off and the patient portion kept apart \u2014 because adding them together is how a practice reads a record month and cannot make payroll. Insurance checked before the visit, and ortho as a module with its own contract ledger.',
      price:'$350/mo', priceNote:'3 tiers \u00b7 the whole spine in every tier',
      svg:'<rect x="10" y="16" width="28" height="18" rx="9"/><path d="M10 24h28"/>' },
    { id:'sleeves', mark:'/os-icons/Sleeves_OS.png', name:'Sleeves OS', img:'/Sleeves_OS.png', tag:'Tattoo studios', genre:'business', state:'live',
      tiers:[ ['Chair',250,1500,'A single artist \u2014 the whole system for someone who is also the front desk'], ['Studio',650,3100,'A real shop with booth renters \u2014 books, metrics and the AI department org'], ['Grandsuite',1400,4600,'Multi-location, guest artists, dedicated environment, branded booking site'] ],
      acc:'#b8324a', url:'/apps/sleeves/', pricing:'/hubs/tattoo.html',
      blurb:'Request, review, quote, deposit \u2014 then a date. One-of-one flash inventory, per-session consent and health screening, and booth-rent splits computed at the chair.',
      price:'$250/mo', priceNote:'3 tiers \u00b7 the whole spine in every tier',
      svg:'<rect x="16" y="10" width="16" height="20" rx="4"/><rect x="20" y="30" width="8" height="12" rx="3"/><path d="M24 42v4"/><path d="M12 14h4M32 14h4"/>' },

    { id:'toolbelt', mark:'/os-icons/Toolbelt_OS.png', name:'Toolbelt OS', img:'/Toolbelt_OS.png', tag:'HVAC \u00b7 plumbing \u00b7 electrical', genre:'business', state:'live',
      tiers:[ ['Truck',450,3900,'1\u20133 trucks \u2014 the whole system for an owner still turning wrenches'], ['Shop',950,8200,'A real shop with a dispatcher \u2014 referral CRM, recruiting, books, agent org'], ['Grandsuite',2200,13800,'Multi-location, multi-trade, dedicated environment, branded tech app'] ],
      acc:'#e4832b', url:'/apps/toolbelt/', pricing:'/hubs/field-service.html',
      blurb:'Dispatch with a match engine that shows its reasons, proof of service, licence and permit gates, truck stock, and the three-line money engine \u2014 for HVAC, plumbing and electrical shops.',
      price:'$450/mo', priceNote:'3 tiers \u00b7 the whole spine in every tier',
      svg:'<path d="M6 30h28v10H6z"/><path d="M34 32h4l4 6v2h-8z"/><circle cx="14" cy="41" r="4"/><circle cx="36" cy="41" r="4"/><path d="M10 24h20"/><path d="M10 20h20"/>' },

    { id:'stayathome', mark:'/os-icons/StayAtHome_OS.png', name:'Stay@Home OS', img:'/StayAtHome_OS.png', tag:'Home care agencies', genre:'business', state:'live',
      tiers:[ ['Office',550,4800,'One office \u2014 the whole system, sized for a single territory'], ['Agency',1150,9500,'Multi-office + referral CRM + books + the AI department org'], ['Grandsuite',2600,16800,'Multi-state + dedicated environment + migration + branded caregiver app'] ],
      acc:'#2e7f7c', url:'/apps/stayathome/', pricing:'/hubs/home-care.html',
      blurb:'Recruiting, scheduling with an AI match engine, EVV field ops, care-plan guardrails, native e-sign, split-rate billing and payroll \u2014 for non-medical home care agencies.',
      price:'$550/mo', priceNote:'3 tiers \u00b7 the whole spine in every tier',
      svg:'<path d="M8 24L24 10l16 14"/><path d="M12 24v14h24V24"/><path d="M24 34c-4-3-6-5-6-8a3 3 0 016-1 3 3 0 016 1c0 3-2 5-6 8z"/>' },

    { id:'4barrel', mark:'/os-icons/4barrel_OS.png', name:'4barrel OS', img:'/4barrel_OS.png', tag:'Used-car dealers', genre:'business', state:'live',
      tiers:[ ['Lot',450,2500,'Inventory + desk + leads + recon'], ['Dealership',950,6500,'Full suite + online sales + service'], ['Multi-lot',2000,12200,'Multi-lot + custom + premium AI'] ],
      acc:'#1c5568', url:'/apps/4barrel/', pricing:'/hubs/showroom.html',
      blurb:'Inventory, sales desk, leads and recon for independent and boutique used-car dealers.',
      price:'$450/mo', priceNote:'3 tiers · annual $4,500/yr (2 months free)',
      svg:'<path d="M6 32V24l4-10a4 4 0 0 1 4-2.6h20A4 4 0 0 1 38 14l4 10v8"/><path d="M6 32h6M42 32h-6"/><circle cx="15" cy="32" r="4"/><circle cx="33" cy="32" r="4"/>' },

    { id:'targeted', mark:'/os-icons/Targeted_OS.png', name:'Targeted OS', img:'/Targeted_OS.png', tag:'Marketing agencies & studios', genre:'business', state:'live',
      tiers:[ ['Freelance / Studio',450,2500,'CRM + pipeline + estimator + campaigns'], ['Agency',950,6500,'Full suite + agent org + mail + Connect'], ['Multi-team',2200,12200,'Multi-team + custom + premium AI'] ],
      acc:'#d97a2e', url:'/apps/targeted/dashboard', pricing:'/hubs/targeted.html',
      blurb:'CRM, pipeline, estimator and campaigns for a marketing agency or studio — on one branded OS.',
      price:'$450/mo', priceNote:'3 tiers · annual $4,500/yr (2 months free)',
      svg:'<circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="9"/><circle cx="24" cy="24" r="3"/>' },

    /* ─────────── ESPO FAMILY — live today ─────────── */
    { id:'espo-music', name:'ESPO Music', tag:'Instrument coaching', genre:'arts', state:'live',
      acc:'#e0a83a', url:'https://espomusic.com/', img:'/logo-music.png',
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
      acc:'#5c8a5f', url:'https://espolearning.com/', img:'/logo-learning.png', mark:'/marks/espolearning-icon.png',
      blurb:'Handwriting, reading, math and writing for young kids. No fail states, no red marks, nothing collected.',
      price:'Free to try', priceNote:'Paid plans not switched on yet' },

    { id:'espo-genius', name:'ESPO Genius', tag:'Plain-English paperwork', genre:'money', state:'live',
      acc:'#7a6fd6', url:'https://espogenius.com/', img:'/logo-genius.png',
      blurb:'The forms and fine print nobody explains — IEPs, benefits, care paperwork — translated into plain English.',
      price:'Free right now', priceNote:'Paid plans not switched on yet' },

    { id:'espo-drama', name:'ESPO Drama', tag:'Theater & dramatic arts', genre:'arts', state:'live',
      acc:'#c8794f', url:'https://espodrama.com/', img:'/logo-drama.png',
      blurb:'Write with Roz your coach, run lines from a real play library, scan your own script, warm up, and learn every job in the room — for actors, writers and theater teachers, ages 5 to 90.',
      price:'Free right now', priceNote:'Paid plans not switched on yet' },

    { id:'esposocial', name:'ESPOsocial', tag:'Private groups & video', genre:'social', state:'dev',
      acc:'#5a5fd6', url:'https://esposocial.com/', img:'/logo-social.png',
      blurb:'A quiet place for a real group — private chat, live video, and Tag for the conversations that do not fit a live call.', priceNote:'Paid plans not switched on yet' },

    { id:'the-narcs', name:'The Narcs', tag:'Fine print, decoded', genre:'money', state:'live',
      acc:'#2f8f7a', url:'https://marketnarc.com/open', img:'/logo-narcs.png',
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
    { id:'revolver', name:'Revolver OS', tag:'Record collection', genre:'arts', state:'live',
      acc:'#c43c36', mark:'/apps/revolver/icon.png', family:'Revolver', url:'/apps/revolver/',
      blurb:'Point your camera at the shelf — Revolver identifies your vinyl, even several covers in one photo, and files them by genre. Your collection stays on your device, export free.',
      price:'Free right now', priceNote:'Photo identification runs on our AI — free while we tune it' },

    { id:'thread', name:'The Thread', tag:'Holds what the doorway wipes', genre:'mind', state:'live',
      acc:'#c8965a', mark:'/apps/thread/icon.png', family:'Neuro Divulge', url:'/apps/thread/',
      blurb:'For heads that lose the thread at the doorway. One thing on screen, a parking lot for stray thoughts, tap-through quests for the kids (no fail states), and homes for the things you can never find. Built by a neurodivergent founder for his own house.',
      price:'Free right now', priceNote:'Part of the Neuro Divulge family' },

    { id:'tucasa', name:'Tu Casa OS', tag:'The home operating system', genre:'family', state:'dev',
      acc:'#c45c3c', mark:'/apps/tucasa/icon.png', family:'Tu Casa', url:'/apps/tucasa/',
      blurb:'The wall screen that fills itself. Photograph the school flyer — the events land on the calendar. Photograph the fridge — the list writes itself and dinner suggests itself. The Thread, kid quests and the baby log are rooms inside.',
      price:'Free right now', priceNote:'Family edition — pricing lands with the fleet model' },

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
      acc:'#2E0D19', mark:'/apps/espovineyard/icon.png', family:'ESPOsavor', age:'21+', url:'/apps/espovineyard/',
      blurb:'A calm wine journal with a real Wine Country Notebook inside — no ads, no marketplace, a cellar that is actually yours.',
      price:'Free right now', priceNote:'Plus coming: $2.99/mo · $24.99/yr — journal, cellar & Notebook stay free' },
    { id:'espostogie', name:'ESPOstogie', tag:'Cigar journal · 21+', genre:'savor', state:'live',
      acc:'#7A3F18', mark:'/apps/espostogie/icon.png', family:'ESPOsavor', age:'21+', url:'/apps/espostogie/',
      blurb:'A cigar journal and humidor — vitola, wrapper, origin, strength, burn time and pairing, kept on your own device.',
      price:'Free right now', priceNote:'Paid plans not switched on yet' },
    { id:'espowhiskey', name:'ESPOwhiskey', tag:'Whiskey journal · 21+', genre:'savor', state:'live',
      acc:'#8A5A18', mark:'/apps/espowhiskey/icon.png', family:'ESPOsavor', age:'21+', url:'/apps/espowhiskey/',
      blurb:'A whiskey journal with two sides on one shelf — log a neat pour or a built cocktail, and the base spirit lands in the same place either way.',
      price:'Free right now', priceNote:'Paid plans not switched on yet' },
    { id:'espobarista', name:'ESPObarista', tag:'Coffee journal', genre:'savor', state:'live',
      acc:'#7A4A28', mark:'/apps/espobarista/icon.png', family:'ESPOsavor', url:'/apps/espobarista/',
      blurb:'A coffee journal that logs both sides of the habit — the pour-over you brewed and the latte you bought.',
      price:'Free right now', priceNote:'Paid plans not switched on yet' },

    { id:'esporacket', name:'ESPOracket', tag:'Tennis & pickleball', genre:'sport', state:'live',
      acc:'#101C2C', mark:M+'esporacket.svg', family:'ESPOcenter', url:'/apps/esporacket/',
      blurb:'Load your match film, tag every point, tap a tag to jump straight to the moment — on any device, footage never uploaded.',
      price:'Free right now', priceNote:'Plus coming: $2.99/mo · $24.99/yr — every price on the page, no hidden tiers' },
    { id:'espowords', name:'ESPOwords', tag:'Play the people you know', genre:'games', state:'live',
      acc:'#243D2C', mark:'/marks/espowords.svg', family:'ESPOparlor', url:'/apps/espowords/',
      blurb:'A turn-based word game with the people you actually know. No ads, no coins, no power-ups, no hints for sale, no strangers, no chat. Free.',
      price:'Free', priceNote:'Free, and staying that way — there is nothing in it to buy.' },
    { id:'espodraw', name:'ESPOdraw', tag:'Draw it, they guess it', genre:'games', state:'live',
      acc:'#243D2C', mark:'/marks/espodraw.svg', family:'ESPOparlor', url:'/apps/espodraw/',
      blurb:'Draw a word, your friends guess it, then it comes back to you. Two to eight of you, in your own time. Every colour and every brush is there from the first round. No ads, no coins, no strangers.',
      price:'Free', priceNote:'Free, and staying that way — there is nothing in it to buy.' },
    { id:'sparklesalon', name:'Sparkle Salon', tag:'Salon game · ages 6–10', genre:'games', state:'live',
      acc:'#ff5fa8', img:'/apps/sparklesalon/icon.png', family:'AE Games', url:'/apps/sparklesalon/', age:'Kids',
      shots:['/shots/sparklesalon.png','/shots/sparklesalon-reveal.png','/shots/sparklesalon-2.png','/shots/sparklesalon-4.png'],
      blurb:'Run your very own salon — give every happy customer amazing hair, nails, makeup and outfits. The customers talk out loud, so it works even before kids can read. No losing, no timers, no ads, nothing collected, and it works offline.',
      price:'Free', priceNote:'A free kids’ game — no ads, no accounts, nothing to buy, nothing collected' },

    { id:'espofocus', name:'ESPOfocus', tag:'ADHD weekly tracker', genre:'family', state:'live',
      acc:'#4c63d2', mark:'/apps/espofocus/icon.svg', url:'/apps/espofocus/',
      blurb:'The weekly ADHD monitoring report your provider asks for — parents, teachers and behavior specialists rate the same 15 things each week, and ESPOfocus charts whether the plan is working. Not a diagnosis; private, initials only.',
      price:'Free right now', priceNote:'A private monitoring aid — no ads, no tracking. Paid plans not switched on yet.' }
  ];

  var GENRES = [
    { id:'all',      label:'All' },
    { id:'business', label:'Business OS' },
    { id:'learning', label:'Learning' },
    { id:'mind',     label:'Mind & mood' },
    { id:'family',   label:'Family' },
    { id:'arts',     label:'Music & arts' },
    { id:'money',    label:'Money & fine print' },
    { id:'travel',   label:'Travel' },
    { id:'sport',    label:'Sport' },
    { id:'savor',    label:'Food & drink' },
    { id:'social',   label:'Social' },
    { id:'games',    label:'Games' }
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
  function live() { return CATALOG.filter(function (a) { return a.state === 'live'; }); }
  function dev() { return CATALOG.filter(function (a) { return a.state === 'dev'; }); }
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

  /* RETIRED IDS. Before Jul 24 2026 these products were keyed by their old brand names, and
     that id was the join key between this catalog and the hub's price desk. The names are
     retired (SSOT Art. IV.4) so the ids are too — but the two repos deploy separately, and a
     rename that lands here first would silently stop matching prices until the hub caught up.
     So we accept either id and always resolve to the canon one. Nothing here is ever shown
     to a visitor; it exists purely so a deploy gap can't blank the prices in the store. */
  var RETIRED_ID = {
    homestead: 'abode', draftline: 'buttress', datum: 'truss', marquee: 'musical',
    reel: '8mm', encore: 'amphitheater', cartwheel: 'lilninja', showroom: '4barrel'
  };
  function canonId(id) { return RETIRED_ID[id] || id; }

  function refreshPrices() {
    return fetch(PRICE_API).then(function (r) {
      if (!r.ok) throw new Error('pricing unavailable');
      return r.json();
    }).then(function (rec) {
      (rec.hubs || []).forEach(function (h) {
        var a = byId(canonId(h.id));
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


  /* MEDIA — the App Store strip. A preview video of the real system being operated,
     then screenshots of the actual rooms. Never a mockup, never stock: every frame here
     was captured by driving the live product. `len` is the true runtime of the file.
     A product with no entry simply shows no gallery — the store must never show a
     broken player or a placeholder tile. */
  var MEDIA = {
    abode:       { preview:'/media/abode/preview.mp4', poster:'/media/abode/poster.jpg', len:'2:37',
                 shots:['/media/abode/s1.jpg', '/media/abode/s2.jpg', '/media/abode/s3.jpg', '/media/abode/s4.jpg', '/media/abode/s5.jpg', '/media/abode/s6.jpg'] },
    buttress:    { preview:'/media/buttress/preview.mp4', poster:'/media/buttress/poster.jpg', len:'2:16',
                 shots:['/media/buttress/s1.jpg', '/media/buttress/s2.jpg', '/media/buttress/s3.jpg', '/media/buttress/s4.jpg', '/media/buttress/s5.jpg', '/media/buttress/s6.jpg', '/media/buttress/s7.jpg', '/media/buttress/s8.jpg'] },
    truss:       { preview:'/media/truss/preview.mp4', poster:'/media/truss/poster.jpg', len:'2:42',
                 shots:['/media/truss/s1.jpg', '/media/truss/s2.jpg', '/media/truss/s3.jpg', '/media/truss/s4.jpg', '/media/truss/s5.jpg', '/media/truss/s6.jpg'] },
    musical:     { preview:'/media/musical/preview.mp4', poster:'/media/musical/poster.jpg', len:'2:41',
                 shots:['/media/musical/s1.jpg', '/media/musical/s2.jpg', '/media/musical/s3.jpg', '/media/musical/s4.jpg', '/media/musical/s5.jpg', '/media/musical/s6.jpg', '/media/musical/s7.jpg'] },
    '8mm':         { preview:'/media/8mm/preview.mp4', poster:'/media/8mm/poster.jpg', len:'3:05',
                 shots:['/media/8mm/s1.jpg', '/media/8mm/s2.jpg', '/media/8mm/s3.jpg', '/media/8mm/s4.jpg', '/media/8mm/s5.jpg', '/media/8mm/s6.jpg', '/media/8mm/s7.jpg', '/media/8mm/s8.jpg'] },
    amphitheater: { preview:'/media/amphitheater/preview.mp4', poster:'/media/amphitheater/poster.jpg', len:'3:03',
                 shots:['/media/amphitheater/s1.jpg', '/media/amphitheater/s2.jpg', '/media/amphitheater/s3.jpg', '/media/amphitheater/s4.jpg', '/media/amphitheater/s5.jpg', '/media/amphitheater/s6.jpg'] },
    lilninja:    { preview:'/media/lilninja/preview.mp4', poster:'/media/lilninja/poster.jpg', len:'2:40',
                 shots:['/media/lilninja/s1.jpg', '/media/lilninja/s2.jpg', '/media/lilninja/s3.jpg', '/media/lilninja/s4.jpg', '/media/lilninja/s5.jpg', '/media/lilninja/s6.jpg'] },
    moments:     { preview:'/media/moments/preview.mp4', poster:'/media/moments/poster.jpg', len:'2:57',
                 shots:['/media/moments/s1.jpg', '/media/moments/s2.jpg', '/media/moments/s3.jpg', '/media/moments/s4.jpg', '/media/moments/s5.jpg', '/media/moments/s6.jpg', '/media/moments/s7.jpg'] },
    smiley:      { preview:'/media/smiley/preview.mp4', poster:'/media/smiley/poster.jpg', len:'2:53',
                 shots:['/media/smiley/s1.jpg', '/media/smiley/s2.jpg', '/media/smiley/s3.jpg', '/media/smiley/s4.jpg', '/media/smiley/s5.jpg', '/media/smiley/s6.jpg', '/media/smiley/s7.jpg'] },
    sleeves:     { preview:'/media/sleeves/preview.mp4', poster:'/media/sleeves/poster.jpg', len:'2:29',
                 shots:['/media/sleeves/s1.jpg', '/media/sleeves/s2.jpg', '/media/sleeves/s3.jpg', '/media/sleeves/s4.jpg', '/media/sleeves/s5.jpg', '/media/sleeves/s6.jpg'] },
    toolbelt:    { preview:'/media/toolbelt/preview.mp4', poster:'/media/toolbelt/poster.jpg', len:'2:31',
                 shots:['/media/toolbelt/s1.jpg', '/media/toolbelt/s2.jpg', '/media/toolbelt/s3.jpg', '/media/toolbelt/s4.jpg', '/media/toolbelt/s5.jpg', '/media/toolbelt/s6.jpg'] },
    stayathome:  { preview:'/media/stayathome/preview.mp4', poster:'/media/stayathome/poster.jpg', len:'2:28',
                 shots:['/media/stayathome/s1.jpg', '/media/stayathome/s2.jpg', '/media/stayathome/s3.jpg', '/media/stayathome/s4.jpg', '/media/stayathome/s5.jpg', '/media/stayathome/s6.jpg'] },
    '4barrel':     { preview:'/media/4barrel/preview.mp4', poster:'/media/4barrel/poster.jpg', len:'2:26',
                 shots:['/media/4barrel/s1.jpg', '/media/4barrel/s2.jpg', '/media/4barrel/s3.jpg', '/media/4barrel/s4.jpg', '/media/4barrel/s5.jpg', '/media/4barrel/s6.jpg', '/media/4barrel/s7.jpg'] },
    targeted:    { preview:'/media/targeted/preview.mp4', poster:'/media/targeted/poster.jpg', len:'2:27',
                 shots:['/media/targeted/s1.jpg', '/media/targeted/s2.jpg', '/media/targeted/s3.jpg', '/media/targeted/s4.jpg', '/media/targeted/s5.jpg', '/media/targeted/s6.jpg'] },
  };
  CATALOG.forEach(function (a) { if (MEDIA[a.id]) a.media = MEDIA[a.id]; });

  root.AEShop = {
    CATALOG: CATALOG, GENRES: GENRES, AISLES: AISLES,
    byId: byId, canonId: canonId, live: live, dev: dev, activeGenres: activeGenres,
    aisleOf: aisleOf, inAisle: inAisle,
    refreshPrices: refreshPrices, priceSource: 'fallback',
    appShop: { build: 99, terms: 'Half up front, half on delivery', turnaround: '3 days' }
  };
})(window);

/* ── SEO: structured data for the App Shop (JSON-LD) ─────────────────────────
   Emits an ItemList of SoftwareApplication entries built from the SAME catalog
   the grid renders — LIVE products only, REAL prices only (honesty rules).
   Googlebot renders JS and reads this, so the shop can appear as a rich
   app-catalog result. Wrapped so SEO can never break the store. */
(function (root) {
  function onReady(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  onReady(function () {
    try {
      var S = root.AEShop; if (!S || !S.CATALOG) return;
      var path = (location.pathname || '').toLowerCase();
      if (path.indexOf('shop') === -1 && path !== '/') return;   // shop page only
      if (document.getElementById('ae-shop-jsonld')) return;     // inject once
      var BASE = 'https://www.aexperiences.com';
      function abs(u){ if (!u) return BASE + '/shop.html'; return u.charAt(0) === '/' ? BASE + u : u; }
      function priceNum(p){ if (!p) return null; var m = String(p).match(/\$\s*([\d,]+)\s*(k)?/i); if (!m) return null; var n = parseInt(m[1].replace(/,/g, ''), 10); if (m[2]) n *= 1000; return isNaN(n) ? null : n; }
      var live = S.CATALOG.filter(function (a) { return a.state === 'live'; });
      var items = live.map(function (a, i) {
        var app = {
          "@type": "SoftwareApplication",
          "name": a.name,
          "applicationCategory": a.genre === 'business' ? "BusinessApplication" : "WebApplication",
          "operatingSystem": "Web-based",
          "url": abs(a.url),
          "description": a.blurb || a.tag || a.name,
          "provider": { "@type": "Organization", "name": "Accelerated Experiences LLC", "url": BASE }
        };
        var pn = priceNum(a.price);
        app.offers = {
          "@type": "Offer",
          "price": pn !== null ? String(pn) : "0",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock",
          "url": abs(a.url)
        };
        if (pn !== null && /\/mo/i.test(a.price)) {
          app.offers.priceSpecification = {
            "@type": "UnitPriceSpecification",
            "price": String(pn), "priceCurrency": "USD",
            "billingIncrement": 1, "unitCode": "MON", "unitText": "month"
          };
        }
        return { "@type": "ListItem", "position": i + 1, "item": app };
      });
      var graph = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "AE App Shop — Accelerated Experiences LLC",
        "url": BASE + "/shop.html",
        "description": "Every app and business OS built by Accelerated Experiences LLC. Walk in and use the real thing — no demo, no sales call, no download.",
        "isPartOf": { "@type": "WebSite", "name": "Accelerated Experiences LLC", "url": BASE },
        "publisher": { "@type": "Organization", "name": "Accelerated Experiences LLC", "url": BASE, "logo": BASE + "/ae-disc.png" },
        "mainEntity": { "@type": "ItemList", "numberOfItems": items.length, "itemListElement": items }
      };
      var s = document.createElement('script');
      s.type = 'application/ld+json';
      s.id = 'ae-shop-jsonld';
      s.textContent = JSON.stringify(graph);
      document.head.appendChild(s);
    } catch (e) { /* SEO must never break the store */ }
  });
})(window);
