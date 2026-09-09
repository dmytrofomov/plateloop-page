# PlateLoop

Ukrainian landing page and brand kit for the PlateLoop Telegram bot.

- Website: https://plateloop.app/
- Brand kit: https://plateloop.app/brand/
- Bot: https://t.me/plan_eat_ai_bot

Adapted from the local `host-gpt-page` website. Layout, photography and bot functionality are preserved; the public identity is PlateLoop.

## Publish

GitHub Pages serves `master:/docs` at `https://plateloop.app/`. Push changes to `master` to publish automatically. There is no build step. Keep `docs/CNAME`, `docs/.nojekyll` and relative asset links.

Hostinger manages the domain DNS. The apex (`@`) must have four A records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, and `185.199.111.153`. The `www` CNAME must point to `dmytrofomov.github.io`. GitHub provisions the HTTPS certificate after DNS resolves to Pages.

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
