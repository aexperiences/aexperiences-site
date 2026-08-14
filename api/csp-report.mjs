// CSP violation collector — Accelerated Experiences LLC.
// Paired with Content-Security-Policy-Report-Only in vercel.json. Its whole job is to let us
// SEE what a real CSP would have broken before we ever enforce one. A wrong CSP renders a live
// storefront blank, so the order is: report-only → read the reports → tighten → enforce.
// No storage key needed: violations go to the Vercel runtime log.
//
// ⚠ Browsers post CSP reports as application/csp-report (report-uri) or application/reports+json
// (report-to). Vercel does NOT body-parse those content types, so req.body arrives empty and a
// naive handler logs nulls forever — looking healthy while recording nothing. Read the raw stream.

async function readBody(req){
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) return req.body;
  if (typeof req.body === 'string' && req.body.trim()) {
    try { return JSON.parse(req.body); } catch { return null; }
  }
  let data = '';
  try { for await (const chunk of req) data += chunk; } catch { return null; }
  if (!data.trim()) return null;
  try { return JSON.parse(data); } catch { return null; }
}

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).end();
  const body = await readBody(req);
  // report-uri wraps in {"csp-report":{}}; report-to sends [{"body":{}}]
  const r = body?.['csp-report'] || (Array.isArray(body) ? body[0]?.body : null) || body?.body || body || {};
  const line = {
    t: new Date().toISOString(),
    doc: r['document-uri'] || r.documentURL || null,
    directive: r['violated-directive'] || r['effective-directive'] || r.effectiveDirective || null,
    blocked: r['blocked-uri'] || r.blockedURL || null,
    sample: String(r['script-sample'] || r.sample || '').slice(0, 120) || null
  };
  // If everything is null the parse failed — say so loudly rather than logging a healthy-looking blank.
  const empty = !line.doc && !line.directive && !line.blocked;
  console.log((empty ? 'CSP_REPORT_UNPARSED ' : 'CSP_REPORT ') + JSON.stringify(empty ? { t: line.t, ct: req.headers['content-type'] || null } : line));
  res.setHeader('cache-control','no-store');
  return res.status(204).end();
}
