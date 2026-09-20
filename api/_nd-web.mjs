// _nd-web.mjs — the web, read-only, for her helper. Accelerated Experiences LLC · Sep 19 2026
// Anthony: the helper must "be able to go out and search the internet and not be fenced to the OS."
// The house pattern, copied from aehub/api/_web.mjs rather than invented: Brave when BRAVE_SEARCH_KEY
// is set, DuckDuckGo's HTML page otherwise (free, no key). Reading a page returns plain text.
// Public http(s) only: no private addresses, no internal hosts, no credentials in the URL.
import { lookup } from 'node:dns/promises';

const UA = { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'accept': 'text/html,application/xhtml+xml', 'accept-language': 'en-US,en;q=0.9' };

function privateIP(ip) {
  if (!ip) return true;
  if (ip.includes(':')) { const v = ip.toLowerCase(); return v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('::ffff:127.') || v.startsWith('::ffff:10.') || v.startsWith('::ffff:192.168.'); }
  const p = ip.split('.').map(Number);
  return p[0] === 10 || p[0] === 127 || p[0] === 0 || (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127) || p[0] >= 224;
}
async function safeURL(raw) {
  let u; try { u = new URL(String(raw)); } catch (e) { throw new Error('not a web address'); }
  if (!/^https?:$/.test(u.protocol)) throw new Error('only http and https');
  if (u.username || u.password) throw new Error('no credentials in addresses');
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || !h.includes('.')) throw new Error('not a public address');
  const addrs = await lookup(h, { all: true }).catch(() => []);
  if (!addrs.length || addrs.some((a) => privateIP(a.address))) throw new Error('not a public address');
  return u.toString();
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('took too long')), ms))]);

export async function webFetch(url) {
  const safe = await safeURL(url);
  const r = await withTimeout(fetch(safe, { headers: UA, redirect: 'follow' }), 9000);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  if (r.url && r.url !== safe) await safeURL(r.url);   // a redirect may not land somewhere private
  const html = (await r.text()).slice(0, 600000);
  const tm = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
  return { url: safe, title: tm ? tm[1].replace(/\s+/g, ' ').trim().slice(0, 200) : '', text: text.slice(0, 5000) };
}

export async function webSearch(query) {
  const q = String(query || '').trim().slice(0, 200);
  if (!q) throw new Error('empty search');
  const key = process.env.BRAVE_SEARCH_KEY;
  if (key) {
    try {
      const r = await withTimeout(fetch('https://api.search.brave.com/res/v1/web/search?count=6&q=' + encodeURIComponent(q),
        { headers: { 'x-subscription-token': key, accept: 'application/json' } }), 8000);
      if (r.ok) {
        const j = await r.json();
        const results = ((j.web && j.web.results) || []).slice(0, 6).map((x) => ({ title: x.title, url: x.url, snippet: x.description || '' }));
        if (results.length) return { results, source: 'brave' };
      }
    } catch (e) {}
  }
  // Free sources, in order. Datacenter addresses get challenged by some of them some of the time,
  // so the helper walks the chain and reports which one answered.
  const strip = (x) => String(x || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const tried = [];
  const sources = [
    ['duckduckgo', 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(q), (html) => {
      const out = []; const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi; let m;
      while ((m = re.exec(html)) && out.length < 6) { let h = m[1]; const um = h.match(/[?&]uddg=([^&]+)/); if (um) h = decodeURIComponent(um[1]); if (/^https?:/i.test(h)) out.push({ title: strip(m[2]), url: h, snippet: '' }); }
      return out; }],
    ['duckduckgo-lite', 'https://lite.duckduckgo.com/lite/?q=' + encodeURIComponent(q), (html) => {
      const out = []; const re = /<a[^>]+href="([^"]+)"[^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>/gi; let m;
      while ((m = re.exec(html)) && out.length < 6) { let h = m[1]; const um = h.match(/[?&]uddg=([^&]+)/); if (um) h = decodeURIComponent(um[1]); if (/^https?:/i.test(h)) out.push({ title: strip(m[2]), url: h, snippet: '' }); }
      return out; }],
    ['mojeek', 'https://www.mojeek.com/search?q=' + encodeURIComponent(q), (html) => {
      const out = []; const re = /<a[^>]+class="ob"[^>]+href="(https?:[^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<p class="s">([\s\S]*?)<\/p>)?/gi; let m;
      while ((m = re.exec(html)) && out.length < 6) out.push({ title: strip(m[2]) || m[1], url: m[1], snippet: strip(m[3]).slice(0, 300) });
      return out; }],
    ['wikipedia', 'https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=6&srsearch=' + encodeURIComponent(q), (txt) => {
      let j = null; try { j = JSON.parse(txt); } catch (e) { return []; }
      return ((j && j.query && j.query.search) || []).map((x) => ({ title: x.title + ' (Wikipedia)', url: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(String(x.title).replace(/ /g, '_')), snippet: strip(x.snippet).slice(0, 300) })); }],
    ['bing', 'https://www.bing.com/search?q=' + encodeURIComponent(q) + '&setlang=en-US', (html) => {
      const out = []; const re = /<li class="b_algo"[\s\S]*?<h2[^>]*><a[^>]+href="(https?:[^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<p[^>]*>([\s\S]*?)<\/p>)?/gi; let m;
      while ((m = re.exec(html)) && out.length < 6) { let h = m[1].replace(/&amp;/g, '&'); const um = h.match(/[?&]u=a1([^&]+)/); if (um) { try { h = Buffer.from(um[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'); } catch (e) {} } if (/^https?:/i.test(h) && !/bing\.com\//.test(h)) out.push({ title: strip(m[2]), url: h, snippet: strip(m[3]).slice(0, 300) }); }
      return out; }],
  ];
  for (const [name, u, parse] of sources) {
    try {
      const r = await withTimeout(fetch(u, { headers: UA, redirect: 'follow' }), 6000);
      if (!r.ok) { tried.push(name + ' ' + r.status); continue; }
      const results = parse(await r.text()).filter((x) => x.title && x.url);
      if (results.length) return { results, source: name };
      tried.push(name + ' empty');
    } catch (e) { tried.push(name + ' ' + (e && e.message || 'error')); }
  }
  throw new Error('no search source answered (' + tried.join(', ') + ')');
}
