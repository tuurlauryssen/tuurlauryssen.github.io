# Post Workflow

1. In Beehiiv, publish the post and copy the raw HTML of the **live published
   page** (not the draft preview — its export bakes in a "Draft Preview" banner
   and dev-only scripts).
2. Save that HTML as a file and drop it into the matching folder:
   `posts/incoming/explained/en`, `posts/incoming/explained/nl`,
   `posts/incoming/ideas/en`, or `posts/incoming/ideas/nl`. The filename doesn't
   matter — the folder alone tells the script the type and language.
3. Run `scripts/process-new-posts.cmd`. For every file it finds in
   `posts/incoming/**`, it will:
   - Auto-extract title, date, excerpt, author(s), and images — no prompts.
   - Strip Beehiiv's inline style/class clutter (the site's own CSS already
     styles article bodies).
   - Download the cover and inline images into `assets/img/posts/<slug>/`
     instead of linking to Beehiiv's own URLs.
   - Write the article page, archive the original into `posts/raw/...`, and
     update `assets/data/posts.json` / `posts-data.js`.
   - Create a branch, commit, push, and open a pull request (via `gh`, or by
     printing a compare link if `gh` isn't installed).
4. Review the PR (the rendered diff, or a Pages preview) and merge it yourself.
   Nothing auto-merges.

If you ever add or remove post files by hand, run `scripts/sync-posts-manifest.cmd`
to rebuild `assets/data/posts.json` from what's actually on disk.

`hidden` posts remain available by direct URL but stay out of the homepage and
archive until their `visibility` is set to `public` in `assets/data/posts.json`.
