/* =============================================================================
   ae-flava.js — the small behavioural half of the Command Center polish layer.
   Accelerated Experiences LLC.

   CSS does the heavy lifting. This only does the two things CSS cannot:
     1. Moves a bar's value label INSIDE the fill when it fits, so the eye does
        not have to travel to the right margin and back.
     2. Counts the big KPI numbers up on first paint — brief, and it respects
        prefers-reduced-motion. Only on the Command Center, never elsewhere.
   Purely additive: if anything here fails, the page is exactly as it was.
   ============================================================================= */
(function(){
  if (typeof document === "undefined") return;
  if (!/dashboard/.test(location.pathname)) return;
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function labelBarsInline(){
    var rows = document.querySelectorAll(".card table tbody tr");
    [].forEach.call(rows, function(tr){
      var wrap = tr.querySelector(".barwrap"); if(!wrap || wrap.dataset.flava) return;
      var bar = wrap.querySelector(".bar"); if(!bar) return;
      var val = tr.querySelector("td.right, td.r"); if(!val) return;
      var pct = parseFloat(bar.style.width||"0");
      if(!(pct >= 34)) return;                 // only when the fill can actually hold text
      wrap.dataset.flava = "1";
      var tag = document.createElement("span");
      tag.textContent = val.textContent.trim();
      tag.setAttribute("style",
        "position:absolute;left:9px;top:50%;transform:translateY(-50%);font:600 10.5px/1 var(--mono,monospace);"+
        "color:#fff;letter-spacing:.02em;pointer-events:none;text-shadow:0 1px 2px rgba(0,0,0,.28)");
      wrap.style.position = "relative";
      wrap.appendChild(tag);
    });
  }

  function countUp(){
    if (REDUCED) return;
    var vals = document.querySelectorAll(".stats > .stat .s-v, .statrow > .stat .s-v");
    [].forEach.call(vals, function(el){
      if (el.dataset.flava) return;
      var raw = el.textContent.trim();
      var m = raw.match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/);
      if (!m) return;
      var target = parseFloat(m[2].replace(/,/g,""));
      if (!isFinite(target) || target <= 0 || target > 100000000) return;
      el.dataset.flava = "1";
      var dp = (m[2].split(".")[1]||"").length, t0 = null, DUR = 520;
      function fmt(n){
        var s = dp ? n.toFixed(dp) : String(Math.round(n));
        if (m[2].indexOf(",") >= 0) {
          var p = s.split("."); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
          s = p.join(".");
        }
        return m[1] + s + m[3];
      }
      function step(t){
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / DUR);
        var e = 1 - Math.pow(1 - k, 3);          // ease-out, settles rather than stops
        el.textContent = fmt(target * e);
        if (k < 1) requestAnimationFrame(step); else el.textContent = raw;
      }
      el.textContent = fmt(0);
      requestAnimationFrame(step);
    });
  }

  function run(){ try{ labelBarsInline(); countUp(); }catch(e){} }
  function boot(){ run(); setTimeout(run,300); setTimeout(run,900); setTimeout(run,1800); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
