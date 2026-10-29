# INSPIRE Website

Public site for INSPIRE. This repo serves the homepage, archive, bilingual article pages, and the client-side integrations for subscriptions, contact, and article community actions.

## Structure

- `index.html`: homepage
- `blog.html`: archive
- `nl/`: Dutch entry pages
- `assets/css/style.css`: shared styles
- `assets/js/site-config.js`: public backend endpoint URLs and other runtime config (`window.INSPIRE_SITE_CONFIG`) — public values only, no secrets
- `assets/js/main.js`: shared UI, forms, analytics, contact, and article community behavior
- `assets/js/beehiiv.js`: Beehiiv-related archive rendering
- `assets/data/posts.json`: post manifest used by the site
- `assets/data/posts-data.js`: same manifest inlined as `window.INSPIRE_LOCAL_POSTS` for a faster initial load
- `assets/data/authors.json`: author metadata
- `assets/img/posts/`: images downloaded from Beehiiv at import time
- `components/`: shared content fragments
- `posts/`: generated article pages, raw archives, and the `incoming/` drop folders
- `scripts/`: post import and manifest sync utilities
- `_config.yml`: GitHub Pages build settings; keeps raw exports, import scripts, and internal docs off the public site
- `SECURITY_AUDIT_PROMPT.md`: reusable prompt for a periodic security review of the site and backend
- `robots.txt`, `sitemap.xml`: crawler hints; add new article URLs to `sitemap.xml` by hand when publishing (the import script does not update it)

## Content Workflow

1. Drop a raw Beehiiv HTML export into the matching `posts/incoming/<type>/<lang>`
   folder.
2. Run `scripts/process-new-posts.cmd`.
3. Review and merge the pull request it opens.

See [`POST_WORKFLOW.md`](POST_WORKFLOW.md) for the full step-by-step version.
If you ever add or remove post files by hand, run `scripts/sync-posts-manifest.cmd`
to rebuild the manifest from what's on disk.

## Runtime Notes

- The site is static and intended for GitHub Pages.
- Public endpoints are read from `window.INSPIRE_SITE_CONFIG`.
- Every page (and the article template in `scripts/process-new-posts.ps1`) carries a Content-Security-Policy `<meta>` tag. If you add a new third-party script, font, or API origin, add it to the policy on all pages, or the browser will block it.
- Article pages render community likes and a private note form (routed to the contact backend) through the backend project. The backend also exposes public comment submission/listing endpoints, but no UI currently calls them.

## Backend

The private backend lives in a separate repository, `inspire-backend`, and is not part of this repo.
