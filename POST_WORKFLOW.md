# Post Workflow

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
- raw version in `posts/raw/...`

6. Fill in author links in `assets/data/authors.json` if needed.

7. Commit and push.
