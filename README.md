# INSPIRE Website

Public site for INSPIRE. This repo serves the homepage, archive, bilingual article pages, and the client-side integrations for subscriptions, contact, and article community actions.

## Structure

- `index.html`: homepage
- `blog.html`: archive
- `nl/`: Dutch entry pages
- `assets/css/style.css`: shared styles
- `assets/js/main.js`: shared UI, forms, analytics, contact, and article community behavior
- `assets/js/beehiiv.js`: Beehiiv-related archive rendering
- `assets/data/posts.json`: post manifest used by the site
- `assets/data/authors.json`: author metadata
- `components/`: shared content fragments
- `posts/`: generated article pages and raw imports
- `scripts/`: post import and manifest sync utilities

## Content Workflow

1. Import a Beehiiv post with `scripts/import-beehiiv-post.cmd`.
2. Review the generated page in `posts/...`.
3. Update `assets/data/authors.json` if a new author is introduced.
4. Rebuild the manifest with `scripts/sync-posts-manifest.cmd` if files were added or removed manually.
5. Push and verify the homepage, archive, and article page.

See [`POST_WORKFLOW.md`](/c:/Users/tuurl/Projects/Blog/tuurlauryssen.github.io/POST_WORKFLOW.md) for the short step-by-step version.

## Runtime Notes

- The site is static and intended for GitHub Pages.
- Public endpoints are read from `window.INSPIRE_SITE_CONFIG`.
- Article pages can render private responses, likes, and comment submission through the backend project.

## Backend

The private backend lives in [`../inspire-backend`](/c:/Users/tuurl/Projects/Blog/inspire-backend/README.md).
