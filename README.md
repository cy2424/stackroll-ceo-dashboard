# Stackroll CEO dashboard

CEO-only website preserving the supplied layout, colors, 12 KPI labels, filters,
focus slots, funnel, rankings, action slots and chart positions.

`observations.js` reads an optional same-origin `ceo-data.json`. With a validated
snapshot it draws daily account, game-round and payment document counts in the
existing Revenue Trend area, with an input-count subtitle. The Date selector
offers all observed dates, the snapshot day, and the 7/30 days ending at that
snapshot. A date table provides exact values. Counts describe current complete,
nondeleted source documents grouped by UTC creation date. They do not establish
completed signup, qualified wagers, wallet credit, actual payout or complete
historical activity. The snapshot day is partial.

Unqualified business KPIs retain reasons, responsible owners and CEO-sheet
references. Account creations are explicitly marked as observed inputs, with
completed signup and exclusions still pending. Compare, Country, Source, Game
and Currency remain disabled pending definitions and source evidence. Other
dashboards remain disabled for this CEO-only release. Without a validated data
snapshot, the page retains its unavailable fallback. No live refresh is connected.

Private local preparation in the development repository:

```powershell
python scripts/prepare_ceo_observations.py --daily .databricks/dashboard-preview-input.json --audit .databricks/ceo-field-audit-refreshed-20261002.json --output .databricks/ceo-preview/ceo-data.json
Copy-Item website/index.html,website/observations.js .databricks/ceo-preview
python -m http.server 8765 --bind 127.0.0.1 --directory .databricks/ceo-preview
```

Query results stay in ignored `.databricks`, never Git. Source records,
identifiers, money amounts and credentials are not exported. The preparer
rejects mixed publications and unreconciled document/status counts.

For public hosting, copy only `index.html`, `observations.js`, `.nojekyll` and
this README to the website-only repository. Copy `pages-workflow.yml` to
`.github/workflows/pages.yml` and select **Settings → Pages → Build and
deployment → Source: GitHub Actions**. Only after owner approval for public
aggregate disclosure, supply the prepared JSON as the repository Actions secret
`CEO_OBSERVATIONS_JSON`. The workflow adds it to the deployed artifact, outside
Git history. The deployed data is public despite being stored as a build secret.
With no secret configured, the unavailable fallback is deployed.

[GitHub Pages supports free hosting for public repositories](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
It serves static files, with no authenticated private dashboard or Databricks
backend. Refreshes require a newly verified export and a new deployment. Keep
the data-engineering repository private. See `docs/ceo-dashboard-delivery.md`
there for the evidence and remaining dependencies.
