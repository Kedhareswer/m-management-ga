# 📚 MangaShelf — never lose your chapter again

A playful reading tracker for **manga, manhwa, comics and graphic novels**.
Paste a link from wherever you read — MangaShelf extracts the title, genres,
cover, author and site automatically, remembers the chapter you're on, and one
click later you're back exactly where you left off.

The design is a warm, book-store-style dashboard: cream panels, cloth-bound
book covers with bookmark ribbons, springy GSAP motion, Lenis smooth
scrolling — and **Mango**, the little chat assistant in the right panel.

## ✨ Features

- **Paste a link → shelf card.** Playwright runs *inside* the Next.js server:
  it renders the page in headless Chromium (even JS-heavy readers) and pulls
  title, genres, cover image, author, description and site name. When a
  Requesty key is set, the LLM reads the page text to extract genres/author/
  kind reliably across bespoke reader layouts (and flags adult content);
  DOM heuristics are the no-key fallback. A lightweight fetch + meta-tag
  fallback kicks in if the browser can't run, so adding always works.
- **Safe mode.** Adult (nsfw) series are detected on add and hidden behind a
  Safe-mode toggle in the shelf header (on by default, remembered locally).
- **Bot-protected sites, handled honestly.** We don't defeat CAPTCHAs — we
  present as a well-behaved browser (realistic headers, per-host rate
  limiting) which clears *soft* protection, and when a site hard-blocks us
  (Cloudflare/DataDome/CAPTCHA) we say so and let you fill details in by hand.
  Chapter tracking never depends on the scrape.
- **Real cover art, even from hot-link-protected sites.** Manga CDNs usually
  refuse images without the right `Referer`, which is why hot-linked covers
  break. Covers are served through `/api/image`, which fetches server-side
  with the series page as Referer, escalates to a fetch through the Playwright
  browser context when a site is stricter, and caches every cover on disk
  (`DATA_DIR/covers`). Cover detection tries `og:image` → JSON-LD → the
  largest portrait image on the page.
- **Chapter bookmarks.** If the link you pasted contains a chapter number
  (`…/chapter-142`, `…/episode-9`, `?episode_no=143`…), MangaShelf learns the
  site's URL pattern. Bump the chapter with the ± stepper (or click the number
  to type it) and **Continue reading** redirects you straight to that chapter.
- **Genre shelves.** Genres are auto-extracted and become the book-shaped
  filter tabs across the top — click one to see just that shelf.
- **Mango the chat assistant — now with a real LLM brain.** Right-hand chat
  panel, like a book-store concierge:
  - `what am I reading?` — your in-progress shelf, with mini covers
  - `update One Piece to chapter 1100` — moves your bookmark
  - `continue Solo Leveling` — link straight to your chapter
  - `recommend fantasy` — picks something from your shelf
  - `stats` — chapters read, genres explored
- **Requesty LLM provider (default: `google/gemma-4-31b-it`).** Open ⚙ in the
  chat header and paste your [Requesty](https://requesty.ai) API key — the key
  is **session-based**: it lives in the browser's sessionStorage, travels
  per-request in a header, and is never stored on the server. With a key,
  Mango answers via the LLM and acts on your shelf through a JSON action
  protocol (update chapters, change status, star favourites, hand you the
  continue-reading link). Without a key — or if the call fails — the built-in
  rules brain answers, so chat always works.
- **Agent memory with compaction.** The conversation is persisted server-side
  (`DATA_DIR/chat-memory.json`) and restored when you come back. When the
  transcript grows past `MEMORY_MAX_MESSAGES` (default 40), older messages are
  folded into a rolling summary — by the LLM when a key is present, by a
  heuristic digest otherwise — and that summary is fed back into Mango's
  system prompt. Clear it any time with the 🗑 button in the chat header.
- **Motion design.** GSAP entrance choreography, popping cards, swaying
  bookmark ribbons, Lenis buttery scrolling.

## 🚀 Run it

```bash
npm install
npx playwright install chromium   # once — downloads the headless browser
npm run dev                        # http://localhost:3000
```

That's it — one app, no extra services. For production: `npm run build && npm start`.

> **Note on hosting:** the app needs a real Node server (it launches
> Chromium and writes your library to disk), so host it on a VPS, Railway,
> Render, Fly.io, or via the Dockerfile below. Serverless platforms
> (Vercel/Netlify functions, Cloudflare Workers) can't run the embedded
> browser or persist the JSON library.

### Docker (optional, single container)

```bash
docker build -t mangashelf .
docker run -p 3000:3000 -v mangashelf-data:/data mangashelf
```

Chromium is baked into the image; your library persists in the
`mangashelf-data` volume.

### Storage: Neon Postgres (recommended) or a local JSON file

Set `DATABASE_URL` (e.g. in `.env.local`) to a
[Neon](https://neon.tech) Postgres connection string and your library +
chat memory live in Postgres — persistent across restarts and deploys,
no schema setup needed (tables are created automatically on first use).
Without it, everything is stored in a local JSON file under `DATA_DIR`,
which is fine for a single machine.

```bash
# .env.local  (gitignored — never commit credentials)
DATABASE_URL=postgresql://user:password@your-host.neon.tech/neondb?sslmode=require
```

### Environment variables

| Variable               | Default                          | Purpose                                        |
| ---------------------- | -------------------------------- | ---------------------------------------------- |
| `DATABASE_URL`         | unset                            | Neon Postgres — enables database storage       |
| `NEON_FETCH_ENDPOINT`  | Neon's own                       | Point the driver at a local Neon HTTP proxy    |
| `DATA_DIR`             | `./data`                         | Library, chat memory and cover cache (file mode) |
| `AI_MODEL`             | `google/gemma-4-31b-it`          | Default LLM model when a Requesty key is set   |
| `REQUESTY_BASE_URL`    | `https://router.requesty.ai/v1`  | OpenAI-compatible router endpoint              |
| `MEMORY_MAX_MESSAGES`  | `40`                             | Compaction trigger for chat memory             |
| `MEMORY_KEEP_RECENT`   | `12`                             | Messages kept verbatim after compaction        |
| `CHROMIUM_PATH`        | Playwright's own                 | Use a pre-installed Chromium binary            |
| `DISABLE_PLAYWRIGHT`   | unset                            | Set to `1` to force the lightweight extractor  |

There is no login: this is a single-user app by design. The Requesty key is
supplied per browser session in the chat settings, never via env or disk.

## 🧱 Stack

- **Next.js 15** (App Router, TypeScript) + **Tailwind CSS**
- **GSAP** for motion, **Lenis** for smooth scrolling
- **Playwright** embedded in the server for extraction & cover fetching
- **Neon Postgres** storage via `@neondatabase/serverless` (set
  `DATABASE_URL`), with a zero-setup JSON-file fallback for local dev

## 🗺️ How the chapter redirect works

1. You paste `https://reader.example/one-piece/chapter-1088`.
2. MangaShelf stores the template `…/one-piece/chapter-{chapter}` and sets
   your bookmark to `1088`.
3. You bump the stepper to `1090` (or tell Mango).
4. Clicking the cover or **Continue reading** hits `/go/:id`, which redirects
   to `…/one-piece/chapter-1090`.

For links without a detectable chapter, `/go/:id` falls back to the last
chapter URL you saved, then to the series page.

## 📁 Project layout

```
app/            Next.js routes (dashboard, /api/manga, /api/chat, /api/image, /go/:id)
components/     Dashboard, shelf cards, chat panel, genre chips, …
lib/            store (JSON), playwright extractor, chapter-URL detection, Mango's brain
Dockerfile      optional single-container deploy (Chromium included)
```
