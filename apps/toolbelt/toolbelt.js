/* ============================================================================
   TOOLBELT OS — SHOWROOM ENGINE
   Field Service / Trades OS · Powered by Accelerated Experiences LLC

   BROWSER-ONLY. Business data lives in this browser's localStorage.

   Vertical grounding — what makes the trades different:
     • The unit of work is a JOB with a truck attached to it. Travel time is real
       cost, and the second job of the day is cheaper to serve than the fifth.
     • One job carries THREE money lines that behave differently: labor (marked
       up over the tech's cost), parts (marked up over supply-house cost), and a
       trip/diagnostic fee. Generic invoicing flattens them and hides the margin.
     • WARRANTY CALLBACKS are the silent killer — you pay full cost and bill zero.
       Most shops never measure them. This one does, by tech and by cause.
     • Licences are dispatch-blocking. An expired journeyman card or EPA 608 means
       that tech legally cannot take that job, and permit work needs a permit
       number before it can close.
     • The phone is used in a crawlspace, in gloves, often with no signal.

   Benchmarks ship SOURCED-OR-BLANK (Art. IV).
   ============================================================================ */
(function (global) {
  "use strict";

  var KEY = "toolbelt_os_v1";
  var STORE = (function(){ try{ localStorage.setItem('_t','1'); localStorage.removeItem('_t'); return localStorage; }catch(e){ return sessionStorage; } })();
  /* LOCAL noon — a UTC-midnight date reads as the previous day west of Greenwich,
     and a dispatch board off by one day is worse than no dispatch board. */
  var TODAY = new Date("2026-07-27T12:00:00");

  function now(){ return Date.now(); }
  function iso(d){ var m=d.getMonth()+1, day=d.getDate();
    return d.getFullYear()+"-"+(m<10?"0":"")+m+"-"+(day<10?"0":"")+day; }
  function addDays(d,n){ var x=new Date(d.getTime()); x.setDate(x.getDate()+n); return x; }
  function addMonths(d,n){ var x=new Date(d.getTime()); x.setMonth(x.getMonth()+n); return x; }
  function read(){ try{ var d=JSON.parse(STORE.getItem(KEY)); return d||null; }catch(e){ return null; } }
  function write(d){ d._t=now(); try{ STORE.setItem(KEY, JSON.stringify(d)); }catch(e){} }
  function clone(a){ return JSON.parse(JSON.stringify(a)); }
  var WEEK_START = (function(){ var d=new Date(TODAY.getTime()); d.setDate(d.getDate()-d.getDay()); return d; })();

  function fresh(){
    return { _t:now(), started:now(), sample:true, tier:"grandsuite", adds:[], offs:[],
      shop:clone(SEED.shop), techs:clone(SEED.techs), customers:clone(SEED.customers),
      jobs:clone(SEED.jobs), calls:clone(SEED.calls), trucks:clone(SEED.trucks), memberships:clone(SEED.memberships), parts:clone(SEED.parts), applicants:clone(SEED.applicants),
      referrers:clone(SEED.referrers), estimates:clone(SEED.estimates),
      documents:clone(SEED.documents), systems:clone(SEED.systems),
      approvals:clone(SEED.approvals), bus:[], seq:1 };
  }
  function emptyBook(){ var d=fresh(); d.sample=false;
    d.techs=[]; d.customers=[]; d.jobs=[]; d.applicants=[]; d.referrers=[]; d.calls=[]; d.trucks=[]; d.memberships=[];
    d.estimates=[]; d.documents=[]; d.approvals=[]; d.bus=[]; return d; }
  function goLive(){ var d=emptyBook(); write(d); return d; }
  function isSample(){ return db().sample !== false; }
  function db(){ var d=read(); if(!d){ d=fresh(); write(d); return d; }
    if(!d.calls){ d.calls = d.sample===false ? [] : clone(SEED.calls); write(d); }
    if(!d.trucks){ d.trucks = d.sample===false ? [] : clone(SEED.trucks); write(d); }
    if(!d.memberships){ d.memberships = d.sample===false ? [] : clone(SEED.memberships); write(d); }
    return d; }
  function save(mut){ var d=db(); mut(d); write(d); return d; }

  /* ====================================================================
     INDUSTRY CANON
     ==================================================================== */
  var TRADES = [
    { k:"HVAC",         color:"#e4832b", note:"Heating, cooling, ductwork, heat pumps." },
    { k:"Plumbing",     color:"#2f7d8c", note:"Supply, drain, fixtures, water heaters." },
    { k:"Electrical",   color:"#e4a62b", note:"Panels, circuits, fixtures, service upgrades." },
    { k:"Refrigeration",color:"#7a5aa8", note:"Commercial refrigeration and ice machines." },
    { k:"Drain",        color:"#8a6d3b", note:"Cabling, hydro-jetting, camera inspection." },
    { k:"Appliance",    color:"#c0568f", note:"In-home appliance diagnosis and repair." }
  ];
  function tradeColor(k){ var t=TRADES.filter(function(x){return x.k===k;})[0]; return t?t.color:"#8391a0"; }

  var JOB_TYPES = ["Service call","Diagnostic","Repair","Install / replace","Maintenance (agreement)","Emergency","Warranty callback","Estimate"];

  /* HOW THE JOB GETS PAID. Each behaves differently and generic invoicing
     flattens them into one line, which is how shops lose money without seeing it. */
  var BILLING = [
    { k:"Time & materials", warranty:false, note:"Labor at the hourly rate + parts at markup + trip fee." },
    { k:"Flat rate",        warranty:false, note:"Book price per task. The customer knows the number before you start." },
    { k:"Maintenance agreement", warranty:false, note:"Prepaid seasonal visits. Revenue is recognised against the agreement, not the visit." },
    { k:"Manufacturer warranty", warranty:true,  note:"The manufacturer reimburses parts and a fixed labor allowance — usually less than your rate." },
    { k:"Our workmanship warranty", warranty:true, note:"We come back for free because something we did failed. Full cost, zero revenue." },
    { k:"New construction / GC", warranty:false, note:"Contract draw against a schedule of values. Slow pay, thin margin, big volume." }
  ];
  function billing(k){ return BILLING.filter(function(b){return b.k===k;})[0] || BILLING[0]; }
  function isWarrantyWork(k){ return !!billing(k).warranty; }

  /* ---------------------------------------------------------------------
     THE DISPATCH GUARDRAIL — the trades' equivalent of a scope boundary.
     Certain work legally requires a licensed journeyman or master AND a pulled
     permit. Dispatching an unlicensed tech, or closing permit work with no
     permit number, is the finding that costs a contractor their licence.
     --------------------------------------------------------------------- */
  var PERMIT_WORK = [
    { k:"Electrical service / panel change", lic:"Journeyman electrician", why:"Service equipment change requires a permit and a licensed electrician on site." },
    { k:"New circuit / rough-in",            lic:"Journeyman electrician", why:"New branch circuits are permitted work in most jurisdictions." },
    { k:"Gas line alteration",               lic:"Gas fitter",             why:"Any gas piping alteration is permitted and pressure-tested." },
    { k:"Water heater replacement",          lic:"Journeyman plumber",     why:"Replacement requires a permit and inspection in most jurisdictions." },
    { k:"Sewer / water service replacement", lic:"Journeyman plumber",     why:"Right-of-way work; permit plus utility locate required." },
    { k:"Refrigerant circuit work",          lic:"EPA 608 Universal",      why:"Federal law: no refrigerant handling without EPA 608 certification." },
    { k:"Backflow assembly test",            lic:"Backflow tester",        why:"Only a certified tester may sign the report the water purveyor accepts." }
  ];
  function permitRule(task){ return PERMIT_WORK.filter(function(p){ return p.k===task; })[0] || null; }
  function needsPermit(task){ return !!permitRule(task); }

  /* Ordinary, non-permitted tasks a tech logs on a job. */
  var TASKS = [
    "Diagnose and report","Filter change","Coil clean","Capacitor replacement","Contactor replacement",
    "Thermostat replacement","Condensate line clear","Blower motor replacement","Refrigerant leak search",
    "Drain cable / auger","Hydro-jet line","Camera inspection","Faucet / fixture replacement",
    "Toilet rebuild","Garbage disposal replacement","Shut-off valve replacement",
    "Outlet / switch replacement","Light fixture replacement","GFCI replacement","Breaker replacement",
    "Appliance diagnosis","Seasonal maintenance checklist","Safety inspection","Customer walkthrough"
  ];

  /* LICENCES. A lapsed required licence removes the tech from dispatch. */
  var LICENCES = [
    { k:"Driver's licence",        required:true,  note:"Every tech drives a company truck." },
    { k:"Insurance / MVR",         required:true,  note:"Carrier requires a clean MVR on file." },
    { k:"OSHA 10",                 required:true,  note:"Jobsite safety card." },
    { k:"EPA 608 Universal",       required:false, note:"Federal. No refrigerant work without it." },
    { k:"Journeyman electrician",  required:false, note:"State card. Required for permitted electrical." },
    { k:"Master electrician",      required:false, note:"Pulls permits and supervises journeymen." },
    { k:"Journeyman plumber",      required:false, note:"State card. Required for permitted plumbing." },
    { k:"Gas fitter",              required:false, note:"Required for any gas piping alteration." },
    { k:"Backflow tester",         required:false, note:"Certifies assemblies to the water purveyor." },
    { k:"NATE certification",      required:false, note:"HVAC competency credential customers recognise." }
  ];
  var LIC_WARN_DAYS = 45;

  var SKILLS = ["Heat pump","Ductless mini-split","Boiler","Commercial rooftop","Ice machine",
                "Tankless water heater","Well pump","Septic","Panel upgrade","EV charger",
                "Generator","Sewer camera","Hydro-jet","Crawlspace comfortable","Attic comfortable"];

  /* MONEY RULES. Draft shop policy — the numbers a contractor actually argues about. */
  var RATES = {
    laborBillPerHr:  145.00,  // what the customer is billed per labor hour
    emergencyMult:   1.5,     // after-hours / weekend / holiday customer multiplier
    tripFee:          89.00,  // diagnostic / trip charge
    partsMarkup:      1.85,   // supply-house cost x this = customer price
    otAfterHours:    40,      // tech hours per week before overtime
    otMultiplier:     1.5,    // PAY side only
    driveePaidPerHr: 24.00,   // paid windshield time between jobs
    mileageRate:      0.70,
    burdenPct:        0.238,  // taxes, comp, truck, insurance, phone — trades burden runs high
    warrantyLaborAllowance: 75.00 // what a manufacturer typically reimburses per labor hour
  };

  var PROOF = { geofenceMeters:200, lateGraceMin:10, noShowMin:30 };

  var ATS_STAGES = ["Applied","Phone screen","Ride-along","Offer","Onboarding","Active","Declined"];
  var REFERRER_TYPES = ["General contractor","Property manager","Realtor","Home warranty company",
                        "Builder","Plumber/Electrician (trade swap)","Supply house","Past customer","Web / search"];
  var ESTIMATE_STAGES = ["Requested","Scheduled","Quoted","Won","Lost"];

  var BENCH = {
    grossMarginPct:  { value:null, note:"Not yet sourced — enter your own target." },
    callbackPct:     { value:null, note:"Not yet sourced. Track your own baseline first." },
    firstTimeFixPct: { value:null, note:"Not yet sourced." },
    techTurnoverPct: { value:null, note:"Not yet sourced." }
  };
  var REPLACES = ["Dispatch & scheduling software","Mobile field app","Estimating / flat-rate book",
                  "Truck inventory spreadsheet","Licence renewal reminders","Customer portal",
                  "E-signature service","Invoicing tool"];

  /* ====================================================================
     SEED — Selkirk Mechanical, Post Falls, Idaho.
     A real-shaped 8-truck shop: HVAC + plumbing + electrical under one roof,
     which is exactly how the successful North Idaho shops actually run.
     ==================================================================== */
  function licOn(monthsOut){ return iso(addMonths(TODAY, monthsOut)); }
  var SEED = {};

  SEED.shop = {
    name:"Selkirk Mechanical", dba:"Selkirk Mechanical, LLC",
    city:"Post Falls", state:"ID",
    licence:"ID-HVA-00000 / ID-PLU-00000 (enter your numbers)",
    owner:"Dale Kirby", phone:"(208) 555-0170",
    lat:47.7180, lng:-116.9516,
    hours:"7:00a – 5:00p, 24/7 emergency",
    holidays:["2026-01-01","2026-05-25","2026-07-04","2026-09-07","2026-11-26","2026-12-25"]
  };

  /* SWITCHBOARD — the phone floor. Simulated sample calls (the ribbon says so):
     real numbers, recordings and IVR are wired to the buyer's line at purchase. */
  SEED.calls = [
    { id:"k1", when:"T 08:42", from:"(208) 555-0214", name:"Gary Pruett", customerId:null,
      reason:"No cooling — upstairs is 84° and climbing", status:"ringing", dur:0, by:null,
      summary:null, jobId:null },
    { id:"k2", when:"T 08:40", from:"(208) 555-0202", name:null, customerId:"c2",
      reason:"Unit 14 — water heater leaking at the base", status:"ringing", dur:0, by:null,
      summary:null, jobId:null },
    { id:"k3", when:"T 08:12", from:"(208) 555-0201", name:null, customerId:"c1",
      reason:"Comfort Club spring visit — wants it before the heat", status:"booked", dur:214, by:"Front desk",
      summary:"Existing member, 2 visits/yr. Prefers mornings, dogs in yard — use gate code on file. Booked as maintenance.", jobId:null },
    { id:"k4", when:"T 07:58", from:"(208) 555-0219", name:"Lena Okafor", customerId:null,
      reason:"Quote — replace 40-gal water heater", status:"booked", dur:311, by:"AI receptionist",
      summary:"New caller, Hayden. Gas 40-gal, 11 yrs old, pilot keeps dropping. Offered first open slot off the live board; caller took it. Estimate flagged for a tankless option.", jobId:null },
    { id:"k5", when:"T 07:31", from:"(208) 555-0223", name:"R. Maldonado", customerId:null,
      reason:"Asked for a price on a panel upgrade", status:"logged", dur:126, by:"AI receptionist",
      summary:"Shopping calls only — wants ballpark for a 200A panel. Gave the visit-fee policy, no booking yet. Set a follow-up touch for Thursday.", jobId:null },
    { id:"k6", when:"T 07:05", from:"(208) 555-0208", name:null, customerId:"c3",
      reason:"Furnace short-cycling again", status:"callback", dur:0, by:null,
      summary:"Missed before open — rang 22s. Auto-queued for callback; history shows a January ignitor replacement under warranty.", jobId:null },
    { id:"y1", when:"Y 16:12", from:"(208) 555-0202", name:null, customerId:"c2",
      reason:"PO for building-6 rooftop work", status:"logged", dur:187, by:"Front desk",
      summary:"PM confirming PO before Thursday rooftop job. PO number recorded to the job record.", jobId:null },
    { id:"y2", when:"Y 11:47", from:"(208) 555-0230", name:"Walk-in referral", customerId:null,
      reason:"Mini-split quote for a garage shop", status:"booked", dur:242, by:"Front desk",
      summary:"Referred by Riverbend's PM. Wants a ductless mini-split in a 600 sq ft shop. Estimate visit booked; referral touch logged.", jobId:null }
  ];

  /* FLEETVIEW — the trucks. Positions are the last GPS ping from the branded
     technician app on each tech's phone; no vehicle hardware is required.
     This floor runs on a simulated sample fleet (the ribbon says so). Optional
     vehicle-level telemetry hardware is wired per buyer at purchase. */
  SEED.trucks = [
    { id:"v1", label:"Truck 1", techId:"t1", plate:"ID 4B–7719", unit:"2021 Ford Transit 250",
      odo:78412, serviceEveryMi:5000, lastServiceMi:75190, lastServiceOn:"2026-06-18",
      ping:{ lat:47.7212, lng:-116.9331, at:"08:56", mph:0, heading:"parked", battery:82 } },
    { id:"v2", label:"Truck 2", techId:"t2", plate:"ID 7K–2204", unit:"2019 RAM ProMaster 1500",
      odo:104880, serviceEveryMi:5000, lastServiceMi:99400, lastServiceOn:"2026-04-02",
      ping:{ lat:47.6931, lng:-116.7842, at:"08:58", mph:0, heading:"parked", battery:61 } },
    { id:"v3", label:"Truck 3", techId:"t3", plate:"ID 2C–5581", unit:"2022 Chevrolet Express 2500",
      odo:41067, serviceEveryMi:5000, lastServiceMi:39900, lastServiceOn:"2026-07-09",
      ping:{ lat:47.7604, lng:-116.7913, at:"08:57", mph:0, heading:"on site", battery:44 } },
    { id:"v4", label:"Truck 4", techId:"t4", plate:"ID 9J–1043", unit:"2020 Ford Transit 350",
      odo:66240, serviceEveryMi:5000, lastServiceMi:62110, lastServiceOn:"2026-05-21",
      ping:{ lat:47.7803, lng:-117.0102, at:"08:41", mph:0, heading:"parked", battery:19 } },
    { id:"v5", label:"Truck 5", techId:"t5", plate:"ID 5N–8827", unit:"2018 Nissan NV2500",
      odo:132904, serviceEveryMi:5000, lastServiceMi:132010, lastServiceOn:"2026-07-28",
      ping:{ lat:47.8104, lng:-116.8938, at:"08:59", mph:41, heading:"S", battery:73 } },
    { id:"v6", label:"Truck 6", techId:"t6", plate:"ID 6R–3390", unit:"2021 RAM ProMaster 2500",
      odo:58733, serviceEveryMi:5000, lastServiceMi:54020, lastServiceOn:"2026-06-30",
      ping:{ lat:47.6742, lng:-116.7661, at:"08:55", mph:0, heading:"parked", battery:88 } },
    { id:"v7", label:"Truck 7", techId:"t7", plate:"ID 8W–6612", unit:"2023 Ford Transit 250",
      odo:19488, serviceEveryMi:5000, lastServiceMi:15100, lastServiceOn:"2026-07-15",
      ping:{ lat:47.6958, lng:-116.7791, at:"08:58", mph:0, heading:"parked", battery:57 } }
  ];

  /* SERVICE PLANS — the maintenance agreements this shop already sells.
     The catalogue and the memberships below line up with the agreements already
     on the customer records; nothing here invents a customer or a number. */
  SEED.plans = [
    { id:"cc",  name:"Comfort Club", kind:"Residential", annual:398, visitsYr:2,
      discount:15, priority:"Front of the line on the day board",
      perks:["Two seasonal visits — heating and cooling","15% off repairs","No after-hours trip fee","Filters carried on the truck"] },
    { id:"ccp", name:"Comfort Club Plus", kind:"Residential", annual:598, visitsYr:3,
      discount:20, priority:"Same-day when a slot exists",
      perks:["Three visits — heating, cooling and a mid-season check","20% off repairs","Diagnostic fee waived","Water heater flush included"] },
    { id:"pri", name:"Priority Commercial", kind:"Commercial", annual:null, visitsYr:null,
      discount:15, priority:"Four-hour response commitment",
      perks:["Quarterly or monthly visits, quoted per site","15% off repairs","Four-hour response","Equipment list kept current"] }
  ];

  /* Memberships carry the state a plan needs that a customer record does not:
     what has been used, when it renews, and whether it renews itself. */
  SEED.memberships = [
    { id:"m1", customerId:"c1",  planId:"cc",  since:"2021-04-02", annual:398,  visitsYr:2,
      visitsUsed:1, lastVisit:"2026-07-27", renewsOn:"2026-08-14", autoRenew:true,  billing:"Annual", status:"Active" },
    { id:"m2", customerId:"c2",  planId:"pri", since:"2022-02-18", annual:7200, visitsYr:12,
      visitsUsed:7, lastVisit:"2026-07-20", renewsOn:"2027-02-18", autoRenew:true,  billing:"Monthly", status:"Active" },
    { id:"m3", customerId:"c4",  planId:"pri", since:"2023-06-05", annual:2400, visitsYr:4,
      visitsUsed:2, lastVisit:"2026-06-11", renewsOn:"2026-09-05", autoRenew:true,  billing:"Monthly", status:"Active" },
    { id:"m4", customerId:"c5",  planId:"cc",  since:"2020-09-30", annual:398,  visitsYr:2,
      visitsUsed:2, lastVisit:"2026-07-27", renewsOn:"2026-08-09", autoRenew:false, billing:"Annual", status:"Active" },
    { id:"m5", customerId:"c8",  planId:"pri", since:"2021-11-12", annual:3600, visitsYr:6,
      visitsUsed:3, lastVisit:"2026-07-25", renewsOn:"2026-11-12", autoRenew:true,  billing:"Monthly", status:"Active" },
    { id:"m6", customerId:"c9",  planId:"cc",  since:"2019-05-21", annual:398,  visitsYr:2,
      visitsUsed:0, lastVisit:"2026-02-14", renewsOn:"2026-08-21", autoRenew:true,  billing:"Annual", status:"Active" }
  ];

  SEED.techs = [
    { id:"t1", name:"Wade Fillmore", trade:"HVAC", phone:"(208) 555-0181", city:"Post Falls",
      lat:47.7150, lng:-116.9400, hired:"2019-03-11", payRate:38.00, status:"Active", rating:4.9,
      truck:"Truck 1", skills:["Heat pump","Ductless mini-split","Commercial rooftop","Attic comfortable"],
      lic:{ "Driver's licence":licOn(26), "Insurance / MVR":licOn(8), "OSHA 10":licOn(14),
            "EPA 608 Universal":"complete", "NATE certification":licOn(19) } },
    { id:"t2", name:"Marisela Ochoa", trade:"Plumbing", phone:"(208) 555-0182", city:"Coeur d'Alene",
      lat:47.6880, lng:-116.7800, hired:"2020-07-06", payRate:36.50, status:"Active", rating:4.8,
      truck:"Truck 2", skills:["Tankless water heater","Sewer camera","Crawlspace comfortable"],
      lic:{ "Driver's licence":licOn(31), "Insurance / MVR":licOn(4), "OSHA 10":licOn(9),
            "Journeyman plumber":licOn(16), "Gas fitter":licOn(11), "Backflow tester":licOn(2) } },
    { id:"t3", name:"Curtis Vandeveer", trade:"Electrical", phone:"(208) 555-0183", city:"Hayden",
      lat:47.7660, lng:-116.7866, hired:"2018-01-22", payRate:41.00, status:"Active", rating:5.0,
      truck:"Truck 3", skills:["Panel upgrade","EV charger","Generator"],
      lic:{ "Driver's licence":licOn(22), "Insurance / MVR":licOn(10), "OSHA 10":licOn(6),
            "Journeyman electrician":licOn(13), "Master electrician":licOn(13) } },
    { id:"t4", name:"Booker Reyes", trade:"HVAC", phone:"(208) 555-0184", city:"Post Falls",
      lat:47.7220, lng:-116.9410, hired:"2022-05-16", payRate:32.00, status:"Active", rating:4.6,
      truck:"Truck 4", skills:["Heat pump","Boiler","Crawlspace comfortable"],
      lic:{ "Driver's licence":licOn(28), "Insurance / MVR":licOn(7), "OSHA 10":licOn(-1),
            "EPA 608 Universal":"complete" } },
    { id:"t5", name:"Junie Halloran", trade:"Plumbing", phone:"(208) 555-0185", city:"Rathdrum",
      lat:47.8121, lng:-116.8960, hired:"2021-09-13", payRate:34.50, status:"Active", rating:4.7,
      truck:"Truck 5", skills:["Hydro-jet","Sewer camera","Well pump","Septic"],
      lic:{ "Driver's licence":licOn(18), "Insurance / MVR":licOn(12), "OSHA 10":licOn(20),
            "Journeyman plumber":licOn(5) } },
    { id:"t6", name:"Desmond Achterberg", trade:"Drain", phone:"(208) 555-0186", city:"Coeur d'Alene",
      lat:47.6720, lng:-116.7640, hired:"2024-02-19", payRate:28.00, status:"Active", rating:4.4,
      truck:"Truck 6", skills:["Hydro-jet","Sewer camera","Crawlspace comfortable"],
      lic:{ "Driver's licence":licOn(33), "Insurance / MVR":licOn(6), "OSHA 10":licOn(11) } },
    { id:"t7", name:"Priya Ranganathan", trade:"Electrical", phone:"(208) 555-0187", city:"Coeur d'Alene",
      lat:47.6930, lng:-116.7770, hired:"2023-06-05", payRate:35.00, status:"Active", rating:4.8,
      truck:"Truck 7", skills:["EV charger","Panel upgrade","Attic comfortable"],
      lic:{ "Driver's licence":licOn(24), "Insurance / MVR":licOn(9), "OSHA 10":licOn(15),
            "Journeyman electrician":licOn(1) } },
    { id:"t8", name:"Toby Lindquist", trade:"HVAC", phone:"(208) 555-0188", city:"Hayden",
      lat:47.7490, lng:-116.7720, hired:"2026-06-01", payRate:24.00, status:"Apprentice", rating:null,
      truck:"rides along", skills:["Attic comfortable"],
      lic:{ "Driver's licence":licOn(29), "Insurance / MVR":licOn(5), "OSHA 10":licOn(17) } }
  ];

  SEED.customers = [
    { id:"c1", name:"Bev Trawick", kind:"Residential", city:"Coeur d'Alene", lat:47.6890, lng:-116.7710,
      addr:"812 Lakeshore Dr", phone:"(208) 555-0201", since:"2021-04-02",
      equip:"Carrier 3-ton heat pump, 2019 · 50 gal gas water heater",
      agreement:"Comfort Club — 2 visits/yr", agreementAnnual:398, visitsYr:2, notes:"Two dogs. Gate code 4417." },
    { id:"c2", name:"Riverbend Apartments", kind:"Property manager", city:"Post Falls", lat:47.7100, lng:-116.9420,
      addr:"4400 Riverbend Ave", phone:"(208) 555-0202", since:"2019-08-15",
      equip:"48 units · package units on 6 buildings", agreement:"Priority commercial", agreementAnnual:7200, visitsYr:12,
      notes:"Bill to Coeur Property Group. PO required over $500." },
    { id:"c3", name:"Hal Bergstrom", kind:"Residential", city:"Hayden", lat:47.7620, lng:-116.7690,
      addr:"1129 Honeysuckle", phone:"(208) 555-0203", since:"2023-11-30",
      equip:"Lennox 96% furnace, 2023 (under mfr warranty) · A/O Smith tankless",
      agreement:"none", notes:"Installed by us — furnace still under manufacturer parts warranty." },
    { id:"c4", name:"Cedar Ridge Dental", kind:"Commercial", city:"Coeur d'Alene", lat:47.6790, lng:-116.7960,
      addr:"2200 Ironwood Dr", phone:"(208) 555-0204", since:"2020-02-11",
      equip:"2 rooftop units · medical gas · compressor", agreement:"Priority commercial", agreementAnnual:2400, visitsYr:4,
      notes:"Cannot lose cooling during patient hours. After-hours preferred." },
    { id:"c5", name:"Norma Pyle", kind:"Residential", city:"Rathdrum", lat:47.8090, lng:-116.8920,
      addr:"305 Mill St", phone:"(208) 555-0205", since:"2018-06-21",
      equip:"Well pump · 200A panel, 1978", agreement:"Comfort Club — 2 visits/yr", agreementAnnual:398, visitsYr:2,
      notes:"Elderly, hard of hearing. Call before arriving, then knock loudly." },
    { id:"c6", name:"Fairmount Builders", kind:"General contractor", city:"Post Falls", lat:47.7240, lng:-116.9280,
      addr:"c/o site — Prairie Crossing Ph 2", phone:"(208) 555-0206", since:"2022-01-10",
      equip:"14 spec homes in progress", agreement:"Contract — schedule of values",
      notes:"Draws on the 10th. Rough-in inspections Tuesdays." },
    { id:"c7", name:"Sal Whitcomb", kind:"Residential", city:"Post Falls", lat:47.7150, lng:-116.9600,
      addr:"77 Seltice Way", phone:"(208) 555-0207", since:"2026-05-19",
      equip:"Sewer line — clay, 1962", agreement:"none", notes:"Recurring root intrusion. Sold on a liner, not scheduled." },
    { id:"c8", name:"Lakeside Grill", kind:"Commercial", city:"Coeur d'Alene", lat:47.6650, lng:-116.7820,
      addr:"18 Sherman Ave", phone:"(208) 555-0208", since:"2021-09-08",
      equip:"Walk-in cooler · ice machine · 3-comp sink", agreement:"Priority commercial", agreementAnnual:3600, visitsYr:6,
      notes:"Health inspection sensitive. Cooler down = closed." },
    { id:"c9", name:"Dot Kilbride", kind:"Residential", city:"Hayden", lat:47.7710, lng:-116.7950,
      addr:"640 Government Way", phone:"(208) 555-0209", since:"2024-03-14",
      equip:"Ductless mini-split x3, 2024", agreement:"Comfort Club — 2 visits/yr", agreementAnnual:398, visitsYr:2, notes:"" },
    { id:"c10", name:"Owen Brackett", kind:"Residential", city:"Coeur d'Alene", lat:47.6640, lng:-116.7960,
      addr:"91 Fernan Hill Rd", phone:"(208) 555-0210", since:"2025-10-02",
      equip:"Boiler, 1998 · 100A panel", agreement:"none", notes:"Wants a panel upgrade quote." }
  ];

  /* Truck stock — the thing that decides whether a job is a first-time fix or a
     second trip. Second trips are pure margin loss. */
  SEED.parts = [
    { sku:"CAP-45-5",  name:"Dual run capacitor 45/5",  cost:14.20, trade:"HVAC",       stock:{t1:4,t4:3,t8:0} },
    { sku:"CON-2P30",  name:"Contactor 2-pole 30A",     cost:19.80, trade:"HVAC",       stock:{t1:2,t4:2,t8:0} },
    { sku:"TSTAT-PRO", name:"Programmable thermostat",  cost:78.00, trade:"HVAC",       stock:{t1:2,t4:1,t8:0} },
    { sku:"BLW-1/2",   name:"Blower motor 1/2 HP",      cost:212.00,trade:"HVAC",       stock:{t1:1,t4:0,t8:0} },
    { sku:"IGN-HSI",   name:"Hot surface igniter",      cost:31.50, trade:"HVAC",       stock:{t1:3,t4:2,t8:0} },
    { sku:"WH-40G",    name:"40 gal gas water heater",  cost:640.00,trade:"Plumbing",   stock:{t2:1,t5:0} },
    { sku:"VLV-QTR",   name:"Quarter-turn shut-off",    cost:8.40,  trade:"Plumbing",   stock:{t2:12,t5:9} },
    { sku:"WAX-RING",  name:"Wax ring kit",             cost:4.10,  trade:"Plumbing",   stock:{t2:8,t5:6} },
    { sku:"DISP-3/4",  name:"Garbage disposal 3/4 HP",  cost:96.00, trade:"Plumbing",   stock:{t2:2,t5:1} },
    { sku:"GFCI-20",   name:"GFCI receptacle 20A",      cost:16.75, trade:"Electrical", stock:{t3:10,t7:8} },
    { sku:"BRK-20-1P", name:"Breaker 20A single pole",  cost:11.90, trade:"Electrical", stock:{t3:14,t7:11} },
    { sku:"PNL-200A",  name:"200A load center",         cost:385.00,trade:"Electrical", stock:{t3:1,t7:0} },
    { sku:"EVSE-48",   name:"EV charger 48A",           cost:520.00,trade:"Electrical", stock:{t3:0,t7:1} },
    { sku:"CBL-3/8",   name:"Drain cable 3/8 x 75'",    cost:118.00,trade:"Drain",      stock:{t6:1} }
  ];

  /* ---------------------------------------------------------------- jobs
     Three weeks of work: two closed, this one live. Deliberately includes the
     things a dispatcher actually fights — an unassigned emergency, a permit job
     with no permit number, and two warranty callbacks that cost real money. */
  var JOB_SEED = [
    /* [dayOffsetFromWeekStart, customerId, trade, type, billing, start, hrs, techId, task, partsUsed{sku:qty}, note] */
    [1,"c1","HVAC","Maintenance (agreement)","Maintenance agreement","08:00",1.5,"t1","Seasonal maintenance checklist",{"CAP-45-5":0},""],
    [1,"c2","HVAC","Repair","Time & materials","10:30",3.0,"t1","Capacitor replacement",{"CAP-45-5":2,"CON-2P30":1},"Bldg 3 and 5 package units."],
    [1,"c5","Plumbing","Repair","Time & materials","08:00",2.0,"t5","Shut-off valve replacement",{"VLV-QTR":3},""],
    [1,"c10","Electrical","Estimate","Time & materials","13:00",1.0,"t3","Diagnose and report",{},"Panel upgrade quote — 1978 100A."],
    [1,"c8","Refrigeration","Emergency","Time & materials","16:30",2.5,"t1","Refrigerant leak search",{},"Walk-in at 52F. After hours."],
    [2,"c3","HVAC","Warranty callback","Manufacturer warranty","09:00",2.0,"t4","Hot surface igniter",{"IGN-HSI":1},"Lennox igniter — under mfr parts warranty."],
    [2,"c7","Drain","Service call","Time & materials","08:30",2.5,"t6","Drain cable / auger",{},"Root intrusion again. Third time this year."],
    [2,"c4","HVAC","Maintenance (agreement)","Maintenance agreement","07:00",2.0,"t4","Coil clean",{},"Before patient hours."],
    [2,"c6","Plumbing","Install / replace","New construction / GC","09:00",6.0,"t2","Water heater replacement",{"WH-40G":1},"Lot 14 rough-in."],
    [3,"c9","HVAC","Maintenance (agreement)","Maintenance agreement","10:00",1.5,"t1","Seasonal maintenance checklist",{},""],
    [3,"c1","Plumbing","Repair","Flat rate","13:00",1.5,"t2","Garbage disposal replacement",{"DISP-3/4":1},""],
    [3,"c2","Electrical","Repair","Time & materials","08:00",4.0,"t7","GFCI replacement",{"GFCI-20":6},"Six units, laundry rooms."],
    [3,"c8","Refrigeration","Warranty callback","Our workmanship warranty","14:00",3.0,"t1","Refrigerant leak search",{},"Same cooler. Our braze joint failed."],
    [4,"c10","Electrical","Install / replace","Time & materials","08:00",7.0,"t3","Electrical service / panel change",{"PNL-200A":1},"200A upgrade. PERMIT."],
    [4,"c5","Plumbing","Service call","Time & materials","09:00",2.0,"t5","Camera inspection",{},""],
    [4,"c4","Refrigeration","Repair","Time & materials","15:00",2.0,"t1","Diagnose and report",{},""],
    [4,"c6","Electrical","Install / replace","New construction / GC","08:00",8.0,"t7","New circuit / rough-in",{"BRK-20-1P":9},"Lots 12-14. PERMIT."],
    [5,"c9","Electrical","Install / replace","Time & materials","09:00",4.0,null,"EV charger",{"EVSE-48":1},"UNASSIGNED — customer confirmed."],
    [5,"c3","Plumbing","Repair","Time & materials","08:00",2.0,"t2","Faucet / fixture replacement",{},""],
    [5,"c2","Plumbing","Service call","Time & materials","11:00",3.0,null,"Toilet rebuild",{"WAX-RING":2},"UNASSIGNED — 2 units."],
    [5,"c1","HVAC","Repair","Time & materials","14:00",2.0,"t4","Blower motor replacement",{"BLW-1/2":1},""],
    [6,"c8","Refrigeration","Emergency","Time & materials","07:00",3.0,"t1","Diagnose and report",{},"Saturday. Ice machine down."]
  ];

  SEED.jobs = (function(){
    var out=[], n=1, todayISO=iso(TODAY);
    for (var wk=-2; wk<=0; wk++){
      for (var i=0;i<JOB_SEED.length;i++){
        var p=JOB_SEED[i];
        var day=addDays(WEEK_START, wk*7+p[0]), dISO=iso(day);
        var cust=SEED.customers.filter(function(c){return c.id===p[1];})[0]; if(!cust) continue;
        if (dISO < cust.since) continue;
        var techId=p[7];
        if (!techId && wk<0) techId=["t2","t7","t5"][i%3];   // prior weeks always got covered
        /* Today is a real working day, not a blank slate: morning jobs are already
           closed, the one running now is on site, the afternoon is still scheduled. */
        var startMin = hhmmToMin(p[5]);
        var status;
        if (dISO < todayISO)       status = techId ? "Closed" : "Missed";
        else if (dISO === todayISO) status = !techId ? "OPEN"
                                           : startMin + Math.round(p[6]*60) <= 12*60 ? "Closed"
                                           : startMin <= 13*60 ? "On site" : "Scheduled";
        else                        status = techId ? "Scheduled" : "OPEN";
        var endMin = hhmmToMin(p[5]) + Math.round(p[6]*60);
        var j = { id:"j"+(n++), customerId:cust.id, techId:techId||null, date:dISO,
          start:p[5], end:minToHhmm(endMin), hours:p[6],
          trade:p[2], type:p[3], billing:p[4], task:p[8],
          parts: JSON.parse(JSON.stringify(p[9]||{})), note:p[10]||"",
          status:status, proof:null, permitNo:"", mileage: 6+((n*7)%22), photos:0 };
        if (status==="Closed"){
          j.proof = { inTs:dISO+"T"+p[5]+":00", inMin:0, outTs:dISO+"T"+minToHhmm(endMin)+":00",
                      inGeo:true, method:"Mobile app (GPS)", tasks:[p[8]], sig:true, note:"" };
          j.photos = 2 + (n%4);
          if (needsPermit(p[8])) j.permitNo = "PF-2026-" + (1400+n);
        } else if (status==="On site"){
          j.proof = { inTs:dISO+"T"+p[5]+":00", inMin:0, outTs:null, inGeo:true,
                      method:"Mobile app (GPS)", tasks:[], sig:false, note:"" };
        }
        out.push(j);
      }
    }
    /* A live week always has exceptions. Place them deliberately. */
    var done = out.filter(function(j){ return j.status==="Closed" && j.proof; });
    [4,17,29,44].forEach(function(i){ if(done[i]) done[i].proof.inMin = 12+(i%9); });     // late arrival
    [9,31].forEach(function(i){ if(done[i]) done[i].proof.inGeo = false; });               // clocked in off-site
    [13,38].forEach(function(i){ if(done[i]) done[i].proof.sig = false; });                // no customer signature
    /* one permitted job closed with no permit number — the audit finding */
    var permitted = out.filter(function(j){ return needsPermit(j.task) && j.status==="Closed"; });
    if (permitted[0]) permitted[0].permitNo = "";
    return out;
  })();

  SEED.estimates = [
    { id:"e1", customerId:"c10", title:"200A service upgrade + EV circuit", trade:"Electrical",
      requested:iso(addDays(TODAY,-9)), stage:"Won", amount:4850, cost:2180,
      note:"Sold. Scheduled Thursday. Permit pulled." },
    { id:"e2", customerId:"c7", title:"Sewer line replacement — 62 ft, pipe burst", trade:"Plumbing",
      requested:iso(addDays(TODAY,-4)), stage:"Quoted", amount:11400, cost:6100,
      note:"Third root callout this year. Quote out, no answer yet." },
    { id:"e3", customerId:"c4", title:"Rooftop unit replacement (1 of 2)", trade:"HVAC",
      requested:iso(addDays(TODAY,-2)), stage:"Scheduled", amount:0, cost:0,
      note:"Site visit Wednesday to measure curb." },
    { id:"e4", customerId:"c9", title:"Whole-home surge protection", trade:"Electrical",
      requested:iso(addDays(TODAY,-16)), stage:"Lost", amount:780, cost:290,
      note:"Went with the cheaper bid. Follow up at next maintenance visit." },
    { id:"e5", customerId:"c2", title:"Replace 6 package units — phased", trade:"HVAC",
      requested:iso(addDays(TODAY,-1)), stage:"Requested", amount:0, cost:0,
      note:"Property manager asked for a phased capital plan." }
  ];

  SEED.applicants = [
    { id:"a1", name:"Reece Mowbray", trade:"HVAC", phone:"(208) 555-0230", city:"Post Falls",
      applied:iso(addDays(TODAY,-1)), stage:"Applied", lic:["EPA 608 Universal"], yrs:6, hasTools:true,
      note:"Currently at a competitor. Wants out of on-call rotation." },
    { id:"a2", name:"Tanya Escobedo", trade:"Electrical", phone:"(208) 555-0231", city:"Coeur d'Alene",
      applied:iso(addDays(TODAY,-3)), stage:"Phone screen", lic:["Journeyman electrician","OSHA 10"], yrs:9, hasTools:true,
      note:"Strong. Journeyman card current. Asking $42." },
    { id:"a3", name:"Cody Reinhart", trade:"Plumbing", phone:"(208) 555-0232", city:"Rathdrum",
      applied:iso(addDays(TODAY,-6)), stage:"Ride-along", lic:["OSHA 10"], yrs:2, hasTools:false,
      note:"Apprentice level. Rides with Junie Thursday." },
    { id:"a4", name:"Marcus Delahoy", trade:"HVAC", phone:"(208) 555-0233", city:"Hayden",
      applied:iso(addDays(TODAY,-12)), stage:"Offer", lic:["EPA 608 Universal","NATE certification"], yrs:11, hasTools:true,
      note:"Offer out at $39. Deciding." },
    { id:"a5", name:"Wyatt Boothe", trade:"Drain", phone:"(208) 555-0234", city:"Post Falls",
      applied:iso(addDays(TODAY,-8)), stage:"Declined", lic:[], yrs:0, hasTools:false,
      note:"No licence, no vehicle, availability does not match." }
  ];

  SEED.referrers = [
    { id:"r1", org:"Fairmount Builders", contact:"Jeanette Pruitt", type:"General contractor",
      phone:"(208) 555-0206", city:"Post Falls", lastTouch:iso(addDays(TODAY,-5)), cadenceDays:14,
      ytd:22, converted:19, note:"Our largest new-construction feed. Draws on the 10th." },
    { id:"r2", org:"Coeur Property Group", contact:"Milo Hargrave", type:"Property manager",
      phone:"(208) 555-0202", city:"Coeur d'Alene", lastTouch:iso(addDays(TODAY,-3)), cadenceDays:21,
      ytd:31, converted:28, note:"Riverbend plus 4 other properties. Highest volume." },
    { id:"r3", org:"Selkirk Realty Group", contact:"Andrea Voss", type:"Realtor",
      phone:"(208) 555-0240", city:"Coeur d'Alene", lastTouch:iso(addDays(TODAY,-38)), cadenceDays:30,
      ytd:9, converted:6, note:"OVERDUE. Pre-sale inspections — good margin, easy work." },
    { id:"r4", org:"Northwest Home Shield", contact:"claims desk", type:"Home warranty company",
      phone:"(800) 555-0241", city:"—", lastTouch:iso(addDays(TODAY,-2)), cadenceDays:14,
      ytd:41, converted:41, note:"High volume, LOW margin — they set the labor allowance." },
    { id:"r5", org:"Panhandle Supply", contact:"Russ Bettine", type:"Supply house",
      phone:"(208) 555-0242", city:"Post Falls", lastTouch:iso(addDays(TODAY,-11)), cadenceDays:30,
      ytd:7, converted:5, note:"Counter guys hand out our card. Worth the doughnuts." },
    { id:"r6", org:"Kirby Electric (trade swap)", contact:"Dale's cousin", type:"Plumber/Electrician (trade swap)",
      phone:"(208) 555-0243", city:"Hayden", lastTouch:iso(addDays(TODAY,-19)), cadenceDays:30,
      ytd:12, converted:10, note:"We send them commercial electrical, they send us plumbing." }
  ];

  SEED.systems = [
    { k:"Dispatch & scheduling", state:"Native", note:"This OS. Board, match engine, drag-free assignment." },
    { k:"Mobile field app",      state:"Native", note:"This OS. Arrive/depart, photos, signature, offline capture." },
    { k:"Flat-rate estimating",  state:"Native", note:"This OS. Your own book prices, not a licensed third-party book." },
    { k:"Truck inventory",       state:"Native", note:"This OS. Stock per truck, used per job, reorder flags." },
    { k:"Licence tracking",      state:"Native", note:"This OS. Expiry-dated, dispatch-blocking." },
    { k:"E-signature",           state:"Native", note:"This OS. Work authorisation, change orders, estimate approval." },
    { k:"Customer portal",       state:"Native", note:"This OS." },
    { k:"Permit filing",         state:"Vendor", note:"Permits are pulled through the city or county portal. The OS tracks the number and the inspection; the jurisdiction issues it." },
    { k:"Card & ACH payment",    state:"Vendor", note:"Taking payment needs a licensed processor. The OS computes and authorises; the processor moves funds." },
    { k:"Supply-house pricing",  state:"Vendor", note:"Live catalogue pricing comes from the distributor's own feed (Ferguson, Winsupply, etc.)." },
    { k:"Payroll filing",        state:"Vendor", note:"The OS produces the hours and the stubs; a payroll processor files and pays." }
  ];

  SEED.approvals = [
    { id:"ap_1", title:"Write off the Lakeside Grill callback — 3.0 hrs, our braze joint",
      dept:"Money", why:"The failure was our workmanship. Billing it would cost the account.",
      impact:"-$435 revenue and full cost absorbed. Second callback on Wade this month.",
      stage:"Awaiting Anthony", conf:91, tags:["revenue","quality"] },
    { id:"ap_2", title:"Offer — Marcus Delahoy at $39.00/hr",
      dept:"Recruiting", why:"11 yrs, EPA 608 and NATE current, covers the HVAC gap Toby cannot yet fill.",
      impact:"$1 over band. Frees Wade from the maintenance route.",
      stage:"Awaiting Anthony", conf:84, tags:["payroll"] },
    { id:"ap_3", title:"Send the Whitcomb sewer replacement quote — $11,400",
      dept:"Estimating", why:"Third root callout this year; cabling it again is losing money for both sides.",
      impact:"Largest open quote. 46% margin at quoted cost.",
      stage:"Awaiting Anthony", conf:88, tags:["send"] },
    { id:"ap_4", title:"Raise the trip fee $89 → $99",
      dept:"Money", why:"Fuel and truck cost per stop have moved; the fee has not changed in two years.",
      impact:"Applies to every T&M call. Roughly +$1,100/mo at current call volume.",
      stage:"Awaiting Anthony", conf:73, tags:["revenue"] }
  ];

  SEED.documents = [
    { id:"d1", tpl:"t_auth", title:"Work Authorisation", subject:"Owen Brackett", subjectId:"c10",
      signer:{name:"Owen Brackett", email:"o.brackett@example.com", role:"Homeowner"},
      status:"Signed", created:iso(addDays(TODAY,-6)), sentTs:iso(addDays(TODAY,-6)), token:"TBX-4K7M-2P9Q",
      values:{name:"Owen Brackett", date:iso(addDays(TODAY,-6)), ackScope:true},
      audit:[{ts:iso(addDays(TODAY,-6))+"T10:14:00",who:"Dale Kirby",what:"Document created from template"},
             {ts:iso(addDays(TODAY,-6))+"T10:16:22",who:"Dale Kirby",what:"Signer link minted for Owen Brackett"},
             {ts:iso(addDays(TODAY,-6))+"T18:02:41",who:"Owen Brackett",what:"Opened the signing link"},
             {ts:iso(addDays(TODAY,-6))+"T18:04:10",who:"Owen Brackett",what:"Consented to do business electronically (ESIGN/UETA)"},
             {ts:iso(addDays(TODAY,-6))+"T18:04:33",who:"Owen Brackett",what:"Adopted and applied signature — record frozen"}] },
    { id:"d2", tpl:"t_estimate", title:"Estimate Approval", subject:"Sal Whitcomb", subjectId:"c7",
      signer:{name:"Sal Whitcomb", email:"s.whitcomb@example.com", role:"Homeowner"},
      status:"Sent", created:iso(addDays(TODAY,-4)), sentTs:iso(addDays(TODAY,-4)), token:"TBX-8N3V-6R1D", values:{},
      audit:[{ts:iso(addDays(TODAY,-4))+"T15:31:00",who:"Dale Kirby",what:"Document created from template"},
             {ts:iso(addDays(TODAY,-4))+"T15:33:12",who:"Dale Kirby",what:"Signer link minted for Sal Whitcomb"}] },
    { id:"d3", tpl:"t_change", title:"Change Order", subject:"Fairmount Builders", subjectId:"c6",
      signer:{name:"Jeanette Pruitt", email:"j.pruitt@example.com", role:"GC — project manager"},
      status:"Draft", created:iso(TODAY), sentTs:null, token:"TBX-1H5J-7T4F", values:[],
      audit:[{ts:iso(TODAY)+"T08:12:00",who:"Dale Kirby",what:"Document created from template — Lot 14 scope grew"}] },
    { id:"d4", tpl:"t_employ", title:"Technician Employment Packet", subject:"Marcus Delahoy", subjectId:"a4",
      signer:{name:"Marcus Delahoy", email:"m.delahoy@example.com", role:"Applicant · offer out"},
      status:"Sent", created:iso(addDays(TODAY,-2)), sentTs:iso(addDays(TODAY,-2)), token:"TBX-9W2L-5C8K", values:{},
      audit:[{ts:iso(addDays(TODAY,-2))+"T09:05:00",who:"Dale Kirby",what:"Document created from template"},
             {ts:iso(addDays(TODAY,-2))+"T09:06:40",who:"Dale Kirby",what:"Signer link minted for Marcus Delahoy"}] }
  ];

  /* ====================================================================
     TIME + LOOKUPS
     ==================================================================== */
  function hhmmToMin(s){ var p=String(s).split(":"); return (+p[0])*60 + (+p[1]); }
  function minToHhmm(m){ m=((m%1440)+1440)%1440; var h=Math.floor(m/60), x=m%60;
    return (h<10?"0":"")+h+":"+(x<10?"0":"")+x; }
  function customerById(id){ return db().customers.filter(function(c){return c.id===id;})[0]||null; }
  function techById(id){ return db().techs.filter(function(t){return t.id===id;})[0]||null; }
  function jobById(id){ return db().jobs.filter(function(j){return j.id===id;})[0]||null; }
  function partBySku(s){ return db().parts.filter(function(p){return p.sku===s;})[0]||null; }
  function docById(id){ return db().documents.filter(function(d){return d.id===id;})[0]||null; }
  function docByToken(t){ return db().documents.filter(function(d){return d.token===t;})[0]||null; }
  function techName(id){ var t=techById(id); return t?t.name:"Unassigned"; }
  function weekOf(dISO){ var d=new Date(dISO+"T12:00:00"); return iso(addDays(d,-d.getDay())); }
  function thisWeek(){ return iso(WEEK_START); }
  function lastWeek(){ return iso(addDays(WEEK_START,-7)); }
  function jobsInWeek(wk){ return db().jobs.filter(function(j){ return weekOf(j.date)===(wk||thisWeek()); }); }
  function isWeekend(dISO){ var w=new Date(dISO+"T12:00:00").getDay(); return w===0||w===6; }
  function isHoliday(dISO){ return (db().shop.holidays||[]).indexOf(dISO)>=0; }
  function afterHours(j){
    var m=hhmmToMin(j.start);
    return isWeekend(j.date) || isHoliday(j.date) || m < 7*60 || m >= 17*60;
  }

  /* ====================================================================
     THE MONEY ENGINE — three lines that behave differently
     ==================================================================== */
  function partsCost(j){
    var c=0; Object.keys(j.parts||{}).forEach(function(sku){
      var p=partBySku(sku); if(p) c += p.cost * (j.parts[sku]||0); });
    return c;
  }
  function assignedHoursBefore(techId, dISO, jobId){
    var wk=weekOf(dISO);
    return db().jobs.filter(function(j){
      return j.techId===techId && weekOf(j.date)===wk && j.id!==jobId &&
             (j.date < dISO || (j.date===dISO && j.id < jobId)); })
      .reduce(function(a,j){ return a+(j.hours||0); },0);
  }
  function rateFor(job){
    if(!job) return null;
    var R=RATES, t=job.techId?techById(job.techId):null, hrs=job.hours||0;
    var ah=afterHours(job), warranty=isWarrantyWork(job.billing);

    /* --- what the customer is billed */
    var laborRate = R.laborBillPerHr * (ah ? R.emergencyMult : 1);
    var pc = partsCost(job);
    var laborBill=0, partsBill=0, trip=0;
    if (job.billing === "Our workmanship warranty"){
      laborBill=0; partsBill=0; trip=0;                    // we eat all of it
    } else if (job.billing === "Manufacturer warranty"){
      laborBill = R.warrantyLaborAllowance * hrs;           // allowance, not our rate
      partsBill = pc;                                       // parts reimbursed at cost
      trip = 0;
    } else if (job.billing === "Maintenance agreement"){
      /* The visit is prepaid, but the revenue is REAL — it just belongs to the
         agreement, not the visit. Recognise this visit's share of the annual fee,
         otherwise every maintenance call reads as a 100% loss and an owner
         concludes their agreement programme is losing money when it is not. */
      var cust = customerById(job.customerId) || {};
      var perVisit = (cust.agreementAnnual && cust.visitsYr) ? (cust.agreementAnnual / cust.visitsYr) : 0;
      laborBill = perVisit; partsBill = pc * R.partsMarkup; trip = 0;
    } else {
      laborBill = laborRate * hrs;
      partsBill = pc * R.partsMarkup;
      trip = (job.type==="Maintenance (agreement)") ? 0 : R.tripFee;
    }
    var revenue = laborBill + partsBill + trip;

    /* --- what it cost us */
    var payRate = t ? t.payRate : 0;
    var before = t ? assignedHoursBefore(t.id, job.date, job.id) : 0;
    var reg = Math.max(0, Math.min(hrs, R.otAfterHours - before));
    var ot  = Math.max(0, hrs - reg);
    var wages = (reg*payRate) + (ot*payRate*R.otMultiplier);
    var drive = (Number(job.mileage)||0)/30 * R.driveePaidPerHr;   // ~30 mph door to door
    var mileage = (Number(job.mileage)||0) * R.mileageRate;
    var burden = (wages+drive) * R.burdenPct;
    var cost = wages + drive + burden + mileage + pc;

    return { hours:hrs, afterHours:ah, warranty:warranty,
      laborRate:laborRate, laborBill:laborBill, partsCost:pc, partsBill:partsBill, trip:trip,
      revenue:revenue, payRate:payRate, regHrs:reg, otHrs:ot, wages:wages, drive:drive,
      mileage:mileage, burden:burden, cost:cost,
      margin:revenue-cost, marginPct: revenue ? ((revenue-cost)/revenue)*100 : (cost? -100 : 0) };
  }

  function scoped(wk, scope){
    var rows=jobsInWeek(wk||thisWeek());
    if(scope==="closed") return rows.filter(function(j){ return j.status==="Closed"; });
    if(scope==="billable") return rows.filter(function(j){ return j.status==="Closed" && !isWarrantyWork(j.billing); });
    return rows.filter(function(j){ return !!j.techId; });   // assigned
  }
  function weekRevenue(wk,s){ return scoped(wk,s).reduce(function(a,j){ var r=rateFor(j); return a+(r?r.revenue:0); },0); }
  function weekCost(wk,s){ return scoped(wk,s).reduce(function(a,j){ var r=rateFor(j); return a+(r?r.cost:0); },0); }
  function weekMargin(wk,s){ return weekRevenue(wk,s)-weekCost(wk,s); }
  function weekMarginPct(wk,s){ var r=weekRevenue(wk,s); return r?(weekMargin(wk,s)/r)*100:0; }
  function weekHours(wk,s){ return scoped(wk,s).reduce(function(a,j){ return a+(j.hours||0); },0); }
  function openJobs(wk){ return jobsInWeek(wk||thisWeek()).filter(function(j){ return !j.techId; }); }
  function openHours(wk){ return openJobs(wk).reduce(function(a,j){ return a+(j.hours||0); },0); }
  function fillRate(wk){ var all=jobsInWeek(wk||thisWeek()); if(!all.length) return null;
    return (all.filter(function(j){return j.techId;}).length/all.length)*100; }
  function byKey(wk,s,keyFn,valFn){ var m={};
    scoped(wk,s).forEach(function(j){ var r=rateFor(j); if(!r) return; var k=keyFn(j); m[k]=(m[k]||0)+valFn(r); });
    return m; }
  function revenueByTrade(wk,s){ return byKey(wk,s,function(j){return j.trade;},function(r){return r.revenue;}); }
  function revenueByBilling(wk,s){ return byKey(wk,s,function(j){return j.billing;},function(r){return r.revenue;}); }
  function marginPctBy(wk,s,keyFn){
    var rev=byKey(wk,s,keyFn,function(r){return r.revenue;});
    var mar=byKey(wk,s,keyFn,function(r){return r.margin;});
    var out={}; Object.keys(rev).forEach(function(k){ out[k]= rev[k]?(mar[k]/rev[k])*100:0; });
    Object.keys(mar).forEach(function(k){ if(!(k in out)) out[k]= -100; });
    return out; }
  function overtimeHours(wk,s){ return scoped(wk,s).reduce(function(a,j){ var r=rateFor(j); return a+(r?r.otHrs:0); },0); }

  /* THE CALLBACK NUMBER — work redone for free. Most shops never measure it. */
  function callbacks(wk){ return jobsInWeek(wk||thisWeek()).filter(function(j){ return j.billing==="Our workmanship warranty"; }); }
  function callbackCost(wk){ return callbacks(wk).reduce(function(a,j){ var r=rateFor(j); return a+(r?r.cost:0); },0); }
  function callbackRate(wk){
    var all=jobsInWeek(wk||thisWeek()).filter(function(j){ return j.techId; });
    if(!all.length) return null;
    return (callbacks(wk).length/all.length)*100;
  }
  function callbacksByTech(){
    var m={};
    db().jobs.filter(function(j){ return j.billing==="Our workmanship warranty" && j.techId; })
      .forEach(function(j){ m[j.techId]=(m[j.techId]||0)+1; });
    return m;
  }

  /* ====================================================================
     LICENCES + PERMITS — dispatch blocking
     ==================================================================== */
  function daysUntil(dISO){ if(!dISO||dISO==="complete") return null;
    return Math.round((new Date(dISO+"T12:00:00")-TODAY)/86400000); }
  function licStatus(t,key){
    var meta=LICENCES.filter(function(l){return l.k===key;})[0]||{};
    var v=(t.lic||{})[key];
    if(!v) return { state: meta.required?"missing":"n/a", days:null, value:null };
    if(v==="complete") return { state:"complete", days:null, value:"complete" };
    var dd=daysUntil(v);
    if(dd<0) return { state:"expired", days:dd, value:v };
    if(dd<=LIC_WARN_DAYS) return { state:"expiring", days:dd, value:v };
    return { state:"current", days:dd, value:v };
  }
  function licBlockers(t){
    var out=[];
    LICENCES.forEach(function(l){
      if(!l.required) return;
      var st=licStatus(t,l.k);
      if(st.state==="missing") out.push(l.k+" missing");
      else if(st.state==="expired") out.push(l.k+" EXPIRED");
    });
    return out;
  }
  function licIssues(){
    var out=[];
    db().techs.forEach(function(t){ LICENCES.forEach(function(l){
      var st=licStatus(t,l.k);
      if(st.state==="expired"||st.state==="expiring"||(st.state==="missing"&&l.required))
        out.push({tech:t, lic:l, status:st}); }); });
    var rank={expired:0,missing:1,expiring:2};
    return out.sort(function(a,b){ return (rank[a.status.state]-rank[b.status.state]) || ((a.status.days||0)-(b.status.days||0)); });
  }
  function cannotDispatch(){ return db().techs.filter(function(t){ return licBlockers(t).length>0; }); }
  function permitGaps(){
    return db().jobs.filter(function(j){ return needsPermit(j.task) && j.status==="Closed" && !j.permitNo; })
      .map(function(j){ return { job:j, rule:permitRule(j.task), customer:customerById(j.customerId), tech:techById(j.techId) }; });
  }
  function dispatchedUnlicensed(wk){
    var out=[];
    jobsInWeek(wk||thisWeek()).forEach(function(j){
      if(!j.techId || j.status==="Closed") return;
      var t=techById(j.techId); if(!t) return;
      var why=licBlockers(t);
      var rule=permitRule(j.task);
      if(rule){ var st=licStatus(t,rule.lic);
        if(st.state!=="current" && st.state!=="complete") why.push("Not licensed for "+rule.k+" ("+rule.lic+")"); }
      if(why.length) out.push({ job:j, tech:t, customer:customerById(j.customerId), why:why });
    });
    return out;
  }

  /* ====================================================================
     THE DISPATCH ENGINE
     ==================================================================== */
  function haversineMi(a,b,c,d){ function r(x){return x*Math.PI/180;} var R=3958.8;
    var dLat=r(c-a), dLng=r(d-b);
    var q=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dLng/2)*Math.sin(dLng/2);
    return R*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q)); }
  function driveMin(mi){ return Math.round((mi/30)*60); }
  function busyAt(t,job){
    var a=hhmmToMin(job.start), b=hhmmToMin(job.end); if(b<=a) b+=1440;
    return db().jobs.some(function(j){
      if(j.techId!==t.id || j.date!==job.date || j.id===job.id) return false;
      var x=hhmmToMin(j.start), y=hhmmToMin(j.end); if(y<=x) y+=1440;
      return a<y && x<b; });
  }
  function stockFor(techId, parts){
    var have=[], missing=[];
    Object.keys(parts||{}).forEach(function(sku){
      var need=parts[sku]||0; if(!need) return;
      var p=partBySku(sku); if(!p){ missing.push(sku); return; }
      var on=(p.stock||{})[techId]||0;
      (on>=need ? have : missing).push(p.name+(on>=need?"":" ("+on+" of "+need+")"));
    });
    return { have:have, missing:missing };
  }
  function matchFor(jobId){
    var job=jobById(jobId); if(!job) return [];
    var cust=customerById(job.customerId); if(!cust) return [];
    var rule=permitRule(job.task);
    return db().techs.map(function(t){
      var reasons=[], blockers=[], score=0;

      var lb=licBlockers(t); if(lb.length) blockers.push(lb.join(" · "));
      if(t.status!=="Active") blockers.push(t.status);
      if(busyAt(t,job)) blockers.push("Already on another job");
      if(rule){
        var st=licStatus(t,rule.lic);
        if(st.state!=="current" && st.state!=="complete")
          blockers.push("Permit work — needs "+rule.lic);
        else reasons.push("Licensed for "+rule.lic);
      }

      var mi=haversineMi(t.lat,t.lng,cust.lat,cust.lng), dm=driveMin(mi);
      if(mi<=5){ score+=30; } else if(mi<=12){ score+=18; } else if(mi<=20){ score+=8; }
      reasons.push(mi.toFixed(1)+" mi (~"+dm+" min)");

      if(t.trade===job.trade){ score+=25; reasons.push("Primary trade: "+t.trade); }
      else { score-=10; reasons.push("Cross-trade ("+t.trade+" on a "+job.trade+" call)"); }

      var stk=stockFor(t.id, job.parts);
      if(stk.missing.length){ score-=18; reasons.push("Truck missing: "+stk.missing.join(", ")); }
      else if(stk.have.length){ score+=15; reasons.push("Parts on truck: "+stk.have.join(", ")); }

      var prior=db().jobs.filter(function(j){ return j.techId===t.id && j.customerId===cust.id && j.status==="Closed"; }).length;
      if(prior){ score+=Math.min(20,4+prior*3); reasons.push("Has been to this customer "+prior+"×"); }

      var cb=callbacksByTech()[t.id]||0;
      if(cb){ score-=cb*6; reasons.push(cb+" callback"+(cb>1?"s":"")+" on record"); }

      var before=assignedHoursBefore(t.id,job.date,job.id), after=before+(job.hours||0);
      if(after>RATES.otAfterHours){ score-=20; reasons.push("Pushes into overtime (+"+(after-Math.max(before,RATES.otAfterHours)).toFixed(1)+" hrs)"); }
      else reasons.push("Week would be "+after.toFixed(1)+" hrs");

      if(t.rating) score+=(t.rating-4)*10;

      /* BLOCKED and BADLY-SUITED are different things, and conflating them is how
         a dispatcher ends up believing nobody can cover a job. `blocked` is the
         legal/physical gate; `score` is judgement and may legitimately go
         negative on a poor-but-permissible option. Never sort one into the other. */
      return { tech:t, blocked: blockers.length > 0,
               score: blockers.length ? null : Math.round(score),
               miles:mi, driveMin:dm, reasons:reasons, blockers:blockers,
               stock:stk, weekAfter:after };
    }).sort(function(a,b){
      if (a.blocked !== b.blocked) return a.blocked ? 1 : -1;
      return (b.score||0)-(a.score||0);
    });
  }

  /* ====================================================================
     PROOF OF SERVICE
     ==================================================================== */
  function proofState(j){
    if(!j) return "—";
    if(!j.techId) return "Unassigned";
    var p=j.proof;
    if(!p||!p.inTs) return j.status==="Scheduled" ? "Scheduled" : "No arrival logged";
    if(!p.inGeo) return "Arrived off-site";
    if(!p.outTs) return j.status==="On site" ? "On site" : "No departure logged";
    if(!p.sig) return "No signature";
    if((p.inMin||0) > PROOF.lateGraceMin) return "Late";
    return "Verified";
  }
  function proofClean(j){ var s=proofState(j); return s==="Verified"||s==="On site"; }
  var PROOF_WINDOW_DAYS = 14;
  function recentClosed(days){
    var from=iso(addDays(TODAY,-(days||PROOF_WINDOW_DAYS)));
    return db().jobs.filter(function(j){ return j.status==="Closed" && j.date>=from; });
  }
  function proofExceptions(days){
    return recentClosed(days).filter(function(j){
      var s=proofState(j);
      return s==="Arrived off-site"||s==="No departure logged"||s==="No arrival logged"||s==="No signature"||s==="Late";
    }).sort(function(a,b){ return a.date<b.date?1:-1; });
  }
  function proofCompliancePct(days){
    var d=recentClosed(days); if(!d.length) return null;
    return (d.filter(proofClean).length/d.length)*100;
  }
  function arrive(jobId,opts){ opts=opts||{};
    return save(function(d){
      var j=d.jobs.filter(function(x){return x.id===jobId;})[0]; if(!j) return;
      j.proof={ inTs:j.date+"T"+j.start+":00", inMin:opts.lateMin||0, outTs:null,
        inGeo: opts.geo===undefined?true:!!opts.geo, sig:false,
        method: opts.offline?"Mobile app (offline, synced)":"Mobile app (GPS)", tasks:[], note:"" };
      j.status="On site";
      logBus(d,"Field", techName(j.techId)+" arrived at "+(customerById(j.customerId)||{}).name+(opts.geo===false?" — OFF-SITE GPS":"") );
    });
  }
  function depart(jobId, tasks, partsUsed, note, sig){
    /* CHECKPOINTS gate — a job does not close undocumented, and the refusal
       lives here so no screen can route around it. */
    var gate = canClose(jobId);
    if(!gate.ok) return { ok:false, blockers:gate.blockers };
    return save(function(d){
      var j=d.jobs.filter(function(x){return x.id===jobId;})[0]; if(!j||!j.proof) return;
      j.proof.outTs=j.date+"T"+j.end+":00";
      j.proof.tasks=tasks||[]; j.proof.note=note||""; j.proof.sig=!!sig;
      if(partsUsed) j.parts=partsUsed;
      j.status="Closed";
      logBus(d,"Field","Job closed — "+(tasks||[]).length+" task(s), "+((sig)?"signed":"NOT signed")+".");
    });
  }
  function assign(jobId, techId){
    return save(function(d){
      var j=d.jobs.filter(function(x){return x.id===jobId;})[0]; if(!j) return;
      j.techId=techId||null;
      if(!techId) j.status = j.date < iso(TODAY) ? "Missed" : "OPEN";
      else if(j.status==="OPEN"||j.status==="Missed") j.status="Scheduled";
      logBus(d,"Dispatch", techId ? (techName(techId)+" dispatched.") : "Assignment cleared — job is open.");
    });
  }
  function addJob(rec){
    var id="j"+Date.now().toString(36);
    save(function(d){
      var c=d.customers.filter(function(x){return x.id===(rec&&rec.customerId);})[0];
      var st=(rec&&rec.start)||"09:00", hrs=(rec&&rec.hours)||2;
      d.jobs.push(Object.assign({ id:id, customerId:c?c.id:null, techId:null, date:iso(TODAY),
        start:st, end:minToHhmm(hhmmToMin(st)+Math.round(hrs*60)), hours:hrs,
        trade:"HVAC", type:"Service call", billing:"Time & materials", task:"Diagnose and report",
        parts:{}, note:"", status:"OPEN", proof:null, permitNo:"", mileage:8, photos:0 }, rec||{}));
      logBus(d,"Dispatch","Job added"+(c?(" for "+c.name):"")+".");
    });
    return id;
  }
  function removeJob(id){ return save(function(d){ d.jobs=d.jobs.filter(function(j){return j.id!==id;}); }); }
  function setPermit(id,no){ return save(function(d){
    var j=d.jobs.filter(function(x){return x.id===id;})[0]; if(j){ j.permitNo=no||""; logBus(d,"Compliance","Permit number recorded."); } }); }

  /* ====================================================================
     TRUCK STOCK — first-time fix or a second trip
     ==================================================================== */
  function truckStock(techId){
    return db().parts.map(function(p){ return { sku:p.sku, name:p.name, trade:p.trade,
      cost:p.cost, on:(p.stock||{})[techId]||0 }; }).filter(function(x){ return x.on>0 || true; });
  }
  function reorderFlags(){
    var out=[];
    db().parts.forEach(function(p){
      db().techs.forEach(function(t){
        var on=(p.stock||{})[t.id];
        if(on===undefined) return;
        if(on<=0) out.push({ part:p, tech:t, on:on, level:"out" });
        else if(on<=1 && p.cost>=90) out.push({ part:p, tech:t, on:on, level:"low" });
      });
    });
    return out;
  }
  function secondTripRisk(wk){
    return jobsInWeek(wk||thisWeek()).filter(function(j){
      if(!j.techId || j.status==="Closed") return false;
      return stockFor(j.techId, j.parts).missing.length>0;
    });
  }

  /* ====================================================================
     ESTIMATES / ATS / REFERRALS
     ==================================================================== */
  function estimateValue(){ return db().estimates.filter(function(e){ return e.stage==="Quoted"||e.stage==="Scheduled"||e.stage==="Requested"; })
    .reduce(function(a,e){ return a+(e.amount||0); },0); }
  function winRate(){
    var decided=db().estimates.filter(function(e){ return e.stage==="Won"||e.stage==="Lost"; });
    if(!decided.length) return null;
    return (decided.filter(function(e){return e.stage==="Won";}).length/decided.length)*100;
  }
  function moveEstimate(id,stage){ return save(function(d){
    var e=d.estimates.filter(function(x){return x.id===id;})[0]; if(e){ e.stage=stage; logBus(d,"Estimating",e.title+" → "+stage+"."); } }); }
  function addEstimate(rec){ var id="e"+Date.now().toString(36);
    save(function(d){ d.estimates.unshift(Object.assign({id:id,requested:iso(TODAY),stage:"Requested",amount:0,cost:0,note:"",trade:"HVAC"},rec||{}));
      logBus(d,"Estimating","New estimate request logged."); });
    return id; }

  function screenScore(a){
    var reasons=[], s=0;
    var need={}; openJobs(thisWeek()).forEach(function(j){ need[j.trade]=(need[j.trade]||0)+1; });
    if(need[a.trade]){ s+=24; reasons.push("We have "+need[a.trade]+" open "+a.trade+" job(s) this week"); }
    else reasons.push("No open "+a.trade+" work this week");
    (a.lic||[]).forEach(function(){ s+=12; });
    if((a.lic||[]).length) reasons.push("Holds: "+a.lic.join(", "));
    else reasons.push("No licences on file — full onboarding");
    s+=Math.min(24,(a.yrs||0)*3); if(a.yrs) reasons.push((a.yrs)+" yrs in the trade");
    if(a.hasTools){ s+=10; reasons.push("Has own hand tools"); } else reasons.push("No tools");
    var short=db().techs.filter(function(t){return t.trade===a.trade&&t.status==="Active";}).length;
    if(short<=2){ s+=14; reasons.push("Only "+short+" active "+a.trade+" tech(s) on the roster"); }
    return { score:Math.round(s), reasons:reasons };
  }
  function moveApplicant(id,stage){ return save(function(d){
    var a=d.applicants.filter(function(x){return x.id===id;})[0]; if(a){ a.stage=stage; logBus(d,"Recruiting",a.name+" → "+stage+"."); } }); }
  function addApplicant(rec){ var id="a"+Date.now().toString(36);
    save(function(d){ d.applicants.unshift(Object.assign({id:id,applied:iso(TODAY),stage:"Applied",lic:[],yrs:0,hasTools:false,note:"",trade:"HVAC"},rec||{}));
      logBus(d,"Recruiting","New application received."); });
    return applicantById(id); }
  function applicantById(id){ return db().applicants.filter(function(a){return a.id===id;})[0]||null; }
  function pipelineCounts(){ var m={}; ATS_STAGES.forEach(function(s){m[s]=0;});
    db().applicants.forEach(function(a){ m[a.stage]=(m[a.stage]||0)+1; }); return m; }

  function referralOverdue(r){ if(!r.cadenceDays) return false;
    return Math.abs(daysUntil(r.lastTouch)||0) > r.cadenceDays; }
  function referralConversion(r){ return r.ytd ? (r.converted/r.ytd)*100 : 0; }
  function topReferrers(){ return db().referrers.slice().sort(function(a,b){ return b.converted-a.converted; }); }
  function logTouch(id,note){ return save(function(d){
    var r=d.referrers.filter(function(x){return x.id===id;})[0]; if(r){ r.lastTouch=iso(TODAY); if(note) r.note=note;
      logBus(d,"Growth","Logged a touch with "+r.org+"."); } }); }

  /* ====================================================================
     NATIVE E-SIGN
     ==================================================================== */
  var ESIGN_CONSENT = "By selecting Adopt and Sign, I agree to do business electronically with {{SHOP}}, " +
    "I agree that my electronic signature is the legal equivalent of my handwritten signature, and I intend " +
    "to sign this record. I may request a paper copy at any time and may withdraw consent to electronic " +
    "records by contacting the office in writing.";
  var DOC_TEMPLATES = [
    { id:"t_auth", title:"Work Authorisation", who:"Customer", body:[
      "AUTHORISATION. I authorise {{SHOP}} to perform the diagnosis and work described for the property at {{ADDR}}.",
      "DIAGNOSTIC / TRIP FEE. A trip fee applies to the visit and is credited toward authorised repairs where applicable.",
      "APPROVAL BEFORE WORK. No repair will be performed until the price has been presented and approved. Any change in scope requires a signed change order.",
      "ACCESS AND CONDITION. I confirm I am authorised to permit work at this property and have disclosed known hazards, pets and access requirements.",
      "PERMITS. Where the work requires a permit, {{SHOP}} will pull it and the work will be inspected by the authority having jurisdiction."],
      fields:[{k:"sig",label:"Signature",type:"signature",required:true},
              {k:"name",label:"Printed name",type:"text",required:true},
              {k:"date",label:"Date",type:"date",required:true},
              {k:"ackScope",label:"I understand no repair happens until I approve the price",type:"check",required:true}] },
    { id:"t_estimate", title:"Estimate Approval", who:"Customer", body:[
      "SCOPE. This approves the estimate presented by {{SHOP}} for the property at {{ADDR}}.",
      "PRICE. The quoted amount is firm for 30 days unless the scope changes or concealed conditions are found.",
      "CONCEALED CONDITIONS. If work uncovers a condition that could not reasonably be seen when quoting, work stops and a change order is presented before continuing.",
      "SCHEDULING. Work is scheduled once this approval and any required deposit are received."],
      fields:[{k:"sig",label:"Signature",type:"signature",required:true},
              {k:"name",label:"Printed name",type:"text",required:true},
              {k:"date",label:"Date",type:"date",required:true}] },
    { id:"t_change", title:"Change Order", who:"Customer or GC", body:[
      "CHANGE. This documents a change to the previously approved scope at {{ADDR}}.",
      "REASON. The change arises from a condition or request described by the technician on site.",
      "PRICE ADJUSTMENT. The adjustment is added to the original contract amount and is due on the same terms.",
      "SCHEDULE. The change may affect the completion date; any impact is noted at signing."],
      fields:[{k:"sig",label:"Signature",type:"signature",required:true},
              {k:"name",label:"Printed name",type:"text",required:true},
              {k:"amount",label:"Change amount ($)",type:"text",required:true},
              {k:"date",label:"Date",type:"date",required:true}] },
    { id:"t_employ", title:"Technician Employment Packet", who:"Technician", body:[
      "OFFER. {{SHOP}} offers employment as a service technician at the rate stated in the offer.",
      "LICENCES. I will keep my driver's licence, insurance, OSHA card and any trade licence current, and I understand I cannot be dispatched if a required credential lapses.",
      "PERMITTED WORK. I will not perform work requiring a licence or permit I do not hold, and I will report any request to do so to the office.",
      "COMPANY VEHICLE. I will operate the company truck lawfully and report any incident the same day.",
      "TRUCK STOCK. I am responsible for the inventory assigned to my truck and for recording parts used on each job."],
      fields:[{k:"sig",label:"Signature",type:"signature",required:true},
              {k:"name",label:"Printed name",type:"text",required:true},
              {k:"date",label:"Date",type:"date",required:true},
              {k:"ackLic",label:"I understand a lapsed licence removes me from dispatch",type:"check",required:true}] }
  ];
  function templateById(id){ return DOC_TEMPLATES.filter(function(t){return t.id===id;})[0]||null; }
  function fillTemplate(s,ctx){ return String(s||"")
    .replace(/\{\{SHOP\}\}/g, ctx.shop||db().shop.name)
    .replace(/\{\{ADDR\}\}/g, ctx.addr||"the service address on file"); }
  function docContext(doc){
    var c=(db().customers||[]).filter(function(x){return x.id===doc.subjectId;})[0];
    return { shop:db().shop.name, addr: c ? (c.addr+", "+c.city) : null };
  }
  function newToken(){ var A="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",p=function(n){var s="";for(var i=0;i<n;i++)s+=A[Math.floor(Math.random()*A.length)];return s;};
    return "TBX-"+p(4)+"-"+p(4); }
  function createDoc(tplId,subject,subjectId,signer){
    var tpl=templateById(tplId); if(!tpl) return null;
    var id="d"+Date.now().toString(36);
    save(function(d){ d.documents.unshift({ id:id,tpl:tplId,title:tpl.title,subject:subject,subjectId:subjectId||null,
      signer:signer||{name:"",email:"",role:""}, status:"Draft", created:iso(TODAY), sentTs:null,
      token:newToken(), values:{},
      audit:[{ts:new Date().toISOString().slice(0,19),who:d.shop.owner,what:"Document created from template"}] });
      logBus(d,"Paper","Drafted "+tpl.title+" for "+subject+"."); });
    return docById(id);
  }
  function sendDoc(id){ return save(function(d){
    var doc=d.documents.filter(function(x){return x.id===id;})[0]; if(!doc) return;
    if(!doc.token) doc.token=newToken();
    doc.status="Sent"; doc.sentTs=iso(TODAY);
    doc.audit.push({ts:new Date().toISOString().slice(0,19),who:d.shop.owner,what:"Signer link minted for "+(doc.signer.name||"the signer")}); }); }
  function openDoc(token){ save(function(d){
    var doc=d.documents.filter(function(x){return x.token===token;})[0]; if(!doc||doc.status==="Signed") return;
    doc.status="Viewed";
    doc.audit.push({ts:new Date().toISOString().slice(0,19),who:doc.signer.name||"Signer",what:"Opened the signing link"}); });
    return docByToken(token); }
  function signDoc(token,values,sig,meta){ meta=meta||{};
    return save(function(d){
      var doc=d.documents.filter(function(x){return x.token===token;})[0]; if(!doc||doc.status==="Signed") return;
      doc.values=values||{}; doc.signature=sig||null;
      doc.signedTs=new Date().toISOString().slice(0,19); doc.status="Signed";
      var who=(values&&values.name)||doc.signer.name||"Signer";
      doc.audit.push({ts:doc.signedTs,who:who,what:"Consented to do business electronically (ESIGN/UETA)"});
      doc.audit.push({ts:doc.signedTs,who:who,what:"Adopted and applied signature — record frozen"});
      if(meta.agent) doc.audit.push({ts:doc.signedTs,who:who,what:"Signed from: "+meta.agent});
      logBus(d,"Paper",doc.title+" signed by "+who+"."); }); }
  function docsAwaiting(){ return db().documents.filter(function(d){ return d.status==="Sent"||d.status==="Viewed"; }); }

  /* ====================================================================
     BUS + APPROVALS + KPIs
     ==================================================================== */
  function logBus(d,dept,msg){ d.bus=d.bus||[];
    d.bus.unshift({ts:new Date().toISOString().slice(0,19),dept:dept,msg:msg});
    if(d.bus.length>120) d.bus.length=120; }
  function bus(){ return db().bus||[]; }

  /* ====================================================================
     SWITCHBOARD — calls become jobs
     ==================================================================== */
  function callLabel(w){ if(!w) return ""; var p=String(w).split(" ");
    return (p[0]==="T"?"Today":"Yesterday")+" "+hhmm(p[1]); }
  function calls(){ return db().calls||[]; }
  function callById(id){ return calls().filter(function(c){return c.id===id;})[0]||null; }
  function callStats(){
    var t=calls().filter(function(c){return String(c.when).charAt(0)==="T";});
    var ring=t.filter(function(c){return c.status==="ringing";}).length;
    var booked=t.filter(function(c){return c.status==="booked";}).length;
    var handled=t.filter(function(c){return c.status!=="ringing";}).length;
    var missed=t.filter(function(c){return c.status==="callback";}).length;
    var ai=t.filter(function(c){return c.by==="AI receptionist";}).length;
    return { today:t.length, ringing:ring, booked:booked, handled:handled, missed:missed, ai:ai };
  }
  function answerCall(id){ return save(function(d){
    var c=(d.calls||[]).filter(function(x){return x.id===id;})[0]; if(!c||c.status!=="ringing") return;
    c.status="logged"; c.by="Front desk"; c.dur=90+((d.seq++)%7)*30;
    c.summary="Answered at the desk. Add the outcome — or book it straight onto the board.";
    logBus(d,"Switchboard","Call answered — "+(c.name||((customerById(c.customerId)||{}).name)||c.from)+".");
  }); }
  function bookFromCall(id, rec){
    var jid=null;
    save(function(d){
      var c=(d.calls||[]).filter(function(x){return x.id===id;})[0]; if(!c) return;
      var custId=c.customerId;
      if(!custId){
        custId="c"+Date.now().toString(36);
        d.customers.push({ id:custId, name:c.name||("Caller "+c.from), kind:"Residential",
          city:d.shop.city, lat:d.shop.lat, lng:d.shop.lng, addr:"(address from the call)",
          phone:c.from, since:iso(TODAY), equip:"", agreement:null, agreementAnnual:0, visitsYr:0,
          notes:"Created from a Switchboard call." });
      }
      jid="j"+Date.now().toString(36);
      var st=(rec&&rec.start)||"13:00", hrs=(rec&&rec.hours)||2;
      d.jobs.push(Object.assign({ id:jid, customerId:custId, techId:null, date:iso(TODAY),
        start:st, end:minToHhmm(hhmmToMin(st)+Math.round(hrs*60)), hours:hrs,
        trade:(rec&&rec.trade)||"HVAC", type:(rec&&rec.type)||"Service call",
        billing:"Time & materials", task:c.reason||"Diagnose and report",
        parts:{}, note:"Booked from the Switchboard — call "+c.id,
        status:"OPEN", proof:null, permitNo:"", mileage:8, photos:0 }, {}));
      c.status="booked"; c.jobId=jid;
      if(!c.by) c.by="Front desk";
      if(!c.dur) c.dur=120+((d.seq++)%5)*45;
      if(!c.summary) c.summary="Booked to the board while the caller was on the line.";
      logBus(d,"Switchboard","Call became a job — "+(c.reason||"service call")+" · on the board OPEN.");
    });
    return jid;
  }
  function aiHandleCall(id){
    var jid=null;
    save(function(d){
      var c=(d.calls||[]).filter(function(x){return x.id===id;})[0]; if(!c||c.status!=="ringing") return;
      c.by="AI receptionist";
      logBus(d,"Switchboard","AI receptionist took the call — matching against the live board.");
    });
    jid=bookFromCall(id,{start:"15:00"});
    save(function(d){
      var c=(d.calls||[]).filter(function(x){return x.id===id;})[0]; if(!c) return;
      c.summary="AI receptionist answered the overflow, matched the first workable slot on the live board, and booked it. Flagged for the desk to confirm parts on the truck.";
    });
    return jid;
  }
  function approvals(){ return db().approvals||[]; }
  function decideApproval(id,dec){ return save(function(d){
    var a=d.approvals.filter(function(x){return x.id===id;})[0]; if(!a) return;
    a.stage = dec==="approve" ? "Approved" : "Returned";
    logBus(d,a.dept,a.title+" — "+a.stage.toLowerCase()+"."); }); }

  function kpis(){
    var wk=thisWeek(), lw=lastWeek();
    var booked=weekRevenue(wk,"assigned"), done=weekRevenue(wk,"closed");
    var du=dispatchedUnlicensed(wk), pg=permitGaps(), str=secondTripRisk(wk);
    return [
      { k:"Week booked",       v:money(booked), n:"Every assigned job, if the week runs as scheduled", band:"good" },
      { k:"Closed so far",     v:money(done), n:pct(booked?done/booked*100:0)+" of the week" },
      { k:"Gross margin",      v:pct(weekMarginPct(wk,"assigned"),1), n:"After wages, "+pct(RATES.burdenPct*100,1)+" burden, drive and parts", band: weekMarginPct(wk,"assigned")>=40?"good":"watch" },
      { k:"Callback cost",     v:money(callbackCost(wk)), n:callbacks(wk).length+" job(s) redone free this week", band: callbacks(wk).length?"bad":"good" },
      { k:"Callback rate",     v: callbackRate(wk)==null?"—":pct(callbackRate(wk),1), n:"Of all assigned jobs", band:(callbackRate(wk)||0)>3?"bad":"good" },
      { k:"Unassigned",        v:openHours(wk).toFixed(1)+" hrs", n:openJobs(wk).length+" jobs with nobody on them", band:openJobs(wk).length?"watch":"good" },
      { k:"Fill rate",         v: fillRate(wk)==null?"—":pct(fillRate(wk)), n:"Jobs covered / jobs booked" },
      { k:"Proof clean",       v: proofCompliancePct()==null?"—":pct(proofCompliancePct()), n:proofExceptions().length+" exceptions · last "+PROOF_WINDOW_DAYS+" days", band:(proofCompliancePct()||0)>=95?"good":"watch" },
      { k:"Dispatched unlicensed", v:du.length, n: du.length?"Jobs assigned to a tech who cannot legally do them":"Every dispatch is clear", band: du.length?"bad":"good" },
      { k:"Permit gaps",       v:pg.length, n: pg.length?"Closed permit work with no permit number":"All permit work documented", band: pg.length?"bad":"good" },
      { k:"Second-trip risk",  v:str.length, n: str.length?"Jobs where the truck is missing a part":"Every truck is stocked for its jobs", band: str.length?"watch":"good" },
      { k:"Overtime",          v:overtimeHours(wk,"assigned").toFixed(1)+" hrs", n:"Paid at "+RATES.otMultiplier+"× — the customer is not billed "+RATES.otMultiplier+"×", band: overtimeHours(wk,"assigned")?"watch":"good" },
      { k:"Open estimates",    v:money(estimateValue()), n:(winRate()==null?"—":pct(winRate())+" win rate")+" · quoted and pending" },
      { k:"Techs on the road", v:db().techs.filter(function(t){return t.status==="Active";}).length, n:cannotDispatch().length+" blocked by a licence", band: cannotDispatch().length?"watch":"good" },
      { k:"Signatures out",    v:docsAwaiting().length, n:"Sent, not yet signed" }
    ];
  }

  /* ====================================================================
     THE PRICE BOOK — ⚠ DRAFT. Accelerated Experiences LLC sets live prices.
     The SPINE ships in every tier: Contacts/CRM, Calendar, Records, Connect,
     Command Center, Approval Desk, Owner's Manual, mobile. Tiers differ by SCALE.
     ==================================================================== */
  /* ====================================================================
     FLEETVIEW — live trucks, "on my way", and geofence timesheet stamps.
     Positions come from the technician app's phone GPS. No hardware.
     ==================================================================== */
  function trucks(){ return db().trucks || []; }
  function truckById(id){ return trucks().filter(function(v){return v.id===id;})[0] || null; }
  function truckForTech(techId){ return trucks().filter(function(v){return v.techId===techId;})[0] || null; }

  /* The sample floor runs on a pinned clock, the same way TODAY is pinned, so the
     board reads the same at 3am as it does at noon. A live shop uses the wall clock. */
  var FLEET_CLOCK = "09:05";
  function pingAgeMin(v){
    if(!v || !v.ping || !v.ping.at) return null;
    var d = hhmmToMin(FLEET_CLOCK) - hhmmToMin(v.ping.at);
    return d < 0 ? 0 : d;
  }

  /* the job a truck is working or heading to right now */
  function currentJobFor(techId){
    var day = iso(TODAY);
    var mine = db().jobs.filter(function(j){ return j.techId===techId && j.date===day; });
    var onsite = mine.filter(function(j){ return j.status==="On site"; })[0];
    if(onsite) return onsite;
    var open = mine.filter(function(j){ return j.status!=="Closed"; })
                   .sort(function(a,b){ return hhmmToMin(a.start)-hhmmToMin(b.start); })[0];
    return open || null;
  }

  /* miles + minutes from the truck's last ping to a job site */
  function etaFor(jobId){
    var j = jobById(jobId); if(!j || !j.techId) return null;
    var v = truckForTech(j.techId); if(!v || !v.ping) return null;
    var c = customerById(j.customerId); if(!c || c.lat===undefined) return null;
    var mi = haversineMi(v.ping.lat, v.ping.lng, c.lat, c.lng);
    return { miles: Math.round(mi*10)/10, minutes: driveMin(mi) };
  }

  function truckState(v){
    var j = currentJobFor(v.techId);
    var eta = j ? etaFor(j.id) : null;
    var day = iso(TODAY);
    var closedToday = db().jobs.filter(function(x){
      return x.techId===v.techId && x.date===day && x.status==="Closed"; }).length;
    var moving = !!(v.ping && v.ping.mph > 3);
    var st;
    if(j && j.status==="On site")   st = "On site";
    else if(j && moving)            st = "En route";
    else if(j)                      st = "Assigned";
    else if(moving)                 st = "Rolling · unassigned";
    else if(closedToday)            st = "Between jobs";
    else                            st = "Idle · no job today";
    if(pingAgeMin(v) !== null && pingAgeMin(v) > 60) st = "No recent ping";
    return { truck:v, tech:techById(v.techId), job:j, eta:eta, status:st,
             ageMin:pingAgeMin(v), lowBattery: !!(v.ping && v.ping.battery !== undefined && v.ping.battery < 25) };
  }
  function fleetState(){ return trucks().map(truckState); }

  function milesSinceService(v){ return Math.max(0, (v.odo||0) - (v.lastServiceMi||0)); }
  function serviceDue(){
    return trucks().map(function(v){
      var since = milesSinceService(v), every = v.serviceEveryMi || 5000;
      var left = every - since;
      return { truck:v, since:since, every:every, left:left,
               level: left <= 0 ? "bad" : (left <= 500 ? "watch" : "good") };
    });
  }

  /* ---- "on my way": a token'd page the customer opens, no account, no app ---- */
  function omwToken(){ return "omw" + Math.random().toString(36).slice(2,10); }
  function sendOnMyWay(jobId){
    var eta = etaFor(jobId), tok = omwToken();
    save(function(d){
      var j = d.jobs.filter(function(x){return x.id===jobId;})[0]; if(!j) return;
      j.omw = { token:tok, sentAt:FLEET_CLOCK, etaMin: eta?eta.minutes:null, miles: eta?eta.miles:null };
      logBus(d, "Field", techName(j.techId) + " sent an on-my-way to " +
        ((customerById(j.customerId)||{}).name||"the customer") +
        (eta ? " — about " + eta.minutes + " min out." : "."));
    });
    return tok;
  }
  function jobByOmw(tok){
    return db().jobs.filter(function(j){ return j.omw && j.omw.token===tok; })[0] || null;
  }

  /* ---- geofence timesheet stamps: the hours come off the actual jobs ---- */
  function stampsFor(techId, weekStart){
    var wk = weekStart || thisWeek();
    return jobsInWeek(wk).filter(function(j){
      return j.techId===techId && j.proof && j.proof.inTs;
    }).map(function(j){
      var inM = hhmmToMin((j.proof.inTs.split("T")[1]||"00:00").slice(0,5));
      var outM = j.proof.outTs ? hhmmToMin((j.proof.outTs.split("T")[1]||"00:00").slice(0,5)) : null;
      if(outM !== null && outM < inM) outM += 1440;
      return { job:j, date:j.date, inAt:(j.proof.inTs.split("T")[1]||"").slice(0,5),
               outAt: j.proof.outTs ? (j.proof.outTs.split("T")[1]||"").slice(0,5) : null,
               geo: j.proof.inGeo !== false, method: j.proof.method || "",
               minutes: outM===null ? null : (outM - inM) };
    });
  }
  function stampHours(techId, weekStart){
    return stampsFor(techId, weekStart).reduce(function(a,s){
      return a + (s.minutes ? s.minutes/60 : 0); }, 0);
  }
  function stampExceptions(weekStart){
    var out = [];
    (db().techs||[]).forEach(function(t){
      stampsFor(t.id, weekStart).forEach(function(s){
        if(!s.geo) out.push({ tech:t, stamp:s, why:"Stamped outside the job geofence" });
        else if(s.outAt === null && s.job.status !== "On site")
          out.push({ tech:t, stamp:s, why:"Arrived, never departed" });
      });
    });
    return out;
  }

  /* ====================================================================
     CHECKPOINTS — job-stage checklists with required photos.
     This extends the gates that already exist here (licence, permit): a job
     cannot be closed until the stage items that carry proof are done.
     Already-closed sample jobs derive their state from the record they left
     behind — photos on file and a captured signature — never from invention.
     ==================================================================== */
  var CHECKPOINTS = {
    common: [
      { k:"before",  stage:"On arrival", photo:true,  required:true,
        label:"Photo of the equipment and nameplate before anyone touches it" },
      { k:"confirm", stage:"On arrival", photo:false, required:false,
        label:"Complaint confirmed with the customer in their words" },
      { k:"after",   stage:"Before close", photo:true, required:true,
        label:"Photo of the finished work" },
      { k:"clean",   stage:"Before close", photo:false, required:false,
        label:"Area left clean, old parts hauled or shown to the customer" },
      { k:"walk",    stage:"Before close", photo:false, required:true,
        label:"Customer walked through what was done and what it cost" }
    ],
    byTrade: {
      "HVAC":          [{ k:"tsplit", stage:"During the work", photo:false, required:false,
                          label:"Temperature split and static pressure recorded" }],
      "Plumbing":      [{ k:"shutoff", stage:"During the work", photo:false, required:false,
                          label:"Main shut-off located and shown to the customer" }],
      "Electrical":    [{ k:"deenergize", stage:"During the work", photo:false, required:true,
                          label:"Circuit de-energised and verified dead before work" }],
      "Refrigeration": [{ k:"recovery", stage:"During the work", photo:false, required:false,
                          label:"Recovery cylinder weight logged in and out" }],
      "Drain":         [{ k:"camera", stage:"During the work", photo:true, required:false,
                          label:"Camera still of the line condition" }]
    }
  };
  var CHECK_STAGES = ["On arrival","During the work","Before close"];

  function checkpointsFor(job){
    if(!job) return [];
    var extra = CHECKPOINTS.byTrade[job.trade] || [];
    return CHECKPOINTS.common.slice(0,2)
      .concat(extra)
      .concat(CHECKPOINTS.common.slice(2));
  }

  /* A job closed before Checkpoints existed still has a record. Read it rather
     than pretending the work was undocumented — or that it was documented. */
  function derivedChecks(job){
    var out = {};
    if(job.status !== "Closed" || !job.proof) return out;
    var photos = job.photos || 0;
    if(photos >= 1) out.before = { done:true, photo:true,  src:"record" };
    if(photos >= 2) out.after  = { done:true, photo:true,  src:"record" };
    if(job.proof.sig) out.walk = { done:true, photo:false, src:"record" };
    return out;
  }

  function checkState(job){
    if(!job) return null;
    var items = checkpointsFor(job);
    var stored = job.checks || {};
    var derived = derivedChecks(job);
    var rows = items.map(function(it){
      var v = stored[it.k] || derived[it.k] || null;
      return { item:it, done: !!(v && v.done), photo: !!(v && v.photo),
               src: v ? (v.src || "tech") : null,
               satisfied: !!(v && v.done && (!it.photo || v.photo)) };
    });
    var required = rows.filter(function(r){ return r.item.required; });
    var missing  = required.filter(function(r){ return !r.satisfied; });
    return { job:job, rows:rows,
             done: rows.filter(function(r){ return r.satisfied; }).length,
             total: rows.length,
             requiredTotal: required.length,
             missing: missing,
             blocked: missing.length > 0 };
  }

  function setCheckpoint(jobId, key, done, photo){
    return save(function(d){
      var j=d.jobs.filter(function(x){return x.id===jobId;})[0]; if(!j) return;
      if(!j.checks) j.checks = {};
      if(done === false){ delete j.checks[key]; }
      else j.checks[key] = { done:true, photo: !!photo, src:"tech" };
      logBus(d,"Field", techName(j.techId)+" ticked a checkpoint on "+
        ((customerById(j.customerId)||{}).name||"a job")+(photo?" (photo attached)":""));
    });
  }

  /* the gate itself */
  function checkBlockers(jobId){
    var st = checkState(jobById(jobId));
    if(!st) return [];
    return st.missing.map(function(r){
      return r.item.label + (r.item.photo && !r.photo ? " — a photo is required" : ""); });
  }
  function canClose(jobId){
    var b = checkBlockers(jobId);
    return { ok: b.length===0, blockers: b };
  }

  /* A job nobody has arrived at yet is not "blocked" — it simply has not started.
     Only work that is under way, or that ran past its window, is held. */
  function checkStarted(j){
    return j.status!=="Closed" && (j.status==="On site" || !!(j.proof && j.proof.inTs));
  }
  function checkExceptions(){
    return db().jobs.filter(checkStarted)
      .map(checkState).filter(function(st){ return st && st.blocked; });
  }
  function checkStats(){
    var started = db().jobs.filter(checkStarted);
    var states = started.map(checkState);
    var notStarted = db().jobs.filter(function(j){
      return j.status!=="Closed" && !checkStarted(j); }).length;
    return { started: started.length,
             notStarted: notStarted,
             clear: states.filter(function(s){ return !s.blocked; }).length,
             blocked: states.filter(function(s){ return s.blocked; }).length,
             photosOutstanding: states.reduce(function(a,s){
               return a + s.missing.filter(function(r){ return r.item.photo; }).length; },0) };
  }

  /* ====================================================================
     SERVICE PLANS — memberships that renew themselves.
     Native. No integration, no third-party membership tool.
     ==================================================================== */
  var PLAN_DUE_DAYS = 45;

  function plans(){ return clone(SEED.plans); }
  function planById(id){ return SEED.plans.filter(function(p){return p.id===id;})[0] || null; }
  function memberships(){ return db().memberships || []; }
  function membershipById(id){ return memberships().filter(function(m){return m.id===id;})[0] || null; }
  function membershipFor(customerId){
    return memberships().filter(function(m){
      return m.customerId===customerId && m.status==="Active"; })[0] || null;
  }
  function isMember(customerId){ return !!membershipFor(customerId); }

  /* member pricing, straight into the pricebook */
  function memberDiscount(customerId){
    var m = membershipFor(customerId); if(!m) return 0;
    var p = planById(m.planId); return p ? (p.discount||0) : 0;
  }
  function memberPrice(amount, customerId){
    var d = memberDiscount(customerId);
    return d ? Math.round(amount * (100-d)) / 100 : amount;
  }

  function visitsLeft(m){
    if(m.visitsYr===null || m.visitsYr===undefined) return null;
    return Math.max(0, m.visitsYr - (m.visitsUsed||0));
  }
  /* a plan visit nobody has put on the board yet */
  function planVisitsDue(){
    return memberships().filter(function(m){
      if(m.status!=="Active") return null;
      var left = visitsLeft(m);
      return left === null ? false : left > 0;
    }).map(function(m){
      return { membership:m, plan:planById(m.planId), customer:customerById(m.customerId),
               left:visitsLeft(m), lastVisit:m.lastVisit };
    });
  }
  function renewalsDue(days){
    var win = days || PLAN_DUE_DAYS;
    return memberships().filter(function(m){ return m.status==="Active"; })
      .map(function(m){
        return { membership:m, plan:planById(m.planId), customer:customerById(m.customerId),
                 days: daysUntil(m.renewsOn) };
      })
      .filter(function(r){ return r.days !== null && r.days <= win; })
      .sort(function(a,b){ return a.days - b.days; });
  }

  /* plan revenue on its own ledger line — never blended into service revenue */
  function planRevenue(){
    var act = memberships().filter(function(m){ return m.status==="Active"; });
    var annual = act.reduce(function(a,m){ return a + (m.annual||0); }, 0);
    var byPlan = SEED.plans.map(function(p){
      var mine = act.filter(function(m){ return m.planId===p.id; });
      return { plan:p, count:mine.length,
               annual: mine.reduce(function(a,m){ return a+(m.annual||0); },0) };
    }).filter(function(x){ return x.count; });
    return { active:act.length, annual:annual, mrr: Math.round(annual/12), byPlan:byPlan };
  }

  /* put the next plan visit on the board */
  function schedulePlanVisit(membershipId, date){
    var m = membershipById(membershipId); if(!m) return null;
    var c = customerById(m.customerId); if(!c) return null;
    var when = date || iso(addDays(TODAY, 7));
    var jid = addJob({ customerId:c.id, techId:null, date:when, start:"09:00", end:"10:30",
      trade:"HVAC", type:"Maintenance (agreement)", billing:"Maintenance agreement",
      task:"Seasonal maintenance checklist",
      note:(planById(m.planId)||{}).name+" visit — "+(visitsLeft(m))+" left on the agreement this year" });
    save(function(d){
      logBus(d,"Service Plans", (planById(m.planId)||{}).name+" visit scheduled for "+c.name+" on "+when+".");
    });
    return jid;
  }

  /* The agent org chases renewals. Ghost Mode: it DRAFTS, it does not send. */
  function draftRenewalNudge(membershipId){
    var m = membershipById(membershipId); if(!m) return null;
    var c = customerById(m.customerId), p = planById(m.planId);
    var d0 = daysUntil(m.renewsOn);
    return save(function(d){
      d.approvals = d.approvals || [];
      var id = "ap_plan_" + m.id;
      if(d.approvals.some(function(a){ return a.id===id; })) return;
      d.approvals.push({
        id:id, title:"Renewal nudge — "+(c?c.name:"")+" · "+(p?p.name:""),
        dept:"Service Plans",
        why: m.autoRenew
          ? "Renews itself in "+d0+" days. The nudge is a courtesy so the charge is never a surprise."
          : "Auto-renew is OFF and it lapses in "+d0+" days. Without a call this one walks.",
        impact: "+"+money(m.annual||0)+" a year held" + (m.autoRenew ? "" : " — at risk today"),
        stage:"Awaiting Anthony", conf: m.autoRenew ? 74 : 92,
        tags:["revenue","retention"] });
      logBus(d,"Service Plans","Renewal nudge drafted for "+(c?c.name:"")+" — waiting on the Approval Desk.");
    });
  }
  function renewalsAtRisk(){
    return renewalsDue(90).filter(function(r){ return !r.membership.autoRenew; });
  }

  function enroll(customerId, planId, annual, visitsYr){
    var p = planById(planId); if(!p) return null;
    var id = "m"+Math.random().toString(36).slice(2,8);
    save(function(d){
      d.memberships = d.memberships || [];
      d.memberships.push({ id:id, customerId:customerId, planId:planId, since:iso(TODAY),
        annual: annual!==undefined && annual!==null ? annual : p.annual,
        visitsYr: visitsYr!==undefined && visitsYr!==null ? visitsYr : p.visitsYr,
        visitsUsed:0, lastVisit:null, renewsOn: iso(addDays(TODAY,365)),
        autoRenew:true, billing: p.annual ? "Annual" : "Monthly", status:"Active" });
      logBus(d,"Service Plans",(customerById(customerId)||{}).name+" enrolled in "+p.name+".");
    });
    return id;
  }
  function setAutoRenew(membershipId, on){
    return save(function(d){
      var m=d.memberships.filter(function(x){return x.id===membershipId;})[0]; if(!m) return;
      m.autoRenew = !!on;
      logBus(d,"Service Plans","Auto-renew turned "+(on?"on":"off")+" for "+
        ((customerById(m.customerId)||{}).name||"a member")+".");
    });
  }

  /* ====================================================================
     BANKROLL — financing on the estimate.
     The payment view ships with Estimates at no extra monthly; the partner
     underwriting is wired per buyer at purchase, and the page says so.
     ==================================================================== */
  var FINANCE = {
    minAmount: 1000,
    terms: [ { months:12, apr:0 }, { months:24, apr:7.99 },
             { months:36, apr:9.99 }, { months:60, apr:11.99 } ],
    partner: null   /* set at purchase — never invented here */
  };

  function monthlyPayment(amount, months, apr){
    if(!amount || !months) return null;
    var r = (apr||0)/100/12;
    if(r === 0) return Math.round((amount/months)*100)/100;
    var f = Math.pow(1+r, months);
    return Math.round((amount * r * f / (f-1)) * 100) / 100;
  }
  function financeEligible(amount){ return !!amount && amount >= FINANCE.minAmount; }
  function financeOffers(amount){
    if(!financeEligible(amount)) return [];
    return FINANCE.terms.map(function(t){
      return { months:t.months, apr:t.apr, monthly: monthlyPayment(amount, t.months, t.apr) };
    });
  }
  /* the headline the customer actually reacts to: "or about $X a month" */
  function bestMonthly(amount){
    var o = financeOffers(amount);
    if(!o.length) return null;
    return o.reduce(function(lo,x){ return (!lo || x.monthly < lo.monthly) ? x : lo; }, null);
  }
  function requestFinancing(estimateId, months){
    var e = db().estimates.filter(function(x){return x.id===estimateId;})[0];
    if(!e || !financeEligible(e.amount)) return null;
    var t = FINANCE.terms.filter(function(x){ return x.months===months; })[0] || FINANCE.terms[0];
    var monthly = monthlyPayment(e.amount, t.months, t.apr);
    save(function(d){
      var x=d.estimates.filter(function(y){return y.id===estimateId;})[0]; if(!x) return;
      x.finance = { months:t.months, apr:t.apr, monthly:monthly,
                    requestedOn: iso(TODAY), status:"Demo — partner wired at purchase" };
      logBus(d,"Estimates","Financing view sent with "+x.title+" — "+
        money(x.amount)+" or about "+money(Math.round(monthly))+" a month over "+t.months+".");
    });
    return monthly;
  }

  var ROOMS = {
    dispatch: { label:"Dispatch & Board",     mo:110, build:850,
      why:"The job spine — the day board, the match engine, and one-tap assignment. Everything hangs off it." },
    field:    { label:"Field App & Proof",    mo:95,  build:700,
      why:"Arrive/depart with time and place, photos, customer signature, offline capture in a crawlspace." },
    work:     { label:"Worksheets & Permits", mo:70,  build:500,
      why:"What was actually done — plus the permit gate that stops permitted work closing undocumented." },
    licences: { label:"Licences & Tickets",   mo:60,  build:450,
      why:"Journeyman cards, EPA 608, OSHA, MVR — expiry-dated, and a lapse pulls the tech off dispatch." },
    truck:    { label:"Truck Stock",          mo:70,  build:500,
      why:"What is on each truck, what a job will consume, and which jobs are about to become second trips." },
    estimate: { label:"Estimates & Sales",    mo:80,  build:600,
      why:"Requested → quoted → won, with the margin on the quote before you send it." },
    crm:      { label:"Referral CRM",         mo:75,  build:550,
      why:"GCs, property managers, realtors, home-warranty desks. Cadence, touches, conversion — and which ones actually pay." },
    portal:   { label:"Customer Portal",      mo:70,  build:500,
      why:"Where the tech is, what was done, what it cost, and the photos — without a phone call to the office." },
    recruit:  { label:"Recruiting · ATS",     mo:95,  build:700,
      why:"Your own careers page and a pipeline scored against the trades you are actually short." },
    sign:     { label:"e-Sign",               mo:65,  build:500,
      why:"Work authorisations, change orders and estimate approvals signed in any browser, with an audit trail." },
    money:    { label:"Invoicing & Payroll",  mo:110, build:850,
      why:"Labor, parts and trip fee kept separate. Overtime, drive time, burden — and the callback line nobody else shows you." },
    books:    { label:"Books & Metrics",      mo:80,  build:600,
      why:"Margin by trade and by how the job gets paid, callback rate by tech, first-time fix — computed, never reconstructed." },
    phones:   { label:"Switchboard · Phones", mo:120, build:900,
      why:"The inbound call becomes a booked job while the caller is still on the line — logged, summarized, on the board. Your number is wired at purchase." },
    webbook:  { label:"24/7 Web Booking",     mo:70,  build:500,
      why:"A booking page under your brand on your own site, offering only slots the live board can actually take." },
    plans:    { label:"Service Plans",        mo:85,  build:650,
      why:"Maintenance agreements that schedule their own visits, bill themselves, price the member's repairs, and get chased for renewal by the department instead of by you." },
    fleet:    { label:"FleetView · Trucks",   mo:100, build:750,
      why:"Where every truck is right now, off the technician app's phone GPS — no hardware to install. Customer on-my-way links, and arrive/leave stamps that become the timesheet." },
    org:      { label:"Agent Org · Bus",      mo:140, build:1100,
      why:"The AI department chains, the event bus and the confidence gates." }
  };
  var TIERS = {
    truck: { key:"truck", name:"Truck", rank:1, mo:450, build:3900,
      desc:"One to three trucks. The whole system, sized for an owner who is still turning wrenches.",
      base:"Up to 3 techs · the full spine",
      includes:["dispatch","field","work","licences","truck","estimate","portal","sign","money"] },
    shop: { key:"shop", name:"Shop", rank:2, mo:950, build:8200,
      desc:"A real shop with a dispatcher. Adds the referral book, recruiting, books & metrics and the AI department org.",
      base:"Unlimited techs · dispatcher seat · referral CRM · agent org",
      includes:["dispatch","field","work","licences","truck","estimate","crm","portal","recruit","sign","money","books","org"] },
    grandsuite: { key:"grandsuite", name:"Grandsuite", rank:3, mo:2200, build:13800,
      desc:"Nothing held back. Multi-location, multi-trade, dedicated environment, data migration and your own branded tech app.",
      base:"Multi-location · multi-trade · dedicated environment · migration · branded app",
      includes:["dispatch","field","work","licences","truck","estimate","crm","portal","recruit","sign","money","books","org","phones","webbook","fleet","plans"] }
  };
  var DEPTS = [
    { group:"Command", items:[
      { href:"dashboard.html", label:"Command Center", ic:"◎" , icon:"icons/command-center.svg"},
      { href:"calendar.html",  label:"Calendar",       ic:"▤" , icon:"icons/calendar.svg"},
      { href:"contacts.html",  label:"Contacts",       ic:"☎" , icon:"icons/families.svg"},
      { href:"connect.html",   label:"Connect · Video",ic:"◉" , icon:"icons/connect.svg"},
      { href:"masterlist.html",label:"Master List",    ic:"▤" , icon:"icons/master-list.svg"},
      { href:"records.html",   label:"Records · Filing",ic:"▤" , icon:"icons/records.svg"},
      { href:"approvals.html", label:"Approval Desk",  ic:"✓", accent:"ops" , icon:"icons/approvals.svg"} ]},
    { group:"Front Desk", items:[
      { href:"switchboard.html", label:"Switchboard · Phones", ic:"☏", room:"phones", accent:"crm" , icon:"icons/desk.svg"},
      { href:"book.html",        label:"Web Booking",          ic:"◷", room:"webbook", accent:"portal" , icon:"icons/enroll.svg"} ]},
    { group:"The Day", items:[
      { href:"dispatch.html",  label:"Dispatch & Board",ic:"▦", room:"dispatch", accent:"dispatch" , icon:"icons/schedule.svg"},
      { href:"field.html",     label:"Field & Proof",   ic:"◉", room:"field",    accent:"field" , icon:"icons/checkin.svg"},
      { href:"worksheets.html",label:"Worksheets & Permits",ic:"✎", room:"work", accent:"work" , icon:"icons/list.svg"},
      { href:"checkpoints.html",label:"Checkpoints",        ic:"☑", room:"work", accent:"work" , icon:"icons/comply.svg"} ]},
    { group:"The Trucks", items:[
      { href:"licences.html",  label:"Licences",        ic:"⛨", room:"licences", accent:"licence" , icon:"icons/law.svg"},
      { href:"truck.html",     label:"Truck Stock",     ic:"▣", room:"truck",    accent:"ops", icon:"icons/truck-stock.svg" },
      { href:"fleetview.html",label:"FleetView · Trucks",ic:"◍", room:"fleet",  accent:"dispatch", icon:"icons/fleetview.svg" } ]},
    { group:"Growth", items:[
      { href:"estimates.html", label:"Estimates",       ic:"✦", room:"estimate", accent:"estimate" , icon:"icons/funnel.svg"},
      { href:"plans.html",     label:"Service Plans",   ic:"❉", room:"plans",    accent:"money" , icon:"icons/tuition.svg"},
      { href:"referrals.html", label:"Referral CRM",    ic:"◈", room:"crm",      accent:"crm", icon:"icons/referral-crm.svg" },
      { href:"portal.html",    label:"Customer Portal", ic:"☗", room:"portal",   accent:"portal", icon:"icons/customer-portal.svg" },
      { href:"recruiting.html",label:"Recruiting · ATS",ic:"★", room:"recruit",  accent:"recruit" , icon:"icons/hr.svg"} ]},
    { group:"Paper", items:[
      { href:"sign.html",      label:"e-Sign",          ic:"✍", room:"sign",     accent:"sign" , icon:"icons/docs.svg"} ]},
    { group:"Money", items:[
      { href:"money.html",     label:"Invoicing & Payroll",ic:"◧", room:"money", accent:"money" , icon:"icons/payroll.svg"},
      { href:"books.html",     label:"Books & Metrics", ic:"◭", room:"books",    accent:"money" , icon:"icons/books.svg"} ]},
    { group:"The Org", items:[
      { href:"org.html",       label:"Agent Org · Bus", ic:"❖", room:"org",      accent:"ops" , icon:"icons/org.svg"} ]}
  ];

  function tier(){ return db().tier||"grandsuite"; }
  function setTier(k){ return save(function(d){ d.tier=k; d.adds=[]; d.offs=[]; }); }
  function activeRooms(){ var d=db(), t=TIERS[d.tier]||TIERS.grandsuite, set=t.includes.slice();
    (d.adds||[]).forEach(function(k){ if(set.indexOf(k)<0) set.push(k); });
    (d.offs||[]).forEach(function(k){ set=set.filter(function(x){return x!==k;}); });
    return set; }
  function hasRoom(k){ return activeRooms().indexOf(k)>=0; }
  function toggleRoom(k){ return save(function(d){
    var t=TIERS[d.tier]||TIERS.grandsuite, inPack=t.includes.indexOf(k)>=0, on=activeRooms().indexOf(k)>=0;
    d.adds=d.adds||[]; d.offs=d.offs||[];
    if(on){ if(inPack) d.offs.push(k); else d.adds=d.adds.filter(function(x){return x!==k;}); }
    else  { if(inPack) d.offs=d.offs.filter(function(x){return x!==k;}); else d.adds.push(k); } }); }
  function priceNow(){ var d=db(), t=TIERS[d.tier]||TIERS.grandsuite, adds=d.adds||[], offs=d.offs||[];
    var am=adds.reduce(function(a,k){return a+((ROOMS[k]||{}).mo||0);},0);
    var ab=adds.reduce(function(a,k){return a+((ROOMS[k]||{}).build||0);},0);
    var om=offs.reduce(function(a,k){return a+((ROOMS[k]||{}).mo||0);},0);
    var ob=offs.reduce(function(a,k){return a+((ROOMS[k]||{}).build||0);},0);
    var rooms=activeRooms(), ala=rooms.reduce(function(a,k){return a+((ROOMS[k]||{}).mo||0);},0);
    var mo=Math.max(0,t.mo+am-om);
    return { tier:t, adds:adds, offs:offs, mo:mo, build:Math.max(0,t.build+ab-ob), rooms:rooms,
             alaMo:ala, savingMo:Math.max(0,ala-mo), changed: adds.length>0||offs.length>0 }; }
  function priceLabel(){ var p=priceNow(); return money(p.mo)+"/mo licensed"; }

  var SEATS = [
    { dept:"Dispatch",   dh:"Ivy",   ae:"Cal",  focus:"Fill rate, drive time, second trips, and who is sitting idle at 2pm." },
    { dept:"Field",      dh:"Roy",   ae:"Bree", focus:"Proof of service, callbacks by cause, first-time fix, permit documentation." },
    { dept:"Money",      dh:"Nell",  ae:"Gus",  focus:"Margin by trade and billing type, overtime creep, and the true cost of warranty work." },
    { dept:"Growth",     dh:"Sol",   ae:"Wren", focus:"Estimate win rate, referral conversion, and which accounts are worth keeping." },
    { dept:"Compliance", dh:"Hale",  ae:"Tess", focus:"Licence expiries, permitted work, insurance, and jobsite safety records." }
  ];
  var BRAIN = { name:"Foreman", role:"COO — the single point of contact",
    line:"Every department's conclusion reaches the owner through one seat, packaged as one decision at a time." };

  /* ------------------------------------------------------------- UI helpers */
  function el(h){ var t=document.createElement("template"); t.innerHTML=String(h).trim(); return t.content.firstChild; }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function money(n){ return "$"+(Math.round(Number(n)||0)).toLocaleString(); }
  function money2(n){ return "$"+(Number(n)||0).toFixed(2); }
  function pct(n,dp){ return (Number(n)||0).toFixed(dp===undefined?0:dp)+"%"; }
  function hhmm(s){ var p=String(s||"").split(":"); if(p.length<2) return s||"";
    var h=+p[0],m=p[1],ap=h>=12?"p":"a"; h=h%12; if(!h) h=12;
    return h+(m==="00"?"":":"+m)+ap; }
  function dayLabel(dISO){ var d=new Date(dISO+"T12:00:00");
    return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]+" "+(d.getMonth()+1)+"/"+d.getDate(); }
  var MARK_URL="https://www.aexperiences.com/Toolbelt_OS.png";
  function brandMark(){ return '<img src="'+MARK_URL+'" alt="Toolbelt OS" width="34" height="34" '+
    'style="display:block;border-radius:9px" onerror="this.style.display=\'none\';this.parentNode.textContent=\'TB\';">'; }
  function proofBand(s){ if(s==="Verified"||s==="On site") return "good";
    if(s==="Late"||s==="Scheduled") return "watch"; if(s==="Unassigned") return ""; return "bad"; }

  /* ------------------------------------------------------------- the shell */
  function renderShell(active){
    var side=document.createElement("aside"); side.className="sidebar";
    side.appendChild(el('<a href="dashboard.html" class="brand"><div class="bmark">'+brandMark()+
      '</div><div><div class="bt">Toolbelt OS</div><div class="bs">Field Service OS</div></div></a>'));
    var nav=document.createElement("nav"); nav.className="nav"; var on=activeRooms();
    DEPTS.forEach(function(g){
      nav.appendChild(el('<div class="nav-group">'+esc(g.group)+'</div>'));
      g.items.forEach(function(it){
        var off=it.room && on.indexOf(it.room)<0;
        var a=el('<a href="'+(off?"javascript:void(0)":it.href)+'" class="navlink '+(it.href===active?"active":"")+
          (off?" locked":"")+'"'+(it.accent?' data-accent="'+it.accent+'"':"")+'>'+(it.icon?'<img class="ic ic-img" src="'+it.icon+'" alt="">':'<span class="ic">'+it.ic+'</span>')+
          '<span class="lb">'+esc(it.label)+'</span>'+(off?'<span class="tier-tag">+'+money(ROOMS[it.room].mo)+'</span>':'')+'</a>');
        if(off){ a.title="Not in this build — add "+ROOMS[it.room].label+" for "+money(ROOMS[it.room].mo)+"/mo";
          a.addEventListener("click",function(){ toggleRoom(it.room);
            toast(ROOMS[it.room].label+" added — "+priceLabel(),"ok");
            setTimeout(function(){location.reload();},500); }); }
        nav.appendChild(a); });
    });
    side.appendChild(nav); return side;
  }
  var MOBILE_NAV=[{href:"dashboard.html",label:"Home",ic:"◎",icon:"icons/command-center.svg"},
    {href:"dispatch.html",label:"Board",ic:"▦",room:"dispatch",icon:"icons/schedule.svg"},
    {href:"field.html",label:"Field",ic:"◉",room:"field",icon:"icons/checkin.svg"},
    {href:"money.html",label:"Money",ic:"◧",room:"money",icon:"icons/payroll.svg"},
    {href:"approvals.html",label:"Approvals",ic:"✓",icon:"icons/approvals.svg"}];
  function renderMobileBar(active){
    var bar=document.createElement("nav"); bar.className="mobilebar"; var on=activeRooms();
    MOBILE_NAV.forEach(function(it){ var off=it.room&&on.indexOf(it.room)<0;
      bar.appendChild(el('<a href="'+(off?"javascript:void(0)":it.href)+'" class="mb-link '+(it.href===active?"active":"")+
        '">'+(it.icon?'<img class="mb-ic mb-img" src="'+it.icon+'" alt="">':'<span class="mb-ic">'+it.ic+'</span>')+
        '<span class="mb-lb">'+esc(it.label)+'</span></a>')); });
    bar.appendChild(el('<button class="mb-link mb-menu" id="mbMenu"><span class="mb-ic">☰</span><span class="mb-lb">Menu</span></button>'));
    return bar; }
  function iconFor(href){
    for(var g=0;g<DEPTS.length;g++){ for(var i=0;i<DEPTS[g].items.length;i++){
      if(DEPTS[g].items[i].href===href) return DEPTS[g].items[i].icon||null; } }
    return null; }
  function renderTopbar(crumb, active){
    var p=priceNow(), s=db().shop;
    var bar=document.createElement("div"); bar.className="topbar";
    var ini=(s.owner||"DK").split(" ").map(function(w){return w[0];}).join("").slice(0,2).toUpperCase();
    var hic=iconFor(active);
    bar.innerHTML='<button class="hamburger" id="hamburger" aria-label="Open menu">☰</button>'+
      (hic?'<img class="crumb-ic" src="'+hic+'" alt="">':'')+
      '<div class="crumbs">Toolbelt OS · <b>'+esc(crumb)+'</b></div><div class="spacer"></div>'+
      '<div class="tierpill" id="tierPillStatic"><span class="dot"></span><div><b>'+esc(p.tier.name)+
      (p.changed?' <i class="cfg">configured</i>':'')+'</b> <span class="price">'+money(p.mo)+'/mo licensed</span></div></div><div class="who"><div class="av">'+esc(ini)+'</div><div>'+esc(s.owner)+
      '<br><span class="muted small">Owner · '+esc(s.name)+'</span></div></div>';
    return bar; }
  function ribbon(){ return el('<div class="ribbon"><span class="live">LIVE SHOWROOM</span>'+
    ' — this is the real operating system, not a slideshow. Type anywhere; it saves in your browser. '+
    'The shop, techs and customers below are a realistic sample book. '+
    '<a href="javascript:void(0)" id="resetFloor">Start with a clean slate</a></div>'); }
  function footer(){ return el('<div class="ae-credit">Powered by <b>Accelerated Experiences LLC</b> · Toolbelt OS is a '+
    'white-label build. Sample data is a fictional shop. Benchmarks are sourced or shown blank — never invented. '+
    'Nothing here is legal, tax or code-compliance advice.</div>'); }
  function toast(m,k){ var w=document.getElementById("toast-wrap"); if(!w) return;
    var t=el('<div class="toast '+(k||"")+'">'+esc(m)+'</div>'); w.appendChild(t);
    setTimeout(function(){ t.style.opacity="0"; setTimeout(function(){t.remove();},250); },2600); }
  /* The fleet-wide Command Center polish layer. One file on the store, loaded by
     every product, so a change lands everywhere at once instead of fourteen times. */
  function loadFlava(){
    if(document.getElementById("aeFlavaCss")) return;
    var l=document.createElement("link"); l.id="aeFlavaCss"; l.rel="stylesheet";
    l.href="https://www.aexperiences.com/ae-flava.css"; document.head.appendChild(l);
    var j=document.createElement("script"); j.src="https://www.aexperiences.com/ae-flava.js";
    j.defer=true; document.head.appendChild(j);
  }
  function mount(o){
    try{ loadFlava(); }catch(e){} o=o||{}; db();
    var app=document.createElement("div"); app.className="app";
    var side=renderShell(o.active), backdrop=el('<div class="nav-backdrop" id="navBackdrop"></div>');
    var main=document.createElement("div"); main.className="main";
    main.appendChild(ribbon()); main.appendChild(renderTopbar(o.crumb||"Command Center", o.active));
    var content=document.createElement("div"); content.className="content"; content.id="content";
    main.appendChild(content); main.appendChild(footer());
    app.appendChild(side); app.appendChild(main);
    document.body.innerHTML=""; document.body.appendChild(app); document.body.appendChild(backdrop);
    document.body.appendChild(renderMobileBar(o.active));
    document.body.appendChild(el('<div id="toast-wrap"></div>'));
    setTimeout(function(){
      var r=document.getElementById("resetFloor");
      if(r) r.addEventListener("click",function(){
        if(!confirm("Clear the sample shop and start with an empty book?\n\nThis removes the sample techs, customers and jobs so you can enter your own. It cannot be undone.")) return;
        goLive(); toast("Empty book ready. Add your first customer.","ok");
        setTimeout(function(){location.reload();},500); });
      function open(){ side.classList.add("open"); backdrop.classList.add("show"); }
      function close(){ side.classList.remove("open"); backdrop.classList.remove("show"); }
      var h=document.getElementById("hamburger"), m=document.getElementById("mbMenu");
      if(h) h.addEventListener("click",open); if(m) m.addEventListener("click",open);
      backdrop.addEventListener("click",close);
      Array.prototype.forEach.call(side.querySelectorAll("a.navlink"),function(a){ a.addEventListener("click",close); });
    },0);
    return content; }
  function page(t,s,a){ return el('<div class="pagehead"><div><h1>'+esc(t)+'</h1>'+
    (s?'<p class="sub">'+s+'</p>':"")+'</div><div class="pagehead-actions">'+(a||"")+'</div></div>'); }
  function card(i,c){ return el('<section class="card '+(c||"")+'">'+i+'</section>'); }
  function stat(l,v,n,b){ return '<div class="stat '+(b||"")+'"><div class="s-l">'+esc(l)+'</div><div class="s-v">'+v+
    '</div>'+(n?'<div class="s-n">'+n+'</div>':"")+'</div>'; }
  function tag(t,k){ return '<span class="tag '+(k||"")+'">'+esc(t)+'</span>'; }
  function srcNote(t){ return '<div class="srcnote">Source: '+esc(t)+'</div>'; }
  function bar(p,c){ var w=Math.max(0,Math.min(100,p));
    return '<div class="bar" style="margin-top:6px"><i style="width:'+w.toFixed(0)+'%'+(c?";background:"+c:"")+'"></i></div>'; }

  /* ------------------------------------------------------- owner's manual */
  var MANUAL = [
    { t:"What this system is", c:"Toolbelt OS runs a field-service shop end to end: the day board, the truck, the job, the paperwork and the money. Every number on a dashboard is computed from your own jobs — nothing on a screen was typed in by hand." },
    { t:"Start with a clean slate", c:"It opens on a realistic sample shop so you can see how every room behaves with data in it. When you are ready for your own book, use 'Start with a clean slate' in the ribbon. It clears the sample and the option disappears." },
    { t:"Why one job has three money lines", c:"Labor is marked up over what the tech costs you. Parts are marked up over the supply house. The trip fee covers getting the truck there at all. Generic invoicing flattens those into one number, and that is how a shop can be busy all week and still lose money on a trade." },
    { t:"The callback line", c:"When you go back because something you did failed, you pay full cost and bill zero. Most shops never measure it. This one shows callback cost every week and callback count by tech — not to punish anyone, but because a tech with a pattern usually needs training or better parts, and you cannot see either without the number." },
    { t:"Manufacturer warranty is not free money", c:"The manufacturer reimburses parts and a fixed labor allowance, usually well below your hourly rate. The system bills it at the allowance so the margin you see on warranty work is the margin you actually get." },
    { t:"How dispatch ranks technicians", c:"Distance and drive time, whether it is their primary trade, whether the parts are already on their truck, how many times they have been to this customer, their callback record, and what the assignment does to their week. Every score shows its reasons so you can argue with it." },
    { t:"Hard blockers cannot be overridden", c:"An expired driver's licence, insurance, or OSHA card removes a tech from dispatch entirely. So does sending someone to permitted work without the licence that work requires — that is the finding that costs a contractor their licence, not a warning." },
    { t:"Permit work cannot close undocumented", c:"Panel changes, new circuits, gas alterations, water heater and service replacements, refrigerant work and backflow tests all require a permit and a specific licence. The system will not treat that job as properly closed until a permit number is on it." },
    { t:"Proof of service", c:"Arrival and departure with time and place, the tasks performed, photos, and the customer's signature. It is what settles a dispute three months later, and on commercial and warranty work it is what gets you paid." },
    { t:"Working with no signal", c:"Crawlspaces, mechanical rooms and rural valleys have no bars. The field app captures the timestamp and coordinates on the device and syncs when the connection returns, keeping the ORIGINAL time — otherwise every rural call would look late." },
    { t:"Second trips are the hidden margin killer", c:"A job where the truck is missing a part is a job that becomes two jobs. The board flags it before the tech leaves, and Truck Stock shows what is out and on which truck." },
    { t:"Overtime is a dispatch decision", c:"Past 40 hours the tech is paid time and a half. The customer is not billed time and a half. The board warns before an assignment creates it, and Books totals the drift for the week." },
    { t:"Licences and the expiry window", c:"Anything inside 45 days reads expiring; anything past reads expired and blocks dispatch. The Licences room sorts worst first." },
    { t:"Where the work comes from", c:"General contractors, property managers, realtors, home-warranty desks and the supply-house counter. The referral book tracks cadence and conversion — and shows which of those accounts is actually worth having. High-volume home-warranty work is often the lowest margin on the board." },
    { t:"The Switchboard", c:"An inbound call opens the caller's whole history before you say hello — what they own, what you did last time, whether they are on an agreement, the gate code. Book the job while they are still on the line and the customer record is created for you if they are new. The AI receptionist takes overflow and books off the live board, then writes down what it did. On this floor the calls are simulated and labelled as such; your real number, recording and IVR are wired to your line at purchase." },
    { t:"24/7 web booking", c:"The booking page runs on your own website under your own brand. It only offers times the live board can actually take: every technician is checked for a conflict and for the licence the work requires, so it cannot double-book you and it cannot hand a job to somebody who is not legal to do it. A booking creates the customer and an OPEN job on the board." },
    { t:"FleetView and the phone in the tech's pocket", c:"Truck positions come from the branded technician app's GPS. There is no box to install in a van and no per-truck subscription. One tap sends the customer a link with the tech's name and a live ETA — no app for them, no account. The same arrive and leave stamps that prove the visit also total the week's hours, so payroll reconciles against jobs that actually happened. Vehicle-level telemetry hardware is optional and wired at purchase; most shops never need it." },
    { t:"Service plans that chase their own renewals", c:"A maintenance agreement here is a live record, not a note in a file. It knows how many visits are left this year, when it renews, and whether it renews itself. Visits go on the board from the plan; the member's discount is applied in the pricebook rather than remembered by whoever answers the phone; and plan revenue sits on its own ledger line so you can see what the agreements are worth separately from service work. When a renewal is close the department drafts the nudge and it lands on the Approval Desk — it is never sent behind your back." },
    { t:"Financing on the estimate", c:"Above the minimum, every quote can show the monthly alongside the total — $8,400, or about $147 a month — with the terms laid out and no games about what the rate is. The margin stays on the quote where you can see it. On this floor the payment view is a demonstration: the financing partner and the actual underwriting are wired to your account at purchase, priced into your build fee. Nothing here approves anybody for credit." },
    { t:"Checkpoints — the job cannot close undocumented", c:"Every job carries a short stage checklist: what to photograph before anyone touches the equipment, the trade-specific step that matters in the middle, and the walkthrough before you leave. The items that carry proof are required, and the refusal is built into the system rather than into one screen — a job with a missing before-photo will not close from the field app, the office, or anywhere else. Jobs that were closed before Checkpoints existed read their state from the record they already left: photos on file and a captured signature." },
    { t:"e-Sign — how signing works here", c:"Pick a template, and the system mints an unguessable link. The customer opens it in any browser with no account, consents to sign electronically, adopts a signature by drawing or typing it, and the record freezes with a timestamped audit trail." },
    { t:"Is an electronic signature legally binding?", c:"US law (ESIGN and UETA) generally makes an electronic signature as enforceable as ink when the signer consented to do business electronically, intended to sign, the signature is attributable to them, and the record is retained and reproducible. This module captures all four. It is not legal advice — have your attorney review the consent language for your state." },
    { t:"What this system does NOT do by itself", c:"Four things need an outside party and the system says so rather than pretending: pulling the permit (the city or county issues it), taking payment (a licensed processor moves the money), live supply-house catalogue pricing (the distributor's feed), and filing payroll (a payroll processor). Everything upstream of those is native here." },
    { t:"The Approval Desk", c:"Anything that changes a rate, sends to a customer, writes off a callback, or commits money waits here instead of happening quietly. It should stay nearly empty." },
    { t:"On your phone", c:"Every room works on a phone. The bottom bar carries Home, Board, Field, Money and Approvals; Menu opens everything else. Buttons are sized for gloves." }
  ];
  function manual(){ return MANUAL; }
  function askManual(q){
    q=String(q||"").toLowerCase().trim(); if(!q) return [];
    var syn={ot:"overtime",callback:"callback",cb:"callback",permit:"permit",licence:"licence",license:"licence",
      esign:"signature","e-sign":"signature",gps:"proof",offline:"signal",parts:"truck",stock:"truck",
      warranty:"warranty",margin:"money",phone:"phone",pay:"payroll"};
    var terms=q.split(/[^a-z0-9-]+/).filter(Boolean).map(function(w){ return syn[w]||w; });
    return MANUAL.map(function(a){ var hay=(a.t+" "+a.c).toLowerCase(), s=0;
      terms.forEach(function(t){ if(!t||t.length<3) return;
        if(a.t.toLowerCase().indexOf(t)>=0) s+=6; s += hay.split(t).length-1; });
      return {a:a,s:s}; }).filter(function(r){return r.s>0;})
      .sort(function(x,y){return y.s-x.s;}).slice(0,4).map(function(r){return r.a;});
  }

  document.addEventListener("visibilitychange",function(){ if(!document.hidden) db(); });

  global.Toolbelt = {
    db:db, save:save, fresh:fresh, goLive:goLive, isSample:isSample, SEED:SEED, TODAY:TODAY,
    iso:iso, addDays:addDays, weekOf:weekOf, thisWeek:thisWeek, lastWeek:lastWeek, jobsInWeek:jobsInWeek,
    hhmmToMin:hhmmToMin, minToHhmm:minToHhmm, isWeekend:isWeekend, isHoliday:isHoliday, afterHours:afterHours,
    TRADES:TRADES, tradeColor:tradeColor, JOB_TYPES:JOB_TYPES, BILLING:BILLING, billing:billing,
    isWarrantyWork:isWarrantyWork, PERMIT_WORK:PERMIT_WORK, permitRule:permitRule, needsPermit:needsPermit,
    TASKS:TASKS, LICENCES:LICENCES, LIC_WARN_DAYS:LIC_WARN_DAYS, SKILLS:SKILLS, RATES:RATES, PROOF:PROOF,
    ATS_STAGES:ATS_STAGES, REFERRER_TYPES:REFERRER_TYPES, ESTIMATE_STAGES:ESTIMATE_STAGES,
    BENCH:BENCH, REPLACES:REPLACES, DOC_TEMPLATES:DOC_TEMPLATES, ESIGN_CONSENT:ESIGN_CONSENT, templateById:templateById,
    customerById:customerById, techById:techById, jobById:jobById, partBySku:partBySku,
    docById:docById, docByToken:docByToken, techName:techName, applicantById:applicantById,
    rateFor:rateFor, partsCost:partsCost, scoped:scoped, assignedHoursBefore:assignedHoursBefore,
    weekRevenue:weekRevenue, weekCost:weekCost, weekMargin:weekMargin, weekMarginPct:weekMarginPct,
    weekHours:weekHours, openJobs:openJobs, openHours:openHours, fillRate:fillRate,
    revenueByTrade:revenueByTrade, revenueByBilling:revenueByBilling, marginPctBy:marginPctBy,
    overtimeHours:overtimeHours, callbacks:callbacks, callbackCost:callbackCost, callbackRate:callbackRate,
    callbacksByTech:callbacksByTech,
    daysUntil:daysUntil, licStatus:licStatus, licBlockers:licBlockers, licIssues:licIssues,
    cannotDispatch:cannotDispatch, permitGaps:permitGaps, dispatchedUnlicensed:dispatchedUnlicensed,
    matchFor:matchFor, haversineMi:haversineMi, driveMin:driveMin, busyAt:busyAt, stockFor:stockFor,
    truckStock:truckStock, reorderFlags:reorderFlags, secondTripRisk:secondTripRisk,
    proofState:proofState, proofClean:proofClean, proofExceptions:proofExceptions,
    proofCompliancePct:proofCompliancePct, PROOF_WINDOW_DAYS:PROOF_WINDOW_DAYS, recentClosed:recentClosed,
    arrive:arrive, depart:depart, assign:assign, addJob:addJob, removeJob:removeJob, setPermit:setPermit,
    estimateValue:estimateValue, winRate:winRate, moveEstimate:moveEstimate, addEstimate:addEstimate,
    screenScore:screenScore, moveApplicant:moveApplicant, addApplicant:addApplicant, pipelineCounts:pipelineCounts,
    referralOverdue:referralOverdue, referralConversion:referralConversion, topReferrers:topReferrers, logTouch:logTouch,
    createDoc:createDoc, sendDoc:sendDoc, openDoc:openDoc, signDoc:signDoc, docsAwaiting:docsAwaiting,
    fillTemplate:fillTemplate, docContext:docContext,
    SEATS:SEATS, BRAIN:BRAIN, bus:bus, approvals:approvals, decideApproval:decideApproval,
    TIERS:TIERS, ROOMS:ROOMS, DEPTS:DEPTS, tier:tier, setTier:setTier, activeRooms:activeRooms,
    hasRoom:hasRoom, toggleRoom:toggleRoom, priceNow:priceNow, priceLabel:priceLabel,
    manual:manual, askManual:askManual, kpis:kpis, iconFor:iconFor,
    calls:calls, callById:callById, callStats:callStats, callLabel:callLabel,
    trucks:trucks, truckById:truckById, truckForTech:truckForTech, fleetState:fleetState,
    truckState:truckState, currentJobFor:currentJobFor, etaFor:etaFor, serviceDue:serviceDue,
    milesSinceService:milesSinceService, sendOnMyWay:sendOnMyWay, jobByOmw:jobByOmw, FLEET_CLOCK:FLEET_CLOCK,
    stampsFor:stampsFor, stampHours:stampHours, stampExceptions:stampExceptions, pingAgeMin:pingAgeMin,
    plans:plans, planById:planById, memberships:memberships, membershipById:membershipById,
    membershipFor:membershipFor, isMember:isMember, memberDiscount:memberDiscount, memberPrice:memberPrice,
    visitsLeft:visitsLeft, planVisitsDue:planVisitsDue, renewalsDue:renewalsDue, renewalsAtRisk:renewalsAtRisk,
    planRevenue:planRevenue, schedulePlanVisit:schedulePlanVisit, draftRenewalNudge:draftRenewalNudge,
    enroll:enroll, setAutoRenew:setAutoRenew, PLAN_DUE_DAYS:PLAN_DUE_DAYS,
    FINANCE:FINANCE, monthlyPayment:monthlyPayment, financeEligible:financeEligible,
    financeOffers:financeOffers, bestMonthly:bestMonthly, requestFinancing:requestFinancing,
    CHECKPOINTS:CHECKPOINTS, CHECK_STAGES:CHECK_STAGES, checkpointsFor:checkpointsFor,
    checkState:checkState, setCheckpoint:setCheckpoint, checkBlockers:checkBlockers,
    canClose:canClose, checkExceptions:checkExceptions, checkStats:checkStats, checkStarted:checkStarted,
    answerCall:answerCall, bookFromCall:bookFromCall, aiHandleCall:aiHandleCall,
    mount:mount, toast:toast, el:el, esc:esc, money:money, money2:money2, pct:pct,
    hhmm:hhmm, dayLabel:dayLabel, page:page, card:card, stat:stat, tag:tag, srcNote:srcNote, bar:bar,
    proofBand:proofBand, brandMark:brandMark, MARK_URL:MARK_URL
  };
})(window);


/* ------------------------------------------------------------------ pricebook
   This showroom no longer trusts its own copy of the price book.

   Every demo used to hard-code its tier names and prices independent of the
   store, and they drifted: on Aug 8 2026 nine of twelve showrooms were quoting
   money that contradicted the store on the same afternoon. Re-syncing twelve
   files by hand every time a price moves isn't a fix, it's a chore that will
   eventually get skipped.

   So the demo now READS the store at runtime. catalog.js on aexperiences.com is
   the one price book; this pulls it, finds this product, and corrects the tier
   name, monthly, and build fee in place — on the same objects the UI renders
   from, so a correction that lands before first paint is simply what shows.

   Three rules, in order:
     1. Never break the demo. Offline, CORS, a catalog rewrite that breaks the
        parse — any failure and it does nothing at all. The baked numbers stay,
        and they are correct as of the Aug 8 2026 sync.
     2. Never invent a number. It only ever copies what the store publishes.
     3. Say something when it corrects. A silent correction hides the drift that
        caused it; the console note is how the next person finds the stale file.

   Read the result any time via: await window.AE_PRICEBOOK                    */

(function (global) {
  "use strict";

  var ID      = "toolbelt";                        /* this product, in the store catalog */
  var STORE   = "https://www.aexperiences.com";
  var CATALOG = STORE + "/catalog.js";
  var API     = STORE + "/api/pricing";   /* preferred the day the store ships it */

  /* Pull ['Name', mo, build] rows out of the catalog's tiers:[ ... ] block for
     one product. Bracket-balanced and string-aware rather than regex-greedy, so
     a description containing a bracket can't run the match past the block end. */
  function parseCatalog(src, id) {
    var at = src.indexOf("id:'" + id + "'");
    if (at < 0) at = src.indexOf('id:"' + id + '"');
    if (at < 0) return null;

    var key = src.indexOf("tiers:", at); if (key < 0) return null;
    var open = src.indexOf("[", key);    if (open < 0) return null;

    var depth = 0, end = -1, inStr = null, i, c;
    for (i = open; i < src.length; i++) {
      c = src[i];
      if (inStr) { if (c === "\\") i++; else if (c === inStr) inStr = null; continue; }
      if (c === "'" || c === '"') { inStr = c; continue; }
      if (c === "[") depth++;
      else if (c === "]") { depth--; if (!depth) { end = i; break; } }
    }
    if (end < 0) return null;

    var block = src.slice(open + 1, end), rows = [], m;
    var re = /\[\s*(['"])((?:\\.|(?!\1).)*)\1\s*,\s*(\d+)\s*,\s*(\d+)/g;
    while ((m = re.exec(block))) {
      rows.push({ name: m[2].replace(/\\(.)/g, "$1"), mo: +m[3], build: +m[4] });
    }
    return rows.length ? rows : null;
  }

  /* Find the app's live TIERS object. Each showroom exports under its own name,
     so match on shape — an object whose entries carry mo + build — rather than on
     a name that could be renamed out from under this. */
  function findTiers() {
    var seen = Object.keys(global), i, o, k, first;
    for (i = 0; i < seen.length; i++) {
      try { o = global[seen[i]]; } catch (e) { continue; }
      if (!o || typeof o !== "object" || !o.TIERS) continue;
      first = null;
      for (k in o.TIERS) { first = o.TIERS[k]; break; }
      if (first && typeof first.mo === "number" && typeof first.build === "number") return o.TIERS;
    }
    return null;
  }

  /* Put the app's tiers in store order. Most showrooms carry an explicit rank and
     that is authoritative. A few (Moments) don't, and there we fall back to the
     declaration order of the object — but only when the counts match exactly, so
     a tier added on one side can never silently shift prices onto the wrong one. */
  function ordered(tiers, expected) {
    var k, list = [], ranked = true;
    for (k in tiers) {
      if (!tiers[k] || typeof tiers[k].mo !== "number") continue;
      if (typeof tiers[k].rank !== "number") ranked = false;
      list.push(tiers[k]);
    }
    if (ranked) return list.sort(function (a, b) { return a.rank - b.rank; });
    return list.length === expected ? list : null;
  }

  /* Never match on the object key. The internal keys (lite/standard/…) are ours
     and can be renamed; the tier's position in the store's list is what a price
     actually belongs to. */
  function reconcile(list, book) {
    var fixes = [];
    book.forEach(function (row, i) {
      var t = list[i];
      if (!t) return;
      if (t.name === row.name && t.mo === row.mo && t.build === row.build) return;
      fixes.push("tier " + (i + 1) + ": " + t.name + " $" + t.mo + "/" + t.build +
                 "  ->  " + row.name + " $" + row.mo + "/" + row.build);
      t.name = row.name; t.mo = row.mo; t.build = row.build;
    });
    return fixes;
  }

  global.AE_PRICEBOOK = (async function () {
    var book = null, r, j, rows, res, tiers = null, tries;

    try {
      r = await fetch(API + "?product=" + encodeURIComponent(ID), { cache: "no-store" });
      if (r.ok) {
        j = await r.json();
        rows = j.tiers || j.data || j;
        if (Array.isArray(rows) && rows.length) {
          book = rows.map(function (t) {
            return Array.isArray(t) ? { name: t[0], mo: +t[1], build: +t[2] }
                                    : { name: t.name, mo: +t.mo, build: +t.build };
          });
        }
      }
    } catch (e) { /* endpoint absent — expected today, not an error */ }

    if (!book) {
      try {
        res = await fetch(CATALOG, { cache: "no-store" });
        if (res.ok) book = parseCatalog(await res.text(), ID);
      } catch (e) { return { ok: false, why: "store unreachable", id: ID }; }
    }
    if (!book) return { ok: false, why: "product not found in catalog", id: ID };

    /* The app may still be booting. Wait briefly, then give up quietly — a demo
       rendering its own correct baked numbers is a fine outcome. */
    for (tries = 0; tries < 60 && !(tiers = findTiers()); tries++) {
      await new Promise(function (done) { setTimeout(done, 50); });
    }
    if (!tiers) return { ok: false, why: "app tiers not exposed", id: ID };

    var list = ordered(tiers, book.length);
    if (!list) return { ok: false, why: "tier count disagrees with the catalog", id: ID };

    var fixes = reconcile(list, book);
    if (fixes.length) {
      console.info("[pricebook] " + ID + " — corrected " + fixes.length +
        " tier(s) against the store catalog. The copy baked into this repo has " +
        "drifted and should be re-synced:\n  " + fixes.join("\n  "));
    }
    return { ok: true, id: ID, tiers: book.length, corrected: fixes.length, fixes: fixes };
  })();

})(window);


/* --------------------------------------------------------------- scope note
   The showroom always opens at the TOP tier on purpose — Art. X: show the
   ceiling, take departments off to fit, never build up from a stripped base.
   That is deliberate and it is right. What was missing is that nobody ever
   SAID so, so a visitor who stepped the tier down had no way to tell whether
   the numbers still on screen were meant to be theirs. They are not. On a
   mystery-shop of Abode the reviewer put it as not being able to picture
   themselves in it, and this is a large part of why.

   So: when you are not on the top tier, the floor says out loud that the
   figures are still seeded at full scale, and tells you what your tier
   actually changes — the departments. No number is altered, invented or
   shrunk to flatter a smaller buyer (Art. IV).

   Appended rather than surgically inserted so it works identically across
   eleven engines that differ inside. It reads the live TIERS, never a copy. */

(function (global) {
  "use strict";

  function engine() {
    var k, o;
    for (k in global) {
      try { o = global[k]; } catch (e) { continue; }
      if (o && typeof o === "object" && o.TIERS && typeof o.tier === "function") return o;
    }
    return null;
  }

  function line(A) {
    var here, top = null, k;
    try { here = A.TIERS[A.tier()]; } catch (e) { return ""; }
    for (k in A.TIERS) if (!top || (A.TIERS[k].rank || 0) > (top.rank || 0)) top = A.TIERS[k];
    if (!here || !top || here.rank === top.rank) return "";          /* top tier: nothing to explain */
    var mine = (here.includes || []).length, all = (top.includes || []).length;
    var s = "This floor stays seeded at full " + top.name + " scale so you can see the ceiling — "
          + "the figures below are not resized down to " + here.name + ".";
    if (mine && all) s += " What your tier changes is the departments: " + mine + " of " + all + " switched on.";
    return s;
  }

  function paint() {
    var A = engine(); if (!A) return;
    var bar = document.querySelector(".topbar"); if (!bar || !bar.parentNode) return;
    var msg = line(A), el = document.getElementById("aeScopeNote");
    if (!msg) { if (el && el.parentNode) el.parentNode.removeChild(el); return; }
    if (!el) {
      el = document.createElement("div");
      el.id = "aeScopeNote";
      el.className = "scopenote";
      /* styled inline so this needs no stylesheet edit in any of the eleven,
         and inherits whatever chrome the product already uses */
      el.style.cssText = "padding:7px 14px;font-size:11.5px;line-height:1.45;opacity:.72;" +
        "border-bottom:1px solid rgba(128,128,128,.22)";
      bar.parentNode.insertBefore(el, bar.nextSibling);
    }
    if (el.textContent !== msg) el.textContent = msg;
  }

  function boot() {
    paint();
    [200, 600, 1400, 2600].forEach(function (ms) { setTimeout(paint, ms); });
    /* tier changes re-render the chrome; some engines reload, some do not */
    setInterval(paint, 1500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})(window);
