# Post Workflow

1. Run `scripts/import-beehiiv-post.cmd`.
2. Choose the post type, language, and visibility.
3. Paste the raw Beehiiv HTML and finish with `ENDHTML`.
4. Review the generated files under `posts/...`.
5. Update `assets/data/authors.json` if needed.
6. If you added or removed files manually, run `scripts/sync-posts-manifest.cmd`.
7. Push and verify the homepage, archive, and article page.

`hidden` posts remain available by direct URL but stay out of the homepage and archive until their `visibility` is set to `public` in `assets/data/posts.json`.
