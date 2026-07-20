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
        { id:'suite', label:'Everything inside', icon:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' }
      ]
    },

    theater: {
      id:'theater', hub:'Marquee Hub', trade:'Live theater', acc:'#e0b24a', acc2:'#b8902f',
      firm:'Granite Box Theatre', firmSub:'149 seats · community company', who:'a community theater', priceId:'marquee',
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
        { id:'suite', label:'Everything inside', icon:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' }
      ]
    },

    cinema: {
      id:'cinema', hub:'Reel Hub', trade:'Cinema', acc:'#8a6fd6', acc2:'#6b52b0',
      firm:'The Orpheum', firmSub:'3 screens · downtown single-site', who:'a three-screen independent', priceId:'reel',
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
        { id:'suite', label:'Everything inside', icon:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' }
      ]
    },

    concerts: {
      id:'concerts', hub:'Encore Hub', trade:'Concerts & venues', acc:'#d65f8a', acc2:'#b04068',
      firm:'The Foundry', firmSub:'450 cap · club venue', who:'a 450-cap club', priceId:'encore',
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
        { id:'suite', label:'Everything inside', icon:'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' }
      ]
    },

    kidsgym: {
      id:'kidsgym', hub:'Cartwheel Hub', trade:'Kids gyms & programs', acc:'#4aa3d6', acc2:'#3480ad',
      firm:'Tumble Town', firmSub:'2 gyms · 340 families', who:'a two-location kids gym', priceId:'cartwheel',
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
      kidsgym:     [ ['Class scheduling & rosters','spots, waitlists, make-ups'], ['Enrollment & waivers','signed before first class, enforced'], ['Tuition autopay','prorates and sibling discounts'], ['Parent portal & messaging','one place parents actually check'] ]
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
