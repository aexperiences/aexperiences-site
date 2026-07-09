// /api/inquiry — receives a project inquiry from aexperiences.com and emails it to Anthony.
// Dependency-free. Emails via Resend IF configured; otherwise reports delivered:false so the
// browser falls back to a prefilled mailto (nothing is ever lost).
//
// To make capture silent (no mail-client popup), set in the Vercel project env:
//   RESEND_API_KEY   — from resend.com
//   INQUIRY_TO       — where to send (default anthonye@aexperiences.studio)
//   INQUIRY_FROM     — a verified sender, e.g. "AE Site <hello@aexperiences.com>"
//                      (default "AE Site <onboarding@resend.dev>", which only delivers to the Resend account owner)

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'POST only' }); return; }

  let d = req.body;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (_) { d = {}; } }
  if (!d || typeof d !== 'object') d = {};

  const clean = (s) => String(s == null ? '' : s).slice(0, 4000).trim();
  const name = clean(d.name), email = clean(d.email);
  if (!name || !/.+@.+\..+/.test(email)) { res.status(400).json({ ok: false, error: 'name and a valid email are required' }); return; }

  const rec = {
    name, email,
    company: clean(d.company), projectType: clean(d.projectType),
    budget: clean(d.budget), timeline: clean(d.timeline), details: clean(d.details),
    at: new Date().toISOString()
  };

  const key = process.env.RESEND_API_KEY;
  let delivered = false;

  if (key) {
    const to = process.env.INQUIRY_TO || 'anthonye@aexperiences.studio';
    const from = process.env.INQUIRY_FROM || 'AE Site <onboarding@resend.dev>';
    const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const html =
      '<h2>New project inquiry</h2>' +
      '<p><b>Name:</b> ' + esc(rec.name) + '<br>' +
      '<b>Email:</b> ' + esc(rec.email) + '<br>' +
      '<b>Company:</b> ' + (esc(rec.company) || '—') + '<br>' +
      '<b>Project type:</b> ' + (esc(rec.projectType) || '—') + '<br>' +
      '<b>Budget:</b> ' + (esc(rec.budget) || '—') + '<br>' +
      '<b>Timeline:</b> ' + (esc(rec.timeline) || '—') + '</p>' +
      '<p><b>Details:</b><br>' + (esc(rec.details).replace(/\n/g, '<br>') || '—') + '</p>' +
      '<hr><p style="color:#888;font-size:12px">Sent from aexperiences.com · ' + rec.at + '</p>';
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, reply_to: rec.email, subject: 'Project inquiry — ' + rec.name, html })
      });
      delivered = r.ok;
    } catch (_) { delivered = false; }
  }

  res.status(200).json({ ok: true, delivered });
};
