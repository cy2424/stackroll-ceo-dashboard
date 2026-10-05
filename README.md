# Stackroll CEO dashboard

Static CEO website, preserving the supplied dashboard's layout, colors, filters,
12 KPI cards, five focus slots, six funnel stages, rankings, three action slots
and chart areas. Open `index.html` directly or serve this folder with:

```powershell
python -m http.server 8765 --bind 127.0.0.1 --directory website
```

The 5 October 2026 Google Sheet review leaves every qualified CEO KPI blocked
by its named business decision or source evidence. Each unavailable visual
explains the reason and references the sheet's numbered items. Filters are
disabled until their contracts and underlying metrics can be implemented.
Other dashboard labels remain in the sidebar, disabled for this CEO-only release.

This page contains no live data, source counts, credentials, source payloads,
external scripts or data connection. Reasons and expanded details are ordinary
HTML and work without JavaScript. It does not claim to be a functioning live KPI
dashboard. See `docs/ceo-dashboard-delivery.md` in the private development
repository for the evidence and remaining work.

For free GitHub Pages hosting, copy only `index.html`, `.nojekyll` and this README
to a separate public repository. Set **Settings → Pages → Build and deployment
→ Source: Deploy from a branch → Branch: main → Folder: / (root) → Save**.
Keep the Databricks repository private. GitHub Pages serves static files; adding
live private metrics later requires an approved authenticated data service.
Never place Databricks tokens, source records or private metrics in this public
repository or browser code.
