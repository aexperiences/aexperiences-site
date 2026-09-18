# 00 — HANDOFF — READ ME FIRST
## Sep 18 2026 · ND OS, twelve doors, and the register that ends the guessing
### BOOT WORD: **FOURDOORS**

> **Weekday crew, new account:** give a fresh instance the word **FOURDOORS**.
> It reads this file before it does anything else. Companion file with the
> step-by-step deploy detail:
> `SESSION LOGS/HANDOFF — THE ONE TOKEN EDIT (Sep 18 2026) — boot word: FOURDOORS.md`

---

# 1 · WHAT CHANGED TONIGHT, IN ONE PAGE

**Money that could not be taken, can now be taken.** Three printables on
Jessica's site showed a price and a button that went nowhere. Three **active
Stripe payment links have existed since Jul 7**. Nothing had ever linked to
them. Wired and verified end to end.

**The paid apps had no doors.** Anyone could type a URL and use a $1.99–$5.99/mo
app for free. **Twelve are now gated** and verified against a stranger's browser.

**Her audience was being sent to the wrong page.** neurodivulge.com served a 10KB
old store page; her real site sat at `aexperiences.com/nd/`. Domain moved, live.

**Nobody could say where anything deploys from.** There is now a register at
`/production/` that answers it, and computes the answers rather than trusting
anyone's memory — including mine.

**ND OS exists.** Jessica has an operating system: eight rooms, phone-first,
installable, dark by default, built on a message bus and the AE Triad.

---

# 2 · THE ONE THING BLOCKING EVERYTHING ELSE

The deploy token **"AE deploy — aexperiences-site"** is scoped to that one repo.
Five repos need adding. Four of them are paid apps still wide open.

```
aexperiences/espogenius.com      ESPO Genius  $7.99/mo   OPEN
aexperiences/marketnarc.com      The Narcs    $7.99/mo   OPEN
aexperiences/xpense-os           Xpense OS    $9.00/mo   OPEN
aexperiences/espodrama           ESPO Drama   $7.99/mo   OPEN
aexperiences/neurodivulge-store  (not an app — owns neurodivulge.com)
```

**GitHub → Settings → Developer Settings → Fine-grained tokens →
"AE deploy — aexperiences-site" → Repository access → add all five → Update.**

**15 pages are already written and committed**, sitting one push from live in
`~/ext-espogenius` and `~/ext-marketnarc` on the Mac VM.

---

# 3 · THE LAWS THIS SESSION PAID FOR

These cost real time. Do not re-learn them.

### An absence of data is never a fact about the world
GitHub answers **404, not 403**, for a private repo a token cannot see —
deliberately, so tokens cannot fish for private names. Vercel's `get_project`
**omits the `link` field** rather than reporting null.

I turned the first into *"there is no such repo"* and told Anthony I did not
know a name that was already in my context. I turned the second into *"this
product has no git repo"* about a live $7.99/mo product that has had one since
July. **404 means you cannot see it. A missing field means it was not returned.**

### A rule that hides things must be tested against everything it hides
Collapsing four ND apps into one shop tile was written as *"if it has a family,
give it no tile."* Nine families have no tile. **Sixteen live apps silently
vanished from the store** and stayed gone overnight. I had verified that the
four disappeared. I never asked what else did.

### A rewrite cannot beat a file that exists
In `vercel.json`, **rewrites are a fallback consulted after the filesystem
check**. `/` resolves to the real `index.html`, so a host rewrite on `/` never
runs. **Redirects** are evaluated before the filesystem. That is the tool.

### A push GitHub accepts is not a deploy Vercel ran
`origin/main` carried a commit while the newest deployment was the one before
it, for several minutes. **Checking the remote is not checking production.**
Check the live bytes, or `x-vercel-cache` and the deployment sha.

### Never `git stash` between `add` and `commit` *(Sep 17, still true)*
`stash pop` restores unstaged. A commit carried 5 of 47 files and **pushed
clean**. Verify with `git show :<path>` or a second clone. Never by stashing.

### When a name cannot be derived, read the hall of records
`espodrama.com` is served by the Vercel project **`whichway`** — named after a
*feature* of the app, the branching WhichWay story. No search gets there from
"ESPO Drama." It was written in `aehub/api/_sot.mjs` the whole time.

---

# 4 · THE DOORS — how the gate actually works

- **`ae-gate.js`** — the storefront. One `<script>` in `<head>`.
  **Never deferred** (the app paints first and a non-payer sees the paid screen
  flash past). **Directly under `<meta charset>`, never above it** (price strings
  carry a mid-dot; a non-ASCII byte before the charset declaration makes a page
  guess its own encoding).
- **`api/gate.mjs`** — the lock. An app **not in its `APPS` set answers
  `ungated` and opens**, so a gate tag without a registry entry silently does
  nothing. **The two lists move together, always.**
- **`data-api`** — for an app on its own domain, which has no `/api/gate`.
  Answers cross-origin on purpose: it only ever returns yes/no about a code or
  a subscription id. It hands out nothing.
- **`AE_COMP_CODES=weirdo`** — Vercel, Config, Production. Opens **every** gated
  app, typed **once**: a comp unlock writes a shared slot and the next app opens
  itself. Revoking the env var kills it everywhere on the next load.

**Gated (12):** ND Thread · ND Tendency · ND Regulator · ND Focus ·
ESPOfunkmaster · AE Revolver · ESPOvocab · ESPOhystory · ESPOvineyard ·
ESPOstogie · ESPOwhiskey · ESPObarista

**Deliberately open:** free and in-testing apps (nothing to buy), B2B hubs
(walking into a hub *is* the sale), `/apps/nd/` (a bundle's front page is a
menu; the four behind it each have their own door).

**The honest limit, say it out loud:** these apps are client-side. This is a
front door, not a vault. It stops everyone not deliberately opening devtools.
At $1.99 that is the right trade. Where the *content* is the product, do it the
`api/hystory` way — server-side.

---

# 5 · THE REGISTER — `/production/`

Gated as app `ops`; `weirdo` opens it. Rebuild:
`python3 _ops/build-production-registry.py`

Three sources, **one** of them typed:

| source | what | how |
|---|---|---|
| `catalog.js` | product, price, state, url | read |
| `VERCEL{}` | project → GitHub repo | typed, **and dated** |
| the files | is `ae-gate.js` really there | **computed** |

It follows `vercel.json` rewrites, so a path on aexperiences.com is never
mistaken for aexperiences.com serving it. A blank says **"this file does not
know"** — never "there is nothing." *A register is allowed to be ignorant. It is
not allowed to be confidently wrong.*

Current: **54 products · 18 sold & live · 0 doors open in this repo · 5
unverifiable here.**

---

# 6 · MONEY — checked in Stripe, Sep 18 2026

- **Zero app subscribers.** The only subscription on the account is Anthony's.
- One real customer, **two printables**, Sep 1. One-time. Nothing renews.
- **$39.99, Jul 5 — Dispute lost.** A chargeback went against him. Sitting there.
- **Regulation Through Movement: Flash Cards has never sold** — not for want of
  demand; there was never a way in.

**So nothing was at risk in gating anything.** Nobody loses what they paid for.

⚠ **The one live hazard:** subscriptions sold **before Sep 17 2026** carry no
`product` metadata, and `api/gate.mjs` refuses an unstamped subscription rather
than guess. If a real subscriber ever appears from before that date,
**back-stamp in Stripe first, then gate.**

---

# 7 · ND OS — the internal project

`/nd/os/` · gated · installable · dark by default · phone first.

**Rooms:** Desk · Write · Notes · Blast · List · Calendar · Docs · Records

- **The bus** (`nd-os.js`) — no room calls another room. Sticky topics replay for
  late arrivals; BroadcastChannel crosses tabs. **A new room costs one line** in
  `ROOMS`. Proof it was right: the Calendar shows list items, queued posts and
  published notes *without knowing those rooms exist*.
- **The Triad** (`nd-triad.js`) — two sealed opposing lenses argue, a Pacemaker
  gates on **earned** confidence and either releases one clean answer or says
  *not yet* and shows what it waits on. Pure functions of real facts — no model,
  no network — which is exactly why it is allowed to say no. It refuses to read
  a trend from four visitors.
- **The dock** — not a tab bar. Floating glass, a pill that chases the room, one
  raised button for what the room is *for*. **It does not hide on scroll** — that
  was removed the moment Anthony said navigation was disappearing.
- **Blast** holds a queue Blastpack drains the day Meta clears. Opening day is a
  switch, not a build: `GET /api/nd-queue?due=1`, `POST {id, status:'sent'}`.

`ND_BLOG_KEY` (Vercel, Secret, Production) is the word she types. `/nd/os/README`
in the repo carries the full architecture.

---

# 8 · JESSICA'S SITE — state and what is left

Live at **neurodivulge.com** → `/nd/` (307, host-scoped redirect).

**Working:** three Stripe checkouts · TikTok, Instagram, Facebook · Notes ·
the gear into ND OS · Privacy.

**Still to do, and they are hers to decide:**
1. **Her FB and IG bios point at `stan.store/Neurodivergenthomeschoolreset` —
   a hard 404.** Stan answers 200 with its own marketing page for handles that
   do not exist, so a casual check looks fine. **Both bios should point at
   neurodivulge.com.** Her TikTok bio already does.
2. The Watch section links to her TikTok profile. Three invented video titles
   were removed rather than pointed at a profile under a promise she never made.
   Real videos can replace it when someone can read the links off her account —
   TikTok blocks headless.
3. Pinterest and YouTube buttons delete themselves until those accounts exist.
4. The address bar reads `neurodivulge.com/nd/`. A clean root needs her site as
   its own Vercel project — the `neurodivulge-store` repo, blocked on the token.
5. **Where the effort belongs: TikTok has 1,059 followers. Instagram 39.
   Facebook 28.** That is one audience and two placeholders.

---

# 9 · HOW ANTHONY WORKS — non-negotiable

- **Plain English. One decision at a time. Short replies.**
- Dyslexia and other learning disabilities. **Drive the browser to the exact
  place and name the single action.** Never hand him codes to transcribe or a
  list of steps.
- Honest pushback over flattery. **Own mistakes plainly, fix them, move on.**
  He is not fragile and he notices hedging.
- **Never tell him to stop working or go to bed.**
- Phone, late at night. Everything built for him is phone-first.
- He knows his business better than any register does. When he says a name, it
  is the name — go look it up rather than arguing with it.
