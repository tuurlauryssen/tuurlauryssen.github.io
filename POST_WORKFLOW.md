# Post Workflow

1. Import a post by double-clicking `scripts/import-beehiiv-post.cmd`.
   Choose `interview` or `learned`, choose `en` or `nl`, choose `public` or `hidden`, paste the raw Beehiiv HTML, then type `ENDHTML`.

2. Check the generated files in `posts/...` and, if needed, update `assets/data/authors.json`.

3. Hidden posts stay in the repo and open by direct URL, but they are excluded from the homepage and archive until their `visibility` in `assets/data/posts.json` is changed from `hidden` to `public`.

4. If you manually add or delete post files later, double-click `scripts/sync-posts-manifest.cmd` to refresh `assets/data/posts.json`.

5. Push to GitHub and verify the homepage and archive.
