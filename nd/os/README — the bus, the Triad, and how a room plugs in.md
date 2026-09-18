# ND OS — how it is built, and how to add to it

Jessica's back end. Phone first, because that is where she is.

## The bus (`nd-os.js`)

No room calls another room. A room **publishes** what happened and **subscribes** to what it
cares about, and that is the whole wiring diagram.

```js
NDOS.bus.emit('post:saved', { post })   // say it
NDOS.bus.on('post:saved', fn)           // hear it — returns off()
NDOS.bus.last('net:busy')               // what was said last
```

Sticky topics (`auth:in`, `auth:out`, `net:busy`, `post:saved`, `post:gone`) replay their last
message to anyone who subscribes afterwards, so a room that mounts late is never stale. The bus
also crosses browser tabs through `BroadcastChannel` — publish in Write and the Desk in another
tab refreshes itself.

Shared services that ride the bus so no room re-implements them:

- `NDOS.auth` — one key, one place. `set` / `clear` emit `auth:in` / `auth:out`; every room
  listens and shows its gate. A 401 anywhere clears the key everywhere.
- `NDOS.net(path, opts)` — the only way to talk to the server. Adds the key, emits `net:busy`
  so the dock spinner is automatic, turns a dead connection into `OFFLINE` instead of a throw.
- `NDOS.say(text, bad)` — emits `ui:say`; the toast subscribes. Rooms never touch the DOM for it.
- `NDOS.mount({active, primary})` — the dock, the sheet, the scroll-away, the raised button.

## The Triad (`nd-triad.js`)

The AE backbone, wired into her OS. Two sealed opposing lenses argue — they never confer, that
is the point. A Pacemaker gates them on an **earned** confidence bar and either releases one
clean answer or says *not yet* and shows what it is still waiting on.

Every department is a **pure function of facts you pass in**. No model, no network, no guess —
which is exactly why it is allowed to say no.

| Department | For | Against | The bar |
|---|---|---|---|
| `publish` | Voice — does it sound like her | Ready — is it finished | no blockers, 55% |
| `desk` | Signal — what the numbers say | Noise — is the sample big enough | 25 people over 5 active days |
| `reach` | Timing — the window is open | Fit — wrong day, and these are not her numbers | in-window on a strong day |

Rulings land on the bus as `triad:finding` then `triad:released` or `triad:held`.

## Adding a room

1. One line in `ROOMS` in `nd-os.js` — the dock, the sheet and the Desk all read from it.
2. A page that loads `nd-theme.css`, `nd-os.css`, `nd-os.js` (and `nd-triad.js` if it judges
   anything), calls `NDOS.mount({active:'<id>', primary:{…}})`, and talks on the bus.
3. If it needs the server, an endpoint that checks `ND_BLOG_KEY` the way `api/nd-blog.mjs` does.

Nothing else changes. That is the whole reason it is built this way.

## The Blastpack drain contract

The queue (`api/nd-queue.mjs`) holds posts while Blastpack waits on Meta app review. Nothing she
writes is lost, and opening day is a switch, not a build. Blastpack, holding `ND_BLOG_KEY`:

```
GET  /api/nd-queue?due=1        -> { items: [...] }   queued, and the time has come
POST /api/nd-queue { id, status:'sent' | 'failed', note }
```

This endpoint never holds a social credential and never posts anything itself. Blastpack does
that, with its own tokens.

## The one thing that must be set

`ND_BLOG_KEY` in the Vercel env. It is the word she types. Until it exists every locked room
answers `NOT_CONFIGURED` and says so in plain English rather than failing silently.
