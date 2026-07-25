// api/label.js — read a wine label photo and return structured fields.
// Uses ANTHROPIC_API_KEY already provisioned on this project (same as api/brian.js).
// The photo is used only to read the label. Nothing is stored server-side.

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ ok: false, reason: "POST only" }); return; }

  var key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(200).json({ ok: false, reason: "no-key" }); return; }

  try {
    var body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
    var img = (body && body.image) || "";
    var m = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+\/=]+)$/.exec(img);
    if (!m) { res.status(400).json({ ok: false, reason: "bad-image" }); return; }

    var mediaType = m[1] === "image/jpg" ? "image/jpeg" : m[1];
    var data = m[2];
    if (data.length > 4000000) { res.status(413).json({ ok: false, reason: "too-large" }); return; }

    var SYSTEM = [
      "You read wine bottle labels.",
      "Reply with ONLY a JSON object. No prose, no markdown, no code fence.",
      "Keys exactly: wine, winery, vintage, varietal.",
      "wine is the name of the bottling. winery is the producer.",
      "vintage is a 4-digit year, or empty string if no year is printed.",
      "varietal is the grape or style if printed, else empty string.",
      "Use an empty string for anything you cannot read with confidence.",
      "Never invent a producer, a name, or a year that is not visibly printed on the label."
    ].join(" ");

    var r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
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

    if (!r.ok) { res.status(200).json({ ok: false, reason: "upstream-" + r.status }); return; }

    var j = await r.json();
    var txt = (j && j.content && j.content[0] && j.content[0].text) || "";
    txt = txt.replace(/[`]{3}json/g, "").replace(/[`]{3}/g, "").trim();

    var out;
    try { out = JSON.parse(txt); } catch (e) { res.status(200).json({ ok: false, reason: "unparsed" }); return; }

    function clean(s) { return typeof s === "string" ? s.trim().replace(/\s+/g, " ").slice(0, 80) : ""; }
    var vRaw = String((out && out.vintage) || "").trim();
    var vintage = /^\d{4}$/.test(vRaw) ? vRaw : "";

    res.status(200).json({
      ok: true,
      wine: clean(out && out.wine),
      winery: clean(out && out.winery),
      vintage: vintage,
      varietal: clean(out && out.varietal)
    });
  } catch (e) {
    res.status(200).json({ ok: false, reason: "error" });
  }
};

