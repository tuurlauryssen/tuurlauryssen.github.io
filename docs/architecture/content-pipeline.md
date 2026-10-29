# Content pipeline: idea → live article

[← back to the map](README.md)

![Content pipeline](images/content-pipeline.svg)

Step-by-step instructions are in [`POST_WORKFLOW.md`](../../POST_WORKFLOW.md), and the drafting prompts are in [`CONTENT_PROMPTS.md`](../../CONTENT_PROMPTS.md). This page shows how the pieces connect.

## Inside `process-new-posts.ps1`

```mermaid
flowchart TB
  classDef in fill:#F7ECDA,stroke:#B8752E,color:#141210
  classDef step fill:#FFFFFF,stroke:#1B2C45,color:#141210
  classDef out fill:#E4EAF3,stroke:#2B4C7E,color:#141210
  classDef stop fill:#F5E2DF,stroke:#A23B3B,color:#141210

  G{"git working tree clean?"} -- no --> X["stop: commit or stash first"]:::stop
  G -- yes --> F["find files in posts/incoming/&lt;type&gt;/&lt;lang&gt;/"]:::in
  F --> D{"Beehiiv draft preview?"}
  D -- yes --> X2["stop: export the LIVE page"]:::stop
  D -- no --> M["extract title, date, excerpt,<br/>author(s), images"]:::step
  M --> C["clean HTML: drop script, noscript, form,<br/>button, header, footer, nav, comments,<br/>attributes, 'Keep reading' blocks"]:::step
  C --> I["download images<br/>→ assets/img/posts/&lt;slug&gt;/"]:::out
  C --> W["write posts/&lt;type&gt;/&lt;lang&gt;/&lt;slug&gt;.html<br/>(site header, fonts, site-config.js, main.js)"]:::out
  M --> RAW["archive original<br/>→ posts/raw/&lt;type&gt;/&lt;lang&gt;/"]:::out
  M --> AU["new authors → authors.json"]:::out
  W --> MAN["sync manifest<br/>posts.json + posts-data.js"]:::out
  MAN --> GIT["git: fetch main → new branch →<br/>commit → push"]:::step
  GIT --> PR{"gh installed?"}
  PR -- yes --> PR1["gh pr create"]:::out
  PR -- no --> PR2["print a compare link"]:::out
```

## Folder → type → URL

| Drop folder | `type` in manifest | Published at | Badge on cards |
|-------------|-------------------|--------------|----------------|
| `posts/incoming/explained/en` | `explained` | `/posts/explained/en/<slug>.html` | Explained |
| `posts/incoming/explained/nl` | `explained` | `/posts/explained/nl/<slug>.html` | Uitgelegd |
| `posts/incoming/ideas/en` | `learned` | `/posts/ideas/en/<slug>.html` | Columns |
| `posts/incoming/ideas/nl` | `learned` | `/posts/ideas/nl/<slug>.html` | Columns |

> The folder is called `ideas`, the type is `learned` (from the old name "Things I Learned"), and the label shown on the site is "Columns". It's the same thing under three names. The backend only accepts the types `explained`, `learned` and the legacy `interview`.

## From manifest to homepage

```mermaid
flowchart LR
  P["posts.json"] -->|"sync script"| PD["posts-data.js<br/>window.INSPIRE_LOCAL_POSTS"]
  PD --> B["beehiiv.js"]
  B -->|"language = page lang<br/>visibility = public"| H["homepage: 2 + 2 latest"]
  B --> A["archive: 9 per page + filters"]
  P -. "visibility: hidden" .-> HID["direct URL only"]
```

After merging: add the new URL to `sitemap.xml` by hand, because the script doesn't do it.
