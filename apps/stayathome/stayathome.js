/* ============================================================================
   STAY@HOME OS — SHOWROOM ENGINE
   Non-Medical Home Care Agency OS · Powered by Accelerated Experiences LLC

   BROWSER-ONLY. No backend for the business data — everything lives in this
   browser's localStorage. Faithful to AEHub canon: DH -> AE -> Event Bus ->
   Pacemaker -> Triad, confidence-gated release, LIVE/ESTIMATE/ASSUMPTION
   source tags, the Fences (drafts only, nothing sends).

   Vertical grounding — what makes home care different from every other
   vertical in this fleet:
     • The unit of work is a SHIFT, not a deal. Hundreds a week, each one a
       separate bill rate AND a separate pay rate.
     • The buyer and the client are different people (adult child pays, elderly
       parent receives). Permissions have to model a family, not a customer.
     • Caregiver turnover runs 60–80%/yr industry-wide, so recruiting is a
       permanent production line, not an occasional event.
     • EVV (Electronic Visit Verification) is federally required for Medicaid
       hours — clock-in must carry time + place + who + what was done.
     • Non-medical means legally bounded scope. A caregiver physically cannot
       be allowed to log a clinical task; that is a liability event.

   All money is computed from seeded shifts. Industry benchmarks are left BLANK
   and flagged "not yet sourced" — blank beats confident-wrong (Art. IV).
   ============================================================================ */
(function (global) {
  "use strict";

  /* ------------------------------------------------------------------ store */
  var KEY = "stayathome_os_v1";
  var STORE = (function(){ try{ localStorage.setItem('_t','1'); localStorage.removeItem('_t'); return localStorage; }catch(e){ return sessionStorage; } })();
  /* LOCAL noon, deliberately. `new Date("2026-07-27")` parses as UTC midnight,
     which in any timezone behind UTC reads as the PREVIOUS day locally — and a
     scheduler that is off by one day is worse than useless. Every date in this
     engine is handled at local noon and formatted from local parts. */
  var TODAY = new Date("2026-07-27T12:00:00");

  function now() { return Date.now(); }
  function read() { try { var d = JSON.parse(STORE.getItem(KEY)); return d || null; } catch (e) { return null; } }
  function write(d) { d._t = now(); try { STORE.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function clone(a){ return JSON.parse(JSON.stringify(a)); }

  function fresh() {
    return {
      _t: now(), started: now(), sample: true,
      tier: "grandsuite", adds: [], offs: [],
      agency:      clone(SEED.agency),
      caregivers:  clone(SEED.caregivers),
      clients:     clone(SEED.clients),
      shifts:      clone(SEED.shifts),
      applicants:  clone(SEED.applicants),
      referrers:   clone(SEED.referrers),
      inquiries:   clone(SEED.inquiries),
      documents:   clone(SEED.documents),
      invoices:    clone(SEED.invoices),
      payruns:     clone(SEED.payruns),
      systems:     clone(SEED.systems),
      approvals:   clone(SEED.approvals),
      bus: [], seq: 1
    };
  }
  /* Real system, not a demo: data persists. `sample:true` only marks the seeded
     starter book so the one-time "start with a clean slate" can offer itself. */
  function emptyBook(){
    var d = fresh();
    d.sample = false;
    d.caregivers=[]; d.clients=[]; d.shifts=[]; d.applicants=[];
    d.referrers=[]; d.inquiries=[]; d.documents=[]; d.invoices=[]; d.payruns=[];
    d.approvals=[]; d.bus=[];
    return d;
  }
  function goLive(){ var d = emptyBook(); write(d); return d; }
  function isSample(){ return db().sample !== false; }

  function db() { var d = read(); if (!d) { d = fresh(); write(d); return d; } return d; }
  function save(mut) { var d = db(); mut(d); write(d); return d; }

  /* ====================================================================
     INDUSTRY CANON — the real vocabulary of a non-medical home care agency
     ==================================================================== */

  /* SERVICE LINES. Bill rates differ by line; so do the skills required. */
  var SERVICE_LINES = [
    { k:"Personal Care",   color:"#2e7f7c", note:"Hands-on ADL support — bathing, dressing, transfers, toileting." },
    { k:"Companion Care",  color:"#d89b3a", note:"Supervision, conversation, errands, light housekeeping, meals." },
    { k:"Respite",         color:"#7a5aa8", note:"Short relief blocks so a family caregiver can step away." },
    { k:"Overnight",       color:"#4d8f8a", note:"Awake or sleep-in overnight coverage." },
    { k:"Live-in",         color:"#c0568f", note:"24-hour placement with sleep and meal periods per state rule." },
    { k:"Transportation",  color:"#8a6d3b", note:"Appointments, pharmacy, groceries. Mileage reimbursed." },
    { k:"Dementia Care",   color:"#a24a76", note:"Redirection, routine anchoring, wandering precautions." }
  ];
  function lineColor(name){ var s = SERVICE_LINES.filter(function(x){return x.k===name;})[0]; return s?s.color:"#8a9794"; }

  /* PAYERS. Home care revenue mixes private pay, long-term care insurance,
     Medicaid waiver and VA. Each pays differently and each has its own paperwork.
     Medicaid waiver hours are the ones that legally require EVV. */
  var PAYERS = [
    { k:"Private Pay",      evv:false, terms:"Weekly autopay (card or ACH) against approved hours." },
    { k:"LTC Insurance",    evv:false, terms:"Monthly invoice on the carrier's own form + care notes." },
    { k:"Medicaid Waiver",  evv:true,  terms:"State clearinghouse submission. EVV required on every visit." },
    { k:"VA Community Care",evv:false, terms:"Authorized hours, monthly billing against the authorization." }
  ];
  function payer(k){ return PAYERS.filter(function(p){return p.k===k;})[0] || PAYERS[0]; }
  function payerRequiresEVV(k){ return !!payer(k).evv; }

  /* ---------------------------------------------------------------------
     THE SCOPE GUARDRAIL — the single most important rule in this vertical.
     A non-medical caregiver may not perform clinical tasks. This is not a
     preference; it is the licensure boundary and the agency's liability line.
     The task catalog is split, and BLOCKED tasks cannot be logged at all.
     --------------------------------------------------------------------- */
  var TASKS_ALLOWED = [
    { k:"Bathing / shower assist",     cat:"ADL" },
    { k:"Dressing & grooming",         cat:"ADL" },
    { k:"Toileting & incontinence care",cat:"ADL" },
    { k:"Transfer / mobility assist",  cat:"ADL" },
    { k:"Ambulation & exercise cues",  cat:"ADL" },
    { k:"Feeding assistance",          cat:"ADL" },
    { k:"Meal preparation",            cat:"IADL" },
    { k:"Light housekeeping",          cat:"IADL" },
    { k:"Laundry & linens",            cat:"IADL" },
    { k:"Grocery & errands",           cat:"IADL" },
    { k:"Transportation to appointment",cat:"IADL" },
    { k:"Medication REMINDER",         cat:"IADL", note:"Remind and observe only. The client self-administers." },
    { k:"Companionship & conversation",cat:"Support" },
    { k:"Safety supervision",          cat:"Support" },
    { k:"Vitals OBSERVATION (report only)", cat:"Support", note:"Note what is observed and report it. No interpretation, no action." }
  ];
  var TASKS_BLOCKED = [
    { k:"Administering medication",  why:"Med administration is a licensed nursing act. Reminders only." },
    { k:"Injections / insulin",      why:"Licensed nursing act. Never delegable to a non-medical aide." },
    { k:"Wound / dressing care",     why:"Skilled nursing. Requires a home health agency, not home care." },
    { k:"Tube feeding (G/J tube)",   why:"Skilled nursing act." },
    { k:"Catheter or ostomy care",   why:"Skilled nursing act." },
    { k:"Blood draw / glucometer stick", why:"Invasive procedure. Licensed staff only." },
    { k:"Clinical assessment or diagnosis", why:"Outside the scope of a non-medical aide, always." },
    { k:"Changing a care plan",      why:"Only the care coordinator may amend an authorized plan." }
  ];
  function taskIsBlocked(name){
    return TASKS_BLOCKED.some(function(t){ return t.k.toLowerCase() === String(name||"").toLowerCase(); });
  }
  function blockReason(name){
    var t = TASKS_BLOCKED.filter(function(x){ return x.k.toLowerCase() === String(name||"").toLowerCase(); })[0];
    return t ? t.why : "";
  }

  /* CREDENTIALS. Every caregiver carries these; a lapsed REQUIRED credential is
     this vertical's stop-work event — the aide cannot be scheduled. */
  var CREDS = [
    { k:"Background check",  required:true,  cycleMo:24, note:"Statewide + national criminal, re-run on cycle." },
    { k:"CPR / First Aid",   required:true,  cycleMo:24, note:"Two-year certification." },
    { k:"TB screening",      required:true,  cycleMo:12, note:"Annual." },
    { k:"Driver's license",  required:false, cycleMo:48, note:"Required only for transportation shifts." },
    { k:"Auto insurance",    required:false, cycleMo:12, note:"Required only for transportation shifts." },
    { k:"MVR check",         required:false, cycleMo:12, note:"Motor vehicle record, transportation shifts." },
    { k:"Orientation hours", required:true,  cycleMo:0,  note:"State-mandated pre-service training hours." },
    { k:"Annual in-service", required:true,  cycleMo:12, note:"Continuing education hours per state rule." },
    { k:"Dementia training", required:false, cycleMo:0,  note:"Required to take Dementia Care assignments." }
  ];
  var CRED_WARN_DAYS = 45;   // inside this window a credential reads "expiring"

  /* SKILLS — the match engine scores against these. */
  var SKILLS = ["Hoyer lift","Gait belt transfer","Two-person transfer","Dementia","Hospice comfort",
                "Diabetic meal prep","Manual wheelchair","Bariatric care","Hearing impaired",
                "Spanish","ASL","Pet friendly","Non-smoker","Male client comfortable","Female client preferred"];

  /* Overtime / differential rules. These are the reason generic scheduling
     software fails an agency: the SAME hour has two prices and they move
     independently. All rates below are the agency's DRAFT policy. */
  var RATE_RULES = {
    otAfterHours: 40,      // hours per caregiver per week before overtime
    otMultiplier: 1.5,     // on the PAY side only; the bill rate does not auto-multiply
    weekendPayAdj: 1.50,   // $/hr added to pay on Sat/Sun
    weekendBillAdj: 2.00,  // $/hr added to the client's bill on Sat/Sun
    holidayMultiplier: 1.5,// both sides on an observed holiday
    travelPayPerHr: 14.00, // paid drive time between back-to-back clients
    mileageRate: 0.70,     // $/mile reimbursement, not wages
    burdenPct: 0.171       // employer taxes + workers' comp, applied to pay for margin math
  };

  /* EVV rules. */
  var EVV = {
    geofenceMeters: 150,       // clock-in must land inside this radius of the client's home
    lateGraceMin: 7,           // minutes after start before a visit reads LATE
    noShowMin: 20,             // minutes after start with no clock-in -> NO-SHOW alert
    missedOutHrs: 2            // hours past scheduled end with no clock-out -> MISSED OUT
  };

  /* ATS stages — a mobile-first hourly funnel, not a white-collar one. */
  var ATS_STAGES = ["Applied","Screened","Interview","Offer","Onboarding","Active","Declined"];

  /* Referral source types — where home care business actually comes from. */
  var REFERRER_TYPES = ["Hospital discharge","Case manager","Elder law attorney","Skilled nursing facility",
                        "Assisted living","Physician office","Hospice","Area Agency on Aging","Word of mouth","Web / search"];

  /* ⚠ Benchmarks ship SOURCED-OR-BLANK. No national home-care median is
     asserted here because none has been sourced into this build. */
  var BENCH = {
    grossMarginPct:  { value:null, note:"Not yet sourced — enter your own target." },
    turnoverPct:     { value:null, note:"Industry commentary cites 60–80%/yr; not sourced to a primary study here." },
    fillRatePct:     { value:null, note:"Not yet sourced." },
    evvCompliancePct:{ value:null, note:"State-set. Enter your state's threshold." }
  };

  /* What this OS replaces — used on the marketing page and the Books room. */
  var REPLACES = [
    "Scheduling + EVV platform",
    "Applicant tracking system",
    "E-signature service",
    "Referral CRM",
    "Family communication portal",
    "Billing + invoicing tool",
    "Credential tracking spreadsheet"
  ];

  global.__SAH_CANON__ = {
    SERVICE_LINES:SERVICE_LINES, PAYERS:PAYERS, TASKS_ALLOWED:TASKS_ALLOWED,
    TASKS_BLOCKED:TASKS_BLOCKED, CREDS:CREDS, SKILLS:SKILLS, RATE_RULES:RATE_RULES,
    EVV:EVV, ATS_STAGES:ATS_STAGES, REFERRER_TYPES:REFERRER_TYPES
  };

  /* ====================================================================
     SEED — Cedar Hollow Home Care, Coeur d'Alene, Idaho.
     A real-shaped agency: 14 active clients, 12 caregivers, a full week of
     shifts, a live recruiting pipeline, and a referral book. Every number on
     every screen is computed from this — nothing on a dashboard is typed in.
     ==================================================================== */

  /* format from LOCAL parts — never toISOString(), which shifts the day */
  function iso(d){
    var m = d.getMonth()+1, day = d.getDate();
    return d.getFullYear() + "-" + (m<10?"0":"") + m + "-" + (day<10?"0":"") + day;
  }
  function addDays(d, n){ var x = new Date(d.getTime()); x.setDate(x.getDate()+n); return x; }
  function addMonths(d, n){ var x = new Date(d.getTime()); x.setMonth(x.getMonth()+n); return x; }
  var WEEK_START = (function(){ var d = new Date(TODAY.getTime()); d.setDate(d.getDate() - d.getDay()); return d; })();

  /* Credential expiry helper used by the seed so some are healthy, some are
     expiring, and exactly one is lapsed — a real book always has all three. */
  function credOn(monthsOut){ return iso(addMonths(TODAY, monthsOut)); }

  var SEED = {};

  SEED.agency = {
    name:"Cedar Hollow Home Care",
    dba:"Cedar Hollow Home Care, LLC",
    city:"Coeur d'Alene", state:"ID",
    license:"ID-PCA-0000 (enter your license number)",
    administrator:"Marisol Vance",
    phone:"(208) 555-0147",
    officeLat:47.6777, officeLng:-116.7805,
    states:["ID","WA"],
    holidays:["2026-01-01","2026-05-25","2026-07-04","2026-09-07","2026-11-26","2026-12-25"]
  };

  SEED.caregivers = [
    { id:"cg1",  name:"Alma Reyes",       phone:"(208) 555-0182", city:"Coeur d'Alene", lat:47.6910, lng:-116.7690,
      hired:"2023-04-11", payRate:19.50, status:"Active", rating:4.9, maxHrs:38,
      skills:["Hoyer lift","Gait belt transfer","Dementia","Spanish","Non-smoker"],
      avail:{mon:"6a-6p",tue:"6a-6p",wed:"6a-6p",thu:"6a-6p",fri:"6a-2p",sat:"",sun:""},
      creds:{ "Background check":credOn(14), "CPR / First Aid":credOn(9), "TB screening":credOn(5),
              "Driver's license":credOn(30), "Auto insurance":credOn(7), "MVR check":credOn(6),
              "Orientation hours":"complete", "Annual in-service":credOn(4), "Dementia training":"complete" } },
    { id:"cg2",  name:"Denise Whitmore",  phone:"(208) 555-0119", city:"Hayden", lat:47.7660, lng:-116.7866,
      hired:"2022-09-06", payRate:21.00, status:"Active", rating:4.8, maxHrs:40,
      skills:["Two-person transfer","Bariatric care","Hospice comfort","Non-smoker"],
      avail:{mon:"7a-7p",tue:"7a-7p",wed:"",thu:"7a-7p",fri:"7a-7p",sat:"8a-4p",sun:""},
      creds:{ "Background check":credOn(19), "CPR / First Aid":credOn(2), "TB screening":credOn(8),
              "Driver's license":credOn(22), "Auto insurance":credOn(3), "MVR check":credOn(3),
              "Orientation hours":"complete", "Annual in-service":credOn(1), "Dementia training":"" } },
    { id:"cg3",  name:"Tyrell Booker",    phone:"(208) 555-0164", city:"Post Falls", lat:47.7180, lng:-116.9516,
      hired:"2024-01-22", payRate:20.00, status:"Active", rating:4.7, maxHrs:40,
      skills:["Hoyer lift","Manual wheelchair","Male client comfortable","Pet friendly"],
      avail:{mon:"8a-8p",tue:"8a-8p",wed:"8a-8p",thu:"",fri:"8a-8p",sat:"",sun:"9a-5p"},
      creds:{ "Background check":credOn(11), "CPR / First Aid":credOn(16), "TB screening":credOn(2),
              "Driver's license":credOn(26), "Auto insurance":credOn(9), "MVR check":credOn(9),
              "Orientation hours":"complete", "Annual in-service":credOn(7), "Dementia training":"" } },
    { id:"cg4",  name:"Priya Raman",      phone:"(208) 555-0198", city:"Coeur d'Alene", lat:47.6640, lng:-116.7960,
      hired:"2023-11-13", payRate:20.50, status:"Active", rating:5.0, maxHrs:32,
      skills:["Dementia","Diabetic meal prep","Female client preferred","Non-smoker","Hearing impaired"],
      avail:{mon:"7a-3p",tue:"7a-3p",wed:"7a-3p",thu:"7a-3p",fri:"7a-3p",sat:"",sun:""},
      creds:{ "Background check":credOn(16), "CPR / First Aid":credOn(12), "TB screening":credOn(9),
              "Driver's license":credOn(19), "Auto insurance":credOn(5), "MVR check":credOn(5),
              "Orientation hours":"complete", "Annual in-service":credOn(9), "Dementia training":"complete" } },
    { id:"cg5",  name:"Rosalind Fairley", phone:"(208) 555-0173", city:"Rathdrum", lat:47.8121, lng:-116.8960,
      hired:"2021-06-02", payRate:22.25, status:"Active", rating:4.9, maxHrs:40,
      skills:["Hoyer lift","Two-person transfer","Dementia","Hospice comfort","ASL"],
      avail:{mon:"6a-6p",tue:"",wed:"6a-6p",thu:"6a-6p",fri:"",sat:"7a-7p",sun:"7a-7p"},
      creds:{ "Background check":credOn(8), "CPR / First Aid":credOn(20), "TB screening":credOn(-1),
              "Driver's license":credOn(15), "Auto insurance":credOn(11), "MVR check":credOn(11),
              "Orientation hours":"complete", "Annual in-service":credOn(3), "Dementia training":"complete" } },
    { id:"cg6",  name:"Marcus Delgado",   phone:"(208) 555-0135", city:"Post Falls", lat:47.7050, lng:-116.9340,
      hired:"2024-06-17", payRate:19.00, status:"Active", rating:4.5, maxHrs:40,
      skills:["Manual wheelchair","Male client comfortable","Spanish","Pet friendly"],
      avail:{mon:"10a-10p",tue:"10a-10p",wed:"10a-10p",thu:"10a-10p",fri:"10a-10p",sat:"",sun:""},
      creds:{ "Background check":credOn(23), "CPR / First Aid":credOn(6), "TB screening":credOn(6),
              "Driver's license":credOn(33), "Auto insurance":credOn(1), "MVR check":credOn(2),
              "Orientation hours":"complete", "Annual in-service":credOn(11), "Dementia training":"" } },
    { id:"cg7",  name:"Junia Oyelaran",   phone:"(208) 555-0156", city:"Coeur d'Alene", lat:47.6845, lng:-116.7500,
      hired:"2025-02-04", payRate:19.75, status:"Active", rating:4.6, maxHrs:30,
      skills:["Gait belt transfer","Diabetic meal prep","Non-smoker","Female client preferred"],
      avail:{mon:"",tue:"8a-8p",wed:"8a-8p",thu:"8a-8p",fri:"8a-8p",sat:"8a-4p",sun:""},
      creds:{ "Background check":credOn(20), "CPR / First Aid":credOn(18), "TB screening":credOn(7),
              "Driver's license":credOn(28), "Auto insurance":credOn(8), "MVR check":credOn(8),
              "Orientation hours":"complete", "Annual in-service":credOn(6), "Dementia training":"" } },
    { id:"cg8",  name:"Hank Sorensen",    phone:"(208) 555-0121", city:"Hayden", lat:47.7490, lng:-116.7720,
      hired:"2022-03-28", payRate:21.50, status:"Active", rating:4.8, maxHrs:40,
      skills:["Two-person transfer","Bariatric care","Hoyer lift","Male client comfortable"],
      avail:{mon:"6p-6a",tue:"6p-6a",wed:"6p-6a",thu:"6p-6a",fri:"",sat:"",sun:"6p-6a"},
      creds:{ "Background check":credOn(6), "CPR / First Aid":credOn(14), "TB screening":credOn(4),
              "Driver's license":credOn(24), "Auto insurance":credOn(10), "MVR check":credOn(10),
              "Orientation hours":"complete", "Annual in-service":credOn(8), "Dementia training":"complete" } },
    { id:"cg9",  name:"Corinne Vasquez",  phone:"(208) 555-0188", city:"Coeur d'Alene", lat:47.6720, lng:-116.7640,
      hired:"2025-05-19", payRate:19.00, status:"Active", rating:4.4, maxHrs:24,
      skills:["Companion","Pet friendly","Spanish","Non-smoker"],
      avail:{mon:"9a-3p",tue:"9a-3p",wed:"",thu:"9a-3p",fri:"9a-3p",sat:"",sun:""},
      creds:{ "Background check":credOn(29), "CPR / First Aid":credOn(21), "TB screening":credOn(10),
              "Driver's license":credOn(31), "Auto insurance":credOn(6), "MVR check":credOn(6),
              "Orientation hours":"complete", "Annual in-service":credOn(10), "Dementia training":"" } },
    { id:"cg10", name:"Beatrix Nowak",    phone:"(208) 555-0142", city:"Rathdrum", lat:47.8040, lng:-116.8890,
      hired:"2023-08-07", payRate:20.75, status:"Active", rating:4.7, maxHrs:36,
      skills:["Dementia","Hospice comfort","Gait belt transfer","Female client preferred"],
      avail:{mon:"7a-7p",tue:"7a-7p",wed:"7a-7p",thu:"",fri:"7a-7p",sat:"",sun:"9a-5p"},
      creds:{ "Background check":credOn(13), "CPR / First Aid":credOn(1), "TB screening":credOn(11),
              "Driver's license":credOn(17), "Auto insurance":credOn(4), "MVR check":credOn(4),
              "Orientation hours":"complete", "Annual in-service":credOn(2), "Dementia training":"complete" } },
    { id:"cg11", name:"Odell Grant",      phone:"(208) 555-0127", city:"Post Falls", lat:47.7220, lng:-116.9410,
      hired:"2026-05-11", payRate:18.75, status:"Onboarding", rating:null, maxHrs:40,
      skills:["Manual wheelchair","Male client comfortable","Non-smoker"],
      avail:{mon:"8a-8p",tue:"8a-8p",wed:"8a-8p",thu:"8a-8p",fri:"8a-8p",sat:"8a-4p",sun:""},
      creds:{ "Background check":credOn(23), "CPR / First Aid":credOn(23), "TB screening":credOn(11),
              "Driver's license":credOn(27), "Auto insurance":credOn(9), "MVR check":"",
              "Orientation hours":"", "Annual in-service":"", "Dementia training":"" } },
    { id:"cg12", name:"Selma Achebe",     phone:"(208) 555-0176", city:"Coeur d'Alene", lat:47.6960, lng:-116.7880,
      hired:"2024-10-01", payRate:20.25, status:"Active", rating:4.8, maxHrs:40,
      skills:["Hoyer lift","Dementia","Diabetic meal prep","ASL","Non-smoker"],
      avail:{mon:"6a-6p",tue:"6a-6p",wed:"6a-6p",thu:"6a-6p",fri:"6a-6p",sat:"",sun:""},
      creds:{ "Background check":credOn(15), "CPR / First Aid":credOn(10), "TB screening":credOn(3),
              "Driver's license":credOn(21), "Auto insurance":credOn(12), "MVR check":credOn(12),
              "Orientation hours":"complete", "Annual in-service":credOn(5), "Dementia training":"complete" } }
  ];

  SEED.clients = [
    { id:"cl1",  name:"Eleanor Whitfield", city:"Coeur d'Alene", lat:47.6880, lng:-116.7710, age:84,
      line:"Personal Care", payer:"Private Pay", billRate:36.00, start:"2024-02-19", status:"Active",
      prefs:["Non-smoker","Female client preferred","Pet friendly"], needs:["Gait belt transfer","Dementia"],
      dx:"Early-stage Alzheimer's. Ambulatory with a walker.",
      family:[{name:"Karen Whitfield-Doyle", rel:"Daughter", role:"Payer + decisions", city:"Seattle, WA", phone:"(206) 555-0192", portal:true},
              {name:"Peter Whitfield", rel:"Son", role:"View only", city:"Boise, ID", phone:"(208) 555-0144", portal:true}],
      plan:["Bathing / shower assist","Dressing & grooming","Meal preparation","Medication REMINDER","Companionship & conversation","Safety supervision"] },
    { id:"cl2",  name:"Harold Bequette",  city:"Hayden", lat:47.7590, lng:-116.7810, age:79,
      line:"Personal Care", payer:"Medicaid Waiver", billRate:28.50, start:"2025-01-08", status:"Active",
      prefs:["Male client comfortable"], needs:["Hoyer lift","Two-person transfer"],
      dx:"Post-CVA, left-side weakness. Hoyer lift for all transfers.",
      family:[{name:"Denise Bequette", rel:"Wife", role:"Payer + decisions", city:"Hayden, ID", phone:"(208) 555-0166", portal:true}],
      plan:["Transfer / mobility assist","Bathing / shower assist","Toileting & incontinence care","Feeding assistance","Meal preparation"] },
    { id:"cl3",  name:"Marguerite Sol",   city:"Post Falls", lat:47.7100, lng:-116.9420, age:91,
      line:"Companion Care", payer:"Private Pay", billRate:32.00, start:"2023-09-30", status:"Active",
      prefs:["Non-smoker","Spanish"], needs:["Spanish"],
      dx:"Frail but cognitively intact. Lives alone; falls risk.",
      family:[{name:"Rafael Sol", rel:"Son", role:"Payer + decisions", city:"Spokane, WA", phone:"(509) 555-0173", portal:true},
              {name:"Ana Sol-Prieto", rel:"Daughter", role:"View + notes", city:"Portland, OR", phone:"(503) 555-0128", portal:true}],
      plan:["Companionship & conversation","Light housekeeping","Meal preparation","Grocery & errands","Safety supervision"] },
    { id:"cl4",  name:"Vernon Ashby",     city:"Coeur d'Alene", lat:47.6710, lng:-116.7590, age:88,
      line:"Dementia Care", payer:"LTC Insurance", billRate:38.00, start:"2024-11-04", status:"Active",
      prefs:["Non-smoker"], needs:["Dementia"],
      dx:"Mid-stage vascular dementia. Sundowning; wandering precautions.",
      family:[{name:"Lorraine Ashby", rel:"Daughter", role:"Payer + decisions", city:"Coeur d'Alene, ID", phone:"(208) 555-0155", portal:true}],
      plan:["Safety supervision","Companionship & conversation","Meal preparation","Dressing & grooming","Medication REMINDER"] },
    { id:"cl5",  name:"Ruth Ilminen",     city:"Rathdrum", lat:47.8090, lng:-116.8920, age:76,
      line:"Respite", payer:"VA Community Care", billRate:34.00, start:"2025-06-16", status:"Active",
      prefs:["Female client preferred"], needs:["Hospice comfort"],
      dx:"Hospice-enrolled. Respite blocks for the spouse who provides primary care.",
      family:[{name:"Aarne Ilminen", rel:"Husband", role:"Primary caregiver", city:"Rathdrum, ID", phone:"(208) 555-0139", portal:true}],
      plan:["Companionship & conversation","Safety supervision","Feeding assistance","Light housekeeping"] },
    { id:"cl6",  name:"Cliff Barrone",    city:"Post Falls", lat:47.7240, lng:-116.9280, age:82,
      line:"Overnight", payer:"Private Pay", billRate:33.00, start:"2025-03-25", status:"Active",
      prefs:["Male client comfortable","Pet friendly"], needs:["Bariatric care","Two-person transfer"],
      dx:"CHF with nocturnal restlessness. Awake-overnight coverage.",
      family:[{name:"Josie Barrone-Kemp", rel:"Daughter", role:"Payer + decisions", city:"Coeur d'Alene, ID", phone:"(208) 555-0117", portal:true}],
      plan:["Safety supervision","Toileting & incontinence care","Transfer / mobility assist","Companionship & conversation"] },
    { id:"cl7",  name:"Inez Caldwell",    city:"Coeur d'Alene", lat:47.6790, lng:-116.7960, age:87,
      line:"Personal Care", payer:"Medicaid Waiver", billRate:28.50, start:"2024-07-22", status:"Active",
      prefs:["Non-smoker","Female client preferred"], needs:["Gait belt transfer","Diabetic meal prep"],
      dx:"Type 2 diabetes, neuropathy. Diet-controlled meals are the core of the plan.",
      family:[{name:"Terrence Caldwell", rel:"Son", role:"Payer + decisions", city:"Hayden, ID", phone:"(208) 555-0181", portal:true}],
      plan:["Bathing / shower assist","Meal preparation","Medication REMINDER","Ambulation & exercise cues","Vitals OBSERVATION (report only)"] },
    { id:"cl8",  name:"Warren Tsai",      city:"Hayden", lat:47.7710, lng:-116.7950, age:73,
      line:"Transportation", payer:"Private Pay", billRate:30.00, start:"2026-01-13", status:"Active",
      prefs:["Non-smoker"], needs:["Manual wheelchair"],
      dx:"Post-surgical, non-driving for 6 months. Appointment and errand runs.",
      family:[{name:"May Tsai", rel:"Wife", role:"Payer + decisions", city:"Hayden, ID", phone:"(208) 555-0193", portal:true}],
      plan:["Transportation to appointment","Grocery & errands","Companionship & conversation"] },
    { id:"cl9",  name:"Dorothy Pell",     city:"Coeur d'Alene", lat:47.6930, lng:-116.7770, age:90,
      line:"Companion Care", payer:"LTC Insurance", billRate:31.00, start:"2023-05-02", status:"Active",
      prefs:["Non-smoker","Hearing impaired"], needs:["Hearing impaired"],
      dx:"Profound hearing loss. Communication board and written cues.",
      family:[{name:"Grant Pell", rel:"Son", role:"Payer + decisions", city:"Missoula, MT", phone:"(406) 555-0164", portal:true}],
      plan:["Companionship & conversation","Light housekeeping","Meal preparation","Laundry & linens"] },
    { id:"cl10", name:"Sal Moretti",      city:"Post Falls", lat:47.7150, lng:-116.9600, age:81,
      line:"Personal Care", payer:"Private Pay", billRate:36.00, start:"2025-09-08", status:"Active",
      prefs:["Male client comfortable","Non-smoker"], needs:["Hoyer lift"],
      dx:"Advanced Parkinson's. Full transfer assist.",
      family:[{name:"Gina Moretti", rel:"Daughter", role:"Payer + decisions", city:"Post Falls, ID", phone:"(208) 555-0108", portal:true},
              {name:"Anthony Moretti Jr.", rel:"Son", role:"Split payer", city:"Las Vegas, NV", phone:"(702) 555-0146", portal:true}],
      plan:["Transfer / mobility assist","Bathing / shower assist","Dressing & grooming","Feeding assistance","Medication REMINDER"] },
    { id:"cl11", name:"Faye Lindqvist",   city:"Rathdrum", lat:47.8150, lng:-116.9010, age:85,
      line:"Companion Care", payer:"Private Pay", billRate:32.00, start:"2026-04-06", status:"Active",
      prefs:["Pet friendly","Non-smoker"], needs:[],
      dx:"Independent but isolated. Two dogs in the home.",
      family:[{name:"Ingrid Lindqvist", rel:"Niece", role:"Payer + decisions", city:"Sandpoint, ID", phone:"(208) 555-0131", portal:true}],
      plan:["Companionship & conversation","Light housekeeping","Grocery & errands","Meal preparation"] },
    { id:"cl12", name:"Bertram Oduya",    city:"Coeur d'Alene", lat:47.6650, lng:-116.7820, age:78,
      line:"Personal Care", payer:"Medicaid Waiver", billRate:28.50, start:"2025-11-17", status:"Active",
      prefs:["Male client comfortable"], needs:["Gait belt transfer"],
      dx:"COPD with limited exertion tolerance. Paced ADL support.",
      family:[{name:"Naomi Oduya", rel:"Daughter", role:"Payer + decisions", city:"Coeur d'Alene, ID", phone:"(208) 555-0179", portal:true}],
      plan:["Bathing / shower assist","Dressing & grooming","Meal preparation","Light housekeeping","Medication REMINDER"] },
    { id:"cl13", name:"Lucille Trapp",    city:"Hayden", lat:47.7620, lng:-116.7690, age:93,
      line:"Live-in", payer:"LTC Insurance", billRate:29.00, start:"2024-04-29", status:"Active",
      prefs:["Female client preferred","Non-smoker"], needs:["Dementia","Two-person transfer"],
      dx:"Late-stage dementia. 24-hour placement with two-person transfers.",
      family:[{name:"Roberta Trapp-Nunez", rel:"Daughter", role:"Payer + decisions", city:"Phoenix, AZ", phone:"(602) 555-0187", portal:true}],
      plan:["Safety supervision","Transfer / mobility assist","Toileting & incontinence care","Feeding assistance","Bathing / shower assist"] },
    { id:"cl14", name:"Owen Kirtland",    city:"Post Falls", lat:47.7080, lng:-116.9550, age:69,
      line:"Respite", payer:"VA Community Care", billRate:34.00, start:"2026-06-22", status:"Pending start",
      prefs:["Male client comfortable","Non-smoker"], needs:[],
      dx:"Veteran, early-onset dementia. Respite blocks pending authorization.",
      family:[{name:"Sandra Kirtland", rel:"Wife", role:"Primary caregiver", city:"Post Falls, ID", phone:"(208) 555-0111", portal:true}],
      plan:["Companionship & conversation","Safety supervision","Transportation to appointment"] }
  ];

  /* ---------------------------------------------------------------- shifts
     A full operating week, built from each client's authorized pattern. This
     is what makes the vertical real: the schedule IS the product. Past shifts
     carry completed EVV records; today's are in flight; the rest are booked.
     A handful are deliberately UNFILLED — every agency has open shifts, and
     pretending otherwise would be a demo. */
  var SHIFT_PATTERNS = [
    /* clientId, weekday(0=Sun), start, end, preferred caregiver */
    ["cl1",1,"08:00","12:00","cg1"], ["cl1",3,"08:00","12:00","cg1"], ["cl1",5,"08:00","12:00","cg4"],
    ["cl2",1,"07:00","11:00","cg2"], ["cl2",2,"07:00","11:00","cg2"], ["cl2",4,"07:00","11:00","cg8"], ["cl2",5,"07:00","11:00",null],
    ["cl3",2,"10:00","14:00","cg9"], ["cl3",4,"10:00","14:00","cg9"], ["cl3",6,"10:00","14:00","cg6"],
    ["cl4",1,"13:00","19:00","cg10"],["cl4",2,"13:00","19:00","cg10"],["cl4",3,"13:00","19:00","cg5"],
    ["cl4",4,"13:00","19:00",null],  ["cl4",5,"13:00","19:00","cg10"],
    ["cl5",0,"09:00","15:00","cg5"], ["cl5",6,"09:00","15:00","cg5"],
    ["cl6",1,"20:00","06:00","cg8"], ["cl6",2,"20:00","06:00","cg8"], ["cl6",3,"20:00","06:00","cg8"], ["cl6",4,"20:00","06:00","cg8"],
    ["cl7",1,"09:00","13:00","cg4"], ["cl7",3,"09:00","13:00","cg4"], ["cl7",5,"09:00","13:00","cg7"],
    ["cl8",2,"09:00","12:00","cg3"], ["cl8",4,"09:00","12:00","cg3"],
    ["cl9",1,"11:00","15:00","cg12"],["cl9",3,"11:00","15:00","cg12"],["cl9",5,"11:00","15:00","cg12"],
    ["cl10",1,"07:00","13:00","cg3"],["cl10",2,"07:00","13:00","cg3"],["cl10",3,"07:00","13:00","cg12"],
    ["cl10",4,"07:00","13:00","cg3"],["cl10",5,"07:00","13:00","cg12"],
    ["cl11",2,"13:00","16:00","cg7"],["cl11",4,"13:00","16:00","cg7"],
    ["cl12",1,"10:00","14:00","cg7"],["cl12",3,"10:00","14:00","cg7"],["cl12",5,"10:00","14:00",null],
    ["cl13",1,"06:00","18:00","cg2"],["cl13",2,"06:00","18:00","cg10"],["cl13",3,"06:00","18:00","cg2"],
    ["cl13",4,"06:00","18:00","cg10"],["cl13",5,"06:00","18:00","cg2"],["cl13",6,"06:00","18:00","cg5"],["cl13",0,"06:00","18:00","cg5"]
  ];

  function hhmmToMin(s){ var p = String(s).split(":"); return (+p[0])*60 + (+p[1]); }
  function shiftHours(start, end){
    var a = hhmmToMin(start), b = hhmmToMin(end);
    if (b <= a) b += 24*60;           // overnight crosses midnight
    return (b - a) / 60;
  }
  function isWeekend(dateISO){ var d = new Date(dateISO+"T12:00:00"); var w = d.getDay(); return w===0 || w===6; }

  SEED.shifts = (function(){
    var out = [], n = 1;
    var todayISO = iso(TODAY);
    /* Build the current week plus the two prior weeks so the money rooms and
       the charts have real history to draw. */
    for (var wk = -2; wk <= 0; wk++) {
      for (var i = 0; i < SHIFT_PATTERNS.length; i++) {
        var p = SHIFT_PATTERNS[i];
        var day = addDays(WEEK_START, wk*7 + p[1]);
        var dISO = iso(day);
        var cl = SEED.clients.filter(function(c){ return c.id === p[0]; })[0];
        if (!cl) continue;
        if (cl.status === "Pending start") continue;
        if (dISO < cl.start) continue;
        var hrs = shiftHours(p[2], p[3]);
        var cgId = p[4];
        /* prior weeks are always covered; the open holes live in the live week */
        if (!cgId && wk < 0) cgId = ["cg6","cg9","cg7","cg12"][i % 4];
        var status = "Booked";
        if (dISO < todayISO)      status = cgId ? "Completed" : "Unfilled";
        else if (dISO === todayISO) status = cgId ? "In progress" : "OPEN";
        else                       status = cgId ? "Booked" : "OPEN";
        var s = {
          id:"sh"+(n++), clientId:cl.id, caregiverId:cgId || null,
          date:dISO, start:p[2], end:p[3], hours:hrs,
          line:cl.line, payer:cl.payer, billRate:cl.billRate,
          status:status, evv:null, mileage:0, note:""
        };
        /* Completed shifts carry a real EVV record. Most are clean; a few carry
           the exact exceptions a scheduler actually chases on a Monday. */
        if (status === "Completed") {
          /* A real week always contains a few exceptions. These are placed
             deliberately rather than left to chance, so Field Ops opens with
             the four states a coordinator actually chases: late, out of
             geofence, missed clock-out, and clean. */
          var k = out.length;
          var jitter = (k % 17 === 3) ? 11 : (k % 17 === 9) ? 14 : 0;  // late
          var geoOk  = (k % 19 !== 5);                                  // out of geofence
          var noOut  = (k % 23 === 7);                                  // missed clock-out
          s.evv = {
            inTs:  dISO + "T" + p[2] + ":00",
            inMin: jitter,
            outTs: noOut ? null : (dISO + "T" + p[3] + ":00"),
            inGeo: geoOk, outGeo: noOut ? null : geoOk,
            method:"Mobile app (GPS)",
            tasks: (cl.plan || []).slice(0, Math.max(3, (cl.plan||[]).length - 1)),
            note: ""
          };
          if (cl.line === "Transportation") s.mileage = 12 + (n % 9);
        }
        out.push(s);
      }
    }
    /* Guarantee the live week actually contains the four exception states.
       A Field Ops room that opens with nothing to do is a demo, not a tool. */
    (function(){
      var done = out.filter(function(s){ return s.status === "Completed" && s.evv; });
      /* Sprinkle, don't flood: roughly one visit in nine carries an exception,
         spread across the three weeks so both the live week and the billing
         week have something real to chase — and plenty that is clean. */
      done.forEach(function(s, i){
        s.evv.inMin = 0; s.evv.inGeo = true;
        if (!s.evv.outTs) s.evv.outTs = s.date + "T" + s.end + ":00";
        s.evv.outGeo = true;
      });
      [3, 14, 27, 41, 55].forEach(function(i){ if (done[i]) done[i].evv.inMin = 9 + (i % 7); });        // LATE
      [8, 33, 49].forEach(function(i){ if (done[i]) { done[i].evv.inGeo = false; done[i].evv.outGeo = false; } }); // GEOFENCE
      [11, 38].forEach(function(i){ if (done[i]) { done[i].evv.outTs = null; done[i].evv.outGeo = null; } });      // MISSED OUT
    })();

    /* Today's in-flight visits get a clock-in but no clock-out yet. */
    out.forEach(function(s){
      if (s.status === "In progress") {
        s.evv = { inTs:s.date+"T"+s.start+":00", inMin:0, outTs:null, inGeo:true, outGeo:null,
                  method:"Mobile app (GPS)", tasks:[], note:"" };
      }
    });
    return out;
  })();

  /* ------------------------------------------------------------- applicants */
  SEED.applicants = [
    { id:"ap1", name:"Shanice Bell",     phone:"(208) 555-0210", city:"Coeur d'Alene", source:"Indeed",
      applied:iso(addDays(TODAY,-1)), stage:"Applied", certs:["CPR / First Aid"], hasCar:true,
      avail:{mon:"6a-2p",tue:"6a-2p",wed:"6a-2p",thu:"6a-2p",fri:"6a-2p",sat:"",sun:""},
      exp:"3 yrs, assisted living", note:"" },
    { id:"ap2", name:"Marcus Ojeda",     phone:"(208) 555-0223", city:"Post Falls", source:"Careers page",
      applied:iso(addDays(TODAY,-1)), stage:"Applied", certs:[], hasCar:true,
      avail:{mon:"",tue:"2p-10p",wed:"2p-10p",thu:"2p-10p",fri:"2p-10p",sat:"2p-10p",sun:""},
      exp:"None — career changer", note:"" },
    { id:"ap3", name:"Georgia Pruitt",   phone:"(208) 555-0234", city:"Hayden", source:"Employee referral",
      applied:iso(addDays(TODAY,-3)), stage:"Screened", certs:["CPR / First Aid","Background check"], hasCar:true,
      avail:{mon:"7a-7p",tue:"7a-7p",wed:"7a-7p",thu:"",fri:"7a-7p",sat:"",sun:""},
      exp:"6 yrs, home care", note:"Referred by Denise Whitmore. Wants 30+ hrs." },
    { id:"ap4", name:"Devon Achterberg", phone:"(208) 555-0245", city:"Rathdrum", source:"Indeed",
      applied:iso(addDays(TODAY,-4)), stage:"Screened", certs:["CPR / First Aid"], hasCar:false,
      avail:{mon:"9a-5p",tue:"9a-5p",wed:"9a-5p",thu:"9a-5p",fri:"",sat:"",sun:""},
      exp:"1 yr, companion care", note:"No vehicle — companion-only routes." },
    { id:"ap5", name:"Nadia Farouk",     phone:"(208) 555-0256", city:"Coeur d'Alene", source:"ZipRecruiter",
      applied:iso(addDays(TODAY,-6)), stage:"Interview", certs:["CPR / First Aid","TB screening"], hasCar:true,
      avail:{mon:"6a-6p",tue:"6a-6p",wed:"",thu:"6a-6p",fri:"6a-6p",sat:"8a-4p",sun:""},
      exp:"8 yrs, hospice aide", note:"Interview booked. Strong hospice background." },
    { id:"ap6", name:"Cole Bettencourt", phone:"(208) 555-0267", city:"Post Falls", source:"Careers page",
      applied:iso(addDays(TODAY,-7)), stage:"Interview", certs:[], hasCar:true,
      avail:{mon:"8a-8p",tue:"8a-8p",wed:"8a-8p",thu:"8a-8p",fri:"8a-8p",sat:"",sun:""},
      exp:"2 yrs, memory care", note:"" },
    { id:"ap7", name:"Yolanda Prescott", phone:"(208) 555-0278", city:"Hayden", source:"Employee referral",
      applied:iso(addDays(TODAY,-11)), stage:"Offer", certs:["CPR / First Aid","Background check","TB screening"], hasCar:true,
      avail:{mon:"7a-3p",tue:"7a-3p",wed:"7a-3p",thu:"7a-3p",fri:"7a-3p",sat:"",sun:""},
      exp:"11 yrs, home care + CNA lapsed", note:"Offer out at $21.00. Awaiting signature." },
    { id:"ap8", name:"Trevon Mabry",     phone:"(208) 555-0289", city:"Coeur d'Alene", source:"Indeed",
      applied:iso(addDays(TODAY,-14)), stage:"Onboarding", certs:["CPR / First Aid","Background check"], hasCar:true,
      avail:{mon:"10a-10p",tue:"10a-10p",wed:"10a-10p",thu:"10a-10p",fri:"10a-10p",sat:"",sun:""},
      exp:"4 yrs, group home", note:"Orientation hours scheduled." },
    { id:"ap9", name:"Britt Halvorsen",  phone:"(208) 555-0291", city:"Rathdrum", source:"Web / search",
      applied:iso(addDays(TODAY,-9)), stage:"Declined", certs:[], hasCar:true,
      avail:{mon:"",tue:"",wed:"",thu:"",fri:"6p-10p",sat:"",sun:""},
      exp:"None", note:"Availability does not overlap any open route." }
  ];

  /* -------------------------------------------------------------- referrers
     The B2B side. In home care this book, not advertising, is where the
     durable volume comes from. */
  SEED.referrers = [
    { id:"rf1", org:"Kootenai Health — Case Management", contact:"Diane Kessler, RN", type:"Hospital discharge",
      phone:"(208) 555-0301", city:"Coeur d'Alene", lastTouch:iso(addDays(TODAY,-6)), cadenceDays:14,
      ytd:11, converted:8, note:"Discharge planners. Drop-by Tuesdays works best." },
    { id:"rf2", org:"North Idaho Elder Law", contact:"Grant Mielke, Esq.", type:"Elder law attorney",
      phone:"(208) 555-0312", city:"Coeur d'Alene", lastTouch:iso(addDays(TODAY,-19)), cadenceDays:30,
      ytd:6, converted:5, note:"Sends high-value private-pay. Highest conversion in the book." },
    { id:"rf3", org:"Lake City Senior Living", contact:"Pam Ostrander", type:"Assisted living",
      phone:"(208) 555-0323", city:"Coeur d'Alene", lastTouch:iso(addDays(TODAY,-3)), cadenceDays:21,
      ytd:9, converted:5, note:"Supplemental one-on-one inside their community." },
    { id:"rf4", org:"Hayden Family Medicine", contact:"Dr. Ruth Ayala", type:"Physician office",
      phone:"(208) 555-0334", city:"Hayden", lastTouch:iso(addDays(TODAY,-41)), cadenceDays:30,
      ytd:3, converted:2, note:"OVERDUE. Front-office staff turned over; re-introduce." },
    { id:"rf5", org:"Hospice of North Idaho", contact:"Marcus Feld", type:"Hospice",
      phone:"(208) 555-0345", city:"Coeur d'Alene", lastTouch:iso(addDays(TODAY,-8)), cadenceDays:14,
      ytd:7, converted:6, note:"Respite blocks for family caregivers. Fast turnarounds." },
    { id:"rf6", org:"Area Agency on Aging — Region 1", contact:"Lynette Barr", type:"Area Agency on Aging",
      phone:"(208) 555-0356", city:"Coeur d'Alene", lastTouch:iso(addDays(TODAY,-12)), cadenceDays:30,
      ytd:8, converted:4, note:"Medicaid waiver referrals. EVV-required hours." },
    { id:"rf7", org:"Post Falls Rehab & Nursing", contact:"Sheila Voigt", type:"Skilled nursing facility",
      phone:"(208) 555-0367", city:"Post Falls", lastTouch:iso(addDays(TODAY,-25)), cadenceDays:21,
      ytd:5, converted:3, note:"Short-stay discharges home." },
    { id:"rf8", org:"Panhandle Case Management", contact:"Ivy Trudeau", type:"Case manager",
      phone:"(208) 555-0378", city:"Rathdrum", lastTouch:iso(addDays(TODAY,-4)), cadenceDays:14,
      ytd:6, converted:4, note:"" },
    { id:"rf9", org:"VA Community Care — Spokane", contact:"Ray Bledsoe", type:"Case manager",
      phone:"(509) 555-0389", city:"Spokane, WA", lastTouch:iso(addDays(TODAY,-16)), cadenceDays:30,
      ytd:4, converted:3, note:"Veteran respite authorizations." },
    { id:"rf10",org:"Word of mouth — families", contact:"—", type:"Word of mouth",
      phone:"", city:"—", lastTouch:iso(TODAY), cadenceDays:0,
      ytd:12, converted:9, note:"Existing families referring neighbours. Highest-trust source." }
  ];

  /* -------------------------------------------------------------- inquiries
     Top-of-funnel: a family calls or submits the web form. Intake is a
     sequence — inquiry, assessment, agreement, start of care. */
  SEED.inquiries = [
    { id:"in1", family:"Bernadette Cho", client:"Walter Cho (father, 86)", city:"Coeur d'Alene",
      source:"Kootenai Health — Case Management", refId:"rf1", received:iso(addDays(TODAY,-1)),
      stage:"New inquiry", need:"Personal Care", hrsWk:20, payer:"Private Pay",
      note:"Discharging Thursday after a hip repair. Needs bathing + transfers." },
    { id:"in2", family:"Miles Trenton", client:"Adele Trenton (mother, 81)", city:"Hayden",
      source:"North Idaho Elder Law", refId:"rf2", received:iso(addDays(TODAY,-3)),
      stage:"Assessment booked", need:"Dementia Care", hrsWk:30, payer:"LTC Insurance",
      note:"Assessment Wednesday 10a. Carrier is Genworth; needs the carrier form." },
    { id:"in3", family:"Odette Marchand", client:"Self (72)", city:"Post Falls",
      source:"Word of mouth", refId:"rf10", received:iso(addDays(TODAY,-5)),
      stage:"Assessment complete", need:"Companion Care", hrsWk:12, payer:"Private Pay",
      note:"Assessment done. Agreement drafted, out for signature." },
    { id:"in4", family:"Sandra Kirtland", client:"Owen Kirtland (husband, 69)", city:"Post Falls",
      source:"VA Community Care — Spokane", refId:"rf9", received:iso(addDays(TODAY,-9)),
      stage:"Agreement signed", need:"Respite", hrsWk:16, payer:"VA Community Care",
      note:"Signed. Waiting on the VA authorization number before first shift." },
    { id:"in5", family:"Roland Beeman", client:"Iris Beeman (wife, 78)", city:"Rathdrum",
      source:"Hospice of North Idaho", refId:"rf5", received:iso(addDays(TODAY,-2)),
      stage:"New inquiry", need:"Respite", hrsWk:8, payer:"Private Pay",
      note:"Hospice-enrolled. Husband needs two afternoons a week." },
    { id:"in6", family:"Cheryl Nakamura", client:"Tomo Nakamura (father, 90)", city:"Coeur d'Alene",
      source:"Lake City Senior Living", refId:"rf3", received:iso(addDays(TODAY,-13)),
      stage:"Lost", need:"Personal Care", hrsWk:24, payer:"Private Pay",
      note:"Went with a competitor on price. Follow up in 60 days." }
  ];

  /* ====================================================================
     NATIVE E-SIGN — templates, fields, signer links, audit trail.
     No DocuSign, no PandaDoc, no vendor. A document is a record with typed
     fields; a signer gets an unguessable link; signing writes an immutable
     audit entry and freezes the record.

     LEGAL POSTURE (stated plainly, not fudged): US e-signature law (ESIGN +
     UETA) turns on four things — (1) the signer AGREED to do business
     electronically, (2) they INTENDED to sign, (3) the signature is
     ATTRIBUTABLE to them, and (4) the record is RETAINED and reproducible.
     This module captures all four and stamps them into the audit trail. It is
     NOT legal advice. Have counsel review the consent language before this is
     used on employment or healthcare agreements in a given state.
     ==================================================================== */
  var ESIGN_CONSENT =
    "By selecting Adopt and Sign, I agree to do business electronically with " +
    "{{AGENCY}}, I agree that my electronic signature is the legal equivalent of " +
    "my handwritten signature, and I intend to sign this record. I can request a " +
    "paper copy at any time and may withdraw consent to electronic records by " +
    "contacting the agency in writing.";

  var DOC_TEMPLATES = [
    { id:"t_service", title:"Home Care Services Agreement", who:"Client / responsible party",
      body:[
        "SERVICES. {{AGENCY}} will provide non-medical home care services to {{CLIENT}} at the address on file, on the schedule agreed in the care plan.",
        "SCOPE. Services are NON-MEDICAL. Caregivers may assist with activities of daily living, meals, housekeeping, errands, transportation and companionship. Caregivers may NOT administer medication, perform injections, wound care, tube feeding, catheter care, or any skilled nursing task.",
        "RATES. Services are billed at {{RATE}} per hour. Weekend hours carry a differential. Observed holidays are billed at 1.5×. Mileage is reimbursed at the published rate.",
        "BILLING. Payment terms: {{PAYER}} Invoices reflect verified visit hours only.",
        "CANCELLATION. Please give 24 hours notice to cancel a scheduled visit. Visits cancelled with less notice may be billed.",
        "TERMINATION. Either party may end this agreement with 14 days written notice.",
        "ACKNOWLEDGEMENT. I have received the client rights notice, the privacy notice, and the service agreement, and I have had the opportunity to ask questions."
      ],
      fields:[
        {k:"sig",   label:"Signature of client / responsible party", type:"signature", required:true},
        {k:"name",  label:"Printed name",     type:"text",  required:true},
        {k:"rel",   label:"Relationship to client", type:"text", required:true},
        {k:"date",  label:"Date",             type:"date",  required:true},
        {k:"ackScope", label:"I understand caregivers cannot perform medical tasks", type:"check", required:true}
      ] },
    { id:"t_careplan", title:"Care Plan Acknowledgement", who:"Client / responsible party",
      body:[
        "This acknowledges the authorized care plan for {{CLIENT}}, listing the specific tasks caregivers are authorized to perform.",
        "Only the tasks listed on the plan may be performed. Tasks may be added or removed only by the care coordinator, in writing.",
        "Any request for a task outside this plan must be raised with the office before it is performed."
      ],
      fields:[
        {k:"sig",  label:"Signature", type:"signature", required:true},
        {k:"name", label:"Printed name", type:"text", required:true},
        {k:"date", label:"Date", type:"date", required:true}
      ] },
    { id:"t_employ", title:"Caregiver Employment Packet", who:"Caregiver",
      body:[
        "OFFER. {{AGENCY}} offers employment as a non-medical caregiver at the rate stated in the offer, on an hourly, as-scheduled basis.",
        "SCOPE OF PRACTICE. I understand I may not administer medication, give injections, perform wound care, tube feeding, catheter or ostomy care, blood draws, or any skilled nursing task. I will report any request to do so to the office immediately.",
        "EVV. I understand I must clock in and out from the client's home using the agency app, and that visit time and location are recorded.",
        "CONFIDENTIALITY. Client information is confidential and will not be discussed or shared outside the agency.",
        "CREDENTIALS. I will keep my background check, CPR/First Aid, TB screening and training hours current, and I understand I cannot be scheduled if a required credential lapses."
      ],
      fields:[
        {k:"sig",   label:"Caregiver signature", type:"signature", required:true},
        {k:"name",  label:"Printed name", type:"text", required:true},
        {k:"date",  label:"Date", type:"date", required:true},
        {k:"ackScope", label:"I have read and understand the scope-of-practice limits", type:"check", required:true},
        {k:"ackEvv",   label:"I agree to clock in and out from the client's home", type:"check", required:true}
      ] },
    { id:"t_privacy", title:"Privacy & Client Rights Notice", who:"Client / responsible party",
      body:[
        "This notice describes how information about {{CLIENT}} is used and disclosed, and the client's rights.",
        "Client rights include: to be treated with dignity; to participate in care planning; to refuse care; to voice a grievance without retaliation; to privacy; and to be informed of charges."
      ],
      fields:[
        {k:"sig",  label:"Signature", type:"signature", required:true},
        {k:"name", label:"Printed name", type:"text", required:true},
        {k:"date", label:"Date", type:"date", required:true}
      ] },
    { id:"t_auth", title:"Payer Authorization / Insurance Assignment", who:"Client / responsible party",
      body:[
        "I authorize {{AGENCY}} to bill {{PAYER}} directly for authorized services, and to release the visit records necessary to support that billing.",
        "I understand I remain responsible for any amount the payer does not cover."
      ],
      fields:[
        {k:"sig",   label:"Signature", type:"signature", required:true},
        {k:"policy",label:"Policy / authorization number", type:"text", required:true},
        {k:"date",  label:"Date", type:"date", required:true}
      ] }
  ];
  function templateById(id){ return DOC_TEMPLATES.filter(function(t){return t.id===id;})[0] || null; }

  SEED.documents = [
    { id:"doc1", tpl:"t_service", title:"Home Care Services Agreement", subject:"Marguerite Sol",
      subjectId:"cl3", signer:{ name:"Rafael Sol", email:"rafael.sol@example.com", role:"Son · payer" },
      status:"Signed", created:iso(addDays(TODAY,-402)), sentTs:iso(addDays(TODAY,-402)),
      token:"SAH-9K4T-2M8Q", values:{ name:"Rafael Sol", rel:"Son", date:iso(addDays(TODAY,-401)), ackScope:true },
      audit:[
        {ts:iso(addDays(TODAY,-402))+"T14:02:11", who:"Marisol Vance", what:"Document created from template"},
        {ts:iso(addDays(TODAY,-402))+"T14:06:40", who:"Marisol Vance", what:"Sent for signature to Rafael Sol"},
        {ts:iso(addDays(TODAY,-401))+"T09:11:03", who:"Rafael Sol", what:"Opened the signing link"},
        {ts:iso(addDays(TODAY,-401))+"T09:12:55", who:"Rafael Sol", what:"Consented to do business electronically (ESIGN/UETA)"},
        {ts:iso(addDays(TODAY,-401))+"T09:13:20", who:"Rafael Sol", what:"Adopted and applied signature — record frozen"}
      ] },
    { id:"doc2", tpl:"t_service", title:"Home Care Services Agreement", subject:"Odette Marchand",
      subjectId:"in3", signer:{ name:"Odette Marchand", email:"o.marchand@example.com", role:"Client" },
      status:"Sent", created:iso(addDays(TODAY,-2)), sentTs:iso(addDays(TODAY,-2)),
      token:"SAH-7P2X-5R1D", values:{},
      audit:[
        {ts:iso(addDays(TODAY,-2))+"T11:20:04", who:"Marisol Vance", what:"Document created from template"},
        {ts:iso(addDays(TODAY,-2))+"T11:24:31", who:"Marisol Vance", what:"Sent for signature to Odette Marchand"},
        {ts:iso(addDays(TODAY,-1))+"T18:41:09", who:"Odette Marchand", what:"Opened the signing link"}
      ] },
    { id:"doc3", tpl:"t_employ", title:"Caregiver Employment Packet", subject:"Yolanda Prescott",
      subjectId:"ap7", signer:{ name:"Yolanda Prescott", email:"y.prescott@example.com", role:"Applicant · offer out" },
      status:"Sent", created:iso(addDays(TODAY,-3)), sentTs:iso(addDays(TODAY,-3)),
      token:"SAH-3B6V-9W7L", values:{},
      audit:[
        {ts:iso(addDays(TODAY,-3))+"T16:02:00", who:"Marisol Vance", what:"Document created from template"},
        {ts:iso(addDays(TODAY,-3))+"T16:03:12", who:"Marisol Vance", what:"Sent for signature to Yolanda Prescott"}
      ] },
    { id:"doc4", tpl:"t_employ", title:"Caregiver Employment Packet", subject:"Odell Grant",
      subjectId:"cg11", signer:{ name:"Odell Grant", email:"o.grant@example.com", role:"Caregiver · onboarding" },
      status:"Signed", created:iso(addDays(TODAY,-77)), sentTs:iso(addDays(TODAY,-77)),
      token:"SAH-1H8N-4C2K", values:{ name:"Odell Grant", date:iso(addDays(TODAY,-76)), ackScope:true, ackEvv:true },
      audit:[
        {ts:iso(addDays(TODAY,-77))+"T10:15:00", who:"Marisol Vance", what:"Document created from template"},
        {ts:iso(addDays(TODAY,-77))+"T10:16:44", who:"Marisol Vance", what:"Sent for signature to Odell Grant"},
        {ts:iso(addDays(TODAY,-76))+"T07:50:19", who:"Odell Grant", what:"Opened the signing link"},
        {ts:iso(addDays(TODAY,-76))+"T07:51:02", who:"Odell Grant", what:"Consented to do business electronically (ESIGN/UETA)"},
        {ts:iso(addDays(TODAY,-76))+"T07:51:38", who:"Odell Grant", what:"Adopted and applied signature — record frozen"}
      ] },
    { id:"doc5", tpl:"t_careplan", title:"Care Plan Acknowledgement", subject:"Vernon Ashby",
      subjectId:"cl4", signer:{ name:"Lorraine Ashby", email:"l.ashby@example.com", role:"Daughter · decisions" },
      status:"Draft", created:iso(TODAY), sentTs:null, token:"SAH-5D9J-6T3F", values:{},
      audit:[ {ts:iso(TODAY)+"T08:30:00", who:"Marisol Vance", what:"Document created from template — care plan revised, needs re-acknowledgement"} ] }
  ];

  /* --------------------------------------------------------------- systems */
  SEED.systems = [
    { k:"Scheduling & EVV",     state:"Native",  note:"This OS. Clock-in, geofence, task logging, offline capture." },
    { k:"E-signature",          state:"Native",  note:"This OS. Templates, signer links, audit trail." },
    { k:"Applicant tracking",   state:"Native",  note:"This OS. Careers page, mobile funnel, screening, interviews." },
    { k:"Payroll & invoicing",  state:"Native",  note:"This OS. Split-rate engine, OT, differentials, LTCI forms." },
    { k:"Referral CRM",         state:"Native",  note:"This OS." },
    { k:"Family portal",        state:"Native",  note:"This OS." },
    { k:"Background checks",    state:"Vendor",  note:"FCRA-regulated. Requires an accredited consumer reporting agency (e.g. Checkr, Asurint). The OS orders and files the result; it cannot produce it." },
    { k:"State EVV submission", state:"Vendor",  note:"Medicaid waiver hours must be fed to the state's mandated aggregator (Sandata / HHAeXchange / Tellus). The OS builds and queues the file; the state receives it." },
    { k:"Card & ACH movement",  state:"Vendor",  note:"Money movement requires a licensed processor (Stripe / Plaid). The OS computes and authorizes; the processor moves funds." },
    { k:"Job board syndication",state:"Vendor",  note:"Posting INTO Indeed / ZipRecruiter uses their API. Direct applications to the native careers page need no vendor." }
  ];

  /* ------------------------------------------------------------- approvals */
  SEED.approvals = [
    { id:"ap_1", title:"Rate increase — Eleanor Whitfield, $36.00 → $38.00/hr",
      dept:"Money", why:"Annual review; two-year client, no increase since start of care.",
      impact:"+$2.00/hr on ~12 hrs/wk. Requires 30 days written notice to the family.",
      stage:"Awaiting Anthony", conf:88, tags:["revenue"] },
    { id:"ap_2", title:"Offer — Yolanda Prescott at $21.00/hr",
      dept:"Recruiting", why:"11 yrs experience, all credentials current, availability covers the two open Friday routes.",
      impact:"Closes the cl2 and cl12 Friday gaps. Above band by $0.25.",
      stage:"Awaiting Anthony", conf:82, tags:["payroll"] },
    { id:"ap_3", title:"Send the Marchand services agreement",
      dept:"Intake", why:"Assessment complete, plan agreed, agreement drafted.",
      impact:"Starts care Monday at 12 hrs/wk, Companion Care, private pay.",
      stage:"Awaiting Anthony", conf:94, tags:["send"] },
    { id:"ap_4", title:"Write off 3.5 unverified Medicaid hours",
      dept:"Money", why:"Three visits missing a clock-out; without EVV they are not billable to the waiver.",
      impact:"-$99.75 revenue. Coach the two caregivers involved.",
      stage:"Awaiting Anthony", conf:76, tags:["revenue","compliance"] }
  ];

  SEED.invoices = [];   // computed on demand from verified shifts
  SEED.payruns  = [];   // computed on demand from verified shifts

  /* ====================================================================
     LOOKUPS
     ==================================================================== */
  function clientById(id){ return db().clients.filter(function(c){return c.id===id;})[0] || null; }
  function caregiverById(id){ return db().caregivers.filter(function(c){return c.id===id;})[0] || null; }
  function shiftById(id){ return db().shifts.filter(function(s){return s.id===id;})[0] || null; }
  function applicantById(id){ return db().applicants.filter(function(a){return a.id===id;})[0] || null; }
  function docById(id){ return db().documents.filter(function(d){return d.id===id;})[0] || null; }
  function docByToken(t){ return db().documents.filter(function(d){return d.token===t;})[0] || null; }
  function referrerById(id){ return db().referrers.filter(function(r){return r.id===id;})[0] || null; }

  function weekOf(dateISO){
    var d = new Date(dateISO+"T12:00:00");
    var s = addDays(d, -d.getDay());
    return iso(s);
  }
  function thisWeek(){ return iso(WEEK_START); }
  function shiftsInWeek(wk){ return db().shifts.filter(function(s){ return weekOf(s.date) === wk; }); }

  /* ====================================================================
     THE SPLIT RATE ENGINE
     The thing generic scheduling software gets wrong: one hour has TWO prices
     that move independently. The client's bill rate and the caregiver's pay
     rate are separate numbers with separate rules, and margin is what's left.
     ==================================================================== */
  function isHoliday(dateISO){ return (db().agency.holidays||[]).indexOf(dateISO) >= 0; }

  /* Weekly hours a caregiver has ALREADY been assigned before this shift —
     drives the overtime threshold. Overtime is a PAY-side event; the client is
     not automatically charged 1.5× because the agency over-scheduled. */
  function assignedHoursBefore(cgId, dateISO, shiftId){
    var wk = weekOf(dateISO);
    return db().shifts
      .filter(function(s){ return s.caregiverId === cgId && weekOf(s.date) === wk && s.id !== shiftId
                                  && (s.date < dateISO || (s.date === dateISO && s.id < shiftId)); })
      .reduce(function(a,s){ return a + (s.hours||0); }, 0);
  }

  function rateFor(shift){
    if (!shift) return null;
    var cg  = shift.caregiverId ? caregiverById(shift.caregiverId) : null;
    var hrs = shift.hours || 0;
    var wknd = isWeekend(shift.date), hol = isHoliday(shift.date);
    var R = RATE_RULES;

    /* ---- the client's side */
    var billBase = Number(shift.billRate) || 0;
    var billAdj  = wknd ? R.weekendBillAdj : 0;
    var billRate = billBase + billAdj;
    if (hol) billRate = billRate * R.holidayMultiplier;
    var billTotal = billRate * hrs;
    var mileage   = (Number(shift.mileage)||0) * R.mileageRate;

    /* ---- the caregiver's side */
    var payBase = cg ? Number(cg.payRate) : 0;
    var payAdj  = wknd ? R.weekendPayAdj : 0;
    var payRate = payBase + payAdj;
    if (hol) payRate = payRate * R.holidayMultiplier;

    /* overtime split: only the hours past the weekly threshold get the multiplier */
    var before = cg ? assignedHoursBefore(cg.id, shift.date, shift.id) : 0;
    var regHrs = Math.max(0, Math.min(hrs, R.otAfterHours - before));
    var otHrs  = Math.max(0, hrs - regHrs);
    var payTotal = (regHrs * payRate) + (otHrs * payRate * R.otMultiplier);

    var burden = payTotal * R.burdenPct;
    var cost   = payTotal + burden + mileage;
    var margin = billTotal - cost;

    return {
      hours:hrs, weekend:wknd, holiday:hol,
      billBase:billBase, billAdj:billAdj, billRate:billRate, billTotal:billTotal,
      payBase:payBase, payAdj:payAdj, payRate:payRate,
      regHrs:regHrs, otHrs:otHrs, payTotal:payTotal,
      burden:burden, mileageOwed:mileage, cost:cost,
      margin:margin, marginPct: billTotal ? (margin / billTotal) * 100 : 0
    };
  }

  /* ====================================================================
     THE MATCH ENGINE
     Ranks available caregivers for an open shift. Every component is a real
     operational constraint, and every score shows its reasons — a coordinator
     will not trust a number they cannot argue with.
     ==================================================================== */
  function haversineMi(lat1,lng1,lat2,lng2){
    function r(d){ return d*Math.PI/180; }
    var R = 3958.8;
    var dLat = r(lat2-lat1), dLng = r(lng2-lng1);
    var a = Math.sin(dLat/2)*Math.sin(dLat/2) +
            Math.cos(r(lat1))*Math.cos(r(lat2))*Math.sin(dLng/2)*Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  /* Drive time estimate. Honest label: this is a straight-line estimate at an
     assumed average speed, NOT a routed travel time. A routing API would
     replace this one function and nothing else. */
  function driveMinEstimate(mi){ return Math.round((mi / 26) * 60); }

  var DAYKEY = ["sun","mon","tue","wed","thu","fri","sat"];
  function parseAvailWindow(str){
    if (!str) return null;
    var m = String(str).toLowerCase().match(/^(\d+)(a|p)-(\d+)(a|p)$/);
    if (!m) return null;
    function to24(h, ap){ h = +h % 12; return ap === "p" ? h + 12 : h; }
    return { from: to24(m[1], m[2]) * 60, to: to24(m[3], m[4]) * 60 };
  }
  function availableFor(cg, shift){
    var d = new Date(shift.date+"T12:00:00");
    var w = parseAvailWindow((cg.avail||{})[DAYKEY[d.getDay()]]);
    if (!w) return false;
    var a = hhmmToMin(shift.start), b = hhmmToMin(shift.end);
    var to = w.to <= w.from ? w.to + 24*60 : w.to;      // overnight availability
    if (b <= a) b += 24*60;
    return a >= w.from && b <= to;
  }
  function alreadyBooked(cg, shift){
    var a = hhmmToMin(shift.start), b = hhmmToMin(shift.end); if (b<=a) b += 24*60;
    return db().shifts.some(function(s){
      if (s.caregiverId !== cg.id || s.date !== shift.date || s.id === shift.id) return false;
      var x = hhmmToMin(s.start), y = hhmmToMin(s.end); if (y<=x) y += 24*60;
      return a < y && x < b;
    });
  }
  function continuityCount(cgId, clientId){
    return db().shifts.filter(function(s){ return s.caregiverId===cgId && s.clientId===clientId && s.status==="Completed"; }).length;
  }
  function credBlockers(cg){
    var out = [];
    CREDS.forEach(function(c){
      if (!c.required) return;
      var v = (cg.creds||{})[c.k];
      if (!v) { out.push(c.k + " missing"); return; }
      if (v === "complete") return;
      if (v < iso(TODAY)) out.push(c.k + " EXPIRED");
    });
    return out;
  }

  function matchFor(shiftId){
    var shift = shiftById(shiftId); if (!shift) return [];
    var cl = clientById(shift.clientId); if (!cl) return [];
    var R = RATE_RULES;
    return db().caregivers.map(function(cg){
      var reasons = [], blockers = [], score = 0;

      /* hard blockers first — a blocked caregiver is never "almost right" */
      var cb = credBlockers(cg);
      if (cb.length) blockers.push(cb.join(" · "));
      if (cg.status !== "Active") blockers.push(cg.status);
      if (alreadyBooked(cg, shift)) blockers.push("Already on another visit");
      if (!availableFor(cg, shift)) blockers.push("Outside stated availability");
      if (cl.line === "Dementia Care" && (cg.creds||{})["Dementia training"] !== "complete")
        blockers.push("No dementia training");
      if (cl.line === "Transportation" && !((cg.creds||{})["Driver's license"] && (cg.creds||{})["Auto insurance"]))
        blockers.push("No licence/insurance on file");

      /* distance */
      var mi = haversineMi(cg.lat, cg.lng, cl.lat, cl.lng);
      var dm = driveMinEstimate(mi);
      if (mi <= 5)      { score += 30; reasons.push(mi.toFixed(1)+" mi (~"+dm+" min)"); }
      else if (mi <= 12){ score += 18; reasons.push(mi.toFixed(1)+" mi (~"+dm+" min)"); }
      else if (mi <= 20){ score += 8;  reasons.push(mi.toFixed(1)+" mi (~"+dm+" min)"); }
      else              { score += 0;  reasons.push(mi.toFixed(1)+" mi — long run"); }

      /* skills the client's care actually needs */
      var need = cl.needs || [], have = cg.skills || [];
      var hit = need.filter(function(n){ return have.indexOf(n) >= 0; });
      score += hit.length * 12;
      if (hit.length) reasons.push("Skills: " + hit.join(", "));
      var missSkill = need.filter(function(n){ return have.indexOf(n) < 0; });
      if (missSkill.length) reasons.push("Missing: " + missSkill.join(", "));

      /* the client's stated preferences — the thing families actually notice */
      var prefs = cl.prefs || [];
      var pHit = prefs.filter(function(p){ return have.indexOf(p) >= 0; });
      score += pHit.length * 8;
      if (pHit.length) reasons.push("Preferences met: " + pHit.join(", "));

      /* continuity — the same face, week after week, is the whole product */
      var cont = continuityCount(cg.id, cl.id);
      if (cont > 0) { score += Math.min(25, 5 + cont); reasons.push("Has worked this client "+cont+"×"); }

      /* overtime risk — filling a hole by pushing someone into OT costs margin */
      var before = assignedHoursBefore(cg.id, shift.date, shift.id);
      var after = before + (shift.hours||0);
      if (after > R.otAfterHours) {
        var otH = after - Math.max(before, R.otAfterHours);
        score -= 20; reasons.push("Pushes into overtime (+"+otH.toFixed(1)+" OT hrs)");
      } else if (after > (cg.maxHrs||40)) {
        score -= 12; reasons.push("Over their stated max of "+cg.maxHrs+" hrs");
      } else {
        reasons.push("Week would be "+after.toFixed(1)+" hrs");
      }

      /* rating */
      if (cg.rating) score += (cg.rating - 4) * 10;

      return {
        caregiver:cg, score: blockers.length ? -1 : Math.round(score),
        miles:mi, driveMin:dm, reasons:reasons, blockers:blockers,
        weekHoursAfter: after
      };
    }).sort(function(a,b){ return b.score - a.score; });
  }

  /* ====================================================================
     EVV — Electronic Visit Verification
     ==================================================================== */
  function evvState(shift){
    if (!shift) return "—";
    if (shift.status === "OPEN" || shift.status === "Unfilled") return "Unfilled";
    var e = shift.evv;
    if (!e || !e.inTs) {
      if (shift.status === "Booked") return "Scheduled";
      return "No clock-in";
    }
    if (!e.inGeo) return "Out of geofence";
    if (!e.outTs) {
      if (shift.status === "In progress") return "On visit";
      return "Missed clock-out";
    }
    if ((e.inMin||0) > EVV.lateGraceMin) return "Late";
    return "Verified";
  }
  function evvIsClean(shift){ var s = evvState(shift); return s === "Verified" || s === "On visit"; }
  /* Billable only if the payer doesn't require EVV, or the visit is verified. */
  function isBillable(shift){
    if (shift.status !== "Completed") return false;
    if (!payerRequiresEVV(shift.payer)) return !!(shift.evv && shift.evv.outTs);
    return evvState(shift) === "Verified" || evvState(shift) === "Late";
  }
  /* Compliance is judged on a TRAILING WINDOW, not a calendar week. On a Monday
     a calendar week holds one day of visits, and a percentage off one day is
     noise, not a metric. Default window: the last 14 days. */
  var EVV_WINDOW_DAYS = 14;
  function recentCompleted(days){
    var from = iso(addDays(TODAY, -(days || EVV_WINDOW_DAYS)));
    return db().shifts.filter(function(s){ return s.status === "Completed" && s.date >= from; });
  }
  function evvExceptions(days){
    return recentCompleted(days).filter(function(s){
      var st = evvState(s);
      return st === "Out of geofence" || st === "Missed clock-out" || st === "No clock-in" || st === "Late";
    }).sort(function(a,b){ return a.date < b.date ? 1 : -1; });
  }
  function evvCompliancePct(days){
    var done = recentCompleted(days);
    if (!done.length) return null;
    return (done.filter(evvIsClean).length / done.length) * 100;
  }

  /* clock in / out — the caregiver-app actions, callable from the EVV room */
  function clockIn(shiftId, opts){
    opts = opts || {};
    return save(function(d){
      var s = d.shifts.filter(function(x){return x.id===shiftId;})[0]; if (!s) return;
      var cl = d.clients.filter(function(c){return c.id===s.clientId;})[0];
      var geoOk = opts.geo === undefined ? true : !!opts.geo;
      s.evv = { inTs: s.date+"T"+s.start+":00", inMin: opts.lateMin||0, outTs:null,
                inGeo:geoOk, outGeo:null,
                method: opts.offline ? "Mobile app (offline, synced)" : "Mobile app (GPS)",
                tasks:[], note:"" };
      s.status = "In progress";
      logBus(d, "Field", (caregiverName(d, s.caregiverId))+" clocked in at "+(cl?cl.name:"client")+
        (geoOk?"":" — OUTSIDE the "+EVV.geofenceMeters+"m geofence"));
    });
  }
  function clockOut(shiftId, tasks, note){
    return save(function(d){
      var s = d.shifts.filter(function(x){return x.id===shiftId;})[0]; if (!s || !s.evv) return;
      var clean = (tasks||[]).filter(function(t){ return !taskIsBlocked(t); });
      s.evv.outTs = s.date+"T"+s.end+":00";
      s.evv.outGeo = true;
      s.evv.tasks = clean;
      s.evv.note = note || "";
      s.status = "Completed";
      logBus(d, "Field", "Visit completed — "+clean.length+" tasks logged.");
    });
  }
  function caregiverName(d, id){ var c=(d.caregivers||[]).filter(function(x){return x.id===id;})[0]; return c?c.name:"Unassigned"; }

  /* ====================================================================
     CREDENTIALS
     ==================================================================== */
  function daysUntil(dISO){
    if (!dISO || dISO === "complete") return null;
    return Math.round((new Date(dISO+"T12:00:00") - TODAY) / 86400000);
  }
  function credStatus(cg, key){
    var meta = CREDS.filter(function(c){return c.k===key;})[0] || {};
    var v = (cg.creds||{})[key];
    if (!v) return { state: meta.required ? "missing" : "n/a", days:null, value:null };
    if (v === "complete") return { state:"complete", days:null, value:"complete" };
    var dd = daysUntil(v);
    if (dd < 0)  return { state:"expired",  days:dd, value:v };
    if (dd <= CRED_WARN_DAYS) return { state:"expiring", days:dd, value:v };
    return { state:"current", days:dd, value:v };
  }
  function credIssues(){
    var out = [];
    db().caregivers.forEach(function(cg){
      CREDS.forEach(function(c){
        var st = credStatus(cg, c.k);
        if (st.state === "expired" || st.state === "expiring" || (st.state === "missing" && c.required))
          out.push({ caregiver:cg, cred:c, status:st });
      });
    });
    return out.sort(function(a,b){
      var rank = {expired:0, missing:1, expiring:2};
      return (rank[a.status.state]-rank[b.status.state]) || ((a.status.days||0)-(b.status.days||0));
    });
  }
  function cannotBeScheduled(){
    return db().caregivers.filter(function(cg){ return credBlockers(cg).length > 0; });
  }
  /* The finding an auditor writes up: someone is ON the schedule who is not
     legally clear to work it. Surfaced loudly rather than quietly tolerated. */
  function scheduledButBlocked(wk){
    var blocked = {}; cannotBeScheduled().forEach(function(c){ blocked[c.id] = credBlockers(c); });
    return shiftsInWeek(wk || thisWeek())
      .filter(function(s){ return s.caregiverId && blocked[s.caregiverId] && s.status !== "Completed"; })
      .map(function(s){ return { shift:s, caregiver:caregiverById(s.caregiverId),
                                 client:clientById(s.clientId), why:blocked[s.caregiverId] }; });
  }

  /* ====================================================================
     MONEY — computed, never typed
     ==================================================================== */
  /* SCOPE matters, and getting it wrong is how a dashboard lies. Mid-week,
     "revenue" can mean two different true things:
       assigned  — everything on the schedule with a caregiver on it. What the
                   week is WORTH if it runs as booked. The planning number.
       delivered — only visits already completed or in flight. What has actually
                   been earned SO FAR. The cash-reality number.
     Every money function takes the scope explicitly so the two are never
     silently mixed. Hours, revenue and payroll all read the same scope. */
  function scoped(wk, scope){
    var rows = shiftsInWeek(wk || thisWeek());
    if (scope === "delivered") return rows.filter(function(s){ return s.status==="Completed"||s.status==="In progress"; });
    if (scope === "billable")  return rows.filter(isBillable);
    return rows.filter(function(s){ return !!s.caregiverId; });      // assigned
  }
  function lastWeek(){ return iso(addDays(WEEK_START, -7)); }
  function weekRevenue(wk, scope){
    return scoped(wk, scope).reduce(function(a,s){ var r=rateFor(s); return a + (r?r.billTotal + r.mileageOwed:0); }, 0);
  }
  function weekCost(wk, scope){
    return scoped(wk, scope).reduce(function(a,s){ var r=rateFor(s); return a + (r?r.cost:0); }, 0);
  }
  function weekMargin(wk, scope){ return weekRevenue(wk,scope) - weekCost(wk,scope); }
  function weekMarginPct(wk, scope){ var r = weekRevenue(wk,scope); return r ? (weekMargin(wk,scope)/r)*100 : 0; }
  function weekHours(wk, scope){
    return scoped(wk, scope).reduce(function(a,s){ return a + (s.hours||0); }, 0);
  }
  function openShifts(wk){ return shiftsInWeek(wk||thisWeek()).filter(function(s){ return !s.caregiverId; }); }
  function openHours(wk){ return openShifts(wk).reduce(function(a,s){ return a+(s.hours||0); },0); }
  function fillRate(wk){
    var all = shiftsInWeek(wk||thisWeek());
    if (!all.length) return null;
    return (all.filter(function(s){return s.caregiverId;}).length / all.length) * 100;
  }
  function byKey(wk, scope, keyFn, valFn){
    var m = {};
    scoped(wk, scope).forEach(function(s){
      var r = rateFor(s); if (!r) return;
      var k = keyFn(s); m[k] = (m[k]||0) + valFn(r);
    });
    return m;
  }
  function revenueByLine(wk, scope){ return byKey(wk,scope,function(s){return s.line;}, function(r){return r.billTotal;}); }
  function revenueByPayer(wk, scope){ return byKey(wk,scope,function(s){return s.payer;}, function(r){return r.billTotal;}); }
  function marginByLine(wk, scope){ return byKey(wk,scope,function(s){return s.line;}, function(r){return r.margin;}); }
  function marginByPayer(wk, scope){ return byKey(wk,scope,function(s){return s.payer;}, function(r){return r.margin;}); }
  /* Margin PERCENT by line — the number that tells an owner which service line
     is quietly carrying the others. Computed, never asserted. */
  function marginPctBy(wk, scope, keyFn){
    var rev = byKey(wk,scope,keyFn,function(r){return r.billTotal;});
    var mar = byKey(wk,scope,keyFn,function(r){return r.margin;});
    var out = {};
    Object.keys(rev).forEach(function(k){ out[k] = rev[k] ? (mar[k]/rev[k])*100 : 0; });
    return out;
  }
  function overtimeHours(wk, scope){
    return scoped(wk, scope).reduce(function(a,s){ var r=rateFor(s); return a + (r?r.otHrs:0); },0);
  }
  function unbillableHours(wk){
    return shiftsInWeek(wk||thisWeek())
      .filter(function(s){ return s.status==="Completed" && !isBillable(s); })
      .reduce(function(a,s){ return a+(s.hours||0); },0);
  }

  /* Client invoice for a week — the private-pay / LTCI document. */
  function invoiceFor(clientId, wk){
    /* Agencies bill the week that FINISHED, on verified hours — not the week
       still in progress. Default accordingly. */
    wk = wk || lastWeek();
    var cl = clientById(clientId); if (!cl) return null;
    var lines = shiftsInWeek(wk)
      .filter(function(s){ return s.clientId===clientId && isBillable(s); })
      .map(function(s){
        var r = rateFor(s);
        return { date:s.date, start:s.start, end:s.end, hours:s.hours, line:s.line,
                 caregiver: caregiverName(db(), s.caregiverId),
                 rate:r.billRate, weekend:r.weekend, holiday:r.holiday,
                 amount:r.billTotal, mileage:r.mileageOwed, evv:evvState(s) };
      });
    var hours = lines.reduce(function(a,l){return a+l.hours;},0);
    var sub   = lines.reduce(function(a,l){return a+l.amount;},0);
    var miles = lines.reduce(function(a,l){return a+l.mileage;},0);
    return { client:cl, week:wk, lines:lines, hours:hours, subtotal:sub, mileage:miles, total:sub+miles,
             payer:cl.payer, terms:payer(cl.payer).terms };
  }
  /* Caregiver pay stub for a week. */
  function paystubFor(cgId, wk, scope){
    wk = wk || thisWeek();
    var cg = caregiverById(cgId); if (!cg) return null;
    var lines = scoped(wk, scope)
      .filter(function(s){ return s.caregiverId===cgId; })
      .map(function(s){
        var r = rateFor(s);
        return { date:s.date, client: (clientById(s.clientId)||{}).name, hours:s.hours,
                 regHrs:r.regHrs, otHrs:r.otHrs, rate:r.payRate, weekend:r.weekend, holiday:r.holiday,
                 amount:r.payTotal, mileage:r.mileageOwed };
      });
    var reg = lines.reduce(function(a,l){return a+l.regHrs;},0);
    var ot  = lines.reduce(function(a,l){return a+l.otHrs;},0);
    var gross = lines.reduce(function(a,l){return a+l.amount;},0);
    var miles = lines.reduce(function(a,l){return a+l.mileage;},0);
    return { caregiver:cg, week:wk, lines:lines, regHrs:reg, otHrs:ot, gross:gross, mileage:miles, total:gross+miles };
  }
  function payrollTotals(wk, scope){
    wk = wk || thisWeek();
    var stubs = db().caregivers.map(function(c){ return paystubFor(c.id, wk, scope); }).filter(function(s){ return s && s.lines.length; });
    return {
      week:wk, stubs:stubs,
      gross: stubs.reduce(function(a,s){return a+s.gross;},0),
      mileage: stubs.reduce(function(a,s){return a+s.mileage;},0),
      otHrs: stubs.reduce(function(a,s){return a+s.otHrs;},0),
      burden: stubs.reduce(function(a,s){return a+s.gross;},0) * RATE_RULES.burdenPct
    };
  }

  /* ====================================================================
     E-SIGN OPERATIONS
     ==================================================================== */
  function newToken(){
    var A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", p = function(n){
      var s=""; for (var i=0;i<n;i++) s += A[Math.floor(Math.random()*A.length)]; return s;
    };
    return "SAH-" + p(4) + "-" + p(4);
  }
  function fillTemplate(str, ctx){
    return String(str||"")
      .replace(/\{\{AGENCY\}\}/g, ctx.agency || db().agency.name)
      .replace(/\{\{CLIENT\}\}/g, ctx.client || "the client")
      .replace(/\{\{RATE\}\}/g,   ctx.rate   || "the agreed rate")
      .replace(/\{\{PAYER\}\}/g,  ctx.payer  || "as agreed with the agency.");
  }
  function docContext(doc){
    var d = db(), ctx = { agency:d.agency.name, client:doc.subject };
    var cl = (d.clients||[]).filter(function(c){return c.id===doc.subjectId;})[0];
    if (cl) { ctx.client = cl.name; ctx.rate = money(cl.billRate); ctx.payer = payer(cl.payer).terms; }
    return ctx;
  }
  function createDoc(tplId, subject, subjectId, signer){
    var tpl = templateById(tplId); if (!tpl) return null;
    var id = "doc" + (Date.now().toString(36));
    save(function(d){
      d.documents.unshift({
        id:id, tpl:tplId, title:tpl.title, subject:subject, subjectId:subjectId||null,
        signer: signer || {name:"", email:"", role:""},
        status:"Draft", created:iso(TODAY), sentTs:null, token:newToken(), values:{},
        audit:[{ ts: new Date().toISOString().slice(0,19), who:d.agency.administrator, what:"Document created from template" }]
      });
      logBus(d, "Paper", "Drafted "+tpl.title+" for "+subject+".");
    });
    return docById(id);
  }
  /* Nothing SENDS on its own — Ghost Mode. "Send" mints the signer link and
     stages it; the office copies the link out or the approval desk releases it. */
  function sendDoc(id){
    return save(function(d){
      var doc = d.documents.filter(function(x){return x.id===id;})[0]; if (!doc) return;
      if (!doc.token) doc.token = newToken();
      doc.status = "Sent"; doc.sentTs = iso(TODAY);
      doc.audit.push({ ts:new Date().toISOString().slice(0,19), who:d.agency.administrator,
                       what:"Signer link minted for "+(doc.signer.name||"the signer") });
    });
  }
  function openDoc(token){
    save(function(d){
      var doc = d.documents.filter(function(x){return x.token===token;})[0]; if (!doc) return;
      if (doc.status === "Signed") return;
      doc.status = "Viewed";
      doc.audit.push({ ts:new Date().toISOString().slice(0,19), who:doc.signer.name||"Signer", what:"Opened the signing link" });
    });
    return docByToken(token);
  }
  /* The signing act. Records consent, intent, attribution and retention —
     the four things ESIGN/UETA turn on — then freezes the record. */
  function signDoc(token, values, sigDataURL, meta){
    meta = meta || {};
    return save(function(d){
      var doc = d.documents.filter(function(x){return x.token===token;})[0]; if (!doc) return;
      if (doc.status === "Signed") return;
      doc.values = values || {};
      doc.signature = sigDataURL || null;
      doc.signedTs = new Date().toISOString().slice(0,19);
      doc.status = "Signed";
      var who = (values && values.name) || doc.signer.name || "Signer";
      doc.audit.push({ ts:doc.signedTs, who:who, what:"Consented to do business electronically (ESIGN/UETA)" });
      doc.audit.push({ ts:doc.signedTs, who:who, what:"Adopted and applied signature — record frozen" });
      if (meta.agent) doc.audit.push({ ts:doc.signedTs, who:who, what:"Signed from: "+meta.agent });
      logBus(d, "Paper", doc.title+" signed by "+who+".");
    });
  }
  function docsAwaiting(){ return db().documents.filter(function(d){ return d.status==="Sent"||d.status==="Viewed"; }); }
  function signUrl(token){
    var base = location.href.replace(/[^\/]*$/, "");
    return base + "sign-doc.html?d=" + encodeURIComponent(token);
  }

  /* ====================================================================
     ATS — the recruiting production line
     ==================================================================== */
  /* Screen score: does this applicant's availability actually cover hours we
     cannot fill? That, not a resume, is what matters for an hourly workforce. */
  function screenScore(ap){
    var reasons = [], score = 0;
    var open = openShifts(thisWeek());
    var covers = open.filter(function(s){
      var w = parseAvailWindow((ap.avail||{})[DAYKEY[new Date(s.date+"T12:00:00").getDay()]]);
      if (!w) return false;
      var a = hhmmToMin(s.start), b = hhmmToMin(s.end); if (b<=a) b += 24*60;
      var to = w.to <= w.from ? w.to+24*60 : w.to;
      return a >= w.from && b <= to;
    });
    if (covers.length) { score += covers.length * 18; reasons.push("Covers "+covers.length+" currently open shift"+(covers.length>1?"s":"")); }
    else reasons.push("Does not cover any open shift this week");

    var days = Object.keys(ap.avail||{}).filter(function(k){ return (ap.avail||{})[k]; }).length;
    score += days * 4; reasons.push(days+" days of stated availability");

    (ap.certs||[]).forEach(function(c){ score += 10; });
    if ((ap.certs||[]).length) reasons.push("Already holds: "+ap.certs.join(", "));
    else reasons.push("No credentials yet — full onboarding required");

    if (ap.hasCar) { score += 12; reasons.push("Has a vehicle"); }
    else reasons.push("No vehicle — companion routes only");

    var yrs = parseInt(String(ap.exp||"").match(/(\d+)\s*yr/i)?RegExp.$1:0, 10) || 0;
    score += Math.min(20, yrs * 3);
    if (yrs) reasons.push(yrs+" yrs experience");

    return { score: Math.round(score), reasons: reasons, covers: covers };
  }
  function moveApplicant(id, stage){
    return save(function(d){
      var a = d.applicants.filter(function(x){return x.id===id;})[0]; if (!a) return;
      a.stage = stage;
      logBus(d, "Recruiting", a.name+" moved to "+stage+".");
    });
  }
  function addApplicant(rec){
    var id = "ap"+(Date.now().toString(36));
    save(function(d){
      d.applicants.unshift(Object.assign({
        id:id, applied:iso(TODAY), stage:"Applied", certs:[], hasCar:false,
        avail:{mon:"",tue:"",wed:"",thu:"",fri:"",sat:"",sun:""}, exp:"", note:"", source:"Careers page"
      }, rec||{}));
      logBus(d, "Recruiting", "New application: "+((rec&&rec.name)||"unnamed")+".");
    });
    return applicantById(id);
  }
  function pipelineCounts(){
    var m = {}; ATS_STAGES.forEach(function(s){ m[s]=0; });
    db().applicants.forEach(function(a){ m[a.stage] = (m[a.stage]||0)+1; });
    return m;
  }
  function timeToHireDays(){
    var hired = db().applicants.filter(function(a){ return a.stage==="Onboarding"||a.stage==="Active"; });
    if (!hired.length) return null;
    var t = hired.reduce(function(a,x){ return a + Math.abs(daysUntil(x.applied)||0); }, 0);
    return Math.round(t / hired.length);
  }

  /* ====================================================================
     REFERRAL CRM
     ==================================================================== */
  function referralOverdue(r){
    if (!r.cadenceDays) return false;
    var since = Math.abs(daysUntil(r.lastTouch) || 0);
    return since > r.cadenceDays;
  }
  function logTouch(id, note){
    return save(function(d){
      var r = d.referrers.filter(function(x){return x.id===id;})[0]; if (!r) return;
      r.lastTouch = iso(TODAY);
      if (note) r.note = note;
      logBus(d, "Growth", "Logged a touch with "+r.org+".");
    });
  }
  function referralConversion(r){ return r.ytd ? (r.converted/r.ytd)*100 : 0; }
  function topReferrers(){
    return db().referrers.slice().sort(function(a,b){ return b.converted - a.converted; });
  }

  /* ====================================================================
     INTAKE
     ==================================================================== */
  var INTAKE_STAGES = ["New inquiry","Assessment booked","Assessment complete","Agreement sent","Agreement signed","Started","Lost"];
  function moveInquiry(id, stage){
    return save(function(d){
      var q = d.inquiries.filter(function(x){return x.id===id;})[0]; if (!q) return;
      q.stage = stage;
      logBus(d, "Intake", q.family+" moved to "+stage+".");
    });
  }
  function addInquiry(rec){
    var id = "in"+(Date.now().toString(36));
    save(function(d){
      d.inquiries.unshift(Object.assign({
        id:id, received:iso(TODAY), stage:"New inquiry", hrsWk:0,
        need:"Companion Care", payer:"Private Pay", note:"", source:"Web / search"
      }, rec||{}));
      logBus(d, "Intake", "New inquiry: "+((rec&&rec.family)||"unnamed")+".");
    });
    return id;
  }
  /* Pipeline value: hours a week × the rate that service line usually bills. */
  function lineRate(line){
    var rows = db().clients.filter(function(c){ return c.line===line; });
    if (!rows.length) return 32;
    return rows.reduce(function(a,c){return a+c.billRate;},0)/rows.length;
  }
  function inquiryValue(q){ return (q.hrsWk||0) * lineRate(q.need) * 52; }
  function pipelineValue(){
    return db().inquiries.filter(function(q){ return q.stage!=="Lost" && q.stage!=="Started"; })
      .reduce(function(a,q){ return a + inquiryValue(q); }, 0);
  }

  /* ====================================================================
     CLIENTS / CAREGIVERS / SHIFTS — real data entry (this is not a demo)
     ==================================================================== */
  function addClient(rec){
    var id = "cl"+(Date.now().toString(36));
    save(function(d){
      d.clients.push(Object.assign({
        id:id, city:d.agency.city, lat:d.agency.officeLat, lng:d.agency.officeLng, age:null,
        line:"Companion Care", payer:"Private Pay", billRate:32, start:iso(TODAY), status:"Active",
        prefs:[], needs:[], dx:"", family:[], plan:[]
      }, rec||{}));
      logBus(d, "Intake", "Client added: "+((rec&&rec.name)||id));
    });
    return id;
  }
  function updateClient(id, patch){
    return save(function(d){
      var c = d.clients.filter(function(x){return x.id===id;})[0]; if (!c) return;
      Object.keys(patch||{}).forEach(function(k){ c[k] = patch[k]; });
    });
  }
  function removeClient(id){
    return save(function(d){
      d.clients = d.clients.filter(function(x){return x.id!==id;});
      d.shifts  = d.shifts.filter(function(s){return s.clientId!==id;});
    });
  }
  function addCaregiver(rec){
    var id = "cg"+(Date.now().toString(36));
    save(function(d){
      d.caregivers.push(Object.assign({
        id:id, city:d.agency.city, lat:d.agency.officeLat, lng:d.agency.officeLng,
        hired:iso(TODAY), payRate:19, status:"Onboarding", rating:null, maxHrs:40,
        skills:[], avail:{mon:"",tue:"",wed:"",thu:"",fri:"",sat:"",sun:""}, creds:{}
      }, rec||{}));
      logBus(d, "Recruiting", "Caregiver added: "+((rec&&rec.name)||id));
    });
    return id;
  }
  function updateCaregiver(id, patch){
    return save(function(d){
      var c = d.caregivers.filter(function(x){return x.id===id;})[0]; if (!c) return;
      Object.keys(patch||{}).forEach(function(k){ c[k] = patch[k]; });
    });
  }
  function removeCaregiver(id){
    return save(function(d){
      d.caregivers = d.caregivers.filter(function(x){return x.id!==id;});
      d.shifts.forEach(function(s){ if (s.caregiverId===id){ s.caregiverId=null; s.status = s.date < iso(TODAY) ? "Unfilled" : "OPEN"; } });
    });
  }
  function addShift(rec){
    var id = "sh"+(Date.now().toString(36));
    save(function(d){
      var cl = d.clients.filter(function(c){return c.id===(rec&&rec.clientId);})[0];
      var hrs = shiftHours((rec&&rec.start)||"09:00", (rec&&rec.end)||"13:00");
      d.shifts.push(Object.assign({
        id:id, clientId:cl?cl.id:null, caregiverId:null, date:iso(TODAY),
        start:"09:00", end:"13:00", hours:hrs,
        line: cl?cl.line:"Companion Care", payer: cl?cl.payer:"Private Pay",
        billRate: cl?cl.billRate:32, status:"OPEN", evv:null, mileage:0, note:""
      }, rec||{}, { hours:hrs }));
      logBus(d, "Scheduling", "Shift added"+(cl?(" for "+cl.name):"")+".");
    });
    return id;
  }
  function assignShift(shiftId, cgId){
    return save(function(d){
      var s = d.shifts.filter(function(x){return x.id===shiftId;})[0]; if (!s) return;
      s.caregiverId = cgId || null;
      if (!cgId) s.status = s.date < iso(TODAY) ? "Unfilled" : "OPEN";
      else if (s.status === "OPEN" || s.status === "Unfilled") s.status = "Booked";
      logBus(d, "Scheduling", cgId ? (caregiverName(d,cgId)+" assigned.") : "Assignment cleared — shift is open.");
    });
  }
  function removeShift(id){ return save(function(d){ d.shifts = d.shifts.filter(function(s){return s.id!==id;}); }); }

  /* Shift broadcast — the "blast the open shift, first qualified claim wins"
     move. Ghost Mode: this STAGES the broadcast; it does not send. */
  function broadcast(shiftId){
    var ranked = matchFor(shiftId).filter(function(m){ return m.score >= 0; });
    save(function(d){
      var s = d.shifts.filter(function(x){return x.id===shiftId;})[0];
      var cl = s ? d.clients.filter(function(c){return c.id===s.clientId;})[0] : null;
      logBus(d, "Scheduling", "Broadcast staged to "+ranked.length+" qualified caregivers"+(cl?(" for "+cl.name):"")+" — awaiting release.");
    });
    return ranked;
  }

  /* ====================================================================
     THE BUS + APPROVALS
     ==================================================================== */
  function logBus(d, dept, msg){
    d.bus = d.bus || [];
    d.bus.unshift({ ts:new Date().toISOString().slice(0,19), dept:dept, msg:msg });
    if (d.bus.length > 120) d.bus.length = 120;
  }
  function bus(){ return db().bus || []; }
  function approvals(){ return db().approvals || []; }
  function decideApproval(id, decision){
    return save(function(d){
      var a = d.approvals.filter(function(x){return x.id===id;})[0]; if (!a) return;
      a.stage = decision === "approve" ? "Approved" : "Returned";
      logBus(d, a.dept, a.title+" — "+a.stage.toLowerCase()+".");
    });
  }

  /* ====================================================================
     KPIs — every one computed, none typed
     ==================================================================== */
  function kpis(){
    var wk = thisWeek(), lw = lastWeek();
    var booked = weekRevenue(wk, "assigned"), delivered = weekRevenue(wk, "delivered");
    var sbb = scheduledButBlocked(wk);
    return [
      { k:"Week booked",       v: money(booked), n:"All assigned shifts, if the week runs as scheduled", band:"good" },
      { k:"Delivered so far",  v: money(delivered), n: pct(booked? delivered/booked*100:0)+" of the week — visits done or in flight" },
      { k:"Gross margin",      v: pct(weekMarginPct(wk,"assigned"),1), n:"After pay, "+pct(RATE_RULES.burdenPct*100,1)+" burden and mileage", band: weekMarginPct(wk,"assigned") >= 30 ? "good" : "watch" },
      { k:"Hours booked",      v: weekHours(wk,"assigned").toFixed(1), n:"Assigned caregiver hours this week" },
      { k:"Unfilled hours",    v: openHours(wk).toFixed(1), n: openShifts(wk).length+" open shifts to cover", band: openHours(wk) > 0 ? "watch" : "good" },
      { k:"Fill rate",         v: fillRate(wk) == null ? "\u2014" : pct(fillRate(wk)), n:"Shifts covered / shifts scheduled" },
      { k:"EVV clean",         v: evvCompliancePct() == null ? "\u2014" : pct(evvCompliancePct()), n: evvExceptions().length+" exceptions to clear \u00b7 last "+EVV_WINDOW_DAYS+" days", band: (evvCompliancePct()||0) >= 95 ? "good" : "watch" },
      { k:"Scheduled but blocked", v: sbb.length, n: sbb.length ? "Credential lapse \u2014 pull them off the schedule" : "Everyone scheduled is clear to work", band: sbb.length ? "bad" : "good" },
      { k:"Active clients",    v: db().clients.filter(function(c){return c.status==="Active";}).length, n:"Plus "+db().clients.filter(function(c){return c.status!=="Active";}).length+" pending start" },
      { k:"Active caregivers", v: db().caregivers.filter(function(c){return c.status==="Active";}).length, n: cannotBeScheduled().length+" blocked by a credential", band: cannotBeScheduled().length ? "watch" : "good" },
      { k:"In the pipeline",   v: db().applicants.filter(function(a){return a.stage!=="Declined"&&a.stage!=="Active";}).length, n:"Applicants moving toward hire" },
      { k:"Credentials due",   v: credIssues().length, n:"Expired, missing or inside "+CRED_WARN_DAYS+" days", band: credIssues().filter(function(i){return i.status.state==="expired";}).length ? "bad" : "watch" },
      { k:"Overtime hours",    v: overtimeHours(wk,"assigned").toFixed(1), n:"Paid at "+RATE_RULES.otMultiplier+"\u00d7 \u2014 the client is not billed "+RATE_RULES.otMultiplier+"\u00d7", band: overtimeHours(wk,"assigned") > 0 ? "watch" : "good" },
      { k:"Unbillable hours",  v: unbillableHours(lw).toFixed(1), n:"Last week \u2014 delivered but not verifiable to the payer", band: unbillableHours(lw) > 0 ? "bad" : "good" },
      { k:"Signatures out",    v: docsAwaiting().length, n:"Sent, not yet signed" }
    ];
  }


  /* ====================================================================
     THE PRICE BOOK
     ⚠ EVERY figure is DRAFT. Accelerated Experiences LLC sets every live
     price — nothing here goes live without Anthony.

     THE PACKAGING RULE (fleet-wide, Jul 28 2026): the SPINE is in every tier
     at every price — Contacts/CRM, Calendar, Records, Connect, Command Center,
     Approval Desk, Owner's Manual, mobile. Tiers differ by SCALE, not by
     whether you're allowed to hold a contact or a date.
     ==================================================================== */
  var ROOMS = {
    schedule: { label:"Schedule & Match",        mo:110, build:850,
                why:"The shift spine — the matrix, the AI match engine, and shift broadcast. Everything else hangs off it." },
    evv:      { label:"Field Ops · EVV",         mo:95,  build:700,
                why:"Clock-in with time, place and tasks. Geofence, late and no-show alerts, offline capture." },
    care:     { label:"Care Plans & Guardrails", mo:70,  build:500,
                why:"The authorized task list per client — and the hard block that stops a clinical task being logged." },
    recruit:  { label:"Recruiting · ATS",        mo:95,  build:700,
                why:"Careers page, no-login mobile application, auto-screening against your actual open shifts." },
    creds:    { label:"Credentials Vault",       mo:60,  build:450,
                why:"Background, CPR, TB, training hours — expiry-dated, and a lapse pulls the caregiver off the schedule." },
    referral: { label:"Referral CRM",            mo:75,  build:550,
                why:"The B2B book — discharge planners, case managers, elder law. Cadence, touches, conversion." },
    intake:   { label:"Intake & Assessment",     mo:80,  build:600,
                why:"Inquiry to start of care: assessment on a tablet, plan built, agreement out." },
    family:   { label:"Family Portal",           mo:70,  build:500,
                why:"The out-of-state adult child sees clock-ins, notes and the bill. Multi-sibling permissions." },
    sign:     { label:"e-Sign",                  mo:65,  build:500,
                why:"Native signatures — agreements, employment packets, care plan acknowledgements, with an audit trail." },
    billing:  { label:"Billing & Invoices",      mo:110, build:850,
                why:"The split-rate engine on the client side. Differentials, holidays, mileage, LTCI carrier forms." },
    payroll:  { label:"Payroll Engine",          mo:95,  build:700,
                why:"The other half of the split rate — overtime, travel pay, mileage, burden, stubs." },
    books:    { label:"Books & Metrics",         mo:80,  build:600,
                why:"Margin by line and by payer, fill rate, unbillable hours — computed, never reconstructed." },
    org:      { label:"Agent Org · Bus",         mo:140, build:1100,
                why:"The AI department chains, the event bus and the confidence gates. This is the engine." }
  };

  var TIERS = {
    office: { key:"office", name:"Office", rank:1, mo:550, build:4800,
      desc:"One office, one book of business. The whole operating system, sized for an agency running a single territory.",
      base:"Single office · up to ~25 caregivers · the full spine",
      includes:["schedule","evv","care","recruit","creds","intake","family","sign","billing","payroll"] },
    agency: { key:"agency", name:"Agency", rank:2, mo:1150, build:9500,
      desc:"A growing agency. Adds the referral book, books & metrics and the AI department org on top of everything above.",
      base:"Multi-office · unlimited caregivers · referral CRM · agent org",
      includes:["schedule","evv","care","recruit","creds","referral","intake","family","sign","billing","payroll","books","org"] },
    grandsuite: { key:"grandsuite", name:"Grandsuite", rank:3, mo:2600, build:16800,
      desc:"Nothing held back. Every department, multi-state, dedicated environment, data migration and your own branded caregiver app.",
      base:"Multi-state · unlimited · dedicated environment · migration · branded app",
      includes:["schedule","evv","care","recruit","creds","referral","intake","family","sign","billing","payroll","books","org"] }
  };

  var DEPTS = [
    { group:"Command", items:[
      { href:"dashboard.html", label:"Command Center",    ic:"◎" },
      { href:"calendar.html",  label:"Calendar",          ic:"▤" },
      { href:"contacts.html",  label:"Contacts",          ic:"☎" },
      { href:"connect.html",   label:"Connect · Video",   ic:"◉" },
      { href:"records.html",   label:"Records · Filing",  ic:"▤" },
      { href:"approvals.html", label:"Approval Desk",     ic:"✓", accent:"ops" }
    ]},
    { group:"Growth", items:[
      { href:"referrals.html", label:"Referral CRM",      ic:"◈", room:"referral", accent:"referral" },
      { href:"intake.html",    label:"Intake & Assessment",ic:"✦", room:"intake",  accent:"intake" }
    ]},
    { group:"Recruiting", items:[
      { href:"recruiting.html",label:"Recruiting · ATS",  ic:"★", room:"recruit", accent:"recruit" },
      { href:"credentials.html",label:"Credentials",      ic:"⛨", room:"creds",   accent:"credentials" }
    ]},
    { group:"The Field", items:[
      { href:"schedule.html",  label:"Schedule & Match",  ic:"▦", room:"schedule", accent:"schedule" },
      { href:"evv.html",       label:"Field Ops · EVV",   ic:"◉", room:"evv",      accent:"field" },
      { href:"careplans.html", label:"Care Plans",        ic:"♥", room:"care",     accent:"care" },
      { href:"family.html",    label:"Family Portal",     ic:"☗", room:"family",   accent:"family" }
    ]},
    { group:"Paper", items:[
      { href:"sign.html",      label:"e-Sign",            ic:"✍", room:"sign",     accent:"sign" }
    ]},
    { group:"Money", items:[
      { href:"billing.html",   label:"Billing & Invoices",ic:"◧", room:"billing", accent:"money" },
      { href:"payroll.html",   label:"Payroll",           ic:"◨", room:"payroll", accent:"money" },
      { href:"books.html",     label:"Books & Metrics",   ic:"◭", room:"books",   accent:"money" }
    ]},
    { group:"The Org", items:[
      { href:"org.html",       label:"Agent Org · Bus",   ic:"❖", room:"org",     accent:"ops" }
    ]}
  ];

  function tier(){ return db().tier || "grandsuite"; }
  function tierRank(){ return (TIERS[tier()]||TIERS.grandsuite).rank; }
  function setTier(k){ return save(function(d){ d.tier = k; d.adds = []; d.offs = []; }); }
  function activeRooms(){
    var d = db(), t = TIERS[d.tier] || TIERS.grandsuite;
    var set = t.includes.slice();
    (d.adds||[]).forEach(function(k){ if (set.indexOf(k)<0) set.push(k); });
    (d.offs||[]).forEach(function(k){ set = set.filter(function(x){return x!==k;}); });
    return set;
  }
  function hasRoom(k){ return activeRooms().indexOf(k) >= 0; }
  function toggleRoom(k){
    return save(function(d){
      var t = TIERS[d.tier]||TIERS.grandsuite, inPack = t.includes.indexOf(k)>=0;
      var on = activeRooms().indexOf(k)>=0;
      d.adds = d.adds||[]; d.offs = d.offs||[];
      if (on) { if (inPack) d.offs.push(k); else d.adds = d.adds.filter(function(x){return x!==k;}); }
      else    { if (inPack) d.offs = d.offs.filter(function(x){return x!==k;}); else d.adds.push(k); }
    });
  }
  function priceNow(){
    var d = db(), t = TIERS[d.tier]||TIERS.grandsuite;
    var adds = (d.adds||[]), offs = (d.offs||[]);
    var addMo = adds.reduce(function(a,k){return a+((ROOMS[k]||{}).mo||0);},0);
    var addBuild = adds.reduce(function(a,k){return a+((ROOMS[k]||{}).build||0);},0);
    var offMo = offs.reduce(function(a,k){return a+((ROOMS[k]||{}).mo||0);},0);
    var offBuild = offs.reduce(function(a,k){return a+((ROOMS[k]||{}).build||0);},0);
    var rooms = activeRooms();
    var alaMo = rooms.reduce(function(a,k){return a+((ROOMS[k]||{}).mo||0);},0);
    var mo = Math.max(0, t.mo + addMo - offMo);
    return { tier:t, adds:adds, offs:offs, addMo:addMo, offMo:offMo,
             mo:mo, build: Math.max(0, t.build + addBuild - offBuild),
             rooms:rooms, alaMo:alaMo, savingMo: Math.max(0, alaMo - mo),
             changed: adds.length>0 || offs.length>0 };
  }
  function priceLabel(){ var p = priceNow(); return money(p.mo) + "/mo · " + money(p.build) + " build"; }

  /* ----------------------------------------------------------- the agent org */
  var SEATS = [
    { dept:"Growth",     dh:"Ada",    ae:"Wren",  focus:"Referral book, intake conversion, and where the next ten clients come from." },
    { dept:"Recruiting", dh:"Ellis",  ae:"Tova",  focus:"Time-to-hire, application-to-interview rate, and whether the pipeline covers the open shifts." },
    { dept:"Field",      dh:"Rosa",   ae:"Kip",   focus:"Fill rate, EVV exceptions, no-shows, and continuity of caregiver per client." },
    { dept:"Money",      dh:"Auden",  ae:"Perry", focus:"Margin by line and payer, overtime creep, unbillable hours, and days to cash." },
    { dept:"Compliance", dh:"Ines",   ae:"Sol",   focus:"Credential lapses, scope-of-practice events, and payer documentation completeness." }
  ];
  var BRAIN = {
    name:"Cedar", role:"COO — the single point of contact",
    line:"Everything the five departments conclude comes to Anthony through one seat, packaged as one decision at a time."
  };

  /* ------------------------------------------------------------- UI helpers */
  function el(html){ var t=document.createElement("template"); t.innerHTML=String(html).trim(); return t.content.firstChild; }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function money(n){ return "$" + (Math.round(Number(n)||0)).toLocaleString(); }
  function money2(n){ return "$" + (Number(n)||0).toFixed(2); }
  function pct(n, dp){ return (Number(n)||0).toFixed(dp===undefined?0:dp) + "%"; }
  function hhmm(s){
    var p = String(s||"").split(":"); if (p.length<2) return s||"";
    var h = +p[0], m = p[1], ap = h>=12 ? "p" : "a"; h = h%12; if (!h) h = 12;
    return h + (m==="00" ? "" : ":"+m) + ap;
  }
  function dayLabel(dISO){
    var d = new Date(dISO+"T12:00:00");
    return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()] + " " + (d.getMonth()+1) + "/" + d.getDate();
  }

  /* the OS mark is the live illustrated icon — never a hand-drawn substitute */
  var MARK_URL = "https://www.aexperiences.com/StayAtHome_OS.png";
  function brandMark(){
    return '<img src="'+MARK_URL+'" alt="Stay@Home OS" width="34" height="34" ' +
           'style="display:block;border-radius:9px" ' +
           'onerror="this.style.display=\'none\';this.parentNode.textContent=\'S@H\';">';
  }

  /* ------------------------------------------------------------- the shell */
  function renderShell(active){
    var side = document.createElement("aside"); side.className = "sidebar";
    side.appendChild(el(
      '<a href="dashboard.html" class="brand">' +
        '<div class="bmark">' + brandMark() + '</div>' +
        '<div><div class="bt">Stay@Home OS</div><div class="bs">Home Care Agency OS</div></div>' +
      '</a>'
    ));
    var nav = document.createElement("nav"); nav.className = "nav";
    var on = activeRooms();
    DEPTS.forEach(function(grp){
      nav.appendChild(el('<div class="nav-group">'+esc(grp.group)+'</div>'));
      grp.items.forEach(function(it){
        var off = it.room && on.indexOf(it.room) < 0;
        var a = el('<a href="'+(off?"javascript:void(0)":it.href)+'" class="navlink '+
          (it.href===active?"active":"")+(off?" locked":"")+'"'+
          (it.accent?' data-accent="'+it.accent+'"':"")+'>'+
          '<span class="ic">'+it.ic+'</span><span class="lb">'+esc(it.label)+'</span>'+
          (off?'<span class="tier-tag">+'+money(ROOMS[it.room].mo)+'</span>':'')+'</a>');
        if (off) {
          a.title = "Not in this build — add "+ROOMS[it.room].label+" for "+
                    money(ROOMS[it.room].mo)+"/mo + "+money(ROOMS[it.room].build)+" build";
          a.addEventListener("click", function(){
            toggleRoom(it.room);
            toast(ROOMS[it.room].label+" added — "+priceLabel(), "ok");
            setTimeout(function(){ location.reload(); }, 500);
          });
        }
        nav.appendChild(a);
      });
    });
    side.appendChild(nav);
    return side;
  }

  var MOBILE_NAV = [
    { href:"dashboard.html", label:"Home",     ic:"◎" },
    { href:"schedule.html",  label:"Schedule", ic:"▦", room:"schedule" },
    { href:"evv.html",       label:"Field",    ic:"◉", room:"evv" },
    { href:"billing.html",   label:"Money",    ic:"◧", room:"billing" },
    { href:"approvals.html", label:"Approvals",ic:"✓" }
  ];
  function renderMobileBar(active){
    var bar = document.createElement("nav"); bar.className = "mobilebar";
    var on = activeRooms();
    MOBILE_NAV.forEach(function(it){
      var off = it.room && on.indexOf(it.room) < 0;
      bar.appendChild(el('<a href="'+(off?"javascript:void(0)":it.href)+'" class="mb-link '+
        (it.href===active?"active":"")+'"><span class="mb-ic">'+it.ic+'</span>'+
        '<span class="mb-lb">'+esc(it.label)+'</span></a>'));
    });
    bar.appendChild(el('<button class="mb-link mb-menu" id="mbMenu"><span class="mb-ic">☰</span><span class="mb-lb">Menu</span></button>'));
    return bar;
  }

  function renderTopbar(crumb){
    var p = priceNow(), ag = db().agency;
    var bar = document.createElement("div"); bar.className = "topbar";
    var initials = (ag.administrator||"AA").split(" ").map(function(w){return w[0];}).join("").slice(0,2).toUpperCase();
    bar.innerHTML =
      '<button class="hamburger" id="hamburger" aria-label="Open menu">☰</button>' +
      '<div class="crumbs">Stay@Home OS · <b>'+esc(crumb)+'</b></div>' +
      '<div class="spacer"></div>' +
      '<div class="tierpill" id="tierPillStatic">' +
        '<span class="dot"></span><div><b>'+esc(p.tier.name)+(p.changed?' <i class="cfg">configured</i>':'')+'</b> ' +
        '<span class="price">'+money(p.mo)+'/mo · '+money(p.build)+' build</span></div></div>' +
      '<div class="who"><div class="av">'+esc(initials)+'</div><div>'+esc(ag.administrator)+'<br>' +
        '<span class="muted small">Administrator · '+esc(ag.name)+'</span></div></div>';
    return bar;
  }

  function ribbon(){
    return el('<div class="ribbon"><span class="live">LIVE SHOWROOM</span>' +
      ' — this is the real operating system, not a slideshow. Type anywhere; it saves in your browser. ' +
      'The agency, caregivers and clients below are a realistic sample book. ' +
      '<a href="javascript:void(0)" id="resetFloor">Start with a clean slate</a></div>');
  }
  function footer(){
    return el('<div class="ae-credit">Powered by <b>Accelerated Experiences LLC</b> · Stay@Home OS is a white-label build. ' +
      'Sample data is a fictional agency. Benchmark figures are sourced or shown blank — never invented. ' +
      'Nothing here is legal, tax or clinical advice.</div>');
  }

  function toast(msg, kind){
    var w = document.getElementById("toast-wrap"); if (!w) return;
    var t = el('<div class="toast '+(kind||"")+'">'+esc(msg)+'</div>');
    w.appendChild(t);
    setTimeout(function(){ t.style.opacity="0"; setTimeout(function(){ t.remove(); }, 250); }, 2600);
  }
  /* The fleet-wide Command Center polish layer. One file on the store, loaded by
     every product, so a change lands everywhere at once instead of fourteen times. */
  function loadFlava(){
    if(document.getElementById("aeFlavaCss")) return;
    var l=document.createElement("link"); l.id="aeFlavaCss"; l.rel="stylesheet";
    l.href="https://www.aexperiences.com/ae-flava.css"; document.head.appendChild(l);
    var j=document.createElement("script"); j.src="https://www.aexperiences.com/ae-flava.js";
    j.defer=true; document.head.appendChild(j);
  }

  function mount(opts){
    try{ loadFlava(); }catch(e){}
    opts = opts || {};
    db();
    var app = document.createElement("div"); app.className = "app";
    var side = renderShell(opts.active);
    var backdrop = el('<div class="nav-backdrop" id="navBackdrop"></div>');
    var main = document.createElement("div"); main.className = "main";
    main.appendChild(ribbon());
    main.appendChild(renderTopbar(opts.crumb || "Command Center"));
    var content = document.createElement("div"); content.className="content"; content.id="content";
    main.appendChild(content);
    main.appendChild(footer());
    app.appendChild(side); app.appendChild(main);
    document.body.innerHTML = "";
    document.body.appendChild(app);
    document.body.appendChild(backdrop);
    document.body.appendChild(renderMobileBar(opts.active));
    document.body.appendChild(el('<div id="toast-wrap"></div>'));

    setTimeout(function(){
      var r = document.getElementById("resetFloor");
      if (r) r.addEventListener("click", function(){
        if (!confirm("Clear the sample agency and start with an empty book?\n\nThis removes the sample caregivers, clients and shifts so you can enter your own. It cannot be undone.")) return;
        goLive(); toast("Empty book ready. Add your first client.", "ok");
        setTimeout(function(){ location.reload(); }, 500);
      });
      function openNav(){ side.classList.add("open"); backdrop.classList.add("show"); }
      function closeNav(){ side.classList.remove("open"); backdrop.classList.remove("show"); }
      var ham = document.getElementById("hamburger"), mb = document.getElementById("mbMenu");
      if (ham) ham.addEventListener("click", openNav);
      if (mb) mb.addEventListener("click", openNav);
      backdrop.addEventListener("click", closeNav);
      Array.prototype.forEach.call(side.querySelectorAll("a.navlink"), function(a){
        a.addEventListener("click", closeNav);
      });
    }, 0);
    return content;
  }

  function page(title, sub, actionsHTML){
    return el('<div class="pagehead"><div><h1>'+esc(title)+'</h1>'+
      (sub?'<p class="sub">'+sub+'</p>':"")+'</div>'+
      '<div class="pagehead-actions">'+(actionsHTML||"")+'</div></div>');
  }
  function card(inner, cls){ return el('<section class="card '+(cls||"")+'">'+inner+'</section>'); }
  function stat(label, value, note, band){
    return '<div class="stat '+(band||"")+'"><div class="s-l">'+esc(label)+'</div>'+
      '<div class="s-v">'+value+'</div>'+(note?'<div class="s-n">'+note+'</div>':"")+'</div>';
  }
  function tag(text, kind){ return '<span class="tag '+(kind||"")+'">'+esc(text)+'</span>'; }
  function srcNote(text){ return '<div class="srcnote">Source: '+esc(text)+'</div>'; }
  function bar(p, cls){
    var w = Math.max(0, Math.min(100, p));
    return '<div class="bar" style="margin-top:6px"><i style="width:'+w.toFixed(0)+'%'+
      (cls?";background:"+cls:"")+'"></i></div>';
  }
  function pill(text, kind){ return '<span class="tag '+(kind||"")+'">'+esc(text)+'</span>'; }
  function evvBand(state){
    if (state==="Verified"||state==="On visit") return "good";
    if (state==="Late"||state==="Scheduled") return "watch";
    if (state==="Unfilled") return "";
    return "bad";
  }

  /* ====================================================================
     THE OWNER'S MANUAL — in-app, searchable, no backend.
     ==================================================================== */
  var MANUAL = [
    { t:"What this system is", c:"Stay@Home OS runs a non-medical home care agency end to end: recruiting, intake, scheduling, the visit itself, the paperwork and the money. Every number you see on a dashboard is computed from your own shifts — nothing on a screen was typed in by hand." },
    { t:"Start with a clean slate", c:"The system opens on a realistic sample agency so you can see how every room behaves with data in it. When you are ready to run your own book, use 'Start with a clean slate' in the ribbon at the top. It clears the sample and the option disappears." },
    { t:"The split rate — why one hour has two prices", c:"Every shift carries a BILL rate (what the client pays) and a PAY rate (what the caregiver earns). They move independently: weekends add a differential to both, holidays multiply both, but overtime multiplies only the PAY side — the client is not charged extra because the office over-scheduled someone. What is left after pay, employer burden and mileage is your margin, shown on every shift." },
    { t:"Overtime is a margin event, not a payroll event", c:"When you assign a shift that pushes a caregiver past 40 hours in a week, the match engine says so before you commit, and shows how many overtime hours it creates. The Books room totals overtime hours for the week so you can see the drift." },
    { t:"How the match engine ranks caregivers", c:"For any open shift it scores every caregiver on distance, the skills that client's care actually needs, the client's stated preferences, continuity (has this caregiver worked this client before), and overtime risk. It shows its reasons — you can argue with any of them. Anyone with a hard blocker (expired credential, already booked, outside stated availability) is listed separately and never ranked." },
    { t:"Hard blockers vs. soft scores", c:"A soft score can be overridden by judgment. A hard blocker cannot: an expired background check, CPR or TB screening pulls a caregiver off the schedule entirely, because scheduling them is the finding an auditor writes up." },
    { t:"EVV — what it is and why it matters", c:"Electronic Visit Verification records who was at the home, when they arrived and left, where they were, and what tasks were performed. For Medicaid waiver hours it is federally required. In this system, a Medicaid visit without a clean EVV record is not billable — the Books room shows those hours as unbillable rather than quietly counting them as revenue." },
    { t:"Geofence, late, no-show, missed clock-out", c:"Clock-in must land within 150 metres of the client's home. Beyond a 7-minute grace the visit reads LATE. With no clock-in 20 minutes past the start it raises a NO-SHOW alert. A visit with no clock-out two hours past its scheduled end reads MISSED CLOCK-OUT. All four appear in Field Ops as exceptions to clear." },
    { t:"Offline clock-in", c:"Caregivers work in places with no signal. The mobile clock-in captures the timestamp and coordinates locally and syncs when the connection returns; the audit record shows it was captured offline, with the original time, not the sync time." },
    { t:"Care plan guardrails", c:"Each client has an authorized task list. Caregivers can only log tasks on that list. Clinical tasks — administering medication, injections, wound care, tube feeding, catheter care, blood draws — are not on any list and cannot be logged at all. The system explains why when someone tries. This is the liability line, so it is enforced in code, not in a policy binder." },
    { t:"Medication reminders are not medication administration", c:"A non-medical caregiver may remind a client to take medication and observe that they did. They may not hand over, measure, inject or otherwise administer it. The task catalog names it 'Medication REMINDER' for exactly this reason." },
    { t:"Recruiting is a production line, not an event", c:"Caregiver turnover in this industry runs high enough that recruiting never stops. The ATS scores each applicant on whether their stated availability actually covers shifts you cannot currently fill — the only screening question that matters for an hourly workforce — plus credentials held, vehicle, and experience." },
    { t:"Credentials and the expiry window", c:"Background check, CPR/First Aid, TB screening, orientation hours and annual in-service are tracked with real dates. Anything inside 45 days reads 'expiring'; anything past reads 'expired' and blocks scheduling. The Credentials room sorts by urgency, worst first." },
    { t:"The referral book is where the business comes from", c:"Home care volume comes from discharge planners, case managers, elder law attorneys, hospice and senior living — not advertising. Each referrer carries a contact cadence; when you go past it the book marks them overdue so relationships don't quietly go cold." },
    { t:"Intake, from inquiry to first shift", c:"Inquiry, assessment booked, assessment complete, agreement sent, agreement signed, started. The pipeline value is computed from hours per week times the rate that service line actually bills, annualized — not a guess." },
    { t:"e-Sign — how signing works here", c:"Pick a template, fill in who it is for, and the system mints an unguessable link. The signer opens it in any browser with no account and no app, consents to sign electronically, adopts a signature by drawing or typing it, and the record freezes. Every step is written to an audit trail with a timestamp." },
    { t:"Is an electronic signature legally binding?", c:"US law (ESIGN and UETA) generally makes an electronic signature as enforceable as ink when four things are true: the signer agreed to do business electronically, they intended to sign, the signature can be attributed to them, and the record is retained and reproducible. This module captures all four. That said, this is not legal advice — have your attorney review the consent language and your retention practice before using it on employment or healthcare documents in your state." },
    { t:"The family portal and the family hierarchy", c:"In home care the person receiving care and the person paying are usually different people, and there is often more than one adult child involved. The portal supports several family members per client with different permissions — payer and decisions, view and notes, or view only — so siblings can follow along without all of them being able to change the plan." },
    { t:"Billing by payer", c:"Private pay bills weekly against approved hours. LTC insurance bills monthly on the carrier's own form with care notes attached. Medicaid waiver requires EVV on every visit and goes to the state clearinghouse. VA community care bills against an authorization. The Billing room formats each one correctly rather than making you re-key it." },
    { t:"What the system does NOT do by itself", c:"Four things genuinely require an outside party and the system says so plainly rather than pretending: background checks (a regulated consumer reporting agency must produce them), submission of Medicaid EVV data (the state's own aggregator receives it), moving money (a licensed processor), and posting jobs INTO Indeed or ZipRecruiter (their platform). Everything upstream of those hops is native here." },
    { t:"The Approval Desk", c:"Anything that would change revenue, send something to a client or family, or commit money waits on the Approval Desk instead of happening quietly. The desk should stay nearly empty — if it fills up, the settings are too tight." },
    { t:"Connect — chat and video", c:"Message a caregiver, run a group call with the office, or send a family an outreach link they can open in a plain browser with no account. Video runs natively in the browser; there is no Zoom, no Jitsi and no third-party meeting service in the path." },
    { t:"Records — the filing cabinet and the source of truth", c:"Signed agreements, care plans, assessments, credentials and payer authorizations file into Records. A document marked as the source of truth is the version anyone should be reading; older copies stay for history but are not the one you act on." },
    { t:"On your phone", c:"Every room works on a phone. The bottom bar carries Home, Schedule, Field, Money and Approvals; the Menu button opens everything else." }
  ];

  function manual(){ return MANUAL; }
  function askManual(q){
    q = String(q||"").toLowerCase().trim();
    if (!q) return [];
    var syn = { ot:"overtime", evv:"visit verification", esign:"signature", "e-sign":"signature",
                pay:"payroll", bill:"billing", cert:"credential", certs:"credentials",
                hire:"recruiting", hiring:"recruiting", applicant:"recruiting",
                phone:"mobile", legal:"binding", medicaid:"waiver", family:"portal" };
    var terms = q.split(/[^a-z0-9-]+/).filter(Boolean).map(function(w){ return syn[w] || w; });
    return MANUAL.map(function(a){
      var hay = (a.t + " " + a.c).toLowerCase(), score = 0;
      terms.forEach(function(t){
        if (!t || t.length < 3) return;
        if (a.t.toLowerCase().indexOf(t) >= 0) score += 6;
        var m = hay.split(t).length - 1; score += m;
      });
      return { a:a, score:score };
    }).filter(function(r){ return r.score > 0; })
      .sort(function(x,y){ return y.score - x.score; })
      .slice(0, 4).map(function(r){ return r.a; });
  }

  document.addEventListener("visibilitychange", function(){ if (!document.hidden) db(); });

  /* -------------------------------------------------------------- public API */
  global.StayAtHome = {
    /* store */
    db:db, save:save, fresh:fresh, goLive:goLive, isSample:isSample, SEED:SEED, TODAY:TODAY,
    iso:iso, addDays:addDays, weekOf:weekOf, thisWeek:thisWeek, shiftsInWeek:shiftsInWeek,
    /* canon */
    SERVICE_LINES:SERVICE_LINES, lineColor:lineColor, PAYERS:PAYERS, payer:payer,
    payerRequiresEVV:payerRequiresEVV, TASKS_ALLOWED:TASKS_ALLOWED, TASKS_BLOCKED:TASKS_BLOCKED,
    taskIsBlocked:taskIsBlocked, blockReason:blockReason, CREDS:CREDS, CRED_WARN_DAYS:CRED_WARN_DAYS,
    SKILLS:SKILLS, RATE_RULES:RATE_RULES, EVV:EVV, ATS_STAGES:ATS_STAGES,
    REFERRER_TYPES:REFERRER_TYPES, INTAKE_STAGES:INTAKE_STAGES, BENCH:BENCH, REPLACES:REPLACES,
    DOC_TEMPLATES:DOC_TEMPLATES, ESIGN_CONSENT:ESIGN_CONSENT, templateById:templateById,
    /* lookups */
    clientById:clientById, caregiverById:caregiverById, shiftById:shiftById,
    applicantById:applicantById, docById:docById, docByToken:docByToken, referrerById:referrerById,
    caregiverName:function(id){ return caregiverName(db(), id); },
    /* money */
    rateFor:rateFor, isHoliday:isHoliday, isWeekend:isWeekend, shiftHours:shiftHours,
    weekRevenue:weekRevenue, scoped:scoped, lastWeek:lastWeek,
    marginByLine:marginByLine, marginByPayer:marginByPayer, marginPctBy:marginPctBy,
    scheduledButBlocked:scheduledButBlocked, weekCost:weekCost, weekMargin:weekMargin, weekMarginPct:weekMarginPct,
    weekHours:weekHours, openShifts:openShifts, openHours:openHours, fillRate:fillRate,
    revenueByLine:revenueByLine, revenueByPayer:revenueByPayer, overtimeHours:overtimeHours,
    unbillableHours:unbillableHours, invoiceFor:invoiceFor, paystubFor:paystubFor, payrollTotals:payrollTotals,
    /* match + schedule */
    matchFor:matchFor, haversineMi:haversineMi, driveMinEstimate:driveMinEstimate,
    availableFor:availableFor, alreadyBooked:alreadyBooked, continuityCount:continuityCount,
    assignedHoursBefore:assignedHoursBefore, broadcast:broadcast,
    addShift:addShift, assignShift:assignShift, removeShift:removeShift,
    /* evv */
    evvState:evvState, evvIsClean:evvIsClean, isBillable:isBillable, evvExceptions:evvExceptions,
    evvCompliancePct:evvCompliancePct, EVV_WINDOW_DAYS:EVV_WINDOW_DAYS, recentCompleted:recentCompleted, clockIn:clockIn, clockOut:clockOut, evvBand:evvBand,
    /* credentials */
    daysUntil:daysUntil, credStatus:credStatus, credIssues:credIssues,
    credBlockers:credBlockers, cannotBeScheduled:cannotBeScheduled,
    /* people + clients */
    addClient:addClient, updateClient:updateClient, removeClient:removeClient,
    addCaregiver:addCaregiver, updateCaregiver:updateCaregiver, removeCaregiver:removeCaregiver,
    /* ats */
    screenScore:screenScore, moveApplicant:moveApplicant, addApplicant:addApplicant,
    pipelineCounts:pipelineCounts, timeToHireDays:timeToHireDays,
    /* referrals + intake */
    referralOverdue:referralOverdue, logTouch:logTouch, referralConversion:referralConversion,
    topReferrers:topReferrers, moveInquiry:moveInquiry, addInquiry:addInquiry,
    inquiryValue:inquiryValue, pipelineValue:pipelineValue, lineRate:lineRate,
    /* e-sign */
    createDoc:createDoc, sendDoc:sendDoc, openDoc:openDoc, signDoc:signDoc,
    docsAwaiting:docsAwaiting, signUrl:signUrl, fillTemplate:fillTemplate, docContext:docContext,
    /* org + approvals */
    SEATS:SEATS, BRAIN:BRAIN, bus:bus, approvals:approvals, decideApproval:decideApproval,
    /* pricing */
    TIERS:TIERS, ROOMS:ROOMS, DEPTS:DEPTS, tier:tier, tierRank:tierRank, setTier:setTier,
    activeRooms:activeRooms, hasRoom:hasRoom, toggleRoom:toggleRoom, priceNow:priceNow, priceLabel:priceLabel,
    /* manual */
    manual:manual, askManual:askManual,
    /* kpis */
    kpis:kpis,
    /* ui */
    mount:mount, toast:toast, el:el, esc:esc, money:money, money2:money2, pct:pct,
    hhmm:hhmm, dayLabel:dayLabel, page:page, card:card, stat:stat, tag:tag, pill:pill,
    srcNote:srcNote, bar:bar, brandMark:brandMark, MARK_URL:MARK_URL
  };
})(window);
