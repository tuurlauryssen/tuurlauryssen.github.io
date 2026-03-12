# Post Workflow

This file is the short operating guide for turning a raw article into local site content. It relates directly to `scripts/import-beehiiv-post.ps1`, `assets/data/posts.json`, and the article files inside `posts/`.

1. Run:
```powershell
powershell -ExecutionPolicy Bypass -File .\tuurlauryssen.github.io\scripts\import-beehiiv-post.ps1
```

2. Choose:
- `interview` or `learned`
- `en` or `nl`

3. Paste the full raw Beehiiv HTML.

4. Type `ENDHTML` on its own line.

5. Review:
- site version in `posts/interviews/...` or `posts/ideas/...`
- raw version in `posts/raw/...` (exact raw HTML you pasted)

6. Fill in author links in `assets/data/authors.json` if needed.

7. Commit and push.
