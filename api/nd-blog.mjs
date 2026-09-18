import { ndWho } from './_nd-auth.mjs';
// /api/nd-blog — the store behind The Neuro-Divulge blog.
// Accelerated Experiences LLC · Sep 17 2026
//
// The AE Build Log is static .html files, which is fine for Anthony because he has a
// deploy. Jessica does not, and should never need one to publish a post — so hers
// lives in the KV store the site already has (the same Upstash instance /api/draw
// uses; no new service, Art. XVII).
//
//   GET                       -> published posts, newest first (public)
//   GET ?slug=x               -> one published post (public)
//   GET ?all=1  + key         -> everything including drafts (the writer)
//   POST { …post }  + key     -> create or update; status: 'draft' | 'published'
//   POST { slug, delete:true } -> remove
//
// The key is a shared passphrase in ND_BLOG_KEY. That is a lock on a back door, not
// an accounts system, and it is the honest level for one author. When ND OS exists it
// becomes her sign-in and this check moves behind it.

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const ready = () => !!(KV_URL && KV_TOK);

async function redis(...cmd) {
  const r = await fetch(KV_URL, {
    method: 'POST',
    headers: { authorization: 'Bearer ' + KV_TOK, 'content-type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  if (!r.ok) throw new Error('store_' + r.status);
  const j = await r.json();
  if (j.error) throw new Error('store: ' + j.error);
  return j.result;
}
const K = (s) => 'nd:post:' + s;
const INDEX = 'nd:posts';
const getJSON = async (k) => { const v = await redis('GET', k); return v ? JSON.parse(v) : null; };

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(obj));
}

const clean = (s, max) => String(s == null ? '' : s).slice(0, max);
function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '')
    .trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 70) || ('post-' + Date.now());
}

/* A body is read back for everyone on the internet, so it is stored as plain text and
   rendered as markdown on the page. Nothing here ever emits HTML. */
function tidy(p) {
  return {
    slug: p.slug, title: p.title, dek: p.dek || '',
    body: p.body || '', status: p.status === 'published' ? 'published' : 'draft',
    createdAt: p.createdAt, updatedAt: p.updatedAt, author: p.author || 'Jessica Esposito'
  };
}

async function readAll() {
  const slugs = (await redis('LRANGE', INDEX, '0', '-1')) || [];
  const out = [];
  for (const s of slugs) { const p = await getJSON(K(s)); if (p) out.push(tidy(p)); }
  out.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return out;
}

async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return null; }
}

export default async function handler(req, res) {
  try {
    if (!ready()) return send(res, 503, { ok: false, error: 'NO_STORE' });
    const url = new URL(req.url, 'https://www.aexperiences.com');
    const authed = !!(await ndWho(req, url));   // AE OS session or the machine word (_nd-auth.mjs)

    if (req.method === 'GET') {
      const slug = clean(url.searchParams.get('slug'), 80);
      if (slug) {
        const p = await getJSON(K(slug));
        if (!p) return send(res, 404, { ok: false, error: 'NO_POST' });
        if (p.status !== 'published' && !authed) return send(res, 404, { ok: false, error: 'NO_POST' });
        return send(res, 200, { ok: true, post: tidy(p) });
      }
      const all = await readAll();
      if (url.searchParams.get('all') === '1') {
        if (!authed) return send(res, 401, { ok: false, error: 'NEED_KEY' });
        return send(res, 200, { ok: true, posts: all });
      }
      return send(res, 200, { ok: true, posts: all.filter((p) => p.status === 'published') });
    }

    if (req.method === 'POST') {
      if (!authed) return send(res, 401, { ok: false, error: 'NEED_KEY' });
      const b = await body(req);
      if (!b) return send(res, 400, { ok: false, error: 'BAD_JSON' });

      if (b.delete) {
        const slug = clean(b.slug, 80);
        if (!slug) return send(res, 400, { ok: false, error: 'NEED_SLUG' });
        await redis('DEL', K(slug));
        await redis('LREM', INDEX, '0', slug);
        return send(res, 200, { ok: true, deleted: slug });
      }

      const title = clean(b.title, 180).trim();
      if (!title) return send(res, 400, { ok: false, error: 'NEED_TITLE' });
      const slug = clean(b.slug, 80) || slugify(title);
      const now = new Date().toISOString();
      const existing = await getJSON(K(slug));
      const post = {
        slug, title,
        dek: clean(b.dek, 300),
        body: clean(b.body, 60000),
        status: b.status === 'published' ? 'published' : 'draft',
        author: clean(b.author, 80) || 'Jessica Esposito',
        createdAt: (existing && existing.createdAt) || now,
        updatedAt: now
      };
      await redis('SET', K(slug), JSON.stringify(post));
      if (!existing) await redis('LPUSH', INDEX, slug);
      return send(res, 200, { ok: true, post: tidy(post) });
    }

    res.setHeader('allow', 'GET, POST');
    return send(res, 405, { ok: false, error: 'METHOD' });
  } catch (e) {
    return send(res, 500, { ok: false, error: 'SERVER', message: String((e && e.message) || e) });
  }
}
