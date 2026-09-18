# HANDOFF — THE ONE TOKEN EDIT
### Accelerated Experiences LLC · Sep 18 2026 · for the weekday crew
### BOOT WORD: **FOURDOORS**

> Give a new instance on the weekday account the word **FOURDOORS**. It should
> read this file first and do nothing else until it has.

---

## THE JOB IN ONE SENTENCE

Four paid apps are still wide open to anyone who types their URL, the work to
close them is **already written and committed**, and all four are blocked on
**one edit to one GitHub token**.

---

## WHAT IS ALREADY DONE (do not redo any of this)

Twelve consumer apps are gated and verified live as of Sep 18 2026:

> ND Thread · ND Tendency · ND Regulator · ND Focus · ESPOfunkmaster ·
> AE Revolver · ESPOvocab · ESPOhystory · ESPOvineyard · ESPOstogie ·
> ESPOwhiskey · ESPObarista

- The door is `ae-gate.js` (one `<script>` in `<head>`, **never** deferred).
- The lock is `api/gate.mjs` on `aexperiences-site`.
- `AE_COMP_CODES=weirdo` is set in Vercel (Config, Production). **One word opens
  every gated app**, and it is typed once — a comp unlock writes a shared slot,
  so the next app opens by itself.
- Free and in-testing apps are deliberately left open. B2B hubs keep their
  "Open" button on purpose: walking into a hub IS the sale.

**The register of all of it:** `https://www.aexperiences.com/production/`
(gated as app `ops`; `weirdo` opens it). Rebuild with
`python3 _ops/build-production-registry.py` in the `aexperiences-site` repo.

---

## THE BLOCKER

The deploy token — GitHub fine-grained PAT named **"AE deploy — aexperiences-site"**
— is scoped to `aexperiences/aexperiences-site` **and nothing else**.

### ⚠ THE TRAP THAT COST THIS SESSION TWICE — READ THIS TWICE

**GitHub returns `404`, not `403`, for a private repo a token cannot see.**
That is deliberate, so tokens cannot be used to fish for private repo names.

I read that 404 as "no such repo" and told Anthony I did not know a repo's name
that was sitting in my own context from the Vercel API. Then I did the same
class of thing again: Vercel's `get_project` does not return the `link` field,
and I turned that missing field into "this product has no git repo," about a
live $7.99/mo product that has had one since July.

**The law: an absence of data is never a fact about the world.**
A 404 means "you cannot see it." A missing field means "not returned."
Neither means "it does not exist."

---

## THE EDIT ANTHONY MAKES (one page, one action)

GitHub → **Settings → Developer Settings → Fine-grained tokens →
"AE deploy — aexperiences-site" → Repository access** → add these four →
**Update**:

```
aexperiences/espogenius.com
aexperiences/marketnarc.com
aexperiences/xpense-os
aexperiences/espodrama
```

He has dyslexia and learning disabilities. **Drive the browser to that exact
page for him and name the single action.** Do not hand him a list of steps and
do not hand him anything to transcribe.

---

## WHAT TO DO THE MOMENT THE TOKEN CAN SEE THEM

Two of the four are **already written, committed, and one push from live.** They
are sitting in clones on the Mac VM, each one commit ahead of origin:

| clone | repo | state |
|---|---|---|
| `~/ext-espogenius` | `aexperiences/espogenius.com` | 9 pages gated, committed |
| `~/ext-marketnarc` | `aexperiences/marketnarc.com` | 6 pages gated, committed |

If those clones are gone (fresh VM), redo them exactly as below.

### The deploy method — Mac VM only, never the cloud sandbox

The cloud sandbox's git proxy 403s these repos. The Mac VM reaches github.com
directly. Full method in
`Strictly Research/_gh-deploy/README — how a lane pushes to aexperiences-site.md`.

```bash
export GIT_TERMINAL_PROMPT=0
git -c credential.helper="$HOME/ghcred.sh" push origin main
```

⛔ **Never run `git stash` between `git add` and `git commit`.** It cost a commit
on Sep 17 — `stash pop` restores changes unstaged, the commit carried 5 of 47
files and pushed clean. Verify with `git show :<path>` or against a second
clone. Never by stashing.

### The gate tag for an app on its own domain

These apps are NOT on aexperiences.com, so they have no `/api/gate` of their
own. They must point at the store's, and `ae-gate.js` supports `data-api` for
exactly this (added Sep 18 2026). `api/gate.mjs` answers cross-origin on
purpose — it only ever returns yes/no about a code or a subscription id.

```html
<script src="https://www.aexperiences.com/ae-gate.js"
        data-api="https://www.aexperiences.com/api/gate"
        data-app="<product-id>" data-name="<Name>"
        data-tag="<tagline>"
        data-price="$7.99/mo · $39.99/yr" data-trial="3"
        data-accent="<hex>" data-icon="https://www.aexperiences.com/<mark>"></script>
```

**Placement rules, both learned the hard way:**
1. In `<head>`, **not** deferred or async. Deferred, the app paints first and a
   non-payer sees the paid screen flash past before the door closes.
2. **Directly under `<meta charset>`, never above it.** The price strings carry a
   mid-dot (`·`). A non-ASCII byte before the charset declaration is how a page
   ends up guessing its own encoding.

### Which pages get it

**The app pages only — `*-app.html`. Never the marketing pages.** The door
belongs on the app, not the pitch.

- `espogenius.com`: `*genius*-app.html` → `data-app="espo-genius"`;
  `*narc*-app.html` → `data-app="the-narcs"`
- `marketnarc.com`: all `*-app.html` → `data-app="the-narcs"`
- `xpense-os`: the app page → `data-app="xpense"`
- `espodrama`: single-file `index.html`, **68KB inline `<script>`** — the GitHub
  web editor is a known-blocked path on this file. Edit it locally and push.
  Working copy: `Strictly Research/espodrama-build/`.
  → `data-app="espo-drama"`

### Then, in `aexperiences-site`, add each id to the registry

`api/gate.mjs` → the `APPS` set. **An app not in that set answers `ungated` and
opens.** A gate tag without a registry entry silently does nothing, so the two
lists move together, always. `xpense` and `espo-drama` are not in it yet.

### Then verify — committed is not shipped, shipped is not verified

```
1. a stranger (fresh browser context) hits the URL  -> storefront, not the app
2. type `weirdo` on one                             -> opens
3. hit a second gated app                           -> opens by itself
4. a free/testing app                               -> still open
```

---

## THE MAP (verified Sep 18 2026)

| Product | Domain / path | Vercel project | GitHub repo |
|---|---|---|---|
| ESPO Genius | espogenius.com | `espogenius-com` | `aexperiences/espogenius.com` |
| The Narcs | aexperiences.com/narcs/open | `marketnarc-com` | `aexperiences/marketnarc.com` |
| Xpense OS | aexperiences.com/apps/xpense/ | `xpense-os` | `aexperiences/xpense-os` |
| ESPO Drama | espodrama.com | **`whichway`** | `aexperiences/espodrama` |

**`whichway`** is the one nobody can guess. It is named after a FEATURE of ESPO
Drama — the branching "WhichWay" story — not after the product. It is recorded
in `aehub/api/_sot.mjs` and in
`aehub/session-logs/ESPO Drama — Roz Voice Fix (Jul 24 2026).md`.
**When a name cannot be derived, read the hall of records. It was there.**

A path on `aexperiences.com` does **not** mean `aexperiences-site` serves it —
`vercel.json` proxies whole products elsewhere. Check the rewrites before
assuming, or read `/production/`, which now does it for you.

---

## STATE OF THE MONEY (checked in Stripe, Sep 18 2026)

- **Zero app subscribers.** The only subscription on the account is Anthony's own.
- One real customer bought **two printables** on Sep 1 — one-time, nothing
  renews, no app access involved.
- One $39.99 from Jul 5 is marked **Dispute lost** (a chargeback went against
  him). Not urgent, but it is sitting there.

**So nothing is at risk in gating any of these.** Nobody loses what they paid for.

One real hazard remains for later: subscriptions sold before Sep 17 2026 carry
no `product` metadata, and `api/gate.mjs` refuses an unstamped subscription on
purpose rather than guess. If a real subscriber ever appears from before that
date, **back-stamp in Stripe first, then gate.**

---

## HOW ANTHONY WORKS — non-negotiable

- **Plain English. One decision at a time. Short replies.**
- Dyslexia and other learning disabilities: **take him to the exact place and
  name the single action.** No codes to transcribe, no step lists.
- Honest pushback over flattery. Own mistakes plainly and move.
- **Never tell him to stop working or go to bed.**
- He works from his phone, late. Anything built for him is phone-first.
