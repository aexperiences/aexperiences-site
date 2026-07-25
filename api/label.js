/*! api/label.js — ESPOvineyard · turn a photo of a wine label into fields
 *  Accelerated Experiences LLC
 *
 *  CREDENTIALS — either one works, and this file does NOT change when you switch:
 *    ANTHROPIC_API_KEY   → talks to api.anthropic.com directly
 *    AI_GATEWAY_API_KEY  → talks to Vercel AI Gateway, which speaks the same
 *                          Anthropic Messages format (model anthropic/claude-haiku-4.5)
 *  Whichever one is present in the project's environment gets used. If NEITHER is set
 *  the endpoint answers { ok:false, reason:"no-key" } and the app quietly falls back to
 *  typing the bottle in by hand. Nothing breaks — it just stays manual.
 *
 *  The photo is used for exactly one request and is never stored anywhere.
 */

var SYSTEM = [
  "You read wine labels from photographs.",
  "Return ONLY a JSON object — no prose, no code fences — with exactly these keys:",
  '{"wine":"","winery":"","vintage":"","varietal":""}',
  'wine     = the bottling or cuvee name as printed (e.g. "Dry Riesling", "Estate Cabernet Sauvignon").',
  "winery   = the producer name as printed.",
  'vintage  = the four-digit year, or "" if the label shows none (non-vintage bottles have none).',
  'varietal = the grape, if the label states it. Leave "" if it does not.',
  'Use "" for anything you cannot actually read. An empty field is correct; a guess is not.',
  "Never invent a producer, a name, or a year that is not visibly printed on the label."
].join("\n");

function readBody(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  if (typeof req.body === "string") {
    try { return Promise.resolve(JSON.parse(req.body)); } catch (e) { return Promise.resolve({}); }
  }
  return new Promise(function (resolve) {
    var raw = "";
    req.on("data", function (c) { raw += c; });
    req.on("end", function () { try { resolve(JSON.parse(raw)); } catch (e) { resolve({}); } });
    req.on("error", function () { resolve({}); });
  });
}

function clean(v) { return typeof v === "string" ? v.trim().slice(0, 120) : ""; }

module.exports = async function (req, res) {
  if (req.method !== "POST") { res.status(405).json({ ok: false, reason: "method" }); return; }

  var direct  = process.env.ANTHROPIC_API_KEY;
  var gateway = process.env.AI_GATEWAY_API_KEY;
  var base, key, model, via;

  if (direct) {
    base = "https://api.anthropic.com";    key = direct;  model = "claude-haiku-4-5-20251001"; via = "anthropic";
  } else if (gateway) {
    base = "https://ai-gateway.vercel.sh"; key = gateway; model = "anthropic/claude-haiku-4.5"; via = "gateway";
  } else {
    res.status(200).json({ ok: false, reason: "no-key" }); return;
  }

  key = String(key).trim();   // a pasted key often carries a trailing newline

  var body = await readBody(req);
  var img = body && body.image;
  if (!img || typeof img !== "string") { res.status(200).json({ ok: false, reason: "no-image" }); return; }

  var m = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+\/=]+)$/.exec(img.trim());
  if (!m) { res.status(200).json({ ok: false, reason: "bad-image" }); return; }
  var mediaType = m[1] === "image/jpg" ? "image/jpeg" : m[1];
  var data = m[2];
  if (data.length > 7000000) { res.status(200).json({ ok: false, reason: "too-big" }); return; }

  try {
    var r = await fetch(base + "/v1/messages", {
      method: "POST",
      headers: via === "gateway"
        ? { "Content-Type": "application/json", "authorization": "Bearer " + key, "anthropic-version": "2023-06-01" }
        : { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: model,
        max_tokens: 300,
        system: SYSTEM,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: data } },
            { type: "text", text: "Read this wine label and return the JSON." }
          ]
        }]
      })
    });

    if (!r.ok) {
      var errText = "";
      try { errText = await r.text(); } catch (e) {}
      res.status(200).json({
        ok: false, reason: "upstream", via: via, status: r.status,
        detail: String(errText).slice(0, 300)
      });
      return;
    }

    var j = await r.json();
    var text = "";
    if (j && Array.isArray(j.content)) {
      for (var i = 0; i < j.content.length; i++) {
        if (j.content[i] && j.content[i].type === "text") text += j.content[i].text;
      }
    }
    text = String(text).replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();

    var out = null;
    try { out = JSON.parse(text); } catch (e) {
      var g = text.match(/\{[\s\S]*\}/);
      if (g) { try { out = JSON.parse(g[0]); } catch (e2) { out = null; } }
    }
    if (!out || typeof out !== "object") {
      res.status(200).json({ ok: false, reason: "unreadable", via: via }); return;
    }

    var vintage = clean(out.vintage);
    if (!/^\d{4}$/.test(vintage)) vintage = "";

    var fields = {
      wine: clean(out.wine),
      winery: clean(out.winery),
      vintage: vintage,
      varietal: clean(out.varietal)
    };

    // Answer in both shapes so any caller — old or new — finds what it expects.
    res.status(200).json({
      ok: true, via: via, fields: fields,
      wine: fields.wine, winery: fields.winery, vintage: fields.vintage, varietal: fields.varietal
    });
  } catch (e) {
    res.status(200).json({ ok: false, reason: "error", detail: String((e && e.message) || e).slice(0, 200) });
  }
};
