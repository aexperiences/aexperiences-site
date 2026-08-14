// CSP violation collector — Accelerated Experiences LLC.
// Paired with Content-Security-Policy-Report-Only in vercel.json. Its whole job is to let us
// SEE what a real CSP would have broken before we ever enforce one. A wrong CSP renders a live
// storefront blank, so the order is: report-only → read the reports → tighten → enforce.
// No storage key needed: violations go to the Vercel runtime log, readable from the dashboard.
export const config = { runtime: 'nodejs' };

export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).end();
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch {} }
    const r = body?.['csp-report'] || body?.body || body || {};
    const line = {
      t: new Date().toISOString(),
      doc: r['document-uri'] || r.documentURL || null,
      directive: r['violated-directive'] || r.effectiveDirective || null,
      blocked: r['blocked-uri'] || r.blockedURL || null,
      sample: (r['script-sample'] || r.sample || '').slice(0, 120) || null
    };
    console.log('CSP_REPORT ' + JSON.stringify(line));
  } catch (e) {
    console.log('CSP_REPORT parse_error ' + String(e).slice(0,120));
  }
  res.setHeader('cache-control','no-store');
  return res.status(204).end();
}
