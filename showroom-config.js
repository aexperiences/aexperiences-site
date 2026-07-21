/* showroom-config.js — the per-trade swap for the AE showroom floor.
   ONE engine (showroom.html) + one config block per vertical. Adding a trade is an entry
   here, not a new build. This is the same one-engine/config-swap method the ESPO line runs on.

   HONESTY RULES for this file, because it is customer-facing and it names competitors:
   - Every competitor name and price in `stack` is real and sourced. If a number could not be
     verified it is not here. Prices move — each entry carries the date it was checked.
   - `pain` describes structural seams between tools, not insults about anyone's product.
   - Demo data is obviously plausible-but-fictional and labelled as such in the UI. No real
     client names, no real addresses, no invented testimonials.
   Accelerated Experiences, LLC
*/
(function (root) {

  /* Sourced Jul 20 2026:
     - NAR 2025 Technology Survey via keetechnology.com — 34% of agents spend $50–250/mo on
       tech, 24% spend over $500/mo.
     - SkySlope suite from ~$340/mo; Dotloop from $31.99/mo; Paperless Pipeline from ~$65/mo;
       DocJacket $29/user/mo; AFrame $54/user/mo (housingwire.com, listedkit.com, docjacket.com).
     - Multi-office brokerages report $1,000–$5,000/mo for transaction management alone.
     - ustechautomations.com: 83% of brokerages added tools in two years, only 28% say tech
       drives productivity; a 32-agent brokerage closing 280 deals/yr spends roughly 90 minutes
       per deal on manual coordination across four systems. */

  var TRADES = {

    realestate: {
      id:'realestate', hub:'Homestead Hub', trade:'Real estate',
      acc:'#c8794f', acc2:'#a85f38',
      firm:'Cedar & Pine Realty',            // fictional demo firm — clearly not a real client
      firmSub:'12 agents · Coeur d\'Alene, Idaho',
      who:'a 12-agent brokerage',
      priceId:'homestead',                   // matches the pricing record in the hub

      // What a brokerage this size genuinely pays for today.
      stack: [
        { tool:'CRM (Follow Up Boss / kvCORE class)', job:'Leads and contacts', cost:'$300–600/mo', note:'per-seat above a base' },
        { tool:'SkySlope or Dotloop',                  job:'Transaction files & compliance', cost:'$340/mo', note:'suite pricing; Dotloop starts $31.99/mo' },
        { tool:'DocuSign',                             job:'Signatures',        cost:'$40–120/mo', note:'per user' },
        { tool:'QuickBooks',                           job:'Commissions & books', cost:'$99/mo', note:'plus a bookkeeper' },
        { tool:'Mailchimp or Constant Contact',        job:'Marketing email',   cost:'$60–200/mo', note:'scales with list size' },
        { tool:'Google Workspace + Drive folders',     job:'Agent onboarding, everything else', cost:'$100/mo', note:'12 seats' }
      ],
      stackNote:'Six vendors, six logins, six renewal dates. None of them holds the whole deal.',

      // The seams. This is where the money actually leaks.
      pain: [
        { t:'The CRM stops at the handshake', d:'It knows the lead. The moment they go under contract the deal moves to a different system, and the CRM never hears the outcome. Your best source of "what actually closes" is blind.' },
        { t:'Somebody re-types everything', d:'Name, address, price, dates — keyed into the CRM, then the transaction platform, then the signature tool, then QuickBooks. Four times, by a person, per deal.' },
        { t:'Commissions live away from the deal', d:'Splits get reconciled in accounting against a file that lives somewhere else. Every disbursement is a small reconciliation project.' },
        { t:'Onboarding is a folder', d:'W-9s, licenses, ICAs in Drive. Nothing tells you a license is expiring — until it has.' }
      ],
      painStat:'Roughly 90 minutes of manual coordination per deal, across four systems.',
      painStatSrc:'US Tech Automations, 2026 — 32-agent brokerage, 280 deals a year',
      painMath:{ deals:280, minutes:90, label:'deals a year' },

      // The dashboard.
      kpis:[
        { k:'Pipeline value', v:'$14.2M', s:'38 active deals', tone:'good' },
        { k:'Closing this month', v:'9', s:'$3.1M volume', tone:'' },
        { k:'Commission owed', v:'$248,400', s:'to 12 agents', tone:'' },
        { k:'Needs your attention', v:'4', s:'2 expiring licenses', tone:'warn' }
      ],
      chart:{ title:'Closed volume', unit:'$M', months:['Feb','Mar','Apr','May','Jun','Jul'], vals:[2.1,2.8,2.4,3.6,3.2,4.1] },
      funnel:[ {s:'New leads',n:64}, {s:'Working',n:41}, {s:'Showing',n:23}, {s:'Under contract',n:14}, {s:'Closing',n:9} ],
      today:[
        { t:'Inspection objection due', w:'1421 Lakeshore Dr', when:'Today, 5:00pm', tone:'warn' },
        { t:'Appraisal ordered', w:'88 Ridgeline Ct', when:'Today', tone:'' },
        { t:'License renewal — M. Alvarez', w:'Expires in 9 days', when:'This week', tone:'warn' },
        { t:'Commission disbursement ready', w:'3 closings', when:'Friday', tone:'good' }
      ],
      people:[
        { n:'M. Alvarez', r:'Agent', d:'6 active · $2.1M', flag:'License expires in 9 days' },
        { n:'J. Whitfield', r:'Agent', d:'5 active · $1.8M', flag:'' },
        { n:'R. Okonkwo', r:'Agent', d:'4 active · $1.6M', flag:'' },
        { n:'S. Bergman', r:'Transaction coordinator', d:'38 files', flag:'' }
      ],
      deals:[
        { a:'1421 Lakeshore Dr', p:'$845,000', st:'Under contract', ag:'M. Alvarez', d:'Closes Aug 4', tone:'warn' },
        { a:'88 Ridgeline Ct',   p:'$1,240,000', st:'Under contract', ag:'J. Whitfield', d:'Closes Aug 11', tone:'' },
        { a:'2207 Fernan Way',   p:'$392,000', st:'Showing', ag:'R. Okonkwo', d:'—', tone:'' },
        { a:'615 Government Way',p:'$525,000', st:'Closing', ag:'M. Alvarez', d:'Closes Jul 24', tone:'good' },
        { a:'44 Cherry Hill Ln', p:'$710,000', st:'New lead', ag:'unassigned', d:'—', tone:'' }
      ],
      dealsMeta:{ h1:'Deals', sub:'Every file, every stage, one list.', cols:['Property','Price','Stage','Agent','Next'] },
      peopleSub:'Production and paperwork on the same card — licenses flagged before they lapse.',
      money:{ h1:'Commissions', sub:'Calculated from the deal, not re-keyed into accounting.',
        kpis:[ {k:'Owed this cycle',v:'$248,400',s:'to 12 agents'}, {k:'Ready to disburse',v:'3',s:'closings cleared',tone:'good'}, {k:'Held in escrow',v:'$61,200',s:'4 files'}, {k:'Missing paperwork',v:'1',s:'blocks disbursement',tone:'warn'} ],
        listTitle:'This cycle', listSub:'Each line traces back to the deal it came from — one click, no reconciliation.',
        rows:[ {n:'M. Alvarez',d:'6 active · $2.1M',v:'$74,200'}, {n:'J. Whitfield',d:'5 active · $1.8M',v:'$61,800'}, {n:'R. Okonkwo',d:'4 active · $1.6M',v:'$52,400'}, {n:'S. Bergman',d:'TC bonus pool',v:'$4,800'} ] },
      funnelTitle:'Where everything stands', funnelSub:'Every deal in one place — the part your CRM stops tracking.',
      sections:[
        { id:'dash', label:'Dashboard', icon:'M3 13h8V3H3zM13 21h8v-10h-8zM13 3v6h8V3zM3 21h8v-6H3z' },
        { id:'deals', label:'Deals', icon:'M3 7h18v13H3zM3 7l3-4h12l3 4M9 12h6' },
        { id:'people', label:'Agents', icon:'M16 20v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8' },
        { id:'money', label:'Commissions', icon:'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
        { id:'suite', label:'Everything inside', icon:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
        { id:'stack', label:'What this replaces', icon:'M3 6h18M3 12h18M3 18h18' }
      ]
    },

    architecture: {
      id:'architecture', hub:'Draftline Hub', trade:'Architecture', acc:'#5c8a5f', acc2:'#43703f',
      firm:'North Fork Studio', firmSub:'9 people · Spokane, Washington', who:'a nine-person studio', priceId:'draftline',

      /* Sourced Jul 20 2026 — monograph.com, itqlick.com, deelo.ai, basebuilders.com.
         Benchmark category per Barry Burris's audit: Deltek Ajera/Vantagepoint, BQE Core,
         Monograph, Newforma. */
      stack: [
        { tool:'BQE Core or Monograph', job:'Projects, time & billing', cost:'$24–79/user/mo', note:'BQE modular; Monograph ~$500–1,200/mo at 20 staff' },
        { tool:'Deltek Ajera (the firms that outgrow those)', job:'Full ERP', cost:'from $200/user/mo', note:'real cost often ~3x after implementation' },
        { tool:'Newforma-class tool', job:'RFIs, submittals, transmittals', cost:'quoted', note:'per-project or enterprise' },
        { tool:'DocuSign', job:'Signatures & contracts', cost:'$40–120/mo', note:'per user' },
        { tool:'QuickBooks', job:'The actual books', cost:'$99/mo', note:'plus a bookkeeper' },
        { tool:'Google Workspace + Drive', job:'Everything else', cost:'$75/mo', note:'9 seats' }
      ],
      stackNote:'For a nine-person studio the modular tools alone run $2,600–$8,500 a year before the ERP conversation even starts — and none of them holds the drawings, the money and the people in one place.',
      pain: [
        { t:'Time lives away from billing', d:'Hours go into one tool, invoices come out of another. You know what you billed — not what a project actually cost you in labor. Budgeted vs. actual hours vs. revenue is the number the whole practice runs on, and it lives in a spreadsheet.' },
        { t:'RFIs are not tied to drawings', d:'The tracker knows RFI 041 exists. It does not know which sheet it is about, which revision answered it, or what got transmitted when. That reconstruction happens by hand, at the worst possible time — during a dispute.' },
        { t:'Licenses are nobody\'s job', d:'A stamped drawing is only valid on a current registration. Most firms track registrations, renewals and insurance certs in a spreadsheet someone forgets to check.' },
        { t:'Nothing upstream of the proposal', d:'Pursuits, RFPs and win rates live in email. The pipeline that feeds the whole firm has no system of record.' }
      ],
      painStat:'Deltek Ajera lists at $200 per user per month — and independent analysis puts the real three-year cost near triple the sticker after implementation and add-ons.',
      painStatSrc:'ITQlick pricing analysis, 2026',
      painHeadline:'$200/user/mo — before the 3x',
      kpis:[
        { k:'Active projects', v:'11', s:'$268k fees in motion', tone:'good' },
        { k:'Open RFIs', v:'7', s:'2 overdue', tone:'warn' },
        { k:'Unbilled work', v:'$84,300', s:'ready to invoice', tone:'' },
        { k:'This week', v:'3', s:'deadlines due', tone:'' }
      ],
      chart:{ title:'Billed fees', unit:'$k', months:['Feb','Mar','Apr','May','Jun','Jul'], vals:[31,44,38,52,47,58] },
      funnelTitle:'Projects by phase', funnelSub:'From first sketch to closeout, one list.',
      funnel:[ {s:'Proposal',n:4}, {s:'Schematic',n:3}, {s:'Design dev',n:2}, {s:'CDs',n:4}, {s:'Construction',n:2} ],
      today:[
        { t:'RFI 041 overdue — steel connection', w:'Larch Street Mixed-Use', when:'2 days over', tone:'warn' },
        { t:'CD set due to client', w:'Hillside Residence', when:'Friday', tone:'warn' },
        { t:'Consultant markup received', w:'Riverpoint Clinic', when:'Today', tone:'' },
        { t:'Invoice #2214 paid', w:'$18,400 · Larch Street', when:'Today', tone:'good' }
      ],
      peopleSub:'Who is on what, and how loaded they are.',
      people:[
        { n:'D. Okafor', r:'Principal', d:'4 projects · sealing', flag:'' },
        { n:'T. Lindqvist', r:'Project architect', d:'3 projects · 92% booked', flag:'Overbooked next week' },
        { n:'A. Reyes', r:'Designer', d:'2 projects · 70% booked', flag:'' },
        { n:'K. Chen', r:'Job captain', d:'CDs · Hillside', flag:'' }
      ],
      dealsMeta:{ h1:'Projects', sub:'Every project, every phase, one list.', cols:['Project','Fee','Phase','Lead','Next'] },
      deals:[
        { a:'Larch Street Mixed-Use', p:'$96,000', st:'CDs', ag:'T. Lindqvist', d:'RFI 041 due', tone:'warn' },
        { a:'Hillside Residence', p:'$42,000', st:'CDs', ag:'K. Chen', d:'Set due Fri', tone:'warn' },
        { a:'Riverpoint Clinic', p:'$68,000', st:'Design dev', ag:'D. Okafor', d:'Consultant review', tone:'' },
        { a:'Garden District ADU', p:'$18,500', st:'Schematic', ag:'A. Reyes', d:'Client mtg Tue', tone:'' },
        { a:'Mill Row Adaptive Reuse', p:'$44,000', st:'Proposal', ag:'D. Okafor', d:'Fee letter out', tone:'good' }
      ],
      money:{ h1:'Billing', sub:'Time and phases roll straight into invoices — nothing re-keyed.',
        kpis:[ {k:'Unbilled',v:'$84,300',s:'across 8 projects'}, {k:'Invoiced this month',v:'$58,200',s:'6 invoices',tone:'good'}, {k:'Outstanding',v:'$23,800',s:'2 invoices, oldest 18 days'}, {k:'Retainage held',v:'$9,200',s:'2 projects',tone:'warn'} ],
        listTitle:'Ready to bill', listSub:'Phase completions waiting for an invoice.',
        rows:[ {n:'Larch Street Mixed-Use',d:'CD phase · 80% complete',v:'$28,800'}, {n:'Riverpoint Clinic',d:'DD phase complete',v:'$20,400'}, {n:'Hillside Residence',d:'CD phase · 60%',v:'$12,600'}, {n:'Garden District ADU',d:'SD complete',v:'$5,500'} ] },
      sections:[
        { id:'dash', label:'Dashboard', icon:'M3 13h8V3H3zM13 21h8v-10h-8zM13 3v6h8V3zM3 21h8v-6H3z' },
        { id:'deals', label:'Projects', icon:'M3 7h18v13H3zM3 7l3-4h12l3 4M9 12h6' },
        { id:'people', label:'Studio', icon:'M16 20v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8' },
        { id:'money', label:'Billing', icon:'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
        { id:'suite', label:'Everything inside', icon:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
        { id:'stack', label:'What this replaces', icon:'M3 6h18M3 12h18M3 18h18' }
      ]
    },

    engineering: {
      id:'engineering', hub:'Datum Hub', trade:'Engineering', acc:'#18b0ba', acc2:'#0f8a92',
      firm:'Basalt Engineering', firmSub:'14 people · Post Falls, Idaho', who:'a fourteen-person practice', priceId:'datum',
      
      /* Same AEC practice-management category as architecture — Deltek/BQE serve A&E firms.
         Sourced Jul 20 2026: monograph.com, itqlick.com, deelo.ai. */
      stack:[
        { tool:'BQE Core', job:'Projects, time & billing', cost:'$24-79/user/mo', note:'module-based' },
        { tool:'Deltek Ajera / Vantagepoint', job:'Full A&E ERP', cost:'from $200/user/mo', note:'real 3-yr cost often ~3x sticker' },
        { tool:'Submittal/RFI tool (Newforma class)', job:'Submittals & transmittals', cost:'quoted', note:'per-project or enterprise' },
        { tool:'DocuSign', job:'Signatures', cost:'$40-120/mo', note:'per user' },
        { tool:'QuickBooks', job:'Books & payroll feed', cost:'$99/mo', note:'plus a bookkeeper' },
        { tool:'Google Workspace + Drive', job:'Everything else', cost:'$115/mo', note:'14 seats' }
      ],
      stackNote:'The A&E tools bill per seat, so a growing firm pays for growth twice - once in salary, once in software.',
      pain:[
        { t:'Utilization is a month-late number', d:'Hours land in one tool, revenue in another. By the time budgeted-vs-actual is reconciled, the project that lost money is already stamped and issued.' },
        { t:'Submittals live outside the drawings', d:'The tracker knows the item; it does not know the sheet, the revision, or the transmittal history. During a claim, that gets rebuilt by hand.' },
        { t:'PE licenses and CEUs on a spreadsheet', d:'A stamp on a lapsed registration is not a paperwork problem, it is a liability event. Most firms track renewals manually.' },
        { t:'Sub-consultant money is a side ledger', d:'What you owe structural and what the client owes you live in different systems and never quite agree.' }
      ],
      painStat:'Deltek Ajera lists from $200 per user per month; independent analysis puts real three-year cost near triple the sticker after implementation.',
      painStatSrc:'ITQlick pricing analysis, 2026',
      painHeadline:'$200/user/mo - before the 3x',
      kpis:[
        { k:'Active jobs', v:'17', s:'$412k fees in motion', tone:'good' },
        { k:'Submittals in review', v:'9', s:'3 due back this week', tone:'warn' },
        { k:'Calcs awaiting QA', v:'5', s:'2 stamped today', tone:'' },
        { k:'Utilization', v:'87%', s:'firm-wide this month', tone:'' }
      ],
      chart:{ title:'Earned fees', unit:'$k', months:['Feb','Mar','Apr','May','Jun','Jul'], vals:[48,55,51,63,60,71] },
      funnelTitle:'Jobs by stage', funnelSub:'Proposal to record drawings, one board.',
      funnel:[ {s:'Proposal',n:5}, {s:'Design',n:6}, {s:'QA review',n:3}, {s:'Issued',n:2}, {s:'CA',n:1} ],
      today:[
        { t:'Submittal 118 due back', w:'Prairie Trail Bridge', when:'Tomorrow', tone:'warn' },
        { t:'Calc package to QA', w:'Seltice Substation', when:'Today', tone:'' },
        { t:'Field report filed', w:'Huetter Road Widening', when:'Today', tone:'' },
        { t:'PE stamp applied — sheet set C', w:'Riverbend Lift Station', when:'Today', tone:'good' }
      ],
      peopleSub:'Licenses, load, and what is on each desk.',
      people:[
        { n:'R. Vasquez, PE', r:'Principal', d:'5 jobs · QA queue 3', flag:'' },
        { n:'H. Marsh, PE', r:'Structural lead', d:'4 jobs · 88% booked', flag:'CEU renewal in 30 days' },
        { n:'J. Toivonen, EIT', r:'Civil designer', d:'3 jobs', flag:'' },
        { n:'L. Braddock', r:'CAD manager', d:'All active sets', flag:'' }
      ],
      dealsMeta:{ h1:'Jobs', sub:'Every job, every stage, one list.', cols:['Job','Fee','Stage','Lead','Next'] },
      deals:[
        { a:'Prairie Trail Bridge', p:'$118,000', st:'QA review', ag:'H. Marsh', d:'Submittal due', tone:'warn' },
        { a:'Seltice Substation', p:'$86,000', st:'Design', ag:'R. Vasquez', d:'Calcs to QA', tone:'' },
        { a:'Riverbend Lift Station', p:'$64,000', st:'Issued', ag:'H. Marsh', d:'CA begins', tone:'good' },
        { a:'Huetter Road Widening', p:'$92,000', st:'CA', ag:'J. Toivonen', d:'Field report', tone:'' },
        { a:'Mica Flats Site Package', p:'$52,000', st:'Proposal', ag:'R. Vasquez', d:'Scope letter', tone:'' }
      ],
      money:{ h1:'Billing', sub:'Earned-value billing straight off the job stages.',
        kpis:[ {k:'Unbilled earned',v:'$96,700',s:'across 11 jobs'}, {k:'Invoiced this month',v:'$71,000',s:'9 invoices',tone:'good'}, {k:'Outstanding',v:'$31,400',s:'oldest 24 days',tone:'warn'}, {k:'Sub-consultants owed',v:'$18,200',s:'3 firms'} ],
        listTitle:'Ready to bill', listSub:'Stage completions waiting for an invoice.',
        rows:[ {n:'Prairie Trail Bridge',d:'90% design complete',v:'$32,000'}, {n:'Seltice Substation',d:'60% design',v:'$24,600'}, {n:'Huetter Road Widening',d:'CA month 2',v:'$11,500'}, {n:'Riverbend Lift Station',d:'Issued for construction',v:'$9,800'} ] },
      sections:[
        { id:'dash', label:'Dashboard', icon:'M3 13h8V3H3zM13 21h8v-10h-8zM13 3v6h8V3zM3 21h8v-6H3z' },
        { id:'deals', label:'Jobs', icon:'M3 7h18v13H3zM3 7l3-4h12l3 4M9 12h6' },
        { id:'people', label:'Team', icon:'M16 20v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8' },
        { id:'money', label:'Billing', icon:'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
        { id:'suite', label:'Everything inside', icon:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
        { id:'stack', label:'What this replaces', icon:'M3 6h18M3 12h18M3 18h18' }
      ]
    },

    theater: {
      id:'theater', hub:'Marquee Hub', trade:'Live theater', acc:'#e0b24a', acc2:'#b8902f',
      firm:'Granite Box Theatre', firmSub:'149 seats · community company', who:'a community theater', priceId:'marquee',
      
      /* Sourced Jul 20 2026: audienceview.com pricing pages + their ticketing-cost guide. */
      stack:[
        { tool:'AudienceView Professional (Theatre Manager class)', job:'Box office & ticketing', cost:'quoted', note:'subscription + per-ticket fees + setup' },
        { tool:'Per-ticket processing', job:'Every online sale', cost:'per ticket', note:'the fee your patrons see' },
        { tool:'SignUpGenius / spreadsheets', job:'Volunteers & house crews', cost:'$0-27/mo', note:'and a phone tree' },
        { tool:'Donor CRM (Little Green Light class)', job:'Donors & grants', cost:'$45-100/mo', note:'separate from ticket history' },
        { tool:'QuickBooks', job:'The books, the 990', cost:'$99/mo', note:'plus a volunteer treasurer' },
        { tool:'Email tool + website host', job:'Marketing & the site', cost:'$50-150/mo', note:'two more logins' }
      ],
      stackNote:'Ticketing platforms charge per ticket, so the better your season sells, the more you pay - and your donor records still cannot see your ticket history.',
      pain:[
        { t:'The ticketing platform taxes every seat', d:'Per-ticket fees mean your best-selling run is also your biggest software bill. A flat monthly does not care how well you sell.' },
        { t:'Donors and patrons are strangers to each other', d:'The person who bought season tickets for ten years and the person who gave $500 are the same person - in two databases that have never met.' },
        { t:'Volunteers run on a phone tree', d:'House crews fill by text message and memory. Nobody can see Saturday is short until Saturday.' },
        { t:'Royalties are a calendar reminder', d:'Rights, royalty deadlines and per-performance reporting live in someone head. Miss one and the licensor notices.' }
      ],
      painStat:'Venue ticketing platforms typically charge a subscription plus per-ticket fees on every online sale, with one-time setup and migration fees on top.',
      painStatSrc:'AudienceView ticketing-cost guide, 2026',
      painHeadline:'A fee on every ticket you sell',
      kpis:[
        { k:'This week\'s house', v:'82%', s:'sold · 4 performances', tone:'good' },
        { k:'Season tickets', v:'214', s:'renewals open', tone:'' },
        { k:'Box office this run', v:'$38,640', s:'The Music Man', tone:'' },
        { k:'Volunteer gaps', v:'3', s:'Saturday house crew', tone:'warn' }
      ],
      chart:{ title:'Ticket revenue', unit:'$k', months:['Feb','Mar','Apr','May','Jun','Jul'], vals:[12,19,9,22,16,27] },
      funnelTitle:'The season', funnelSub:'Every production from pick to strike.',
      funnel:[ {s:'Announced',n:5}, {s:'Auditions',n:1}, {s:'Rehearsal',n:1}, {s:'Running',n:1}, {s:'Closed',n:2} ],
      today:[
        { t:'House opens 6:30', w:'The Music Man · Fri', when:'Today', tone:'' },
        { t:'Saturday ushers short', w:'3 of 6 filled', when:'This week', tone:'warn' },
        { t:'Royalty payment due', w:'MTI · next production', when:'Aug 1', tone:'warn' },
        { t:'Season renewal mailer sent', w:'214 subscribers', when:'Today', tone:'good' }
      ],
      peopleSub:'Cast, crew and volunteers — one roster, no phone tree.',
      people:[
        { n:'P. Delacroix', r:'Director', d:'The Music Man', flag:'' },
        { n:'S. Nakamura', r:'Stage manager', d:'Run of show', flag:'' },
        { n:'House crew — Sat', r:'Volunteers', d:'3 of 6 filled', flag:'Needs 3' },
        { n:'M. Okafor', r:'Music director', d:'Live pit · 8 players', flag:'' }
      ],
      dealsMeta:{ h1:'Productions', sub:'The whole season on one board.', cols:['Production','Budget','Stage','Director','Next'] },
      deals:[
        { a:'The Music Man', p:'$14,200', st:'Running', ag:'P. Delacroix', d:'Closes Aug 3', tone:'good' },
        { a:'Almost, Maine', p:'$6,800', st:'Auditions', ag:'TBD', d:'Callbacks Tue', tone:'warn' },
        { a:'A Christmas Carol', p:'$11,500', st:'Announced', ag:'R. Winters', d:'Rights confirmed', tone:'' },
        { a:'Youth Workshop Showcase', p:'$2,400', st:'Announced', ag:'Education', d:'Enrollment open', tone:'' },
        { a:'Steel Magnolias', p:'$7,200', st:'Closed', ag:'P. Delacroix', d:'Strike done', tone:'' }
      ],
      money:{ h1:'Box office & books', sub:'Tickets, concessions and donations land in the same ledger.',
        kpis:[ {k:'This run',v:'$38,640',s:'tickets + concessions'}, {k:'Season to date',v:'$104,300',s:'all sources',tone:'good'}, {k:'Royalties due',v:'$3,850',s:'2 titles',tone:'warn'}, {k:'Donations YTD',v:'$26,900',s:'118 gifts'} ],
        listTitle:'This week', listSub:'Every dollar traced to a performance or a donor.',
        rows:[ {n:'Fri 7:30 performance',d:'128 seats · 86%',v:'$3,410'}, {n:'Sat 2:00 matinee',d:'114 seats · 77%',v:'$2,890'}, {n:'Sat 7:30 performance',d:'137 seats · 92%',v:'$3,720'}, {n:'Concessions · weekend',d:'3 performances',v:'$1,240'} ] },
      sections:[
        { id:'dash', label:'Dashboard', icon:'M3 13h8V3H3zM13 21h8v-10h-8zM13 3v6h8V3zM3 21h8v-6H3z' },
        { id:'deals', label:'Season', icon:'M3 7h18v13H3zM3 7l3-4h12l3 4M9 12h6' },
        { id:'people', label:'Company', icon:'M16 20v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8' },
        { id:'money', label:'Box office', icon:'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
        { id:'suite', label:'Everything inside', icon:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
        { id:'stack', label:'What this replaces', icon:'M3 6h18M3 12h18M3 18h18' }
      ]
    },

    cinema: {
      id:'cinema', hub:'Reel Hub', trade:'Cinema', acc:'#8a6fd6', acc2:'#6b52b0',
      firm:'The Orpheum', firmSub:'3 screens · downtown single-site', who:'a three-screen independent', priceId:'reel',
      
      /* Sourced Jul 20 2026: filmgrail.com cinema-software roundup, veezi.com model. */
      stack:[
        { tool:'Veezi (Vista class, indie tier)', job:'Ticketing & showtimes', cost:'modular, pay-as-you-go', note:'per-module monthly' },
        { tool:'Per-ticket / processing fees', job:'Every online sale', cost:'per ticket', note:'on top of the modules' },
        { tool:'Distributor settlement', job:'Splits & remittance', cost:'spreadsheets', note:'by hand, weekly' },
        { tool:'Membership tool or punch cards', job:'Members & loyalty', cost:'$50-100/mo', note:'separate list' },
        { tool:'QuickBooks', job:'The books', cost:'$99/mo', note:'plus a bookkeeper' },
        { tool:'Email + website host', job:'Marketing & the site', cost:'$50-150/mo', note:'two more logins' }
      ],
      stackNote:'The point-of-sale knows tonight. The spreadsheet knows the split. The books know last month. Nobody knows the whole house at once.',
      pain:[
        { t:'Settlement is a weekly spreadsheet ritual', d:'Grosses come out of the POS, splits get computed by hand, remittances go out late. One formula error is a distributor phone call.' },
        { t:'Members are a list, not a relationship', d:'The loyalty tool cannot see what anyone actually watched, so member night is a guess.' },
        { t:'Concessions per-head is invisible', d:'The number that decides whether tonight made money is not on any screen - it is division someone does later, if they do it.' },
        { t:'Fees scale with success', d:'Per-ticket pricing means a sold-out week costs more to process than a dead one.' }
      ],
      painStat:'Independent-cinema platforms price per module plus per-ticket fees, while distributor settlement - the money that actually leaves - stays in spreadsheets.',
      painStatSrc:'FilmGrail cinema-software review; Veezi pricing model, 2026',
      painHeadline:'POS, splits, books: three systems',
      kpis:[
        { k:'Tonight', v:'71%', s:'sold across 3 screens', tone:'good' },
        { k:'This week', v:'$21,480', s:'box + concessions', tone:'' },
        { k:'Members', v:'642', s:'+18 this month', tone:'good' },
        { k:'Projector 2', v:'1 alert', s:'lamp hours high', tone:'warn' }
      ],
      chart:{ title:'Weekly gross', unit:'$k', months:['W1','W2','W3','W4','W5','W6'], vals:[16,18,15,22,19,24] },
      funnelTitle:'Screens tonight', funnelSub:'Every showtime, every seat, one board.',
      funnel:[ {s:'Screen 1 · 7:00',n:84}, {s:'Screen 2 · 7:15',n:61}, {s:'Screen 3 · 7:30',n:47}, {s:'Screen 1 · 9:45',n:38}, {s:'Screen 2 · 9:50',n:22} ],
      today:[
        { t:'Print delivery — next week\'s slate', w:'2 DCPs arrived', when:'Today', tone:'good' },
        { t:'Lamp hours — Screen 2', w:'Order replacement', when:'This week', tone:'warn' },
        { t:'Member night', w:'Thursday · 642 invited', when:'Thu', tone:'' },
        { t:'Distributor settlement due', w:'2 titles', when:'Friday', tone:'warn' }
      ],
      peopleSub:'Shifts covered, projection certified, everyone on one rota.',
      people:[
        { n:'C. Whitmore', r:'Manager', d:'Tonight · close', flag:'' },
        { n:'Projection', r:'2 certified', d:'All screens covered', flag:'' },
        { n:'Concessions', r:'4 on shift', d:'Fri/Sat covered', flag:'' },
        { n:'Sunday crew', r:'Front of house', d:'1 gap', flag:'Needs 1' }
      ],
      dealsMeta:{ h1:'Programme', sub:'This week\'s slate and what each screen is doing.', cols:['Title','Gross to date','Status','Screen','Next'] },
      deals:[
        { a:'The Lighthouse Keeper', p:'$9,840', st:'Running', ag:'Screen 1', d:'Held over', tone:'good' },
        { a:'Midnight Cartography', p:'$6,210', st:'Running', ag:'Screen 2', d:'Final week', tone:'' },
        { a:'Paper Lanterns', p:'$4,120', st:'Running', ag:'Screen 3', d:'—', tone:'' },
        { a:'Classic series: Rear Window', p:'$1,310', st:'One-night', ag:'Screen 1', d:'Sun 4:00', tone:'' },
        { a:'Next week\'s slate', p:'—', st:'Booked', ag:'All', d:'DCPs in', tone:'good' }
      ],
      money:{ h1:'Settlement & takings', sub:'Box, concessions and distributor splits in one ledger.',
        kpis:[ {k:'This week gross',v:'$21,480',s:'all sources'}, {k:'Concessions',v:'$6,340',s:'29% of gross',tone:'good'}, {k:'Distributor owed',v:'$7,120',s:'2 titles',tone:'warn'}, {k:'Membership dues',v:'$3,210',s:'this month'} ],
        listTitle:'Settlement this week', listSub:'Each split calculated from the actual grosses.',
        rows:[ {n:'The Lighthouse Keeper',d:'55/45 week 3',v:'$4,410'}, {n:'Midnight Cartography',d:'60/40 week 2',v:'$2,710'}, {n:'Paper Lanterns',d:'flat rental',v:'$850'}, {n:'Classic series',d:'flat rental',v:'$300'} ] },
      sections:[
        { id:'dash', label:'Dashboard', icon:'M3 13h8V3H3zM13 21h8v-10h-8zM13 3v6h8V3zM3 21h8v-6H3z' },
        { id:'deals', label:'Programme', icon:'M3 7h18v13H3zM3 7l3-4h12l3 4M9 12h6' },
        { id:'people', label:'Crew', icon:'M16 20v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8' },
        { id:'money', label:'Settlement', icon:'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
        { id:'suite', label:'Everything inside', icon:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
        { id:'stack', label:'What this replaces', icon:'M3 6h18M3 12h18M3 18h18' }
      ]
    },

    concerts: {
      id:'concerts', hub:'Encore Hub', trade:'Concerts & venues', acc:'#d65f8a', acc2:'#b04068',
      firm:'The Foundry', firmSub:'450 cap · club venue', who:'a 450-cap club', priceId:'encore',
      
      /* Sourced Jul 20 2026: AudienceView ticketing-cost guide (fee models); category structure. */
      stack:[
        { tool:'Ticketing platform (Eventbrite/etix class)', job:'Tickets & presales', cost:'per ticket', note:'a cut of every sale' },
        { tool:'Settlement spreadsheets', job:'Artist deals & payouts', cost:'by hand', note:'every show, night-of' },
        { tool:'Advance sheets in email', job:'Riders, input lists, day-of', cost:'inbox', note:'version chaos' },
        { tool:'Bar POS', job:'Bar revenue', cost:'$60-100/mo + fees', note:'never meets the ticket data' },
        { tool:'QuickBooks', job:'The books', cost:'$99/mo', note:'plus a bookkeeper' },
        { tool:'Email + website host', job:'Marketing & the site', cost:'$50-150/mo', note:'two more logins' }
      ],
      stackNote:'Ticketing takes a cut of every sale, settlement lives in a 1am spreadsheet, and bar-per-head - the number a club actually runs on - is not in any system.',
      pain:[
        { t:'The platform takes a cut of every ticket', d:'Percentage ticketing fees mean your biggest nights carry your biggest software cost. A flat monthly does not scale against you.' },
        { t:'Settlement happens at 1am on a spreadsheet', d:'Counts, splits, expenses and deposits reconciled by a tired person after the encore. Every error is an artist-relations problem.' },
        { t:'The advance lives in email', d:'Riders and input lists get versioned in an inbox. The one that matters is whichever one production printed.' },
        { t:'Bar and tickets never meet', d:'Bar-per-head decides which bookings work, and it is computed - when it is computed - by hand.' }
      ],
      painStat:'Event ticketing platforms typically charge per-ticket fees on every online sale - a percentage of your gross, taken before settlement.',
      painStatSrc:'AudienceView ticketing-cost guide, 2026',
      painHeadline:'A percentage of every good night',
      kpis:[
        { k:'Next show', v:'88%', s:'sold · Saturday', tone:'good' },
        { k:'On sale now', v:'6', s:'shows this quarter', tone:'' },
        { k:'Bar per head', v:'$14.20', s:'last 5 shows', tone:'good' },
        { k:'Unsettled', v:'2', s:'artist settlements', tone:'warn' }
      ],
      chart:{ title:'Monthly gross', unit:'$k', months:['Feb','Mar','Apr','May','Jun','Jul'], vals:[38,42,35,51,47,58] },
      funnelTitle:'On-sale board', funnelSub:'Every show from hold to settled.',
      funnel:[ {s:'Holds',n:8}, {s:'Confirmed',n:6}, {s:'On sale',n:6}, {s:'This week',n:2}, {s:'To settle',n:2} ],
      today:[
        { t:'Advance due — Saturday headline', w:'Rider + input list', when:'Today', tone:'warn' },
        { t:'On-sale 10am — fall tour stop', w:'Presale code live', when:'Tomorrow', tone:'' },
        { t:'Settlement — last Friday', w:'80/20 after expenses', when:'Overdue', tone:'warn' },
        { t:'Saturday walk-up projection', w:'~40 tickets', when:'Sat', tone:'good' }
      ],
      peopleSub:'Crew calls, security and bar on one sheet.',
      people:[
        { n:'V. Ashford', r:'Talent buyer', d:'6 on sale · 8 holds', flag:'' },
        { n:'Production', r:'Sound + lights', d:'Sat call 2:00pm', flag:'' },
        { n:'Security', r:'6 booked', d:'Sat · sold show', flag:'' },
        { n:'Bar', r:'5 on shift', d:'Sat · full staff', flag:'' }
      ],
      dealsMeta:{ h1:'Shows', sub:'Holds to settlements, one board.', cols:['Show','Potential','Status','Buyer','Next'] },
      deals:[
        { a:'Sat — Headline + support', p:'$13,500', st:'On sale', ag:'V. Ashford', d:'88% sold', tone:'good' },
        { a:'Fall tour stop', p:'$11,200', st:'Confirmed', ag:'V. Ashford', d:'On-sale 10am', tone:'' },
        { a:'Local showcase night', p:'$3,800', st:'On sale', ag:'V. Ashford', d:'42% sold', tone:'' },
        { a:'Last Friday\'s show', p:'$9,640', st:'To settle', ag:'—', d:'Settlement overdue', tone:'warn' },
        { a:'Album release hold', p:'$8,000', st:'Hold', ag:'V. Ashford', d:'Confirm by Aug 1', tone:'' }
      ],
      money:{ h1:'Settlement', sub:'Ticket counts, bar and expenses — the settlement builds itself.',
        kpis:[ {k:'To settle',v:'$16,120',s:'2 shows',tone:'warn'}, {k:'This month gross',v:'$58,300',s:'tickets + bar',tone:'good'}, {k:'Bar this month',v:'$19,400',s:'33% of gross'}, {k:'Deposits held',v:'$6,500',s:'3 upcoming'} ],
        listTitle:'Open settlements', listSub:'Every line from the actual counts, not a spreadsheet.',
        rows:[ {n:'Last Friday — headline',d:'412 sold · 80/20 after exp',v:'$6,890'}, {n:'Last Friday — support',d:'flat',v:'$750'}, {n:'Thu showcase',d:'door split 70/30',v:'$1,480'}, {n:'Bar reconciliation',d:'both nights',v:'$7,000'} ] },
      sections:[
        { id:'dash', label:'Dashboard', icon:'M3 13h8V3H3zM13 21h8v-10h-8zM13 3v6h8V3zM3 21h8v-6H3z' },
        { id:'deals', label:'Shows', icon:'M3 7h18v13H3zM3 7l3-4h12l3 4M9 12h6' },
        { id:'people', label:'Crew', icon:'M16 20v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8' },
        { id:'money', label:'Settlement', icon:'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
        { id:'suite', label:'Everything inside', icon:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
        { id:'stack', label:'What this replaces', icon:'M3 6h18M3 12h18M3 18h18' }
      ]
    },

    kidsgym: {
      id:'kidsgym', hub:'Cartwheel Hub', trade:'Kids gyms & programs', acc:'#4aa3d6', acc2:'#3480ad',
      firm:'Tumble Town', firmSub:'2 gyms · 340 families', who:'a two-location kids gym', priceId:'cartwheel',
      
      /* Sourced Jul 20 2026: jackrabbitclass.com/pricing, Capterra iClassPro listing. */
      stack:[
        { tool:'Jackrabbit Class', job:'Classes, rosters, tuition', cost:'from $49/mo', note:'scales with student count; Plus from $93/mo + $169 setup; Enterprise to $331/mo' },
        { tool:'iClassPro', job:'The alternative', cost:'from $139/mo/location', note:'tiers up from there' },
        { tool:'Waiver tool (SmartWaiver class)', job:'Waivers & e-sign', cost:'$15-50/mo', note:'separate from enrollment' },
        { tool:'QuickBooks', job:'The books', cost:'$99/mo', note:'plus a bookkeeper' },
        { tool:'Email tool + website host', job:'Marketing & the site', cost:'$50-150/mo', note:'two more logins' },
        { tool:'Group texts & paper binders', job:'Coach certs, CPR, schedules', cost:'someone\'s memory', note:'the real system of record' }
      ],
      stackNote:'Class software prices climb with your student count - growth costs twice. And the safety-critical stuff - waivers, CPR certs - lives outside it anyway.',
      pain:[
        { t:'Price climbs with every student', d:'Student-count pricing means enrollment growth raises your software bill automatically. A flat monthly does not.' },
        { t:'Waivers live outside enrollment', d:'The waiver tool does not know who is on the roster, so a kid can attend a first class unsigned - which is exactly the day it matters.' },
        { t:'Coach certs are a binder', d:'CPR and safety certifications expire quietly. Nothing flags a lapsed cert before that coach takes a class.' },
        { t:'Parents get texts from three places', d:'Enrollment emails, coach group-texts, billing receipts - three senders, no thread, and the make-up-class question lands in all of them.' }
      ],
      painStat:'Jackrabbit tiers from $49 to $331 a month scaling with student count; iClassPro from $139 per location - before waivers, books and marketing tools.',
      painStatSrc:'Jackrabbit pricing page; Capterra, 2026',
      painHeadline:'Growth raises their bill, not ours',
      kpis:[
        { k:'Enrolled now', v:'417', s:'kids across 2 gyms', tone:'good' },
        { k:'This week\'s classes', v:'58', s:'4 with open spots', tone:'' },
        { k:'Tuition collected', v:'$46,800', s:'96% on-time', tone:'good' },
        { k:'Waivers missing', v:'6', s:'blocks first class', tone:'warn' }
      ],
      chart:{ title:'Monthly tuition', unit:'$k', months:['Feb','Mar','Apr','May','Jun','Jul'], vals:[41,43,44,42,45,47] },
      funnelTitle:'Enrollment flow', funnelSub:'From inquiry to enrolled, nobody lost in a spreadsheet.',
      funnel:[ {s:'Inquiries',n:38}, {s:'Trial booked',n:22}, {s:'Trial done',n:16}, {s:'Enrolled',n:11}, {s:'Waitlist',n:9} ],
      today:[
        { t:'6 waivers outstanding', w:'New fall enrollees', when:'Before first class', tone:'warn' },
        { t:'Coach out Thursday', w:'Tumblers 5-6 needs cover', when:'Thu', tone:'warn' },
        { t:'Fall session opens', w:'340 families emailed', when:'Today', tone:'good' },
        { t:'Birthday party booked', w:'Sat 2:00 · Gym A', when:'Sat', tone:'' }
      ],
      peopleSub:'Coaches, certifications and class loads in one place.',
      people:[
        { n:'B. Castellano', r:'Head coach · Gym A', d:'14 classes', flag:'' },
        { n:'E. Njoku', r:'Coach', d:'11 classes', flag:'CPR renewal in 21 days' },
        { n:'F. Lindgren', r:'Coach', d:'9 classes · Thu out', flag:'Needs cover Thu' },
        { n:'Front desk', r:'2 per shift', d:'Both gyms covered', flag:'' }
      ],
      dealsMeta:{ h1:'Classes', sub:'Every class, roster and spot count.', cols:['Class','Tuition','Status','Coach','Spots'] },
      deals:[
        { a:'Tumblers 5-6 · Thu 4pm', p:'$89/mo', st:'Needs cover', ag:'F. Lindgren', d:'2 open', tone:'warn' },
        { a:'Beginners 3-4 · Sat 9am', p:'$79/mo', st:'Full', ag:'B. Castellano', d:'Waitlist 4', tone:'good' },
        { a:'Ninja 7-9 · Tue 5pm', p:'$95/mo', st:'Open', ag:'E. Njoku', d:'3 open', tone:'' },
        { a:'Preteen tumbling · Wed 6pm', p:'$95/mo', st:'Open', ag:'B. Castellano', d:'1 open', tone:'' },
        { a:'Parent & tot · Fri 10am', p:'$69/mo', st:'Full', ag:'E. Njoku', d:'Waitlist 5', tone:'good' }
      ],
      money:{ h1:'Tuition', sub:'Autopay, prorates and sibling discounts handled by the system, not the front desk.',
        kpis:[ {k:'Collected this month',v:'$46,800',s:'96% on-time',tone:'good'}, {k:'Past due',v:'$1,840',s:'7 families',tone:'warn'}, {k:'Autopay enrolled',v:'88%',s:'of families'}, {k:'Parties & camps',v:'$5,200',s:'this month'} ],
        listTitle:'Needs attention', listSub:'The shortlist, not a ledger dump.',
        rows:[ {n:'7 past-due accounts',d:'auto-reminders sent',v:'$1,840'}, {n:'Fall proration batch',d:'runs Aug 1',v:'—'}, {n:'Sibling discount audit',d:'12 families',v:'ok'}, {n:'Camp deposits',d:'winter camp',v:'$2,100'} ] },
      sections:[
        { id:'dash', label:'Dashboard', icon:'M3 13h8V3H3zM13 21h8v-10h-8zM13 3v6h8V3zM3 21h8v-6H3z' },
        { id:'deals', label:'Classes', icon:'M3 7h18v13H3zM3 7l3-4h12l3 4M9 12h6' },
        { id:'people', label:'Coaches', icon:'M16 20v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8' },
        { id:'money', label:'Tuition', icon:'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
        { id:'suite', label:'Everything inside', icon:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
        { id:'stack', label:'What this replaces', icon:'M3 6h18M3 12h18M3 18h18' }
      ]
    },

    showroom: {
      id:'showroom', hub:'Showroom Hub', trade:'Used-car dealer',
      acc:'#1c5568', acc2:'#123f4f',
      firm:'Ridgeline Auto Sales', firmSub:'1 lot · 22 units on ground · Coeur d\'Alene, Idaho',
      who:'a single-lot used-car dealer', priceId:'showroom',
      kpis:[
        { k:'Units on the lot', v:'22', s:'5 arrived this week', tone:'' },
        { k:'Deals this month', v:'14', s:'$186,400 gross', tone:'good' },
        { k:'Leads working', v:'31', s:'9 new today', tone:'' },
        { k:'Recon in progress', v:'4', s:'2 ready for photos', tone:'warn' }
      ],
      chart:{ title:'Units sold', unit:'units', months:['Feb','Mar','Apr','May','Jun','Jul'], vals:[9,11,10,13,12,14] },
      funnel:[ {s:'New leads',n:58}, {s:'Working',n:34}, {s:'Test drive',n:19}, {s:'Financing',n:15}, {s:'Sold',n:14} ],
      funnelTitle:'Where every deal stands', funnelSub:'Lead to delivered, one pipeline.',
      today:[
        { t:'Recon done — ready for photos', w:'2019 Ford F-150', when:'Today', tone:'good' },
        { t:'Trade appraisal due', w:'2021 Honda Civic', when:'Today, 3:00pm', tone:'warn' },
        { t:'Financing approval pending', w:'3 deals', when:'This week', tone:'warn' },
        { t:'Lot walk with lender rep', w:'Monthly review', when:'Friday', tone:'' }
      ],
      peopleSub:'Sales and recon on the same board — nothing sits without an owner.',
      people:[
        { n:'M. Reyes', r:'Sales', d:'5 deals this month', flag:'' },
        { n:'D. Kowalski', r:'Sales', d:'4 deals this month', flag:'' },
        { n:'T. Nakamura', r:'Recon / detail', d:'4 units in shop', flag:'Backlog: 2 units' },
        { n:'Front desk', r:'F&I', d:'14 deals financed', flag:'' }
      ],
      dealsMeta:{ h1:'Deals', sub:'Every unit and every deal, one list.', cols:['Unit','Price','Stage','Rep','Next'] },
      deals:[
        { a:'2019 Ford F-150', p:'$28,900', st:'Financing', ag:'M. Reyes', d:'Funds Fri', tone:'warn' },
        { a:'2021 Honda Civic', p:'$19,500', st:'Test drive', ag:'D. Kowalski', d:'—', tone:'' },
        { a:'2018 Jeep Wrangler', p:'$24,200', st:'Sold', ag:'M. Reyes', d:'Delivered', tone:'good' },
        { a:'2020 Toyota Camry', p:'$21,800', st:'New lead', ag:'unassigned', d:'—', tone:'' },
        { a:'2017 Chevrolet Silverado', p:'$26,500', st:'Recon', ag:'T. Nakamura', d:'Photos pending', tone:'warn' }
      ],
      money:{ h1:'F&I & Gross', sub:'Front and back gross tied to the deal, not re-keyed into a spreadsheet.',
        kpis:[ {k:'Gross this month',v:'$186,400',s:'14 deals',tone:'good'}, {k:'Ready to fund',v:'3',s:'closings cleared',tone:'good'}, {k:'F&I income',v:'$22,100',s:'this month'}, {k:'Missing paperwork',v:'1',s:'blocks funding',tone:'warn'} ],
        listTitle:'This cycle', listSub:'Each line traces back to the deal it came from.',
        rows:[ {n:'M. Reyes',d:'5 deals · sales',v:'$71,200'}, {n:'D. Kowalski',d:'4 deals · sales',v:'$58,900'}, {n:'T. Nakamura',d:'recon bonus pool',v:'$3,200'}, {n:'F&I income',d:'14 deals financed',v:'$22,100'} ] },
      sections:[
        { id:'dash', label:'Dashboard', icon:'M3 13h8V3H3zM13 21h8v-10h-8zM13 3v6h8V3zM3 21h8v-6H3z' },
        { id:'deals', label:'Deals', icon:'M3 7h18v13H3zM3 7l3-4h12l3 4M9 12h6' },
        { id:'people', label:'Team', icon:'M16 20v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8' },
        { id:'money', label:'F&I & Gross', icon:'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
        { id:'suite', label:'Everything inside', icon:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' }
      ]
    },

    driveline: {
      id:'driveline', hub:'Driveline Hub', trade:'Franchise dealership',
      acc:'#24507e', acc2:'#132c45',
      firm:'Timberline Ford', firmSub:'1 rooftop · 48 units on ground · Spokane Valley, Washington',
      who:'a single-point franchise dealership', priceId:'driveline',
      kpis:[
        { k:'Units on ground', v:'48', s:'12 arrived this week', tone:'' },
        { k:'Deals this month', v:'31', s:'$1.1M volume', tone:'good' },
        { k:'Service bays booked', v:'86%', s:'6 bays', tone:'' },
        { k:'Parts backorders', v:'5', s:'2 hold a repair order', tone:'warn' }
      ],
      chart:{ title:'Units sold', unit:'units', months:['Feb','Mar','Apr','May','Jun','Jul'], vals:[24,27,25,30,28,31] },
      funnel:[ {s:'New leads',n:96}, {s:'Working',n:61}, {s:'Test drive',n:40}, {s:'Financing',n:34}, {s:'Delivered',n:31} ],
      funnelTitle:'Where every deal stands', funnelSub:'Lead to delivery, sales and service on one spine.',
      today:[
        { t:'Loaner needed', w:'RO #4482', when:'Today', tone:'warn' },
        { t:'Parts backorder — ETA slipped', w:'3 repair orders waiting', when:'This week', tone:'warn' },
        { t:'Delivery scheduled', w:'2026 F-150 Lariat', when:'Today, 4:00pm', tone:'good' },
        { t:'OEM incentive expiring', w:'Certified pre-owned bonus', when:'Fri', tone:'warn' }
      ],
      peopleSub:'Sales, service and parts on the same board.',
      people:[
        { n:'R. Ferraro', r:'Sales manager', d:'9 deals this month', flag:'' },
        { n:'K. Whitmore', r:'Service manager', d:'6 bays · 86% booked', flag:'' },
        { n:'A. Delgado', r:'Parts manager', d:'5 backorders', flag:'2 hold repair orders' },
        { n:'S. Bianchi', r:'F&I manager', d:'31 deals financed', flag:'' }
      ],
      dealsMeta:{ h1:'Deals', sub:'Every unit and every deal, one list.', cols:['Unit','Price','Stage','Rep','Next'] },
      deals:[
        { a:'2026 Ford F-150 Lariat', p:'$54,900', st:'Delivering', ag:'R. Ferraro', d:'Today 4pm', tone:'good' },
        { a:'2025 Explorer ST', p:'$48,200', st:'Financing', ag:'R. Ferraro', d:'Funds Thu', tone:'warn' },
        { a:'2024 Certified Escape', p:'$27,600', st:'Test drive', ag:'sales floor', d:'—', tone:'' },
        { a:'2026 Bronco Sport', p:'$34,100', st:'New lead', ag:'unassigned', d:'—', tone:'' },
        { a:'2025 Super Duty', p:'$61,400', st:'Sold', ag:'R. Ferraro', d:'Delivered', tone:'good' }
      ],
      money:{ h1:'Sales & Service Revenue', sub:'Front-end gross, back-end gross, and shop revenue on one ledger.',
        kpis:[ {k:'Sales gross',v:'$412,000',s:'31 deals',tone:'good'}, {k:'Service revenue',v:'$98,600',s:'this month'}, {k:'Parts revenue',v:'$61,200',s:'this month'}, {k:'Backorders',v:'5',s:'delaying ROs',tone:'warn'} ],
        listTitle:'This cycle', listSub:'Each line traces back to the deal or repair order it came from.',
        rows:[ {n:'R. Ferraro',d:'9 deals · sales',v:'$121,400'}, {n:'Service dept',d:'6 bays','v':'$98,600'}, {n:'Parts dept',d:'5 open backorders',v:'$61,200'}, {n:'F&I income',d:'31 deals financed',v:'$34,900'} ] },
      sections:[
        { id:'dash', label:'Dashboard', icon:'M3 13h8V3H3zM13 21h8v-10h-8zM13 3v6h8V3zM3 21h8v-6H3z' },
        { id:'deals', label:'Deals', icon:'M3 7h18v13H3zM3 7l3-4h12l3 4M9 12h6' },
        { id:'people', label:'Team', icon:'M16 20v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8' },
        { id:'money', label:'Revenue', icon:'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
        { id:'suite', label:'Everything inside', icon:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' }
      ]
    },

    motorcade: {
      id:'motorcade', hub:'Motorcade Hub', trade:'Dealer group',
      acc:'#182f4d', acc2:'#0e1c2e',
      firm:'Cascade Auto Group', firmSub:'6 rooftops · 312 units group-wide · Pacific Northwest',
      who:'a six-rooftop dealer group', priceId:'motorcade',
      kpis:[
        { k:'Units group-wide', v:'312', s:'across 6 rooftops', tone:'' },
        { k:'Deals this month', v:'187', s:'$6.4M volume', tone:'good' },
        { k:'Online / national leads', v:'240', s:'38% of pipeline', tone:'' },
        { k:'Rooftops needing attention', v:'2', s:'inventory imbalance', tone:'warn' }
      ],
      chart:{ title:'Group units sold', unit:'units', months:['Feb','Mar','Apr','May','Jun','Jul'], vals:[140,152,148,171,165,187] },
      funnel:[ {s:'New leads',n:420}, {s:'Working',n:260}, {s:'Test drive',n:210}, {s:'Financing',n:195}, {s:'Delivered',n:187} ],
      funnelTitle:'Where every deal stands, group-wide', funnelSub:'Every rooftop rolled into one pipeline.',
      today:[
        { t:'Inventory imbalance — transfer suggested', w:'Rooftop 3 → Rooftop 5', when:'Today', tone:'warn' },
        { t:'National online order', w:'Ships to Rooftop 2', when:'Today', tone:'good' },
        { t:'GM review — Rooftop 4', w:'Below plan 2 months running', when:'This week', tone:'warn' },
        { t:'Group marketing spend review', w:'Monthly', when:'Fri', tone:'' }
      ],
      peopleSub:'Every rooftop GM and every number, on one card.',
      people:[
        { n:'J. Okafor', r:'GM · Rooftop 1', d:'34 deals · $1.1M', flag:'' },
        { n:'L. Marchetti', r:'GM · Rooftop 2', d:'29 deals · $980K', flag:'' },
        { n:'P. Novak', r:'GM · Rooftop 3', d:'31 deals · $1.0M', flag:'Inventory imbalance' },
        { n:'R. Adeyemi', r:'GM · Rooftop 4', d:'22 deals · $740K', flag:'Below plan 2 months' }
      ],
      dealsMeta:{ h1:'Rooftops', sub:'Every rooftop, every number, one view.', cols:['Rooftop','Volume','Stage','GM','Next'] },
      deals:[
        { a:'Rooftop 1 — Ford', p:'$1.1M', st:'On plan', ag:'J. Okafor', d:'—', tone:'good' },
        { a:'Rooftop 2 — Toyota', p:'$980K', st:'On plan', ag:'L. Marchetti', d:'—', tone:'good' },
        { a:'Rooftop 3 — Chevrolet', p:'$1.0M', st:'Needs transfer', ag:'P. Novak', d:'Transfer pending', tone:'warn' },
        { a:'Rooftop 4 — Honda', p:'$740K', st:'Below plan', ag:'R. Adeyemi', d:'GM review Thu', tone:'warn' },
        { a:'National online', p:'$2.6M', st:'Growing', ag:'group desk', d:'—', tone:'good' }
      ],
      money:{ h1:'Group Revenue', sub:'Every rooftop’s gross rolled up, without a spreadsheet in between.',
        kpis:[ {k:'Group gross',v:'$2.1M',s:'187 deals',tone:'good'}, {k:'Service & parts',v:'$680,000',s:'group-wide'}, {k:'National online',v:'$2.6M',s:'46 units'}, {k:'Rooftops below plan',v:'2',s:'of 6',tone:'warn'} ],
        listTitle:'This cycle', listSub:'Every rooftop’s number traces back to its own deals.',
        rows:[ {n:'Rooftop 1',d:'34 deals',v:'$1.1M'}, {n:'Rooftop 2',d:'29 deals',v:'$980K'}, {n:'National online desk',d:'46 units',v:'$2.6M'}, {n:'Group service & parts',d:'6 rooftops',v:'$680,000'} ] },
      sections:[
        { id:'dash', label:'Dashboard', icon:'M3 13h8V3H3zM13 21h8v-10h-8zM13 3v6h8V3zM3 21h8v-6H3z' },
        { id:'deals', label:'Rooftops', icon:'M3 7h18v13H3zM3 7l3-4h12l3 4M9 12h6' },
        { id:'people', label:'GMs', icon:'M16 20v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8' },
        { id:'money', label:'Revenue', icon:'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
        { id:'suite', label:'Everything inside', icon:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' }
      ]
    },

    targeted: {
      id:'targeted', hub:'Targeted Hub', trade:'Marketing agency',
      acc:'#d97a2e', acc2:'#a8461f',
      firm:'North Loop Creative', firmSub:'9 people · Boise, Idaho',
      who:'a nine-person marketing agency', priceId:'targeted',
      kpis:[
        { k:'Active clients', v:'18', s:'3 onboarding', tone:'' },
        { k:'Campaigns live', v:'24', s:'6 launching this week', tone:'good' },
        { k:'Pipeline value', v:'$340,000', s:'11 proposals out', tone:'' },
        { k:'Invoices overdue', v:'2', s:'$8,400 outstanding', tone:'warn' }
      ],
      chart:{ title:'Billed revenue', unit:'$k', months:['Feb','Mar','Apr','May','Jun','Jul'], vals:[38,41,39,46,44,49] },
      funnel:[ {s:'New leads',n:22}, {s:'Discovery call',n:14}, {s:'Proposal sent',n:11}, {s:'Contract signed',n:8}, {s:'Onboarded',n:6} ],
      funnelTitle:'Where every account stands', funnelSub:'Lead to onboarded, one pipeline instead of a shared inbox.',
      today:[
        { t:'Proposal due', w:'Meridian Dental — full-funnel', when:'Today, 5:00pm', tone:'warn' },
        { t:'Campaign launches', w:'Fall push — 3 clients', when:'Today', tone:'good' },
        { t:'Invoice overdue', w:'2 clients, $8,400', when:'This week', tone:'warn' },
        { t:'Quarterly client check-in', w:'North Bench Realty', when:'Fri', tone:'' }
      ],
      peopleSub:'Account load and campaign count on the same card.',
      people:[
        { n:'C. Alvarado', r:'Account manager', d:'5 clients · 7 campaigns', flag:'' },
        { n:'H. Okumura', r:'Designer', d:'9 active projects', flag:'' },
        { n:'B. Solstad', r:'Media buyer', d:'12 campaigns live', flag:'' },
        { n:'Front desk / ops', r:'Billing & scheduling', d:'18 clients', flag:'2 invoices overdue' }
      ],
      dealsMeta:{ h1:'Pipeline', sub:'Every account and every campaign, one list.', cols:['Client','Value','Stage','Owner','Next'] },
      deals:[
        { a:'Meridian Dental', p:'$4,200/mo', st:'Proposal sent', ag:'C. Alvarado', d:'Due today', tone:'warn' },
        { a:'North Bench Realty', p:'$2,800/mo', st:'Active', ag:'C. Alvarado', d:'Check-in Fri', tone:'good' },
        { a:'Timberline Outfitters', p:'$3,600/mo', st:'Discovery call', ag:'B. Solstad', d:'—', tone:'' },
        { a:'Coeur Creamery', p:'$1,900/mo', st:'New lead', ag:'unassigned', d:'—', tone:'' },
        { a:'Ridgeline Dental Group', p:'$5,100/mo', st:'Onboarded', ag:'H. Okumura', d:'Launched', tone:'good' }
      ],
      money:{ h1:'Billing', sub:'Retainers and project invoices tied to the work, not a separate ledger.',
        kpis:[ {k:'Billed this month',v:'$49,000',s:'18 clients',tone:'good'}, {k:'Overdue',v:'$8,400',s:'2 clients',tone:'warn'}, {k:'Retainer clients',v:'14',s:'of 18'}, {k:'Project invoices',v:'4',s:'this month'} ],
        listTitle:'This cycle', listSub:'Each line traces back to the client and campaign it came from.',
        rows:[ {n:'C. Alvarado book',d:'5 clients',v:'$14,800'}, {n:'B. Solstad book',d:'media spend + fees',v:'$16,200'}, {n:'H. Okumura projects',d:'4 project invoices',v:'$9,600'}, {n:'Overdue — 2 clients',d:'follow-up sent',v:'$8,400'} ] },
      sections:[
        { id:'dash', label:'Dashboard', icon:'M3 13h8V3H3zM13 21h8v-10h-8zM13 3v6h8V3zM3 21h8v-6H3z' },
        { id:'deals', label:'Pipeline', icon:'M3 7h18v13H3zM3 7l3-4h12l3 4M9 12h6' },
        { id:'people', label:'Team', icon:'M16 20v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8' },
        { id:'money', label:'Billing', icon:'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
        { id:'suite', label:'Everything inside', icon:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' }
      ]
    }

  };

  /* THE FULL SUITE — every tool category a business of this kind runs, in one system.
     This is the completeness claim, stated as a wall of working modules: nothing on this
     list lives in another vendor's tab. Shared core + trade-specific labels per hub. */
  function suiteFor(t) {
    var tradeTools = {
      realestate:  [ ['Listings & MLS-ready sheets','every property, photos, docs'], ['Transaction files','contract to close, compliance-complete'], ['Commission engine','splits, caps, disbursement'], ['Showing scheduler','tours booked off the listing'] ],
      architecture:[ ['Project phases & RFIs','SD through CA, tracked'], ['Drawing set log','issues, revisions, transmittals'], ['Consultant portal','markups in, without email chains'], ['Fee & phase billing','earned value, auto-invoiced'] ],
      engineering: [ ['Submittal tracking','in, reviewed, returned'], ['Calc & QA queue','who stamped what, when'], ['Field reports','photos and notes from the site'], ['Sub-consultant ledger','owed and owing'] ],
      theater:     [ ['Box office & seat map','your real house, reserved seating'], ['Season & production board','rights, budgets, casts'], ['Volunteer & crew roster','house crews fill themselves'], ['Donor & patron records','giving history beside ticket history'] ],
      cinema:      [ ['Showtimes & seat maps','every screen, every seat'], ['Distributor settlement','splits computed off real grosses'], ['Membership engine','perks, renewals, member nights'], ['Concessions tracking','per-head, per-show'] ],
      concerts:    [ ['Ticketing — GA & reserved','holds, presales, comps'], ['Artist settlement builder','from actual counts and expenses'], ['Advance sheets','riders, input lists, day-of'], ['Bar & merch reconciliation','per-show, automatic'] ],
      kidsgym:     [ ['Class scheduling & rosters','spots, waitlists, make-ups'], ['Enrollment & waivers','signed before first class, enforced'], ['Tuition autopay','prorates and sibling discounts'], ['Parent portal & messaging','one place parents actually check'] ],
      showroom:    [ ['Inventory & VIN decoding','every unit, photos, condition'], ['Sales desk','deal structuring, trade values'], ['Recon & service tracking','in, worked, ready for photos'], ['F&I menu','financing and aftermarket, on the deal'] ],
      driveline:   [ ['Sales desk','deal structuring across the rooftop'], ['Service scheduling','bays, loaners, ROs'], ['Parts tracking','on hand, on order, backordered'], ['OEM incentive tracking','current programs on every deal'] ],
      motorcade:   [ ['Multi-rooftop inventory','stock and transfers across rooftops'], ['Group sales desk','every rooftop, one pipeline'], ['National online desk','online-first sales, any rooftop'], ['Group reporting','every rooftop, one rollup'] ],
      targeted:    [ ['Client & pipeline CRM','every account, every stage'], ['Campaign tracking','live status per client, per channel'], ['Proposals & estimator','scoped and quoted fast'], ['Agent org / team roles','who owns what, at a glance'] ]
    };
    var core = [
      ['CRM & pipeline','every contact, every stage'],
      ['Calendar & scheduling','the whole operation, one calendar'],
      ['Documents & e-signature','send, sign, filed automatically'],
      ['Invoicing & books','money tied to the work it came from'],
      ['Email & marketing','campaigns from your own records'],
      ['Team & HR records','licenses, certs, renewals — flagged before they lapse'],
      ['Messaging & video calls','built in, no third-party seats'],
      ['Reports & dashboards','the numbers, live, not exported'],
      ['Your website','same system, same brand'],
      ['AI assistant','answers from your data, drafts in your voice']
    ];
    return (tradeTools[t.id] || []).concat(core);
  }

  root.AEShowroom = {
    TRADES: TRADES,
    get: function (id) { return TRADES[id] || TRADES.realestate; },
    list: function () { return Object.keys(TRADES); },
    suiteFor: suiteFor
  };
})(window);
