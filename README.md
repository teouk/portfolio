# Teoman Pisenis: portfolio

A static site (HTML, CSS and JavaScript). There's no build step, so Vercel serves it as-is.

## Deploy on Vercel

**Option A: GitHub (recommended, auto-redeploys on every push)**
1. Create a new GitHub repo (e.g. `portfolio`) and push this folder to it.
2. On vercel.com, choose **Add New → Project**, then import the repo.
3. Set **Framework Preset** to **Other**. Leave the build command and output directory empty, then click **Deploy**.

**Option B: Vercel CLI**
```bash
cd portfolio
npx vercel        # preview deploy
npx vercel --prod # production
```

To use a nicer address, open **Project → Settings → Domains** and add e.g. `teomanpisenis.vercel.app` (free) or your own domain.

## Before you share the link

- **Real screenshot.** `assets/glorious-dashboard.svg` is a simplified illustration. Save a real screenshot of the inventory app as `assets/glorious-dashboard.png` and change the `<img src>` in `index.html`. Hide or blur anything private first.
- **CV download.** Put your CV at `assets/Teoman_Pisenis_CV.pdf`. The "Download CV" button appears automatically once the file exists. Consider removing your phone number from this public copy.
- **Repo links.** If any projects are public on GitHub, add a link inside that project's card.
- **Car demo.** When the dissertation car is moving, replace the illustration in the dissertation card with a short video or GIF.

## Preview locally

```bash
cd portfolio
python3 -m http.server 8000   # then open http://localhost:8000
```
