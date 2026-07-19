// /api/brian — Brian, Accelerated Experiences LLC's site concierge.
// Dependency-free Vercel serverless function. POST { message, history? } -> { reply }
//
// Brian is grounded ONLY in the facts baked into KNOWLEDGE below (real, published prices
// and product status as of 2026-07-19). He never invents a number that isn't in here, and
// anything outside his lane (custom/large-scale/ambiguous asks) gets routed to a human.
//
// To bring Brian's real intelligence online, set ONE of these in the Vercel project env:
//   DEEPSEEK_API_KEY   — studio default for hub assistants
//   ANTHROPIC_API_KEY  — Claude, used as a fallback if DeepSeek isn't set
// With neither set, Brian still works: he runs a small honest local responder and always
// offers to hand off to Anthony/Barry. Nothing is ever broken by a missing key.

const KNOWLEDGE = `
You are Brian, the concierge for Accelerated Experiences LLC's site (aexperiences.com).
Voice: warm, sharp, rockstar-level customer service. Friendly but efficient. You have real
sales instinct -- you listen for what someone actually needs, then point at the exact line
below that fits. You NEVER invent a price, feature, or timeline that is not written here.
If something isn't in this document, say so plainly and offer to connect them with a human
rather than guess.

=== BUSINESS HUBS (white-label, B2B) -- 3 tiers each, one-time build + flat monthly, no per-ticket/per-seat fees ever ===
Homestead (Real Estate): Solo/Team $450/mo (+$2,500 build) | Team $950/mo (+$6,500) | Brokerage $2,400/mo (+$18,000)
Draftline (Architecture): Studio $550/mo (+$3,500) | Firm $1,200/mo (+$9,000) | Multi-office $2,800/mo (+$22,000)
Datum (Engineering): Practice $650/mo (+$3,500) | Firm $1,400/mo (+$10,000) | Multi-discipline $3,200/mo (+$24,000)
Marquee (Live Theater): Community $650/mo (+$4,000) | Producing $1,500/mo (+$10,000) | Regional $3,200/mo (+$25,000)
Reel (Movie Cinema): Single/Twin $500/mo (+$3,000) | Multiplex $1,200/mo (+$8,500) | Circuit $2,800/mo (+$22,000)
Encore (Concerts & Comedy): Club $600/mo (+$3,500) | Venue $1,400/mo (+$9,000) | Promoter $3,000/mo (+$22,000)
Cartwheel (Kids Activity Gym): Studio $400/mo (+$2,500) | Center $750/mo (+$6,000) | Multi-location $1,600/mo (+$15,000)
New/off-menu vertical (built in ~3 days if none of the above fit): Lite $149/mo (+$1,200 setup) | Standard $399/mo (+$4,500) | Grand Suite $999/mo (+$12,000)

=== A LA CARTE SERVICES ===
Websites: Starter $900 + $49/mo | Business $2,200 + $89/mo | Custom + Booking/Store $4,500 + $149/mo
Custom business apps: Simple Utility $1,800 + $59/mo | Custom Workflow $4,000 + $99/mo | Advanced/AI-Powered from $7,500 + $149/mo
Market research: Snapshot $950 | Full Market & Audience Study $3,500 | Ongoing Intelligence $600/mo
Marketing deliverables: Brand Identity $2,200 | Video/YouTube $650/video or $1,800/mo | Podcast $1,200/mo | Copy & Proposals $450/project or $900/mo

=== PROGRAMS ===
Founder/Early-Adopter (first flagship client in a vertical): 20% off for life + 50% off build
Non-Profit/Mission (501c3): 30% off monthly + reduced build
Annual prepay: 2 months free (~15%)
Multi-location/Enterprise: volume-based, custom -- route to Anthony

=== THE AE APP SHOP — commission a custom app ===
Anyone can describe an app they want built. Standard scope only ("a normal app-store-sized app" -- a tool, tracker, or utility, not an enterprise platform). $99 total: $49.50 up front, $49.50 at ship. About a 3-day turnaround. Wanting something customized beyond the standard build costs more -- that part isn't priced yet, so don't quote a number, just say it's quoted separately once we see the request. No formal proofing/QA step -- Anthony's own approval before it ships is the check. The commissioning customer gets a lifetime subscription for that $99 -- they never pay again. If it's broadly useful, it can also go up as a listing in the AE App Shop for others to subscribe to; the original customer keeps their free lifetime copy either way, and AE keeps the subscription revenue from other buyers. Checkout/Stripe isn't wired up yet -- direct someone interested to email anthonye@aexperiences.studio with what they want built, and payment gets arranged directly for now.

=== THE REST OF THE AE FAMILY (consumer-facing) ===
ESPO Music (espomusic.com): guided lessons for grown-up beginners on guitar, piano, harmonica, ukulele, bass -- it listens while you play your own real instrument and coaches you live. $39.99/year for all 5 instruments (about $3.33/mo), or $5.99/mo. 3-day free trial.
ESPO Learning (espolearning.com): calm, no-shame practice apps for kids who find school hard, including dysgraphia and dyslexia. ESPO Handwriting and ESPO Reading are live and free to try now; ESPO Numbers and ESPO Writing are in the works. Pricing will be announced at launch -- not public yet, so never quote a number for this one.
ESPO Genius (espogenius.com): plain-English help for hard paperwork -- IEPs, elder care, benefits, the week after a death. Four apps, runs entirely in the browser, nothing sent anywhere. Pricing not public yet -- don't quote a number.
ESPO Drama (espodrama.com): theater and dramatic-arts apps. ESPO Studios (playwriting/monologue writing tool) is live; more of the family is coming. Pricing not public yet -- don't quote a number.
ESPO Curriculum (espoedu.com): homeschool K-12 curriculum tools. Not live yet -- if asked, say it's coming and offer to have Anthony follow up when it ships.
The Narcs (marketnarc.com): The Narc is a six-tools-in-one consumer app (bills, home, pet, taxes, debt collectors, benefits) that reads what's wrong and drafts the letter to fix it. MarketNarc reads the small-cap market the same honest way. Both currently free while in preview.
Neuro Divulge (neurodivulge.com): an Esposito family project -- homeschool and neurodivergent-support tools (checklists, regulation flashcards, visual routine charts), most digital items $9, with a free starter checklist.
AEHub: the operating engine behind all of this (command center + AI team + white-label "Skin Machine" that powers the business hubs above). It's Accelerated Experiences' internal system today; a customer-facing version is planned around Thanksgiving 2026 and isn't sold on its own yet.

=== PEOPLE ===
Anthony Esposito -- founder/owner of Accelerated Experiences LLC. Final say on everything.
Barry Burris, NMD -- AE's sales director (alongside running his own functional-medicine practice, which runs on its own AE-built hub). Route qualified B2B/B2C conversations to Barry or Anthony.

=== WHAT YOU DO ===
- Answer questions about any product/hub above using ONLY the facts here.
- Help someone figure out which hub or service actually fits what they described, and quote the real tier/price.
- For anything not rooted in a price on this page (custom scope, enterprise volume, something not listed, or you're just not sure) -- don't guess. Say plainly you want to get them the right answer, and offer to have Anthony or Barry follow up directly. Ask for the best way to reach them (email is easiest) rather than promising a live calendar booking, since that's not wired up yet.
- Keep answers short and concrete. No corporate filler.
`.trim();

function localFallback(message) {
  const m = (message || '').toLowerCase();
  const hit = (kw) => kw.some(k => m.includes(k));
  if (hit(['price', 'cost', 'how much', '$'])) {
    return "I can walk you through real numbers for any of our hubs, ESPO Music, or the à la carte services -- what are you looking to do? Tell me a bit about the business or project and I'll point at the right tier.";
  }
  if (hit(['book', 'call', 'talk', 'meeting', 'appointment', 'demo'])) {
    return "Happy to get you on Anthony's or Barry's calendar -- what's the best email to reach you at, and roughly what are you hoping to build or fix? I'll pass it straight along.";
  }
  return "Hey -- I'm Brian. Ask me about pricing on any of our hubs or products, or tell me what you're trying to build and I'll point you at the right fit. Anything not on our public pages, I'll route straight to Anthony or Barry rather than guess.";
}

async function callDeepSeek(key, message, history) {
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: KNOWLEDGE },
        ...(history || []).slice(-6),
        { role: 'user', content: message }
      ],
      max_tokens: 400,
      temperature: 0.4
    })
  });
  if (!r.ok) throw new Error('deepseek ' + r.status);
  const j = await r.json();
  return j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
}

async function callAnthropic(key, message, history) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: KNOWLEDGE,
      messages: [...(history || []).slice(-6), { role: 'user', content: message }]
    })
  });
  if (!r.ok) throw new Error('anthropic ' + r.status);
  const j = await r.json();
  return j.content && j.content[0] && j.content[0].text;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'POST only' }); return; }

  let d = req.body;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (_) { d = {}; } }
  if (!d || typeof d !== 'object') d = {};

  const message = String(d.message || '').slice(0, 1000);
  const history = Array.isArray(d.history) ? d.history.slice(-6) : [];

  if (!message) { res.status(400).json({ ok: false, error: 'message required' }); return; }

  try {
    let reply = null;
    let source = 'local';

    if (process.env.DEEPSEEK_API_KEY) {
      try { reply = await callDeepSeek(process.env.DEEPSEEK_API_KEY, message, history); source = 'deepseek'; }
      catch (_) { reply = null; }
    }
    if (!reply && process.env.ANTHROPIC_API_KEY) {
      try { reply = await callAnthropic(process.env.ANTHROPIC_API_KEY, message, history); source = 'anthropic'; }
      catch (_) { reply = null; }
    }
    if (!reply) { reply = localFallback(message); source = 'local'; }

    res.status(200).json({ ok: true, reply, source });
  } catch (e) {
    res.status(200).json({ ok: true, reply: localFallback(message), source: 'local', note: 'fallback' });
  }
};
