# The website (this repo)

[← back to the map](README.md)

The site is **100% static**: there's no build step, no framework and no server. GitHub Pages serves the files in the repo as they are. Everything dynamic happens in the visitor's browser, which calls the Supabase functions.

## 2.1 Folder map

```mermaid
flowchart LR
  classDef page fill:#FFFFFF,stroke:#1B2C45,color:#141210
  classDef js fill:#E4EAF3,stroke:#2B4C7E,color:#141210
  classDef data fill:#E7EEE7,stroke:#3F6B4A,color:#141210
  classDef tool fill:#F7ECDA,stroke:#B8752E,color:#141210

  R(["repo root"])
  R --> P1["index.html · blog.html<br/>EN pages"]:::page
  R --> P2["nl/index.html · nl/blog.html<br/>NL pages"]:::page
  R --> P3["posts/explained|ideas/en|nl/*.html<br/>article pages"]:::page
  R --> P4["sandbox/<br/>layout experiments"]:::page
  R --> J1["assets/js/site-config.js<br/>endpoint URLs + GA ID"]:::js
  R --> J2["assets/js/main.js<br/>forms, analytics, likes, reads, UI"]:::js
  R --> J3["assets/js/beehiiv.js<br/>post cards + counters"]:::js
  R --> J4["assets/js/page-config-nl.js<br/>Dutch strings"]:::js
  R --> J5["components/home-content(.nl).js<br/>editable homepage copy"]:::js
  R --> D1["assets/data/posts.json + posts-data.js<br/>post manifest"]:::data
  R --> D2["assets/data/authors.json"]:::data
  R --> D3["assets/css/style.css<br/>all styling"]:::data
  R --> T1["scripts/process-new-posts.*<br/>Beehiiv → page → PR"]:::tool
  R --> T2["scripts/sync-posts-manifest.*<br/>rebuild manifest"]:::tool
  R --> T3["posts/incoming/…<br/>drop folders"]:::tool
```

## 2.2 Which scripts each page loads

Order matters. `site-config.js` must load before `main.js`, and `posts-data.js` before `beehiiv.js`.

```mermaid
flowchart TB
  classDef cfg fill:#E4EAF3,stroke:#2B4C7E,color:#141210
  classDef core fill:#FFFFFF,stroke:#1B2C45,stroke-width:2px,color:#141210
  classDef data fill:#E7EEE7,stroke:#3F6B4A,color:#141210

  subgraph Home["🏠 index.html / nl/index.html"]
    direction LR
    h0["home-content(.nl).js"]:::data --> h1["site-config.js"]:::cfg --> h1b["page-config-nl.js<br/>(NL only)"]:::cfg --> h2["main.js"]:::core --> h3["posts-data.js"]:::data --> h4["beehiiv.js"]:::core --> h5["inline: copy, hero logo<br/>canvas, rotating quotes"]:::core
  end
  subgraph Blog["🗂️ blog.html / nl/blog.html"]
    direction LR
    b1["site-config.js"]:::cfg --> b1b["page-config-nl.js<br/>(NL only)"]:::cfg --> b2["main.js"]:::core --> b3["posts-data.js"]:::data --> b4["beehiiv.js"]:::core --> b5["inline: quotes"]:::core
  end
  subgraph Article["📄 posts/…/slug.html"]
    direction LR
    a1["site-config.js"]:::cfg --> a2["main.js"]:::core
  end
```

## 2.3 What happens when someone opens an article

`main.js` waits for `DOMContentLoaded`, then wires everything up. On an **article page** that comes down to this:

```mermaid
sequenceDiagram
  autonumber
  participant B as 🌐 Browser
  participant P as GitHub Pages
  participant G as Google Analytics
  participant F as Supabase functions

  B->>P: GET /posts/explained/en/slug.html (+ CSS, JS, fonts)
  P-->>B: static files
  Note over B: main.js: DOMContentLoaded
  B->>G: load gtag.js · config(storage:"none", anonymize_ip)
  B->>G: page_view, article_view
  Note over B: visitorToken = crypto.randomUUID()<br/>(memory only, new on every page load)
  B->>F: article-read-track {eventType:"opened"}
  B->>F: article-community-summary {articleSlug, visitorToken}
  F-->>B: likeCount, likedByCurrentVisitor
  Note over B: like 👍 + 💬 buttons and the<br/>"reply to article" form appear
  loop every second while the tab is visible
    Note over B: activeSeconds += 1
  end
  B->>F: after 10 active seconds: article-read-track {eventType:"engaged"}
  B->>G: scroll_depth at 25 / 50 / 75 / 90 %
  B->>G: article_read_complete (≥ 90 % scrolled and ≥ 30 s active)
  opt reader clicks 👍
    B->>F: article-like-toggle
    F-->>B: new likeCount
    B->>G: article_like
  end
  opt reader sends the reply form
    B->>F: contact-message (subject "Reply to article: …")
    B->>G: contact_success
  end
```

### The "engaged read" timeline, visually

```mermaid
gantt
  title One article visit (seconds of active, visible-tab time)
  dateFormat ss
  axisFormat %Ss
  section Supabase
  "opened" row written         :milestone, 00, 0s
  "engaged" (≥10 s active)     :milestone, 10, 0s
  section Google Analytics
  page_view + article_view     :milestone, 00, 0s
  scroll_depth events          :active, 00, 30s
  article_read_complete (≥30 s and 90 % scroll) :milestone, 30, 0s
```

> **What "Reads" means on the post cards:** the number of **engaged** reads, meaning page loads where the tab was visible for at least 10 seconds.
> The visitor token is new on every page load, so one person reading twice counts twice. That's a deliberate privacy choice: nothing is stored in the browser. The same applies to likes.

## 2.4 Homepage & archive: how post cards are built

```mermaid
flowchart TB
  classDef step fill:#FFFFFF,stroke:#1B2C45,color:#141210
  classDef net fill:#E7EEE7,stroke:#3F6B4A,color:#141210

  A["window.INSPIRE_LOCAL_POSTS<br/>(from posts-data.js)"]:::step --> B{"present?"}
  B -- yes --> C["map + sort posts<br/>(newest first)"]:::step
  B -- no --> B2["fetch posts.json"]:::step --> C
  C --> D["keep posts where language = page language<br/>and visibility = public"]:::step
  D --> E{"homepage?"}
  E -- yes --> F["2 latest Explained + 2 latest Columns"]:::step
  E -- no --> G["archive grid, 9 at a time,<br/>filter tabs: all / explained / learned"]:::step
  F --> H["render cards<br/>(titles, links, excerpts HTML-escaped)"]:::step
  G --> H
  H --> I["article-read-summary<br/>1 call for all cards"]:::net
  H --> J["article-community-summary<br/>1 call per card"]:::net
  I --> K["show 'Reads' if available"]:::step
  J --> K2["show 'Likes' if available"]:::step
```

Counters start hidden. They only appear when the backend answers, so a backend outage just means no numbers.

## 2.5 Forms on the site

| Form | Where | Client-side checks | Sends to | Success message |
|------|-------|--------------------|----------|-----------------|
| **Subscribe** (`[data-subscribe-form]`) | Homepage + archive (EN + NL) | email pattern, ≤ 200 chars | `subscribe` with `{email, source:"website", language:<page lang>, metadata.page}` | "Subscription confirmed." / "You are on the list." |
| **Contact** (`[data-contact-form]`) | Homepage contact section (built by `main.js`) | name 2–100, email ≤ 200, message 10–5000 | `contact-message` with `source:"website-contact"` | "Your message is on its way." |
| **Reply to article** | Bottom of every article (same form, pre-filled subject + prompt) | same | `contact-message` | same |

The client-side checks only improve the experience. The backend checks everything again, and its limits are the ones that count (see the backend's [request flows](https://github.com/tuurlauryssen/inspire-backend/blob/main/docs/architecture/03-backend-and-flows.md), private repo).

## 2.6 Analytics: what Google receives

| Event | When | Extra parameters |
|-------|------|------------------|
| `page_view` | every page | `page_path`, `page_lang` |
| `article_view` | article pages | article slug/path/title/language/type |
| `scroll_depth` | 25/50/75/90 % | `percent_scrolled` |
| `article_read_complete` | ≥ 90 % scroll **and** ≥ 30 s active | `active_seconds` |
| `article_like` | 👍 clicked | `liked` |
| `subscribe_success`, `contact_success` | form sent | — |
| `archive_filter_selected` | archive tab clicked | `filter_name` |
| `outbound_click` | link to another domain clicked | `outbound_url` |

Privacy settings in `initializeAnalytics()`: `storage: "none"` (no cookies), `anonymize_ip: true`, and a `client_id` that's random on every page load. Google can't link visits together through cookies, and the site sets no cookies of its own.

## 2.7 Bilingual setup

```mermaid
flowchart LR
  EN["/ (EN)"] <-- "hreflang + language switch" --> NL["/nl/ (NL)"]
  EN --- C1["components/home-content.js"]
  NL --- C2["components/home-content.nl.js<br/>+ page-config-nl.js (strings, nl-BE dates)"]
  POSTS["posts.json<br/>language: en | nl"] --> EN
  POSTS --> NL
```

- Each language has its own homepage and archive. Posts are filtered by their `language` field.
- `sitemap.xml` declares the EN/NL alternates with `hreflang`.
- Subscribers get `language` = the page's `<html lang>`, so you know which edition they signed up from.

## 2.8 Small things worth knowing

- **`components:loaded` listener** in `main.js` is left over from a removed `component-loader.js`, and nothing fires it any more. It's harmless dead code.
- **`sandbox/`** is a public copy of older layouts, reachable at `tuurlauryssen.com/sandbox/`. It's not blocked by `robots.txt` and has no `noindex`, so search engines may index it.
- **Hotlinked images.** The homepage hero image and the first article still load images from Beehiiv's CDN. Re-running that post through the import script would bring them local.
- **Static like/read numbers in `posts.json`** (`"likes": 32, "reads": "1.2k"`) come from Beehiiv at import time. The live counters on cards come from Supabase instead, so the two can differ.
