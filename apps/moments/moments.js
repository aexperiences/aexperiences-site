/* =============================================================================
   Moments OS — the operating system for a solo photographer or videographer.
   Accelerated Experiences LLC · Post Falls, Idaho.

   THE NUMBER NOBODY IN THIS TRADE COMPUTES
   A photographer quotes "$3,500 for a wedding" and books it against EIGHT HOURS.
   Then they cull for four, edit for twenty, answer emails for three, and redo an
   album because the client asked twice. The shoot was eight hours; the JOB was
   thirty-five. Every pricing decision they will ever make is downstream of a
   number they have never once written down.
   Moments OS computes it on every job, out loud.
   ============================================================================= */
(function (global) {
  "use strict";

  var KEY = "moments_os_v1";
  var STORE = (function(){ try{ localStorage.setItem('_t','1'); localStorage.removeItem('_t'); return localStorage; }catch(e){ return sessionStorage; } })();

  var TODAY = new Date("2026-07-27T12:00:00");
  function iso(d){ var m=d.getMonth()+1, day=d.getDate();
    return d.getFullYear()+"-"+(m<10?"0":"")+m+"-"+(day<10?"0":"")+day; }
  function addDays(d,n){ var x=new Date(d.getTime()); x.setDate(x.getDate()+n); return x; }
  function addMonths(d,n){ var x=new Date(d.getTime()); x.setMonth(x.getMonth()+n); return x; }
  function dISO(s){ return new Date(String(s)+"T12:00:00"); }
  function read(){ try{ var d=JSON.parse(STORE.getItem(KEY)); return d||null; }catch(e){ return null; } }
  function write(d){ d._t=Date.now(); try{ STORE.setItem(KEY, JSON.stringify(d)); }catch(e){} }
  function clone(a){ return JSON.parse(JSON.stringify(a)); }
  var WEEK_START=(function(){ var d=new Date(TODAY.getTime()); d.setDate(d.getDate()-d.getDay()); return d; })();
  function onDate(n){ return iso(addDays(TODAY,n)); }
  function monthsOut(m){ return iso(addMonths(TODAY,m)); }

  /* ---------------------------------------------------------------- CANON --
     Job types carry an HONEST post-production multiplier: how many hours of
     desk work each shooting hour actually creates. These are the trade's own
     rules of thumb, and they are labelled as judgement on screen — not passed
     off as research. */
  var JOB_TYPES = [
    {k:"wedding",   n:"Wedding",              postPerHr:2.6, base:3500, deliver:"600–800 edited images", kind:"photo"},
    {k:"elopement", n:"Elopement",            postPerHr:2.2, base:1650, deliver:"200–300 edited images", kind:"photo"},
    {k:"portrait",  n:"Portrait session",     postPerHr:1.8, base:450,  deliver:"40–60 edited images",  kind:"photo"},
    {k:"family",    n:"Family session",       postPerHr:1.6, base:395,  deliver:"40 edited images",     kind:"photo"},
    {k:"newborn",   n:"Newborn",              postPerHr:2.4, base:550,  deliver:"30 edited images",     kind:"photo"},
    {k:"headshot",  n:"Headshots — business", postPerHr:1.2, base:325,  deliver:"3 retouched per person", kind:"photo"},
    {k:"realestate",n:"Real estate listing",  postPerHr:0.9, base:275,  deliver:"25 images + floor plan", kind:"photo"},
    {k:"product",   n:"Product / commercial", postPerHr:2.0, base:1200, deliver:"per shot list", kind:"photo", licensed:true},
    {k:"event",     n:"Corporate event",      postPerHr:1.1, base:900,  deliver:"150 images, 48hr turn", kind:"photo"},
    {k:"brandvid",  n:"Brand video",          postPerHr:5.5, base:2800, deliver:"1 hero cut + 3 socials", kind:"video", licensed:true},
    {k:"weddingvid",n:"Wedding film",         postPerHr:6.0, base:2900, deliver:"8-min film + teaser",  kind:"video"},
    {k:"socialpack",n:"Social content pack",  postPerHr:4.0, base:850,  deliver:"12 vertical cuts",     kind:"video", licensed:true}
  ];
  function jobType(k){ return JOB_TYPES.filter(function(t){return t.k===k;})[0]||JOB_TYPES[0]; }

  var STAGES = ["Enquiry","Quoted","Retainer due","Booked","Shot","In post","Delivered","Closed","Lost"];

  /* Usage licensing. Commercial clients are not buying photographs, they are
     buying PERMISSION — for a term, a territory and a set of media. A solo who
     charges a day rate and hands over unlimited rights has given away the part
     that was worth the most, and will never know. */
  var LICENSE_TERMS = [
    {k:"none",     n:"Personal use — no commercial licence", mult:1.00},
    {k:"social",   n:"Organic social only · 1 year",         mult:1.15},
    {k:"web",      n:"Web + social · 1 year",                mult:1.35},
    {k:"webpaid",  n:"Web, social + paid digital · 1 year",  mult:1.75},
    {k:"full1",    n:"All media incl. print · 1 year",       mult:2.20},
    {k:"full3",    n:"All media · 3 years",                  mult:3.10},
    {k:"buyout",   n:"Perpetual buyout",                     mult:4.50}
  ];
  function licenceBy(k){ return LICENSE_TERMS.filter(function(l){return l.k===k;})[0]||LICENSE_TERMS[0]; }

  /* What it costs to actually run — the numbers a solo forgets are costs. */
  var COSTS = {
    secondShooter: 45,     // per hour
    assistant:     28,
    mileage:       0.67,   // IRS-style rate per mile
    storagePerTB:  9,      // per month per TB held
    albumCost:     185,     // trade cost of an album that sells for ~$650
    printMarkup:   2.8
  };
  var RATES = { targetHourly: 85, revisionsIncluded: 2, revisionHours: 1.5, galleryMonths: 12 };

  var BENCH = {
    note:"There is no reliable public benchmark for solo photography margins — the trade's published figures come from vendor surveys with tiny samples. So this product measures YOUR numbers rather than comparing you to invented ones."
  };

  var REPLACES = [
    ["A CRM + contract tool (Honeybook, Dubsado)","$35–39/mo"],
    ["A gallery host + proofing platform (Pixieset, Pic-Time, ShootProof)","$20–40/mo"],
    ["Bookkeeping","$20–30/mo"],
    ["A separate e-sign tool","$15–25/mo"],
    ["Photo culling & finishing in someone else's app","subscription, forever"],
    ["Video editing you do in someone else's app","subscription, forever"],
    ["The spreadsheet where you guess your hourly rate","hours, and it is wrong"]
  ];

  /* ----------------------------------------------------------------- SEED -- */
  var SEED = {};
  SEED.studio = { name:"Wren & Field", owner:"Rosalind Wren", city:"Coeur d'Alene, Idaho",
                  founded:2019, storageTB:6.5 };

  SEED.clients = [
    {id:"c1", name:"Devon & Marisol Ayers",  email:"—", type:"Wedding client", note:"Sept wedding, 180 guests."},
    {id:"c2", name:"Halcyon Coffee Roasters",email:"—", type:"Commercial",     note:"Wants quarterly content."},
    {id:"c3", name:"The Ferraro family",     email:"—", type:"Portrait",       note:"Books every autumn since 2021."},
    {id:"c4", name:"Kestrel Dental",         email:"—", type:"Commercial",     note:"Headshots for 11 staff."},
    {id:"c5", name:"Junie & Tom Alcaraz",    email:"—", type:"Wedding client", note:""},
    {id:"c6", name:"Northbend Realty",       email:"—", type:"Commercial",     note:"Listing work, volume pricing."},
    {id:"c7", name:"Odette Lamb",            email:"—", type:"Portrait",       note:"Newborn — second child."},
    {id:"c8", name:"Ridgeline Outfitters",   email:"—", type:"Commercial",     note:"Brand video, spring campaign."},
    {id:"c9", name:"Silas & Wren Moreau",    email:"—", type:"Wedding client", note:"Elopement, Priest Lake."},
    {id:"c10",name:"Cedar Ridge Dental",     email:"—", type:"Commercial",     note:"Referred by Kestrel."}
  ];

  /* Jobs carry BOTH the shoot hours and the real post hours, because that gap is
     the entire product. A couple of these are deliberately underwater — a book
     with nothing wrong in it teaches nobody anything. */
  SEED.jobs = [
    {id:"j1", client:"c1", type:"wedding",    date:onDate(48),  stage:"Booked",     price:3800, shootHrs:9,
     postHrs:0,  travelMi:26, second:true, secondHrs:8, revisions:0, lic:"none",  retainer:1200, paid:1200},
    {id:"j2", client:"c2", type:"product",    date:onDate(-12), stage:"Delivered",  price:1450, shootHrs:5,
     postHrs:11, travelMi:8,  second:false,secondHrs:0, revisions:3, lic:"web",   retainer:500,  paid:1450},
    {id:"j3", client:"c3", type:"family",     date:onDate(-5),  stage:"In post",    price:395,  shootHrs:1.5,
     postHrs:3.5,travelMi:14, second:false,secondHrs:0, revisions:0, lic:"none",  retainer:0,    paid:395},
    {id:"j4", client:"c4", type:"headshot",   date:onDate(-19), stage:"Closed",     price:1210, shootHrs:4,
     postHrs:5,  travelMi:11, second:false,secondHrs:0, revisions:1, lic:"web",   retainer:0,    paid:1210},
    {id:"j5", client:"c5", type:"wedding",    date:onDate(-33), stage:"Delivered",  price:3500, shootHrs:10,
     postHrs:31, travelMi:64, second:true, secondHrs:9, revisions:2, lic:"none",  retainer:1000, paid:3500},
    {id:"j6", client:"c6", type:"realestate", date:onDate(-3),  stage:"Delivered",  price:275,  shootHrs:1.5,
     postHrs:1.2,travelMi:22, second:false,secondHrs:0, revisions:0, lic:"web",   retainer:0,    paid:0},
    {id:"j7", client:"c7", type:"newborn",    date:onDate(-26), stage:"Closed",     price:550,  shootHrs:2.5,
     postHrs:6,  travelMi:6,  second:false,secondHrs:0, revisions:1, lic:"none",  retainer:200,  paid:550},
    {id:"j8", client:"c8", type:"brandvid",   date:onDate(-40), stage:"Delivered",  price:2800, shootHrs:7,
     postHrs:44, travelMi:118,second:true, secondHrs:7, revisions:5, lic:"webpaid",retainer:900, paid:2800},
    {id:"j9", client:"c9", type:"elopement",  date:onDate(21),  stage:"Retainer due",price:1650,shootHrs:4,
     postHrs:0,  travelMi:92, second:false,secondHrs:0, revisions:0, lic:"none",  retainer:500,  paid:0},
    {id:"j10",client:"c10",type:"headshot",   date:onDate(9),   stage:"Quoted",     price:0,    shootHrs:3,
     postHrs:0,  travelMi:9,  second:false,secondHrs:0, revisions:0, lic:"web",   retainer:0,    paid:0},
    {id:"j11",client:"c2", type:"socialpack", date:onDate(-58), stage:"Closed",     price:850,  shootHrs:3,
     postHrs:14, travelMi:8,  second:false,secondHrs:0, revisions:2, lic:"none",  retainer:0,    paid:850},
    {id:"j12",client:"c6", type:"realestate", date:onDate(-10), stage:"Delivered",  price:275,  shootHrs:1.5,
     postHrs:1.1,travelMi:19, second:false,secondHrs:0, revisions:0, lic:"web",   retainer:0,    paid:0},
    {id:"j13",client:"c1", type:"weddingvid", date:onDate(48),  stage:"Booked",     price:2900, shootHrs:9,
     postHrs:0,  travelMi:26, second:false,secondHrs:0, revisions:0, lic:"none",  retainer:800,  paid:800}
  ];

  /* Galleries cost money to hold. Nobody prices that, and old galleries sit
     there forever earning nothing. */
  SEED.galleries = [
    {id:"g1", job:"j5", delivered:onDate(-26), expires:onDate(339), gb:82, downloads:41, selects:0},
    {id:"g2", job:"j2", delivered:onDate(-9),  expires:onDate(356), gb:14, downloads:6,  selects:12},
    {id:"g3", job:"j8", delivered:onDate(-31), expires:onDate(334), gb:310,downloads:9,  selects:0},
    {id:"g4", job:"j4", delivered:onDate(-16), expires:onDate(-2),  gb:9,  downloads:11, selects:33},
    {id:"g5", job:"j7", delivered:onDate(-22), expires:onDate(18),  gb:11, downloads:8,  selects:0},
    {id:"g6", job:"j11",delivered:onDate(-52), expires:onDate(-14), gb:26, downloads:4,  selects:0},
    {id:"g7", job:"j6", delivered:onDate(-2),  expires:onDate(363), gb:6,  downloads:2,  selects:0}
  ];
  SEED.documents=[]; SEED.approvals=[]; SEED.bus=[];

  function fresh(){
    return { v:1, sample:true, tier:"studio", adds:[], offs:[],
      studio:clone(SEED.studio), clients:clone(SEED.clients), jobs:clone(SEED.jobs),
      galleries:clone(SEED.galleries), documents:[], approvals:[], bus:[] };
  }
  function emptyBook(){ var d=fresh(); d.sample=false;
    d.clients=[]; d.jobs=[]; d.galleries=[]; d.documents=[]; d.approvals=[]; d.bus=[]; return d; }
  function goLive(){ var d=emptyBook(); write(d); return d; }
  function isSample(){ return db().sample!==false; }
  function db(){ var d=read(); if(!d){ d=fresh(); write(d); return d; } return d; }
  function save(mut){ var d=db(); mut(d); write(d); return d; }

  function clientById(id){ return db().clients.filter(function(c){return c.id===id;})[0]||null; }
  function jobById(id){ return db().jobs.filter(function(j){return j.id===id;})[0]||null; }
  function galleryById(id){ return db().galleries.filter(function(g){return g.id===id;})[0]||null; }
  function clientName(id){ var c=clientById(id); return c?c.name:"—"; }
  function daysUntil(s){ if(!s) return null; return Math.round((dISO(s).getTime()-TODAY.getTime())/86400000); }
  function dayLabel(s){ var d=dISO(s);
    return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]+" "+(d.getMonth()+1)+"/"+d.getDate(); }

  /* ================= THE TRUE HOURLY — the whole point of the product ========
     Every hour the job actually consumed, not just the ones with a camera in
     hand. Shoot + travel + post + revisions + the admin nobody logs.
     ======================================================================== */
  var ADMIN_HRS_PER_JOB = 1.4;      // enquiry, emails, invoicing, scheduling
  var TRAVEL_MPH = 40;

  function projectedPost(j){ var t=jobType(j.type); return +(j.shootHrs*t.postPerHr).toFixed(1); }
  function postHours(j){
    // before the shoot there is no actual post yet — show the honest projection
    return (j.postHrs && j.postHrs>0) ? j.postHrs : projectedPost(j);
  }
  function extraRevisions(j){ return Math.max(0, (j.revisions||0) - RATES.revisionsIncluded); }
  function revisionHours(j){ return +(extraRevisions(j)*RATES.revisionHours).toFixed(1); }
  function travelHours(j){ return +(((j.travelMi||0)*2)/TRAVEL_MPH).toFixed(1); }
  function totalHours(j){
    return +((j.shootHrs||0) + postHours(j) + travelHours(j) + revisionHours(j) + ADMIN_HRS_PER_JOB).toFixed(1);
  }
  /* Costs a solo forgets: the second shooter, the mileage, the album at trade
     cost, and the storage they will pay every month for a year. */
  function jobCosts(j){
    var second = j.second ? (j.secondHrs||0)*COSTS.secondShooter : 0;
    var mileage= (j.travelMi||0)*2*COSTS.mileage;
    var g = db().galleries.filter(function(x){return x.job===j.id;})[0];
    var storage = g ? +((g.gb/1024)*COSTS.storagePerTB*RATES.galleryMonths).toFixed(2) : 0;
    return { second:second, mileage:mileage, storage:storage,
             total:+(second+mileage+storage).toFixed(2) };
  }
  function netToOwner(j){ return +( (j.price||0) - jobCosts(j).total ).toFixed(2); }
  /* A job with no price yet has no hourly rate — returning a negative number
     makes unquoted work look like a loss. null means "not priced yet". */
  function trueHourly(j){
    if(!j || !(j.price>0)) return null;
    var h=totalHours(j); return h>0 ? +(netToOwner(j)/h).toFixed(2) : null; }
  function quotedHourly(j){ return (j.shootHrs>0) ? +(((j.price||0)/j.shootHrs)).toFixed(2) : 0; }
  function underwater(j){ var t=trueHourly(j); return t!=null && t < RATES.targetHourly; }

  function jobIssues(j){
    var out=[], t=jobType(j.type);
    var th=trueHourly(j);
    if(th!=null && th < RATES.targetHourly)
      out.push("True hourly is "+money2(th)+" against a target of "+money2(RATES.targetHourly)+
               " — the quote reads like "+money2(quotedHourly(j))+" an hour because it only counts the shoot.");
    if(extraRevisions(j)>0)
      out.push(extraRevisions(j)+" revision round"+(extraRevisions(j)>1?"s":"")+" beyond the "+RATES.revisionsIncluded+
               " in the contract — "+revisionHours(j)+" unbilled hours.");
    if(t.licensed && j.lic==="none")
      out.push("Commercial work with no usage licence recorded. They are using these images for business and paying a personal-use price.");
    if(j.stage!=="Enquiry" && j.stage!=="Quoted" && j.stage!=="Lost" && (j.retainer||0)>0 && (j.paid||0)<(j.retainer||0))
      out.push("Retainer of "+money(j.retainer)+" has not been collected and the date is being held anyway.");
    if((j.stage==="Delivered") && (j.paid||0) < (j.price||0))
      out.push("Delivered with "+money((j.price||0)-(j.paid||0))+" still outstanding — the work is gone and the money is not in.");
    return out;
  }

  /* Licensing. The multiplier is applied to the base, so a solo can SEE what the
     permission is worth instead of guessing. */
  function licensedPrice(typeKey, licKey){
    var t=jobType(typeKey), l=licenceBy(licKey);
    return Math.round(t.base*l.mult);
  }
  /* The gap has to be measured against what the USE is worth, not against the
     licence on file. Comparing a commercial job to the personal-use rate returns
     zero and quietly confirms the exact mistake this is here to catch. */
  function licenceGap(j){
    var t=jobType(j.type); if(!t.licensed) return 0;
    var key = (j.lic==="none") ? "web" : j.lic;   // commercial use is at minimum web+social
    var should=licensedPrice(j.type, key);
    return Math.max(0, should-(j.price||0));
  }
  function unlicensedCommercial(){
    return db().jobs.filter(function(j){ return jobType(j.type).licensed && j.lic==="none" && j.stage!=="Lost"; });
  }

  /* Galleries: what is expiring, and what the shelf costs. */
  function galleryState(){
    return db().galleries.map(function(g){
      var j=jobById(g.job), d=daysUntil(g.expires);
      return {g:g, job:j, days:d,
              state: d<0 ? "expired" : d<=30 ? "expiring" : "live",
              cost: +((g.gb/1024)*COSTS.storagePerTB).toFixed(2)};
    }).sort(function(a,b){ return a.days-b.days; });
  }
  function galleryStorageMonthly(){ return +galleryState().reduce(function(a,x){ return a+x.cost; },0).toFixed(2); }
  /* Delivered galleries are only the visible part. The archive — raw files, working
     files, everything kept "just in case" — is the bill that actually recurs. */
  function storageCostMonthly(){ return +((db().studio.storageTB||0)*COSTS.storagePerTB).toFixed(2); }
  function deadStorage(){ return galleryState().filter(function(x){ return x.state==="expired"; }); }

  /* Pipeline + money */
  function byStage(s){ return db().jobs.filter(function(j){ return j.stage===s; }); }
  function pipelineValue(){ return db().jobs.filter(function(j){
    return ["Enquiry","Quoted","Retainer due"].indexOf(j.stage)>=0; })
    .reduce(function(a,j){ return a+(j.price|| jobType(j.type).base ); },0); }
  function booked(){ return db().jobs.filter(function(j){ return ["Booked","Shot","In post"].indexOf(j.stage)>=0; }); }
  function outstanding(){ return db().jobs.reduce(function(a,j){
    return a + Math.max(0,(j.paid!=null? (j.price||0)-(j.paid||0) : 0)); },0); }
  function collectedYTD(){ return db().jobs.reduce(function(a,j){ return a+(j.paid||0); },0); }
  function delivered(){ return db().jobs.filter(function(j){ return j.stage==="Delivered"||j.stage==="Closed"; }); }
  function avgTrueHourly(){
    var ds=delivered().filter(function(j){ return j.price>0; });
    if(!ds.length) return 0;
    return +(ds.reduce(function(a,j){ return a+(trueHourly(j)||0); },0)/ds.length).toFixed(2);
  }
  function hoursThisYear(){ return +db().jobs.reduce(function(a,j){ return a+totalHours(j); },0).toFixed(1); }
  function underwaterJobs(){ return delivered().filter(function(j){ return j.price>0 && underwater(j); }); }
  function moneyLeftOnTable(){
    return db().jobs.reduce(function(a,j){ return a+licenceGap(j); },0)
         + underwaterJobs().reduce(function(a,j){
             return a + Math.max(0,(RATES.targetHourly*totalHours(j)) - netToOwner(j)); },0);
  }

  function setStage(id,s){ return save(function(d){
    var j=d.jobs.filter(function(x){return x.id===id;})[0]; if(j) j.stage=s; }); }
  function logPost(id,hrs){ return save(function(d){
    var j=d.jobs.filter(function(x){return x.id===id;})[0]; if(j) j.postHrs=(j.postHrs||0)+(Number(hrs)||0); }); }
  function addRevision(id){ return save(function(d){
    var j=d.jobs.filter(function(x){return x.id===id;})[0]; if(j) j.revisions=(j.revisions||0)+1; }); }
  function takePayment(id,amt){ return save(function(d){
    var j=d.jobs.filter(function(x){return x.id===id;})[0]; if(j) j.paid=(j.paid||0)+(Number(amt)||0); }); }
  function setLicence(id,k){ return save(function(d){
    var j=d.jobs.filter(function(x){return x.id===id;})[0]; if(j) j.lic=k; }); }
  function retireGallery(id){ return save(function(d){
    d.galleries = d.galleries.filter(function(g){ return g.id!==id; }); }); }

  function kpis(){
    return {
      pipeline: pipelineValue(),
      booked: booked().length,
      collected: collectedYTD(),
      outstanding: outstanding(),
      trueHourly: avgTrueHourly(),
      target: RATES.targetHourly,
      hours: hoursThisYear(),
      underwater: underwaterJobs().length,
      leftOnTable: Math.round(moneyLeftOnTable()),
      unlicensed: unlicensedCommercial().length,
      storage: storageCostMonthly(), galleryStorage: galleryStorageMonthly(),
      dead: deadStorage().length,
      expiring: galleryState().filter(function(x){return x.state==="expiring";}).length
    };
  }

  /* --------------------------------------------------------- E-SIGN (native) --
     We built this ourselves; it is not a DocuSign reseller wrapper. */
  var ESIGN_CONSENT = "By selecting Adopt and Sign, I agree to do business electronically with {{STUDIO}}, "
    + "that my electronic signature is the legal equivalent of my handwritten signature, and that I have had "
    + "the opportunity to read this document in full. I may request a paper copy at no charge.";
  var DOC_TEMPLATES = [
    {id:"booking", name:"Booking contract + retainer", who:"Client",
     body:"{{STUDIO}} agrees to photograph the session described, on the date reserved. The retainer is non-refundable and reserves the date; the balance is due before delivery. Rescheduling is subject to availability."},
    {id:"model",   name:"Model release", who:"Subject",
     body:"I grant {{STUDIO}} the right to use my likeness in its portfolio, website and social media. This release does not transfer any copyright, which remains with {{STUDIO}}."},
    {id:"licence", name:"Commercial usage licence", who:"Client",
     body:"{{STUDIO}} grants a licence to use the delivered images for the media, territory and term stated. The licence is not a transfer of copyright, and use beyond the stated term or media requires a new licence."},
    {id:"secondshoot", name:"Second shooter agreement", who:"Second shooter",
     body:"All images captured on this engagement are works made for hire and the copyright vests in {{STUDIO}}. The second shooter may display images in a personal portfolio only, with credit, and may not licence them."},
    {id:"delivery", name:"Delivery + gallery terms", who:"Client",
     body:"The gallery remains available for the period stated. Please download and back up your files before it expires. {{STUDIO}} keeps archives as a courtesy, not as a guarantee."}
  ];
  function templateById(id){ return DOC_TEMPLATES.filter(function(t){return t.id===id;})[0]||null; }
  function fillTemplate(s,ctx){ return String(s||"").replace(/\{\{STUDIO\}\}/g, ctx.studio||"the studio"); }
  function newToken(){ var A="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",p=function(n){var s="";for(var i=0;i<n;i++)s+=A[Math.floor(Math.random()*A.length)];return s;};
    return p(4)+"-"+p(4)+"-"+p(4); }
  function createDoc(tplId,clientId){
    var t=templateById(tplId); if(!t) return null; var id="d"+Date.now();
    save(function(d){ d.documents.push({id:id,tpl:tplId,name:t.name,client:clientId||null,
      signer:clientName(clientId),token:newToken(),status:"Draft",created:Date.now(),
      trail:[{t:Date.now(),what:"Created"}]}); });
    return id; }
  function docById(id){ return db().documents.filter(function(d){return d.id===id;})[0]||null; }
  function docByToken(t){ return db().documents.filter(function(d){return d.token===t;})[0]||null; }
  function sendDoc(id){ return save(function(d){
    var x=d.documents.filter(function(y){return y.id===id;})[0];
    if(x&&x.status==="Draft"){ x.status="Sent"; x.trail.push({t:Date.now(),what:"Sent to signer"}); } }); }
  function openDoc(tok){ save(function(d){
    var x=d.documents.filter(function(y){return y.token===tok;})[0];
    if(x&&x.status==="Sent"){ x.status="Viewed"; x.trail.push({t:Date.now(),what:"Opened by signer"}); } });
    return docByToken(tok); }
  function signDoc(tok,sig,meta){ meta=meta||{};
    save(function(d){ var x=d.documents.filter(function(y){return y.token===tok;})[0];
      if(!x||x.status==="Signed") return;
      x.status="Signed"; x.sig=sig; x.signedAt=Date.now();
      x.trail.push({t:Date.now(),what:"Consent to electronic signature accepted"});
      x.trail.push({t:Date.now(),what:"Signed",by:x.signer,ua:meta.ua||""}); });
    return docByToken(tok); }
  function docsAwaiting(){ return db().documents.filter(function(d){ return d.status==="Sent"||d.status==="Viewed"; }); }

  /* ------------------------------------------------------- PRICE BOOK --
     The solo class. A photographer's whole current stack runs about $85/month,
     so the entry tier has to replace all of it and still be an easy yes. */
  var ROOMS = {
    jobs:    {name:"Jobs & pipeline",        mo:25, build:200},
    hourly:  {name:"True hourly",            mo:25, build:200},
    galleries:{name:"Galleries & delivery",  mo:29, build:240},
    contracts:{name:"Contracts & e-sign",    mo:19, build:160},
    money:   {name:"Money & retainers",      mo:25, build:200},
    licence: {name:"Usage licensing",        mo:29, build:240},
    cutlabs: {name:"Cutlabs video editor",   mo:39, build:300},
    prints:  {name:"Print & product sales",  mo:19, build:160},
    portal:  {name:"Client portal",          mo:19, build:160}
  };
  var TIERS = {
    starter:  {name:"Starter", mo:99, build:600,
      includes:["jobs","hourly","galleries","contracts","money","cutlabs","darkroom","proofs"],
      blurb:"One person. Enquiries, shoots, contracts, galleries, invoices — and real photo AND video software: the Darkroom, client proofing, and the Cutlabs editor. Replaces the whole stack you pay for now."},
    studio:   {name:"Studio", mo:199, build:1200,
      includes:["jobs","hourly","galleries","contracts","money","cutlabs","darkroom","proofs","licence","prints","portal"],
      blurb:"A second shooter, print sales, usage licensing and a branded client portal. Photo and video software in this tier too — every tier."},
    signature:{name:"Signature", mo:329, build:2000,
      includes:["jobs","hourly","galleries","contracts","money","cutlabs","darkroom","proofs","licence","prints","portal"],
      blurb:"Commercial work — larger storage, your own domain, a dedicated environment and priority support."}
  };
  function tier(){ return db().tier||"studio"; }
  function setTier(k){ return save(function(d){ d.tier=k; d.adds=[]; d.offs=[]; }); }
  function activeRooms(){ var d=db(), t=TIERS[d.tier]||TIERS.studio, set=t.includes.slice();
    (d.adds||[]).forEach(function(k){ if(set.indexOf(k)<0) set.push(k); });
    (d.offs||[]).forEach(function(k){ var i=set.indexOf(k); if(i>=0) set.splice(i,1); });
    return set; }
  function hasRoom(k){ return activeRooms().indexOf(k)>=0; }
  function toggleRoom(k){ return save(function(d){
    var t=TIERS[d.tier]||TIERS.studio, inTier=t.includes.indexOf(k)>=0;
    d.adds=d.adds||[]; d.offs=d.offs||[];
    if(inTier){ var i=d.offs.indexOf(k); if(i>=0) d.offs.splice(i,1); else d.offs.push(k); }
    else { var j=d.adds.indexOf(k); if(j>=0) d.adds.splice(j,1); else d.adds.push(k); } }); }
  function priceNow(){ var d=db(), t=TIERS[d.tier]||TIERS.studio, mo=t.mo, build=t.build;
    (d.adds||[]).forEach(function(k){ if(ROOMS[k]){ mo+=ROOMS[k].mo; build+=ROOMS[k].build; } });
    (d.offs||[]).forEach(function(k){ if(ROOMS[k]){ mo-=ROOMS[k].mo; build-=ROOMS[k].build; } });
    return {mo:Math.max(0,mo), build:Math.max(0,build)}; }
  function priceLabel(){ var p=priceNow(); return money(p.mo)+"/mo · "+money(p.build)+" setup"; }
  /* The customer picks how to pay. Same total either way — that is the honest
     version of a choice, and it is worth saying out loud. */
  function payPaths(){
    var p=priceNow();
    return { a:{setup:p.build, mo:p.mo},
             b:{setup:0, yr1:Math.round(p.mo + p.build/12), after:p.mo, minMonths:12},
             twoYearA: p.build + p.mo*24,
             twoYearB: Math.round(p.mo + p.build/12)*12 + p.mo*12 };
  }

  var SYSTEMS = [
    {what:"Jobs, true hourly, galleries, licensing, contracts, e-sign, video editing", how:"Native to Moments OS", native:true},
    {what:"Card and ACH payments", how:"Licensed payment processor (vendor)", native:false},
    {what:"Print fulfilment and shipping", how:"Print lab (vendor)", native:false},
    {what:"Bulk file storage beyond your tier", how:"Object storage (vendor, passed through at cost)", native:false},
    {what:"Email and SMS delivery", how:"Messaging provider (vendor)", native:false}
  ];

  /* --------------------------------------------------------- RENDERING -- */
  function el(h){ var t=document.createElement("template"); t.innerHTML=String(h).trim(); return t.content.firstChild; }
  function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function money(n){ return "$"+(Math.round(Number(n)||0)).toLocaleString(); }
  function money2(n){ return "$"+(Number(n)||0).toFixed(2); }
  function pct(n,dp){ return (Number(n)||0).toFixed(dp===undefined?0:dp)+"%"; }
  function hrs(n){ return (Number(n)||0).toFixed(1)+"h"; }

  var MARK_URL="https://www.aexperiences.com/Moments_OS.png";
  function brandMark(){
    return '<img src="'+MARK_URL+'" alt="Moments OS" onerror="this.remove()">';
  }

  var NAV=[
    {g:"COMMAND", items:[
      {h:"dashboard.html", l:"Command Center", i:"◎"},
      {h:"calendar.html",  l:"Calendar",       i:"▤"},
      {h:"contacts.html",  l:"Contacts",       i:"☎"},
      {h:"connect.html",   l:"Connect · Video",i:"◉"},
      {h:"records.html",   l:"Records · Filing",i:"▤"},
      {h:"approvals.html", l:"Approval Desk",  i:"✓"}]},
    {g:"THE WORK", items:[
      {h:"jobs.html",      l:"Jobs & Pipeline",i:"✦", room:"jobs"},
      {h:"hourly.html",    l:"True Hourly",    i:"◭", room:"hourly"},
      {h:"galleries.html", l:"Galleries",      i:"▦", room:"galleries"},
      {h:"cutlabs.html",   l:"Cutlabs Editor", i:"▶", room:"cutlabs"},
      {h:"darkroom.html", l:"Darkroom · Photo", i:"◐", room:"darkroom"},
      {h:"proofs.html",   l:"Proofing · Selects", i:"❤", room:"proofs"}]},
    {g:"PAPER & MONEY", items:[
      {h:"licence.html",   l:"Usage Licensing",i:"⛉", room:"licence"},
      {h:"money.html",     l:"Money & Retainers",i:"◧", room:"money"},
      {h:"sign.html",      l:"Contracts · e-Sign",i:"✍", room:"contracts"},
      {h:"portal.html",    l:"Client Portal",  i:"☗", room:"portal"}]},
    {g:"THE STUDIO", items:[
      {h:"org.html",       l:"Agent Org · Bus",i:"❖"}]}
  ];
  /* The chassis stylesheet targets .sidebar / .nav-group / .navlink .ic / .navlink .lb
     and .navlink.active. This used to emit .rail / .navgroup / .on, so the sidebar
     never got its dark background and cream nav text meant for a dark rail sat on
     white — unreadable. Markup now matches the CSS exactly. */
  function renderShell(active){
    var side=document.createElement("aside"); side.className="sidebar";
    side.appendChild(el('<a href="dashboard.html" class="brand">'+
      '<div class="bmark" aria-hidden="true">'+brandMark()+'</div>'+
      '<div><div class="bt">Moments OS</div><div class="bs">Photo &amp; Video OS</div></div></a>'));
    var nav=document.createElement("nav"); nav.className="nav";
    NAV.forEach(function(g){
      var items=g.items.filter(function(it){ return !it.room || hasRoom(it.room); });
      if(!items.length) return;
      nav.appendChild(el('<div class="nav-group">'+esc(g.g)+'</div>'));
      items.forEach(function(it){
        nav.appendChild(el('<a href="'+it.h+'" class="navlink'+(it.h===active?" active":"")+'">'+
          '<span class="ic">'+it.i+'</span><span class="lb">'+esc(it.l)+'</span></a>'));
      });
    });
    side.appendChild(nav);
    return side;
  }
  var MOBILE_NAV=[{h:"dashboard.html",l:"Home",i:"◎"},{h:"jobs.html",l:"Jobs",i:"✦"},
    {h:"hourly.html",l:"Hourly",i:"◭"},{h:"galleries.html",l:"Galleries",i:"▦"},{h:"index.html",l:"More",i:"≡"}];
  function renderMobileBar(active){
    return el('<nav class="mobilebar">'+MOBILE_NAV.map(function(n){
      return '<a class="'+(n.h===active?"on":"")+'" href="'+n.h+'"><i>'+n.i+'</i>'+esc(n.l)+'</a>'; }).join("")+'</nav>');
  }
  /* The tier pill was static — there was nothing to click, so the showroom could not
     be re-priced. It is now a real menu: switch package, or add and remove any single
     room, with the price recomputing as you go. */
  function renderTopbar(crumb){
    var pr=priceNow(), t=TIERS[tier()]||TIERS[Object.keys(TIERS)[0]];
    var d=db(), adds=(d.adds||[]), offs=(d.offs||[]);
    var changed=adds.length||offs.length;
    var bar=document.createElement("div"); bar.className="topbar";
    bar.innerHTML='<div class="crumbs">'+esc(crumb||"")+'</div><div class="spacer"></div>'+
      '<div class="tierpill" id="tierPill" role="button" tabindex="0" aria-haspopup="true" aria-expanded="false">'+
        '<span class="dot"></span><div><b>'+esc(t.name)+(changed?' <i class="cfg">configured</i>':'')+'</b> '+
        '<span class="price">'+money(pr.mo)+'/mo · '+money(pr.build)+' setup</span></div><span class="chev">▾</span></div>'+
      '<div class="who"><div class="av">'+esc("RO")+'</div><div>'+esc("Rosalind Wren")+'<br>'+
        '<span class="muted small">'+esc("Owner · Photographer")+'</span></div></div>';

    var menu=document.createElement("div"); menu.className="tiermenu"; menu.id="tierMenu";
    menu.appendChild(el('<div class="tm-head">Start from a package, then <b>add or take off any single room</b>. Each one is priced on its own, so the build fits the business instead of the business fitting the build.</div>'));
    Object.keys(TIERS).forEach(function(k){
      var tt=TIERS[k];
      var opt=el('<div class="tieropt '+(k===tier()?"on":"")+'">'+
        '<div class="to-top"><span class="to-name">'+esc(tt.name)+'</span>'+
        '<span class="to-price">'+money(tt.mo)+'/mo · '+money(tt.build)+' setup</span></div>'+
        '<div class="to-desc">'+esc(tt.blurb)+'</div>'+
        '<div class="to-base">'+tt.includes.length+' rooms included</div></div>');
      opt.addEventListener("click", function(e){ e.stopPropagation(); setTier(k); location.reload(); });
      menu.appendChild(opt);
    });
    menu.appendChild(el('<div class="tm-sub">Rooms — toggle any one on or off</div>'));
    var on=activeRooms(), list=document.createElement("div"); list.className="roomlist";
    Object.keys(ROOMS).forEach(function(k){
      var r=ROOMS[k], isOn=on.indexOf(k)>=0, inPack=t.includes.indexOf(k)>=0;
      var row=el('<div class="roomrow '+(isOn?"on":"")+'"><span class="rr-box">'+(isOn?"✓":"+")+'</span>'+
        '<span class="rr-name">'+esc(r.name)+(isOn&&!inPack?' <i class="rr-flag add">added</i>':'')+
        (!isOn&&inPack?' <i class="rr-flag off">removed</i>':'')+'</span>'+
        '<span class="rr-price">'+money(r.mo)+'/mo<i>'+money(r.build)+' setup</i></span></div>');
      row.addEventListener("click", function(e){ e.stopPropagation(); toggleRoom(k);
        toast(r.name+(activeRooms().indexOf(k)>=0?" added — ":" removed — ")+priceLabel());
        setTimeout(function(){ location.reload(); },550); });
      list.appendChild(row);
    });
    menu.appendChild(list);
    menu.appendChild(el('<div class="tm-total"><div class="tt-line"><span>'+esc(t.name)+' package</span>'+
      '<b>'+money(t.mo)+'/mo</b></div>'+
      (adds.length?'<div class="tt-line add"><span>+ '+adds.length+' room'+(adds.length>1?'s':'')+' added</span><b>+'+money(pr.mo-t.mo>0?pr.mo-t.mo:0)+'/mo</b></div>':'')+
      (offs.length?'<div class="tt-line off"><span>− '+offs.length+' room'+(offs.length>1?'s':'')+' removed</span><b>−'+money(t.mo-pr.mo>0?t.mo-pr.mo:0)+'/mo</b></div>':'')+
      '<div class="tt-line grand"><span>Your build</span><b>'+money(pr.mo)+'/mo · '+money(pr.build)+' setup</b></div></div>'));
    bar.appendChild(menu);

    var pill=bar.querySelector("#tierPill");
    function close(){ menu.classList.remove("open"); pill.setAttribute("aria-expanded","false"); }
    pill.addEventListener("click", function(e){
      e.stopPropagation();
      var open=menu.classList.toggle("open");
      pill.setAttribute("aria-expanded", String(open));
    });
    pill.addEventListener("keydown", function(e){ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); pill.click(); } });
    menu.addEventListener("click", function(e){ e.stopPropagation(); });
    document.addEventListener("click", close);
    document.addEventListener("keydown", function(e){ if(e.key==="Escape") close(); });
    return bar;
  }
  function ribbon(){
    if(!isSample()) return null;
    return el('<div class="ribbon"><span class="live">LIVE SHOWROOM</span>'+
      ' this is the real operating system, not a slideshow. Type anywhere; it saves in your browser. '+
      'The studio, clients and jobs below are a realistic sample book. '+
      '<button class="linkbtn" id="goLiveBtn">Start with a clean slate</button></div>');
  }
  function footer(){ return el('<div class="ae-credit">Powered by <b>Accelerated Experiences LLC</b> · Moments OS is a '+
    'white-label product — your studio name and colours replace ours.</div>'); }
  function toast(m){ var w=document.getElementById("toast-wrap"); if(!w) return;
    var t=el('<div class="toast">'+esc(m)+'</div>'); w.appendChild(t);
    setTimeout(function(){ t.classList.add("out"); setTimeout(function(){ t.remove(); },400); },2600); }
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
    o=o||{}; db(); loadFlava();
    document.body.innerHTML='<div class="app" id="appRoot"><div class="main">'+
      '<div class="topwrap"></div><div class="ribwrap"></div><div class="content" id="content"></div>'+
      '<div class="footwrap"></div></div></div><div id="toast-wrap"></div><div class="mobwrap"></div>';
    var appRoot=document.getElementById("appRoot");
    appRoot.insertBefore(renderShell(o.active), appRoot.firstChild);
    document.body.querySelector(".topwrap").appendChild(renderTopbar(o.crumb));
    var r=ribbon(); if(r) document.body.querySelector(".ribwrap").appendChild(r);
    document.body.querySelector(".footwrap").appendChild(footer());
    document.body.querySelector(".mobwrap").appendChild(renderMobileBar(o.active));
    var g=document.getElementById("goLiveBtn");
    if(g) g.addEventListener("click",function(){ goLive(); toast("Cleared. This is your studio now."); setTimeout(function(){location.reload();},700); });
    if(typeof o.render==="function") o.render(document.getElementById("content"));
    return document.getElementById("content");
  }
  function page(t,s){ return el('<div class="pagehead"><div><h1>'+esc(t)+'</h1>'+
    (s?'<p class="lede">'+esc(s)+'</p>':'')+'</div></div>'); }
  function card(i,c){ return el('<section class="card '+(c||"")+'">'+i+'</section>'); }
  function stat(l,v,n,b){ return '<div class="stat '+(b||"")+'"><div class="s-l">'+esc(l)+'</div>'+
    '<div class="s-v">'+v+'</div>'+(n?'<div class="s-n">'+n+'</div>':'')+'</div>'; }
  function tag(t,k){ return '<span class="tag '+(k||"")+'">'+esc(t)+'</span>'; }
  function bar(p,c){ var w=Math.max(0,Math.min(100,p)); return '<div class="barwrap"><div class="bar '+(c||"")+'" style="width:'+w+'%"></div></div>'; }
  function srcNote(t){ return '<div class="srcnote">'+esc(t)+'</div>'; }

  var MANUAL = [
    {t:"The number this whole product exists for", k:"hourly true rate money",
     b:"You quoted a wedding at $3,500 against eight hours and it felt like $437 an hour. Then you culled for four hours, edited for twenty, drove for three, answered emails for two and redid the album because they asked twice. The shoot was eight hours. The job was thirty-seven. Your real rate was $94, before you paid the second shooter. Moments OS computes that on every job, before and after."},
    {t:"Why projected post hours appear before you have done any", k:"post projection estimate",
     b:"Each job type carries an honest multiplier — how many desk hours each shooting hour tends to create. Until you log real hours, the job shows the projection, so a quote can be sanity-checked before you send it rather than regretted after. Those multipliers are our judgement from the trade, not research, and they are labelled that way."},
    {t:"A commercial client is buying permission, not photographs", k:"licence licensing usage commercial rights",
     b:"They are not paying for files, they are paying for the right to use them — for a term, a territory and a set of media. A solo who charges a day rate and hands over unlimited rights has given away the most valuable part of the deal and will never see it on an invoice. Usage Licensing prices the permission separately and tells you when a term is running out, because that is renewal money."},
    {t:"Revision rounds are where the profit quietly goes", k:"revisions scope creep edits",
     b:"Your contract includes two. The third is an hour and a half you will not bill and will not remember. Moments OS counts them and puts the unbilled hours on the job, so the next contract can say something different."},
    {t:"Galleries cost money to keep", k:"gallery storage expiry delivery",
     b:"Every delivered gallery is storage you pay for every month whether anyone opens it or not. Galleries shows what the shelf costs, what is expiring, and which galleries are dead weight — a job from two years ago that nobody has downloaded since is a bill you are paying for nothing."},
    {t:"Costs a solo forgets", k:"costs second shooter mileage storage",
     b:"The second shooter, the mileage both ways, the album at trade cost, and twelve months of storage. None of them feel like costs on the day. All of them come out of the number you thought you earned."},
    {t:"The video editor is included, not an upsell", k:"cutlabs video editing",
     b:"Cutlabs is a real editor we built — timeline, trim, captions, zoom punches, freeze frames, slow motion, sound effects and export. It is in every tier including Starter. No other business tool for photographers ships an editor, which is precisely why it is here."},
    {t:"e-Sign is ours", k:"esign signature contract docusign",
     b:"We built the signing layer ourselves — consent, intent, attribution to a named person, and a trail that freezes when it is signed. It is not a reseller wrapper around somebody else's product, so it is not a separate subscription."},
    {t:"You license the software; you own your work", k:"ownership own licence data export",
     b:"The software is licensed, the way you license every other tool you run on. Your photographs, your galleries, your clients, your contracts and your brand are yours outright — exportable any time, including the day you leave. If you cancel, the software stops and your data exports for ninety days."},
    {t:"What Moments OS does NOT do", k:"limits vendor not native",
     b:"It does not process card payments, it does not print or ship your products, it does not host unlimited files for free, and it does not send your email. Those are named vendor connections. Anything claiming all of that natively is telling you something untrue."},
    {t:"Everything is stored in your browser here", k:"storage privacy showroom",
     b:"This showroom keeps everything in your own browser. Nothing you type is sent anywhere. 'Start with a clean slate' empties the sample book and does not come back."},
    {t:"There are no industry benchmarks on this screen", k:"benchmark comparison average",
     b:"There is no reliable public data on solo photography margins — the published figures come from vendor surveys with tiny samples. Rather than compare you to an invented average, this measures your own numbers against your own target rate."}
  ];
  function manual(){ return MANUAL; }
  function askManual(q){
    q=String(q||"").toLowerCase().trim(); if(!q) return [];
    var SYN={rate:"hourly",money:"money",price:"pricing",charge:"pricing",worth:"hourly",
      edit:"revisions",edits:"revisions",revision:"revisions",
      rights:"licence",license:"licence",licence:"licence",commercial:"licence",usage:"licence",
      video:"cutlabs",editor:"cutlabs",editing:"cutlabs",darkroom:"darkroom",retouch:"darkroom",proofing:"proofs",proofs:"proofs",selects:"proofs",
      photos:"gallery",images:"gallery",delivery:"gallery",storage:"storage",
      contract:"esign",sign:"esign",signature:"esign",own:"ownership",owns:"ownership"};
    var words=q.split(/[^a-z0-9]+/).filter(Boolean).map(function(w){ return SYN[w]||w; });
    return MANUAL.map(function(a){
      var hay=(a.t+" "+a.k+" "+a.b).toLowerCase(), sc=0;
      words.forEach(function(w){ if(!w) return;
        if(a.k.toLowerCase().indexOf(w)>=0) sc+=3;
        if(a.t.toLowerCase().indexOf(w)>=0) sc+=2; else if(hay.indexOf(w)>=0) sc+=1; });
      return {a:a,sc:sc};
    }).filter(function(r){return r.sc>0;}).sort(function(x,y){return y.sc-x.sc;})
      .slice(0,4).map(function(r){return r.a;});
  }

  var SEATS=[{dept:"Enquiries",head:"Wren",aes:["Leads","Quotes","Follow-up"]},
             {dept:"Production",head:"Cass",aes:["Scheduling","Shot lists","Second shooters"]},
             {dept:"Post",head:"Iver",aes:["Culling","Editing","Delivery"]},
             {dept:"Money",head:"Nell",aes:["Retainers","Invoicing","Licensing"]}];
  var BRAIN={name:"Aperture",role:"COO — the single point of contact",
    line:"One decision at a time, not four opinions."};
  function bus(){ return db().bus||[]; }
  function approvals(){ return db().approvals||[]; }

  global.Moments = {
    db:db, save:save, goLive:goLive, isSample:isSample, TODAY:TODAY, iso:iso, addDays:addDays,
    dISO:dISO, daysUntil:daysUntil, dayLabel:dayLabel,
    JOB_TYPES:JOB_TYPES, jobType:jobType, STAGES:STAGES, LICENSE_TERMS:LICENSE_TERMS, licenceBy:licenceBy,
    COSTS:COSTS, RATES:RATES, REPLACES:REPLACES, SYSTEMS:SYSTEMS, BENCH:BENCH,
    clientById:clientById, clientName:clientName, jobById:jobById, galleryById:galleryById,
    projectedPost:projectedPost, postHours:postHours, travelHours:travelHours,
    revisionHours:revisionHours, extraRevisions:extraRevisions, totalHours:totalHours,
    jobCosts:jobCosts, netToOwner:netToOwner, trueHourly:trueHourly, quotedHourly:quotedHourly,
    underwater:underwater, jobIssues:jobIssues,
    licensedPrice:licensedPrice, licenceGap:licenceGap, unlicensedCommercial:unlicensedCommercial,
    galleryState:galleryState, storageCostMonthly:storageCostMonthly, galleryStorageMonthly:galleryStorageMonthly, deadStorage:deadStorage,
    byStage:byStage, pipelineValue:pipelineValue, booked:booked, outstanding:outstanding,
    collectedYTD:collectedYTD, delivered:delivered, avgTrueHourly:avgTrueHourly,
    hoursThisYear:hoursThisYear, underwaterJobs:underwaterJobs, moneyLeftOnTable:moneyLeftOnTable,
    setStage:setStage, logPost:logPost, addRevision:addRevision, takePayment:takePayment,
    setLicence:setLicence, retireGallery:retireGallery,
    DOC_TEMPLATES:DOC_TEMPLATES, ESIGN_CONSENT:ESIGN_CONSENT, templateById:templateById,
    fillTemplate:fillTemplate, createDoc:createDoc, docById:docById, docByToken:docByToken,
    sendDoc:sendDoc, openDoc:openDoc, signDoc:signDoc, docsAwaiting:docsAwaiting,
    ROOMS:ROOMS, TIERS:TIERS, tier:tier, setTier:setTier, activeRooms:activeRooms, hasRoom:hasRoom,
    toggleRoom:toggleRoom, priceNow:priceNow, priceLabel:priceLabel, payPaths:payPaths,
    kpis:kpis, manual:manual, askManual:askManual, SEATS:SEATS, BRAIN:BRAIN, bus:bus, approvals:approvals,
    mount:mount, page:page, card:card, stat:stat, tag:tag, bar:bar, srcNote:srcNote,
    el:el, esc:esc, money:money, money2:money2, pct:pct, hrs:hrs, toast:toast, brandMark:brandMark
  };
})(this);




/* ---- ae-charts: the visual command center (auto-discovers the engine) ---- */
(function(){
  if (typeof document==='undefined') return;
  if (!/dashboard/.test(location.pathname)) return;
  var NAMES=['Moments','Smiley','FB','Fourbarrel','Amph','EightMM','Truss','Abode','LilNinja','Buttress','Musical','MusicalCore','Showroom'];
  function eng(){ for(var i=0;i<NAMES.length;i++){ var g=window[NAMES[i]]; if(g&&typeof g.db==='function') return g; } return null; }
  function cvar(list,fb){ try{ var cs=getComputedStyle(document.documentElement);
    for(var i=0;i<list.length;i++){ var v=(cs.getPropertyValue(list[i])||'').trim(); if(v) return v; } }catch(e){} return fb; }
  var MONEYRE=/fee|price|amount|total|revenue|cost|value|gross|net|tuition|billed|budget|earned|paid|guarantee|sale|msrp|acq/i;
  var LABELRE=/^(name|title|project|show|production|unit|family|account|client|customer|patron|vehicle|item|label|company|program|artist|address|make)$/i;
  var CATRE=/^(phase|status|stage|type|category|kind|dept|department|state|tier|track|discipline|genre)$/i;
  var BAD=/^(id|key|uid|number|vin|stock)$/i;
  function pick(r,f){ return f.indexOf('.')>0 ? ((r[f.split('.')[0]]||{})[f.split('.')[1]]) : r[f]; }

  function discover(d){
    var best=null;
    Object.keys(d||{}).forEach(function(k){
      var a=d[k];
      if(!Array.isArray(a)||a.length<2||typeof a[0]!=='object'||!a[0]) return;
      var fields=[];
      Object.keys(a[0]).forEach(function(f){ var v=a[0][f];
        if(v&&typeof v==='object'&&!Array.isArray(v)){ Object.keys(v).forEach(function(s){ if(typeof v[s]==='number') fields.push(f+'.'+s); }); }
        else fields.push(f); });
      fields.forEach(function(f){
        var vals=a.map(function(r){ return Number(pick(r,f)); }).filter(function(n){ return isFinite(n); });
        if(vals.length<Math.max(2,Math.floor(a.length*0.6))) return;
        var sum=vals.reduce(function(x,y){return x+y;},0); if(!(sum>0)) return;
        var money=MONEYRE.test(f.split('.').pop())||MONEYRE.test(f);
        var score=sum*(money?1000:1);
        if(!best||score>best.score) best={coll:k,rows:a,field:f,sum:sum,money:money,score:score};
      });
    });
    if(!best) return null;
    var k0=Object.keys(best.rows[0]||{});
    best.label=k0.filter(function(f){ return LABELRE.test(f)&&typeof best.rows[0][f]==='string'; })[0]
            || k0.filter(function(f){ return !BAD.test(f)&&typeof best.rows[0][f]==='string'&&String(best.rows[0][f]).length>2; })[0]
            || k0.filter(function(f){ return typeof best.rows[0][f]==='string'; })[0] || null;
    best.cat=k0.filter(function(f){ if(!CATRE.test(f)) return false;
      var set={}; best.rows.forEach(function(r){ if(typeof r[f]==='string') set[r[f]]=1; });
      var n=Object.keys(set).length; return n>=2&&n<=6; })[0]||null;
    return best;
  }

  function build(){
    var E=eng(); if(!E) return;
    var content=document.getElementById('content'); if(!content) return;
    if(document.getElementById('aeChartCard')) return;
    var d; try{ d=E.db(); }catch(e){ return; }
    var S=discover(d); if(!S) return;

    var ACC =cvar(['--blue','--accent','--primary','--brand','--a-money','--a-projects','--teal'],'#4a7fa5');
    var ACC2=cvar(['--blue-2','--brand-2','--a-books','--a-field'],ACC);
    var HI  =cvar(['--amber','--gold','--amber-3','--brand-glow'],'#c9871f');
    var TRK =cvar(['--sunk','--line-2','--line'],'rgba(128,128,128,.18)');
    var INK =cvar(['--ink'],'#1b1f22'), MUT=cvar(['--mut','--ink-2'],'#7b8288');

    function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
    function fmt(n){ n=Number(n)||0;
      if(!S.money) return String(Math.round(n));
      if(n>=1000000) return '$'+(n/1000000).toFixed(2).replace(/\.?0+$/,'')+'M';
      if(n>=1000) return '$'+Math.round(n/1000)+'k';
      return '$'+Math.round(n); }
    function words(s){ s=String(s==null?'':s); return s.length>26?s.slice(0,25)+'…':s; }
    function title(s){ return String(s).replace(/[._-]/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}); }

    /* --- bars: top rows by value --- */
    /* A label field can legitimately hold a foreign key ("client":"c1") rather than a
       name, which renders a chart labelled c1, c5, c8 — useless. If the engine exposes
       its own lookup, resolve through it. */
    function human(v){
      if(typeof v!=='string' || !/^[a-z]{1,3}\d+$/.test(v)) return v;
      var fns=['clientName','ptName','memberName','artistName','name'];
      for(var i=0;i<fns.length;i++){
        if(typeof E[fns[i]]==='function'){ try{ var n=E[fns[i]](v); if(n && n!=='—') return n; }catch(e){} }
      }
      return v;
    }
    var rows=S.rows.slice().map(function(r){ return {l:S.label?human(r[S.label]):'—', v:Number(pick(r,S.field))||0}; })
                   .filter(function(r){ return r.v>0; })
                   .sort(function(a,b){ return b.v-a.v; }).slice(0,6);
    var max=Math.max.apply(null,rows.map(function(r){return r.v;}).concat([1]));
    var W=760,labW=190,valW=76,barW=W-labW-valW,rowH=32,H=rows.length*rowH+6,g1='';
    rows.forEach(function(r,i){
      var y=i*rowH+4, w=Math.max(2,(r.v/max)*barW);
      g1+='<text x="0" y="'+(y+15)+'" font-size="11.5" fill="'+MUT+'" font-family="system-ui,sans-serif">'+esc(words(r.l))+'</text>'
        +'<rect x="'+labW+'" y="'+(y+4)+'" width="'+barW+'" height="14" rx="4" fill="'+TRK+'"/>'
        +'<rect x="'+labW+'" y="'+(y+4)+'" width="'+w+'" height="14" rx="4" fill="'+(i===0?HI:ACC)+'"/>'
        +'<text x="'+W+'" y="'+(y+15)+'" text-anchor="end" font-size="11" font-weight="600" fill="'+INK+'" font-family="ui-monospace,Menlo,monospace">'+fmt(r.v)+'</text>';
    });

    /* --- donut by category --- */
    var g2='',leg='';
    if(S.cat){
      var by={},tot=0;
      S.rows.forEach(function(r){ var c=human(r[S.cat]); if(typeof c!=='string')return;
        var v=Number(pick(r,S.field))||0; if(!(v>0))return; by[c]=(by[c]||0)+v; tot+=v; });
      var keys=Object.keys(by).sort(function(a,b){return by[b]-by[a];});
      var PAL=[ACC,HI,ACC2,'#6a8f7a','#8a7fa8','#a8865f'];
      var R=52,CX=68,CY=68,C=2*Math.PI*R,off=0;
      keys.forEach(function(k,i){ var fr=tot?by[k]/tot:0; if(fr<=0)return;
        g2+='<circle cx="'+CX+'" cy="'+CY+'" r="'+R+'" fill="none" stroke="'+PAL[i%PAL.length]+'" stroke-width="19" stroke-dasharray="'+(fr*C)+' '+C+'" stroke-dashoffset="'+(-off*C)+'" transform="rotate(-90 '+CX+' '+CY+')"/>';
        leg+='<span style="display:inline-flex;align-items:center;gap:6px;margin:0 12px 7px 0;font-size:12px;color:'+MUT+'"><i style="width:10px;height:10px;border-radius:3px;background:'+PAL[i%PAL.length]+';display:inline-block"></i>'+esc(k)+' · '+fmt(by[k])+'</span>';
        off+=fr; });
      g2+='<text x="'+CX+'" y="'+(CY-1)+'" text-anchor="middle" font-size="14" font-weight="700" fill="'+INK+'" font-family="system-ui,sans-serif">'+fmt(tot)+'</text>'
        +'<text x="'+CX+'" y="'+(CY+13)+'" text-anchor="middle" font-size="8.5" fill="'+MUT+'" font-family="ui-monospace,Menlo,monospace">TOTAL</text>';
    }

    /* --- KPI bullets vs target bands (only if this engine publishes them) --- */
    var g3='';
    try{
      if(typeof E.kpis==='function'){
        var ks=E.kpis().filter(function(k){ return k.bench&&k.bench.target&&typeof k.value==='number'; }).slice(0,3);
        ks.forEach(function(k,i){
          var lo=k.bench.target[0],hi=k.bench.target[1],mx=Math.max(hi*1.35,k.value*1.1),bw=400,x0=132,y0=i*34+12;
          var vx=Math.min(bw,(k.value/mx)*bw),lx=(lo/mx)*bw,hx=(hi/mx)*bw,inb=k.value>=lo&&k.value<=hi;
          var val=(k.fmt==='pct')?Math.round(k.value)+'%':(k.fmt==='x')?k.value.toFixed(2)+'x':Math.round(k.value);
          g3+='<text x="0" y="'+(y0+11)+'" font-size="11.5" fill="'+MUT+'" font-family="system-ui,sans-serif">'+esc(k.label||k.k)+'</text>'
            +'<rect x="'+x0+'" y="'+y0+'" width="'+bw+'" height="13" rx="4" fill="'+TRK+'"/>'
            +'<rect x="'+(x0+lx)+'" y="'+y0+'" width="'+Math.max(2,hx-lx)+'" height="13" fill="none" stroke="'+ACC+'" stroke-dasharray="3 3"/>'
            +'<rect x="'+x0+'" y="'+(y0+3)+'" width="'+vx+'" height="7" rx="3" fill="'+(inb?ACC:HI)+'"/>'
            +'<text x="'+(x0+bw+8)+'" y="'+(y0+11)+'" font-size="11" font-weight="700" fill="'+(inb?ACC:HI)+'" font-family="ui-monospace,Menlo,monospace">'+val+'</text>';
        });
      }
    }catch(e){}

    var card=document.createElement('div');
    card.className='card'; card.id='aeChartCard';
    var heading=(S.money?'The money, drawn':'The numbers, drawn');
    card.innerHTML='<h2 style="margin:0 0 4px">'+heading+'</h2>'+
      '<div class="card-sub" style="margin-bottom:14px">Same figures as the tables below, as pictures — computed live from this system\'s own data, nothing hand-entered.</div>'+
      '<div style="border:1px solid '+TRK+';border-radius:12px;padding:14px 16px 10px;margin-bottom:14px">'+
        '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:'+MUT+';margin-bottom:8px">Top '+esc(title(S.coll))+' by '+esc(title(S.field.split('.').pop()))+'</div>'+
        '<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto;display:block">'+g1+'</svg></div>'+
      (g2?'<div style="display:grid;grid-template-columns:1fr 1.15fr;gap:14px">'+
        '<div style="border:1px solid '+TRK+';border-radius:12px;padding:14px 16px">'+
          '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:'+MUT+';margin-bottom:8px">By '+esc(title(S.cat))+'</div>'+
          '<div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap"><svg viewBox="0 0 136 136" style="max-width:136px;width:100%;height:auto">'+g2+'</svg>'+
          '<div style="flex:1;min-width:120px">'+leg+'</div></div></div>'+
        (g3?'<div style="border:1px solid '+TRK+';border-radius:12px;padding:14px 16px"><div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:'+MUT+';margin-bottom:8px">Health vs. target band</div><svg viewBox="0 0 560 '+(Math.max(1,Math.min(3,3))*34+14)+'" style="width:100%;height:auto">'+g3+'</svg></div>':'<div></div>')+
      '</div>':(g3?'<div style="border:1px solid '+TRK+';border-radius:12px;padding:14px 16px"><div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:'+MUT+';margin-bottom:8px">Health vs. target band</div><svg viewBox="0 0 560 116" style="width:100%;height:auto">'+g3+'</svg></div>':''));

    var first=content.querySelector('.card');
    if(first&&first.nextSibling) content.insertBefore(card,first.nextSibling);
    else content.appendChild(card);
  }
  function boot(){ build(); setTimeout(build,300); setTimeout(build,1200); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
