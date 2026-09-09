# PlateLoop

Ukrainian landing page and brand kit for the PlateLoop Telegram bot.

- Website: https://dmytrofomov.github.io/plateloop-page/
- Brand kit: https://dmytrofomov.github.io/plateloop-page/brand/
- Bot: https://t.me/plan_eat_ai_bot

Adapted from the local `host-gpt-page` website. Layout, photography and bot functionality are preserved; the public identity is PlateLoop.

## Publish

GitHub Pages serves `master:/docs`. Push changes to `master` to publish automatically. There is no build step or custom domain. Keep `docs/.nojekyll` and use relative asset links so the `/plateloop-page/` prefix works.

## Preview and verify

```powershell
python -m http.server 8000 --directory docs
```

Open http://localhost:8000/.

```powershell
npm ci
npm test
```

The browser check uses installed Google Chrome; set `CHROME_PATH` for another location. It serves the site under `/plateloop-page/` and checks responsive layouts, tabs, keyboard controls, FAQ, images, metadata, brand downloads and content without JavaScript. Reports and screenshots are written to ignored `output/`.

To regenerate the brand assets:

```powershell
npm run build:brand
npm run export:brand
python scripts/package-brand.py
npm test
```

See [README-BRAND.md](README-BRAND.md) for the brand sources.
