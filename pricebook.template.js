

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

  var ID      = "__PRODUCT_ID__";                        /* this product, in the store catalog */
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
