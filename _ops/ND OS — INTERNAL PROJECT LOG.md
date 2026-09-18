# ND OS — INTERNAL PROJECT LOG
### Accelerated Experiences LLC · opened Sep 17 2026 · this entry Sep 18 2026
### Status: **LIVE, in use, unfinished by design**

---

## WHAT IT IS AND WHY IT EXISTS

An operating system for **The Neuro-Divulge**, Jessica's side of the business.
Anthony's framing, in his own words:

> *"build her the coolest mobile/ipad mini business os that she can use and
> say… show her what her company can do… her husband and his fucking friend
> that he hangs out with late at night… she hasn't even used my OS. this is my
> way to get her to use one."*

That is the brief. It is not a dashboard exercise. It is an attempt to hand
someone a business they can see the shape of, on the device they actually hold.

**Internal project, not a product.** Nothing here is sold. It sits behind the
same door as everything else.

---

## WHERE IT LIVES

| | |
|---|---|
| Rooms | `/nd/os/` · `/nd/write/` · `/nd/blog/` |
| Shell | `nd/os/nd-os.js` (bus) · `nd-triad.js` (Triad) · `nd-os.css` (dock) |
| Theme | `nd/nd-theme.css` |
| Endpoints | `api/nd-blog.mjs` · `api/nd-desk.mjs` · `api/nd-queue.mjs` · `api/nd-store.mjs` |
| Repo | `aexperiences/aexperiences-site` |
| Lock | `ND_BLOG_KEY` (Vercel · Secret · Production) |
| Architecture | `nd/os/README — the bus, the Triad, and how a room plugs in.md` |

**Eight rooms:** Desk · Write · Notes · Blast · List · Calendar · Docs · Records

---

## THE THREE DECISIONS THAT DEFINE IT

### 1. Bus style — his instruction, and it paid immediately
No room calls another room. A room publishes; a room subscribes. Sticky topics
replay for late arrivals; `BroadcastChannel` carries the bus across tabs.

*The proof it was right:* the Calendar shows list items, queued posts and
published notes **without knowing the List, Blast or Write rooms exist.** It
subscribed to `list:changed` and `post:saved`. Nobody wired four rooms together
because there is nothing to wire.

**Cost of a new room: one line in `ROOMS`.** The dock, the sheet and the Desk
all read from it.

### 2. The AE Triad runs the back end
Two sealed opposing lenses argue; a Pacemaker gates on **earned** confidence and
either releases one clean answer or says *not yet* and shows what it is waiting
on.

| Dept | For | Against | Bar |
|---|---|---|---|
| `publish` | Voice — does it sound like her | Ready — is it finished | no blockers, 55% |
| `desk` | Signal — what the numbers say | Noise — is the sample big enough | 25 people / 5 active days |
| `reach` | Timing — the window is open | Fit — wrong day, and these are not her numbers | in-window, strong day |

Every department is a **pure function of facts handed in** — no model, no
network, no guess. That is precisely why it is allowed to say no. On the Desk it
refuses to read a trend from four visitors. On Write it can hold a draft, and
she can always overrule it.

The Reach windows are labelled **general published findings on every render**,
not once in a footnote, and the Pacemaker keeps saying so until her own numbers
clear the Desk bar.

### 3. It is a dock, not a tab bar
Floating dark glass off the bottom edge, a pill that chases the active room, one
raised button for what the room is *for*, drag-to-dismiss sheet for the rest.
Dark by default, remembered per phone, painted before the first pixel so there
is no white flash at 11pm. Installable to the home screen as **ND OS**.

The front of house stays light — classroom pastels, his call, not up for debate.
`nd-os.css` is loaded only by the rooms, so it physically cannot reach her site.

---

## WHAT THE ROOMS DO

- **Desk** — visitors, where from, IPs, what the ND label sold. Reads its own
  sample size and refuses to over-read it.
- **Write** — a note, read by the Triad, then published. She can overrule it.
- **Notes** — the public blog. Body stored as plain text, never HTML.
- **Blast** — caption, platforms, "pick the next good window" scored across her
  whole selection, into a queue. **Blastpack drains it the day Meta clears.**
  Opening day is a switch, not a build: `GET /api/nd-queue?due=1` and
  `POST {id, status:'sent'}` are already written.
- **List** — Now / After that / Done. Ticks flip instantly and flip back if the
  server refuses.
- **Calendar** — everything that already has a time, gathered. Nothing entered
  twice.
- **Docs** — saves itself two seconds after she stops typing, and on tab close.
  Print goes to a clean sheet, which is how you get a PDF on a phone.
- **Records** — the hall of records. Most entries the OS writes itself as things
  happen and **cannot be edited**; hers carry a hollow ring. That distinction is
  what makes it a record instead of a notebook.

---

## CORRECTIONS TAKEN, IN HIS WORDS

Kept because the pattern matters more than the fixes.

| He said | What was wrong |
|---|---|
| *"its a dark brown website, i don't know what the fuck you re doing"* | A dark theme invented for the front site. Removed entirely. |
| *"the black isn't classroom pastels. Read the briefs"* | Ink filling buttons. Read the Sep 14 brief; terracotta. |
| *"that is the colors. dammit"* | Palette sampled from his reference, not invented. |
| *"navigation disapears at times on certain screens"* | The dock hid itself on scroll. **Removed** — a navigation you cannot find is not navigation. |
| *"We've already got most of those icons"* | I was drawing new SVGs. The ICON SWAP MACHINE already held them. |
| *"look in the hall of records"* | I was guessing at what was written down. |

**The standing lesson:** when he says something exists, it exists. Go find it.

---

## OPEN, AND WHY

1. **Real sign-in.** One shared word today. `jre@aexperiences.studio` and his
   own address were the stated intent.
2. **Her `@neurodivulge.com` email, then the HTML blaster.** His stated future.
3. **A door from AE OS into ND OS.** Asked for, not built.
4. **Blast opens on Instagram** when TikTok is where her 1,059 people are.
5. **Clean root** for neurodivulge.com — needs her site as its own Vercel
   project, blocked on the token.

---

## THE NUMBER THAT SHOULD DRIVE THE NEXT DECISION

**TikTok 1,059 · Instagram 39 · Facebook 28.**

That is not three social accounts. It is one real audience and two placeholders.
Her TikTok bio already points at neurodivulge.com and is correct. **The other two
point at a dead stan.store link.** Everything else — the OS, the queue, the
posting windows — should be pointed where the people actually are.
