# Posts

Article content lives here.

- `incoming/explained/en`, `incoming/explained/nl`, `incoming/ideas/en`, `incoming/ideas/nl`:
  drop a raw Beehiiv HTML export in the matching folder, then run
  `scripts/process-new-posts.cmd`. The folder alone tells the script the post's
  type and language, so nothing needs to be typed.
- `explained/en` and `explained/nl`: published explainer pages
- `ideas/en` and `ideas/nl`: published idea pages
- `raw/...`: archived copies of the original Beehiiv HTML, kept for reference

Related data:

- `assets/data/posts.json`: manifest used by the homepage and archive
- `assets/data/authors.json`: author names, links, and socials
- `assets/img/posts/<slug>/`: cover and inline images downloaded from Beehiiv at
  import time, so articles don't depend on Beehiiv's own image URLs
