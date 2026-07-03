# 📚 MangaShelf — never lose your chapter again

A playful reading tracker for **manga, manhwa, comics and graphic novels**.
Paste a link from wherever you read — MangaShelf extracts the title, genres,
cover, author and site automatically, remembers the chapter you're on, and one
click later you're back exactly where you left off.

The design is a warm, book-store-style dashboard: cream panels, cloth-bound
book covers with bookmark ribbons, springy GSAP motion, Lenis smooth
scrolling — and **Mango**, the little chat assistant in the right panel.

## ✨ Features

- **Paste a link → shelf card.** A Playwright-powered scraper service renders
  the page (even JS-heavy readers) and pulls title, genres, cover image,
  author, description and site name. A built-in fallback extractor (meta / OG
  tags) kicks in when the service isn't running, so the app always works.
- **Chapter bookmarks.** If the link you pasted contains a chapter number
  (`…/chapter-142`, `…/episode-9`, `?episode_no=143`…), MangaShelf learns the
  site's URL pattern. Bump the chapter with the ± stepper (or click the number
  to type it) and **Continue reading** redirects you straight to that chapter.
- **Genre shelves.** Genres are auto-extracted and become the book-shaped
  filter tabs across the top — click one to see just that shelf.
- **Mango the chat assistant.** Right-hand chat panel, like a book-store
  concierge:
  - `what am I reading?` — your in-progress shelf, with mini covers
  - `update One Piece to chapter 1100` — moves your bookmark
  - `continue Solo Leveling` — link straight to your chapter
  - `recommend fantasy` — picks something from your shelf
  - `stats` — chapters read, genres explored
- **Motion design.** GSAP entrance choreography, popping cards, swaying
  bookmark ribbons, Lenis buttery scrolling.

## 🚀 Run it

### With Docker (web + Playwright scraper)

```bash
docker compose up --build
```

- Web app → http://localhost:3000
- Scraper service → http://localhost:4000 (`POST /extract {"url": "…"}`)
- Your library persists in the `library-data` volume.

### Local development

```bash
# 1. the web app
npm install
npm run dev            # http://localhost:3000

# 2. (optional but recommended) the Playwright scraper
cd scraper
npm install
npx playwright install chromium   # once, downloads the browser
npm start                          # http://localhost:4000
```

Without the scraper the app falls back to a lightweight meta-tag extractor —
fine for most sites, but the Playwright service handles client-rendered
readers much better.

### Environment variables

| Variable       | Where   | Default                 | Purpose                             |
| -------------- | ------- | ----------------------- | ----------------------------------- |
| `SCRAPER_URL`  | web     | `http://localhost:4000` | Where the Playwright service lives  |
| `DATA_DIR`     | web     | `./data`                | Folder for `library.json`           |
| `PORT`         | scraper | `4000`                  | Scraper port                        |
| `CHROMIUM_PATH`| scraper | Playwright's own        | Use a pre-installed Chromium binary |

## 🧱 Stack

- **Next.js 15** (App Router, TypeScript) + **Tailwind CSS**
- **GSAP** for motion, **Lenis** for smooth scrolling
- **Playwright** scraper micro-service (Node, Dockerised with the official
  Playwright image)
- JSON file storage — zero database setup, your shelf is one readable file

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
app/            Next.js routes (dashboard, /api/manga, /api/chat, /go/:id)
components/     Dashboard, shelf cards, chat panel, genre chips, …
lib/            store (JSON), extractors, chapter-URL detection, Mango's brain
scraper/        Playwright extraction service (own Dockerfile)
docker-compose.yml
```
