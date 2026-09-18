#!/usr/bin/env python3
"""
THE PRODUCTION REGISTRY  ·  Accelerated Experiences LLC
=======================================================
Answers, for every product, the question that cost a session on Sep 18 2026:
"where does this thing actually live, and can a stranger walk into it?"

Three sources, and only one of them is typed by hand:

  catalog.js      the product truth  — name, price, state, url      (read)
  VERCEL[]        project -> github repo, from the Vercel API       (typed, dated)
  the repo itself whether ae-gate.js is really on the page          (COMPUTED)

The gate column is computed on purpose. A registry that says a door is locked
because somebody typed that it was locked is worse than no registry.

  python3 _ops/build-production-registry.py      -> production.json + /production/
"""
import json, os, re, glob, subprocess, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

# ---------------------------------------------------------------- Vercel map
# From the Vercel API (list_projects), Sep 18 2026. Only projects whose `link`
# field named a GitHub repo are recorded; `null` means the project has no repo
# attached and deploys some other way, which is itself worth knowing.
VERCEL_SEEN = "2026-09-18"
VERCEL = {
  "aexperiences-site":      "aexperiences/aexperiences-site",
  "aehub":                  "aexperiences/aehub",
  "marketnarc-com":         "aexperiences/marketnarc.com",
  "espogenius-com":         "aexperiences/espogenius.com",
  "xpense-os":              "aexperiences/xpense-os",
  "aeblastpack":            "aexperiences/aeblastpack",
  "aecomply":               "aexperiences/aecomply",
  "ae-cut-and-effect":      "aexperiences/ae-cut-and-effect",
  "espofret":               "aexperiences/espofret",
  "espoedu":                "aexperiences/espoedu",
  "foodlog":                "aexperiences/foodlog",
  "neurodivulge-store":     "aexperiences/neurodivulge-store",
  "momentum-hub":           "aexperiences/momentum-hub",
  "momentum-site":          "aexperiences/momentum-site",
  "ae-mcarthur-hub":        "aexperiences/ae-mcarthur-hub",
  "ae-realestate-hub":      "aexperiences/ae-realestate-hub",
  "ae-concert-hub":         "aexperiences/ae-concert-hub",
  "ae-showroom-hub":        "aexperiences/ae-showroom-hub",
  "lakecity-camps-classes": "aexperiences/lakecity-camps-classes",
  "gigiespo-home":          "aexperiences/gigiespo-home",
  "ae-fable-api":           "aexperiences/ae-fable-api",
  "ae-apply":               "aexperiences/ae-apply",
  # no repo attached — deployed straight, not from git
  "neuro-divulge":          None,
  "ae-fraud-division":      None,
  "ae-factory":             None,
  "curriculum-os":          None,
  "ae-wire":                None,
}
# a product url's host -> the Vercel project serving it
HOST_PROJECT = {
  "www.aexperiences.com": "aexperiences-site",
  "aexperiences.com":     "aexperiences-site",
  "espogenius.com":       "espogenius-com",
  "marketnarc.com":       "marketnarc-com",
  "www.marketnarc.com":   "marketnarc-com",
  "espodrama.com":        None,          # ← not in the Vercel account. Unresolved.
}

# ------------------------------------------------------------------- catalog
src = open("catalog.js", encoding="utf-8").read()
def field(t, k, d=""):
    m = re.search(k + r":\s*'((?:[^'\\]|\\.)*)'", t)
    return m.group(1) if m else d

products = []
for m in re.finditer(r"id:'([^']+)'", src):
    pid = m.group(1); i = m.start()
    start = src.rfind("{", 0, i); depth = 0; j = start
    while j < len(src):
        if src[j] == "{": depth += 1
        elif src[j] == "}":
            depth -= 1
            if depth == 0: break
        j += 1
    t = src[start:j+1]
    if "name:'" not in t[:140]: continue
    plans = [(p.group(1), float(p.group(2)), p.group(3))
             for p in re.finditer(r"\['([^']+)',\s*([\d.]+),\s*'(month|year)'", t)]
    products.append(dict(
        id=pid, name=field(t, "name"), tag=field(t, "tag"),
        state=field(t, "state"), genre=field(t, "genre"),
        url=field(t, "url"), family=field(t, "family"),
        tiers=bool(re.search(r"tiers:\s*\[", t)),
        plans=[p for p in plans if re.search(r"plans:\s*\[", t)],
    ))

# ------------------------------------------------- where it lives, and its door
def locate(p):
    u = p["url"] or ""
    if u.startswith("/"):
        return dict(host="www.aexperiences.com", path=u, project="aexperiences-site",
                    repo=VERCEL.get("aexperiences-site"), local=("apps/" + p["id"]))
    m = re.match(r"https?://([^/]+)(/.*)?$", u)
    if not m:
        return dict(host=None, path=None, project=None, repo=None, local=None)
    host, path = m.group(1), m.group(2) or "/"
    proj = HOST_PROJECT.get(host, "?")
    return dict(host=host, path=path, project=proj,
                repo=(VERCEL.get(proj) if proj else None),
                local=("apps/" + p["id"]) if host.endswith("aexperiences.com") else None)

def door(p, loc):
    """Computed, never typed. Only this repo can be inspected from here."""
    d = loc.get("local")
    if d and os.path.isdir(d):
        f = os.path.join(d, "index.html")
        if os.path.exists(f):
            return "locked" if "ae-gate.js" in open(f, encoding="utf-8", errors="replace").read() else "OPEN"
        return "no index.html"
    if loc.get("repo") and loc["repo"] != "aexperiences/aexperiences-site":
        return "not in this repo"
    return "unknown"

rows = []
for p in products:
    loc = locate(p)
    sold = bool(p["plans"]) and not p["tiers"] and p["genre"] != "business"
    rows.append(dict(**p, **{"where": loc}, sold=sold,
                     door=door(p, loc) if sold and p["state"] == "live" else ("n/a" if not sold else "not live")))

out = dict(generated=datetime.datetime.now().isoformat(timespec="seconds"),
           vercelSeen=VERCEL_SEEN, count=len(rows), products=rows)
json.dump(out, open("production.json", "w"), indent=1)

holes = [r for r in rows if r["door"] == "OPEN"]
unknown = [r for r in rows if r["door"] in ("not in this repo", "unknown")]
print("products:", len(rows))
print("sold + live:", sum(1 for r in rows if r["sold"] and r["state"] == "live"))
print("doors OPEN (anyone can walk in):", len(holes), [r["id"] for r in holes] or "none")
print("cannot be checked from here:", len(unknown), [r["id"] for r in unknown] or "none")
print("no Vercel project resolved:", [r["id"] for r in rows if r["where"]["project"] in (None, "?")] or "none")
