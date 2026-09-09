# Posts

Article content lives here.

- `interviews/en` and `interviews/nl`: published interview pages (currently paused — see below)
- `ideas/en` and `ideas/nl`: published column pages
- `explained/en` and `explained/nl`: published explainer pages (informative, non-opinion pieces — how something works, why something is the way it is)
- `raw/...`: imported source copies kept for review

## Pausing a post type

To pause a whole type (like Interviews) without deleting anything:

1. Set `visibility` to `hidden` for each of that type's entries in `assets/data/posts.json` and `assets/data/posts-data.js`. The pages stay published and reachable by direct URL, but drop out of the homepage and archive.
2. Remove that type's filter tab from `blog.html`/`nl/blog.html` and its section from `index.html`/`nl/index.html` if you want it fully out of the UI, not just empty.

To resume, reverse both steps.

Related data:

- `assets/data/posts.json`: manifest used by the homepage and archive
- `assets/data/authors.json`: author names, links, and socials
