# Current Status

## What's done (`aimap-homepage` — this repo)
- Landing page with live demo links and feature sections
- Multi-step Create wizard (Department → Researchers → AI Summaries → Review)
- GitHub OAuth sign-in flow (via Cloudflare Worker for token exchange)
- GitHub API integration: create repo from `poloclub/ai-map` template, push `researchmap.config.yaml`, push `researchers.csv`, store LLM API key as a repo secret, trigger workflow, enable GitHub Pages
- Progress page that polls workflow status
- Auth gate on Create page (must sign in before using wizard)

## What's done in `ai-map` template repo
- **Scraper**: Uses ScholarMine (installed from GitHub in workflow). Scrapes Google Scholar profiles via Tor.
- **Pipeline scripts** (all present in `ai-map/pipeline/`):
  - `pipeline/combine_profiles.py` — merge scraped per-researcher data into one CSV
  - `pipeline/generate_summaries.py` — call LLM to generate keywords + summaries (Gemini/OpenAI/Anthropic)
  - `pipeline/generate_map_data.py` — embeddings + UMAP → `data.ndjson` + `grid.json`
  - `pipeline/download_images.py` — download researcher profile photos
  - `pipeline/run_pipeline.py` — orchestrator that runs all steps in order
  - `pipeline/requirements.txt` — Python dependencies
- **GitHub Actions workflow** (`.github/workflows/generate-map.yml`): 3-job workflow (Scrape → Process → Build & Deploy) triggers via `workflow_dispatch`.
- **Frontend data loading**: `Embedding.svelte` loads local `data.ndjson` + `grid.json` in `actions` build mode.
- **Build mode**: `vite.config.ts` has `actions` mode with configurable base path via `VITE_BASE_PATH` env var.

## CRITICAL
- **WizMap boundaries need to be extended**: The WizMap visualization boundaries are too tight — researchers near the edges get clipped or are hard to interact with. The contour/grid extent and UMAP coordinate padding need to be expanded so the full map is visible and navigable.

## What's NOT done yet
- **Switch TEMPLATE_OWNER back to poloclub**: Currently `Sripal1` in `src/lib/config.ts` to bypass poloclub org OAuth restrictions. Switch back to `poloclub` once the org approves the OAuth app or the repo is public.
- **Config-driven frontend theming**: The template frontend does not yet read `university_name`, `color_theme`, etc. from `researchmap.config.yaml` at build time (title, colors, logo).
- **ScholarMine publishing**: ScholarMine is installed from `git+https://github.com/Sripal1/scholarmine.git` — needs to be pushed to that repo before the workflow will work.
- **Parallelized scraping**: Currently runs as a single job. The unification plan describes splitting researchers into chunks for parallel scraping (useful for 200+ researchers).
- **Chunked LLM summary generation**: Break down the LLM summary generation workflow into multiple chunks instead of processing all researchers in one pass (avoids timeouts and rate limits on large datasets).

---

# Deployment TODO

## Before deploying to GitHub Pages

### 1. Update GitHub OAuth App URLs
Go to https://github.com/settings/developers → your OAuth App and change:
- **Homepage URL**: `https://<your-username>.github.io/aimap-homepage/`
- **Authorization callback URL**: `https://<your-username>.github.io/aimap-homepage/create`

### 2. Update Cloudflare Worker `ALLOWED_ORIGIN`
In `oauth-worker/wrangler.toml`, change:
```toml
ALLOWED_ORIGIN = "https://<your-username>.github.io"
```
Then redeploy: `cd oauth-worker && npm run deploy`

### 3. Update `.env` for production
```
VITE_GITHUB_CLIENT_ID=<your-client-id>
VITE_OAUTH_WORKER_URL=https://aimap-oauth.<your-subdomain>.workers.dev
```

### 4. Clean up all localhost references
When deploying to production, make sure to replace all `localhost:5173` references:
- **GitHub OAuth App**: Update Homepage URL and Authorization callback URL to production domain
- **Cloudflare Worker**: Update `ALLOWED_ORIGIN` in `oauth-worker/wrangler.toml` from `http://localhost:5173` to production origin, then redeploy
- **GitHub OAuth App callback**: Currently set to `http://localhost:5173/aimap-homepage/create` — must match production URL

---

## Local development setup

### 1. Create GitHub OAuth App
1. Go to https://github.com/settings/developers → "New OAuth App"
2. **Application name**: `AI Map` (or anything)
3. **Homepage URL**: `http://localhost:5173`
4. **Authorization callback URL**: `http://localhost:5173/create`
5. Click "Register application"
6. Copy the **Client ID**
7. Click "Generate a new client secret" and copy the **Client Secret**

### 2. Deploy Cloudflare Worker
```sh
cd oauth-worker
npm install
npx wrangler login          # authenticate with Cloudflare in browser
wrangler secret put GITHUB_CLIENT_ID       # paste Client ID
wrangler secret put GITHUB_CLIENT_SECRET   # paste Client Secret
```
Edit `wrangler.toml` and set `ALLOWED_ORIGIN = "http://localhost:5173"`, then:
```sh
npm run deploy
```
Copy the deployed URL (e.g. `https://aimap-oauth.<subdomain>.workers.dev`).

### 3. Create `.env` in project root
```
VITE_GITHUB_CLIENT_ID=<your-client-id>
VITE_OAUTH_WORKER_URL=<your-worker-url>
```

### 4. Restart dev server
```sh
npm run dev
```
