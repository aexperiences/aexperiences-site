/* ============================================================================
   showroom-org.js — drops "The AI team" section into EVERY showroom floor.
   Accelerated Experiences, LLC.

   This is the differentiator: the hub doesn't just hold the data, it RUNS itself.
   Anthony's hierarchy, live on the floor: Founder → COO (the interface machine)
   → Department Head → Administrative Executive → the Event Bus → Pacemaker →
   a Triad of two opposing lenses. Info flows up, tasking flows down. Every
   decision clears a confidence bar or it holds and escalates — nothing bluffs.

   One engine, every vertical: showroom.html loads this after showroom-config.js
   and before its own render, so the section is injected into all trades at once.
   No data is real — it's a working demo you cannot break.
   ============================================================================ */
(function (root) {
  "use strict";
  if (!root.AEShowroom || !root.AEShowroom.TRADES) return;

  /* ---- the org, universal to any company-in-a-box hub ---- */
  var DEPTS = [
    { key:"sales", name:"New Business", tone:"var(--gold)", gate:80,
      dh:"Head of New Business", ae:"Pipeline Executive", pace:"Pitch · Pacemaker",
      lensA:"Hunter — chase the upside", lensB:"Guard — is it real & funded?",
      does:"Turns leads into signed work; sets appointments and books demos for a human to run." },
    { key:"money", name:"Money", tone:"var(--good)", gate:85,
      dh:"Head of Accounting", ae:"Books Executive", pace:"Pace · Pacemaker",
      lensA:"Ledger — what actually cleared", lensB:"Margin — does it clear the GPM?",
      does:"Prices the work, watches the margin, and never green-lights a number it can't prove. Highest bar in the shop." },
    { key:"production", name:"Production", tone:"var(--acc)", gate:80,
      dh:"Head of Delivery", ae:"Delivery Executive", pace:"Rhythm · Pacemaker",
      lensA:"Maker — the fastest good path", lensB:"Breaker — where does it fall apart?",
      does:"Owns getting the work out the door on time; sequences the build and flags the slip before it happens." },
    { key:"creative", name:"Creative", tone:"var(--acc2)", gate:80,
      dh:"Creative Director", ae:"Studio Executive", pace:"Vera · Pacemaker",
      lensA:"Iris — the boldest idea", lensB:"Cade — is it on-brand & ready?",
      does:"The taste of the shop. Brand systems, pages, campaigns — held to a real bar before anything ships." },
    { key:"ops", name:"Operations", tone:"var(--cream-2)", gate:80,
      dh:"Head of Operations", ae:"Records Executive", pace:"Cadence · Pacemaker",
      lensA:"Order — the cleanest process", lensB:"Flow — where's the bottleneck?",
      does:"The connective tissue. Owns the filing cabinet and the follow-up calendar so nothing drops." }
  ];

  /* deterministic per-department verdicts — flavored with the firm name, honest as a demo */
  function verdictFor(key, firm) {
    var V = {
      sales:{ stance:"Close the two late-stage deals this week before chasing new leads — "+firm+" has more signed work waiting on a signature than in the funnel.", conf:82,
        reasons:[["data","Late-stage deals outweigh open discovery in the pipeline right now."],["data","The last won account came from the exact same motion — it's repeatable."],["assumption","Assumes both budgets are funded; one may slip to next quarter."]] },
      money:{ stance:"Hold the standard margin — don't discount to win the big logo. "+firm+" clears its bar on real cost; a cut here pollutes every job after it.", conf:71,
        reasons:[["data","Recent jobs held margin within 5% of quote."],["data","Collected-to-quoted ratio is healthy this cycle."],["assumption","The big deal's true delivery cost is un-estimated — pricing before scoping risks the bar."]] },
      production:{ stance:"Ship the signed work first, stage the gated job behind its approval — don't start a build you can't publish yet.", conf:80,
        reasons:[["data","One job is signed and scheduled; another waits on an outside approval."],["data","Two workstreams are already live — capacity is committed."],["assumption","Assumes approvals land on time; a slip pushes the launch a week."]] },
      creative:{ stance:"Release the approved asset; hold the new brand direction for one more pass before it goes to paid — "+firm+"'s name rides on it.", conf:78,
        reasons:[["data","One asset cleared the craft bar; the rest are still pre-approval."],["data","Every mark is tested at small size and grayscale before it leaves the desk."],["assumption","Assumes the client signs off on the palette — brand-canon changes route to the founder."]] },
      ops:{ stance:"Tighten the handoff between Creative and delivery — approved work is the bottleneck holding two timelines.", conf:80,
        reasons:[["data","Pre-approval items are gating the next stage of work."],["data","Every released decision is filed with a calendar follow-up — nothing drops silently."],["assumption","Assumes current staffing; a spike in new business needs a capacity review first."]] }
    };
    return V[key] || V.sales;
  }

  /* ---- one-time styles, in the floor's own forest/gold language ---- */
  function injectStyles() {
    if (document.getElementById("ae-org-css")) return;
    var s = document.createElement("style"); s.id = "ae-org-css";
    s.textContent = [
      ".org-lead{background:rgba(224,168,58,.08);border:1px solid rgba(224,168,58,.3);border-radius:16px;padding:18px 18px;margin-bottom:18px}",
      ".org-lead h3{margin:0 0 6px;font-size:16px}",
      ".org-lead p{margin:0;font-size:13.5px;line-height:1.6;color:var(--cream-2);max-width:74ch}",
      ".org-chain{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0 2px;font-family:var(--mono);font-size:11.5px;color:var(--cream-2)}",
      ".org-chain b{color:var(--gold)}",
      ".org-chain .ar{color:var(--mute)}",
      ".org-grid{display:grid;grid-template-columns:1fr;gap:12px}",
      "@media(min-width:820px){.org-grid{grid-template-columns:repeat(2,1fr)}}",
      "@media(min-width:1180px){.org-grid{grid-template-columns:repeat(3,1fr)}}",
      ".dept{border:1px solid var(--line);border-radius:14px;padding:14px 15px;background:rgba(255,255,255,.035)}",
      ".dept .dh{display:flex;align-items:center;gap:9px;margin-bottom:8px}",
      ".dept .sw{width:10px;height:10px;border-radius:3px;flex:none}",
      ".dept .dn{font-weight:800;font-size:15px}",
      ".dept .bar{margin-left:auto;font-family:var(--mono);font-size:10.5px;color:var(--mute)}",
      ".dept .does{font-size:12.5px;color:var(--cream-2);line-height:1.5;margin-bottom:10px}",
      ".seat{display:flex;gap:8px;font-size:12px;color:var(--cream-2);padding:3px 0}",
      ".seat .rl{font-family:var(--mono);font-size:9.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--mute);flex:none;width:52px;padding-top:1px}",
      ".triad{margin-top:8px;padding-top:8px;border-top:1px dashed var(--line)}",
      ".cbar{height:7px;border-radius:5px;background:rgba(255,255,255,.09);overflow:hidden;margin-top:10px}",
      ".cbar i{display:block;height:100%;border-radius:5px;background:linear-gradient(90deg,var(--bad),var(--warn),var(--good))}",
      ".cmeta{display:flex;justify-content:space-between;font-size:10.5px;color:var(--mute);margin-top:4px}",
      ".cmeta b{color:var(--cream)}",
      ".bus{background:var(--forest-dd);border:1px solid var(--line);border-radius:14px;padding:8px;max-height:300px;overflow:auto;display:flex;flex-direction:column;gap:7px}",
      ".ev{border:1px solid var(--line);border-radius:10px;padding:9px 11px;background:rgba(255,255,255,.03);animation:aeorgin .3s ease}",
      "@keyframes aeorgin{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}",
      ".ev.concl{border-color:var(--gold);background:rgba(224,168,58,.07)}",
      ".ev .top{display:flex;gap:8px;align-items:center;font-size:10.5px;color:var(--mute);font-family:var(--mono);margin-bottom:4px}",
      ".ev .top .k{margin-left:auto;text-transform:uppercase;letter-spacing:.05em}",
      ".ev .bd{font-size:12.5px;color:var(--cream-2);line-height:1.45}",
      ".rz{display:flex;flex-direction:column;gap:4px;margin-top:8px}",
      ".rz .r{display:flex;gap:7px;font-size:12px;color:var(--cream-2)}",
      ".rz .tg{font-size:9px;text-transform:uppercase;letter-spacing:.04em;padding:1px 6px;border-radius:5px;height:fit-content;margin-top:1px;flex:none}",
      ".rz .tg.data{background:rgba(111,201,138,.16);color:var(--good)}",
      ".rz .tg.assumption{background:rgba(224,168,58,.16);color:var(--warn)}",
      ".askrow{display:flex;gap:9px;flex-wrap:wrap;margin:2px 0 4px}",
      ".askrow select,.askrow input{min-height:42px;border-radius:11px;border:1.5px solid var(--line-2);background:rgba(255,255,255,.05);color:var(--cream);font:inherit;font-size:14px;padding:0 12px}",
      ".askrow input{flex:1;min-width:220px}",
      ".askbtn{min-height:42px;padding:0 18px;border-radius:11px;font-weight:700;font-size:14px;background:linear-gradient(180deg,var(--acc),var(--acc2));color:#fff;border:none}"
    ].join("");
    document.head.appendChild(s);
  }

  function esc(x){ return String(x==null?"":x).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c];}); }

  function deptCard(d, firm) {
    var v = verdictFor(d.key, firm);
    return '<div class="dept">'
      + '<div class="dh"><span class="sw" style="background:'+d.tone+'"></span><span class="dn">'+esc(d.name)+'</span>'
        + '<span class="bar">bar '+d.gate+'%</span></div>'
      + '<div class="does">'+esc(d.does)+'</div>'
      + '<div class="seat"><span class="rl">DH</span><span>'+esc(d.dh)+' — owns the "so what".</span></div>'
      + '<div class="seat"><span class="rl">AE</span><span>'+esc(d.ae)+' — packages it, files it, keeps the calendar.</span></div>'
      + '<div class="triad">'
        + '<div class="seat"><span class="rl">Pace</span><span>'+esc(d.pace)+' — the only voice out of the triad.</span></div>'
        + '<div class="seat"><span class="rl">Lens</span><span>'+esc(d.lensA)+'</span></div>'
        + '<div class="seat"><span class="rl">Lens</span><span>'+esc(d.lensB)+' — they never confer; opposing reads are the point.</span></div>'
      + '</div>'
      + '<div class="cbar"><i style="width:'+v.conf+'%"></i></div>'
      + '<div class="cmeta"><span>last read <b>'+v.conf+'%</b></span><span>'+(v.conf>=d.gate?"released ✓":"held — needs a human")+'</span></div>'
      + '</div>';
  }

  function busSeed(firm) {
    return [
      { topic:"sot.read", k:"route", bd:"Every seat is called to the Source of Truth and reads it before acting. Loaded ✓" },
      { topic:"ae.packaged", k:"route", bd:"The Assistant packages the ask and routes it down the bus to the triad." },
      { topic:"triad.finding", k:"deliberate", bd:"Lens A argues the upside; Lens B pushes back on what isn't sourced. They never confer." },
      { topic:"pacemaker.released", k:"conclude", bd:"Pacemaker clears the confidence bar and releases one clean answer up to the COO.", concl:true },
      { topic:"ae.lateral", k:"route", bd:"Assistants coordinate laterally with the next department — same position, no chain needed." },
      { topic:"coo.decision", k:"route", bd:"The COO — a machine of its own — packages it for "+firm+"'s owner and keeps every department on track." }
    ];
  }

  function evHtml(e) {
    return '<div class="ev'+(e.concl?" concl":"")+'"><div class="top"><span>'+esc(e.topic)+'</span><span class="k">'+esc(e.k)+'</span></div>'
      + '<div class="bd">'+esc(e.bd)+'</div></div>';
  }

  root.AEOrg = {
    render: function (T) {
      injectStyles();
      var firm = (T && T.firm) || "your team";
      var hub = (T && T.hub) || "this hub";
      var busId = "aeorg-bus-"+Math.random().toString(36).slice(2,7);

      var html = ''
        + '<div class="h"><div><h1>The AI team</h1>'
          + '<p class="sub">'+esc(hub)+' doesn\'t just hold your data — it runs itself. This is the chain of command that ships the work.</p></div></div>'

        + '<div class="org-lead"><h3>How it runs</h3>'
          + '<p>Every department is a real chain — a <b>Department Head</b> who owns the call, an <b>Administrative Executive</b> who packages and files it, and a <b>Triad</b> of two opposing lenses whose only voice out is the <b>Pacemaker</b>. Information flows up, tasking flows down, and nothing leaves a triad until it clears a confidence bar. Above them all, the <b>COO</b> is a machine of its own — the single interface between the departments and you. The goal is that almost nothing reaches your desk; only true fences — sending, spending, publishing, pricing, or booking a human — ever do.</p>'
          + '<div class="org-chain"><b>Founder</b><span class="ar">→</span><b>COO</b><span class="ar">→</span>Dept Head<span class="ar">→</span>Assistant<span class="ar">→</span><b>Event&nbsp;Bus</b><span class="ar">→</span>Pacemaker<span class="ar">→</span>Triad</div>'
        + '</div>'

        + '<div class="org-grid">' + DEPTS.map(function(d){ return deptCard(d, firm); }).join("") + '</div>'

        + '<div class="cols" style="margin-top:16px"><div>'
          + '<div class="card"><h3>Ask the team</h3><p class="cs">Route a question through the org. The triad argues it, the Pacemaker gates it on its bar, and it either clears to the COO or escalates to you.</p>'
            + '<div class="askrow"><select id="'+busId+'-dept">'+DEPTS.map(function(d){return '<option value="'+d.key+'">'+esc(d.name)+' — bar '+d.gate+'%</option>';}).join("")+'</select>'
            + '<input id="'+busId+'-q" placeholder="e.g. Should we discount to win the big account?">'
            + '<button class="askbtn" id="'+busId+'-go">Send it down the chain ▾</button></div>'
            + '<div id="'+busId+'-ans"></div>'
          + '</div>'
        + '</div><div>'
          + '<div class="card"><h3>Live event bus</h3><p class="cs">Every hop is logged — the audit trail. Nothing drops silently.</p>'
            + '<div class="bus" id="'+busId+'-feed">' + busSeed(firm).map(evHtml).join("") + '</div>'
          + '</div>'
        + '</div></div>'

        + '<div class="cta"><h3>This is the engine, not a diagram</h3>'
          + '<p>The same org runs behind every screen in '+esc(hub)+' — pricing the work, drafting the campaign, watching the margin, keeping the calendar. In the live build it runs on real models under Ghost Mode: it drafts and proposes, and only you dispose.</p>'
          + '<div class="btnrow"><a class="btn btn-p" href="/shop.html#'+esc((T&&T.priceId)||"")+'">See pricing</a>'
          + '<a class="btn btn-g" href="mailto:anthonye@aexperiences.studio?subject='+encodeURIComponent(hub+" — the AI team")+'">Ask us anything</a></div></div>';

      // wire the interaction after this HTML is mounted by the engine
      setTimeout(function () {
        var go = document.getElementById(busId+"-go"); if (!go) return;
        go.addEventListener("click", function () {
          var key = document.getElementById(busId+"-dept").value;
          var d = DEPTS.filter(function(x){return x.key===key;})[0] || DEPTS[0];
          var v = verdictFor(key, firm);
          var pass = v.conf >= d.gate;
          var ans = document.getElementById(busId+"-ans");
          ans.innerHTML = '<div class="ev concl" style="margin-top:12px">'
            + '<div class="top"><span>'+key+'.pacemaker</span><span class="k">'+(pass?"released":"held")+'</span></div>'
            + '<div class="bd">'+esc(v.stance)+'</div>'
            + '<div class="cbar"><i style="width:'+v.conf+'%"></i></div>'
            + '<div class="cmeta"><span>confidence <b>'+v.conf+'%</b></span><span>bar <b>'+d.gate+'%</b> · '+(pass?"cleared → COO":"held → founder")+'</span></div>'
            + '<div class="rz">'+v.reasons.map(function(r){return '<div class="r"><span class="tg '+r[0]+'">'+r[0]+'</span><span>'+esc(r[1])+'</span></div>';}).join("")+'</div>'
            + '</div>';
          // push a couple of events onto the bus
          var feed = document.getElementById(busId+"-feed");
          if (feed) {
            feed.insertAdjacentHTML("afterbegin", evHtml({ topic:key+".ae.packaged", k:"route", bd:d.ae+" packaged the ask and routed it to the triad." }));
            feed.insertAdjacentHTML("afterbegin", evHtml({ topic: pass?key+".pacemaker.released":"escalation.below_bar", k: pass?"conclude":"reject",
              bd: pass ? (d.pace+" cleared the "+d.gate+"% bar and released it up to the COO.")
                       : (d.pace+" held below the "+d.gate+"% bar ("+v.conf+"%) — needs a human. Escalated to the founder."), concl:true }));
          }
        });
      }, 0);

      return html;
    }
  };

  /* inject the section into EVERY trade, right before "Everything inside" (or at the end) */
  var TR = root.AEShowroom.TRADES;
  var ICON = "M12 3a3 3 0 0 1 3 3 3 3 0 0 1-2 2.8V11h5a2 2 0 0 1 2 2v1.2A3 3 0 0 1 21 17a3 3 0 1 1-4-2.8V13h-5v1.2A3 3 0 0 1 13 20a3 3 0 1 1-2-5.8V13H6v1.2A3 3 0 1 1 3 17a3 3 0 0 1 2-2.8V13a2 2 0 0 1 2-2h4V8.8A3 3 0 0 1 9 6a3 3 0 0 1 3-3z";
  Object.keys(TR).forEach(function (k) {
    var t = TR[k];
    if (!t.sections || t.sections.some(function(s){return s.id==="org";})) return;
    var item = { id:"org", label:"The AI team", icon:ICON };
    var suiteIdx = -1;
    for (var i=0;i<t.sections.length;i++){ if (t.sections[i].id==="suite"){ suiteIdx=i; break; } }
    if (suiteIdx >= 0) t.sections.splice(suiteIdx, 0, item);
    else t.sections.push(item);
  });
})(window);
