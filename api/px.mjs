// /api/px — THE AE BEACON. Accelerated Experiences LLC.
//
// Lives on aexperiences.com because the store is public by design: every other AE
// property calls this one endpoint cross-origin, so it must answer with no sign-in.
// It only ever WRITES a visit row and returns a 1x1 gif. Nothing is readable here.
//
// Storage is Upstash Redis over plain REST — the same store and the same zero-dependency
// pattern api/who.mjs already uses. No new resource, no vendor, no monthly bill (Art. XVII).
// LPUSH is atomic, so two visitors landing in the same millisecond cannot overwrite
// each other — the failure the estimate store hit on Sep 10 2026 cannot happen here.
//
// It never records a name, an email, or anything a visitor typed.

const KV_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const KV_TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const KEEP_DAYS = 400;

// Gigi's site is deliberately absent. Anthony's instruction, Sep 11 2026.
const KNOWN = new Set([
  'store','hub','espofret','espogenius','espodrama','espolearning','esposocial','espoedu',
  'marketnarc','neurodivulge','aecomply','aeblastpack','cutandeffect','xpense','apply','wire',
  'momentum','momentum-site','mcarthur','lakecity','foodlog','curriculum','espowho','espodraw',
  'abode','buttress','truss','musical','8mm','amphitheater','lilninja','4barrel','targeted',
  'stayathome','toolbelt','sleeves','smiley','moments','showroom','realestate','concert'
]);
const BOT_RE = /bot|crawl|spider|slurp|bingpreview|headless|monitor|curl|wget|python-requests|axios|node-fetch|phantom|lighthouse|pingdom|uptime|semrush|ahrefs|mj12|dotbot|petal|bytespider|gptbot|claudebot|ccbot|perplexity|applebot|facebookexternalhit|embedly|preview/i;

const clip = (s, n) => (s == null ? '' : String(s).slice(0, n));
const deviceOf = (ua) => !ua ? 'unknown' : /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobi|iPhone|Android.*Mobile/i.test(ua) ? 'phone' : 'desktop';
function browserOf(ua){ if(!ua) return 'unknown';
  if(/Edg\//.test(ua)) return 'Edge'; if(/OPR\/|Opera/.test(ua)) return 'Opera';
  if(/Chrome\//.test(ua)&&!/Chromium/.test(ua)) return 'Chrome';
  if(/Firefox\//.test(ua)) return 'Firefox'; if(/Safari\//.test(ua)) return 'Safari'; return 'other'; }
function osOf(ua){ if(!ua) return 'unknown';
  if(/Windows NT/.test(ua)) return 'Windows'; if(/iPhone|iPad|iOS/.test(ua)) return 'iOS';
  if(/Mac OS X/.test(ua)) return 'macOS'; if(/Android/.test(ua)) return 'Android';
  if(/Linux/.test(ua)) return 'Linux'; return 'other'; }

async function kv(commands) {
  if (!KV_URL || !KV_TOK) return null;
  const r = await fetch(KV_URL + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + KV_TOK, 'content-type': 'application/json' },
    body: JSON.stringify(commands)
  });
  return r.ok ? r.json() : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }

  let body = {};
  if (req.method === 'POST') {
    try {
      const chunks = []; let size = 0;
      for await (const c of req) { size += c.length; if (size > 8192) break; chunks.push(c); }
      body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    } catch (_) { body = {}; }
  }
  let q = {}; try { q = Object.fromEntries(new URL(req.url, 'http://x').searchParams); } catch (_) {}
  const g = (k) => (body[k] != null ? body[k] : q[k]);

  const h = req.headers;
  const ua = clip(h['user-agent'], 400);
  const ip = clip(h['x-forwarded-for'], 200).split(',')[0].trim() || clip(h['x-real-ip'], 60) || '';

  let site = clip(g('s') || g('site'), 40).toLowerCase();
  if (!KNOWN.has(site)) site = site ? 'other:' + site.replace(/[^a-z0-9_.-]/g, '') : 'unknown';

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const hit = {
    t: now.toISOString(), site, ip,
    path: clip(g('p') || g('path'), 300),
    title: clip(g('ti') || g('title'), 200),
    ref: clip(g('r') || g('ref'), 300),
    refHost: (() => { try { return new URL(clip(g('r') || g('ref'), 300)).hostname; } catch (_) { return ''; } })(),
    vid: clip(g('v') || g('vid'), 40), sid: clip(g('sid'), 40),
    nv: String(g('nv') || '') === '1',
    country: clip(h['x-vercel-ip-country'], 8),
    region: clip(h['x-vercel-ip-country-region'], 16),
    city: (() => { try { return clip(decodeURIComponent(h['x-vercel-ip-city'] || ''), 80); } catch (_) { return clip(h['x-vercel-ip-city'], 80); } })(),
    lat: clip(h['x-vercel-ip-latitude'], 20), lon: clip(h['x-vercel-ip-longitude'], 20),
    tz: clip(h['x-vercel-ip-timezone'], 60),
    ua, device: deviceOf(ua), browser: browserOf(ua), os: osOf(ua),
    bot: BOT_RE.test(ua) || !ua,
    lang: clip(g('l') || h['accept-language'], 60),
    screen: clip(g('sc'), 24),
    dur: Number(g('d') || 0) || 0,
    utm: { source: clip(g('utm_source'), 60), medium: clip(g('utm_medium'), 60),
           campaign: clip(g('utm_campaign'), 80), term: clip(g('utm_term'), 60), content: clip(g('utm_content'), 60) }
  };

  try {
    await kv([
      ['LPUSH', 'ae:tr:' + day, JSON.stringify(hit)],
      ['EXPIRE', 'ae:tr:' + day, String(KEEP_DAYS * 86400)],
      ['SADD', 'ae:tr:days', day],
      ['SADD', 'ae:tr:sites', site],
      ['PFADD', 'ae:tr:vis:' + day, hit.vid || ip],
      ['EXPIRE', 'ae:tr:vis:' + day, String(KEEP_DAYS * 86400)]
    ]);
  } catch (_) { /* a beacon never breaks the page it is measuring */ }

  if (req.method === 'POST') { res.statusCode = 204; return res.end(); }
  res.setHeader('Content-Type', 'image/gif');
  res.statusCode = 200;
  return res.end(GIF);
}
