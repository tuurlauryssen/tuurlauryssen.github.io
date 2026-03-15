# Post Workflow

1. Import a post by double-clicking `scripts/import-beehiiv-post.cmd`.
   Choose `interview` or `learned`, choose `en` or `nl`, paste the raw Beehiiv HTML, then type `ENDHTML`.

2. Check the generated files in `posts/...` and, if needed, update `assets/data/authors.json`.

3. If you manually add or delete post files later, double-click `scripts/sync-posts-manifest.cmd` to refresh `assets/data/posts.json` and `assets/data/posts-data.js`.

4. Push to GitHub and verify the homepage and archive.
