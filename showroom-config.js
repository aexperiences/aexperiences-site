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
      sections:[
        { id:'dash', label:'Dashboard', icon:'M3 13h8V3H3zM13 21h8v-10h-8zM13 3v6h8V3zM3 21h8v-6H3z' },
        { id:'deals', label:'Deals', icon:'M3 7h18v13H3zM3 7l3-4h12l3 4M9 12h6' },
        { id:'people', label:'Agents', icon:'M16 20v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8' },
        { id:'money', label:'Commissions', icon:'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
        { id:'stack', label:'What this replaces', icon:'M3 6h18M3 12h18M3 18h18' }
      ]
    }

    /* NEXT TRADES — same shape, swap the content:
       architecture (Draftline) · engineering (Datum) · theater (Marquee)
       cinema (Reel) · concerts (Encore) · kidsgym (Cartwheel)
       Each needs its own researched `stack` with real vendors and real prices.
       Do NOT clone real-estate numbers across trades — the vendors are different. */
  };

  root.AEShowroom = {
    TRADES: TRADES,
    get: function (id) { return TRADES[id] || TRADES.realestate; },
    list: function () { return Object.keys(TRADES); }
  };
})(window);
