# Security Audit Prompt

Reusable prompt for a periodic security review of INSPIRE with an AI coding
agent. Give the agent both repositories (`tuurlauryssen.github.io` and the
private `inspire-backend`) and paste the prompt below. Not published on the
site (see `_config.yml`).

---

> You are a senior application-security engineer doing an authorized security
> review of my own website, INSPIRE. Find every **major** weakness across the
> frontend and the backend, fix what is safe to fix, and report the rest.
>
> **System overview**
> - Frontend: static site on GitHub Pages (`tuurlauryssen.github.io`, public
>   repo, custom domain `tuurlauryssen.com`). Plain HTML/CSS/JS, no build step
>   apart from GitHub Pages' default Jekyll pass. Articles are imported from
>   Beehiiv HTML exports by `scripts/process-new-posts.ps1`, which sanitizes
>   the export and writes the article page.
> - Backend: Supabase (`inspire-backend`, private repo). Deno edge functions
>   with `verify_jwt = false` (public endpoints), Postgres with RLS, Resend
>   for outbound email, GitHub Actions for backups and a keepalive.
> - There is **no PHP** anywhere. Don't spend time on PHP CVEs unless that
>   changes. Check instead for the equivalents in this stack: Deno/esm.sh
>   dependency issues, Supabase advisories, GitHub Pages/Jekyll behavior.
>
> **Threat model.** Anonymous internet attackers who can call every public
> endpoint directly (curl, scripts, spoofed headers), bots, someone with read
> access to either repo, and a malicious or compromised Beehiiv export.
>
> **Check at minimum**
> 1. *Secrets and data leaks.* Working tree and full git history of both repos
>    (API keys, service-role keys, tokens, DB URLs, `.env`, exports, dumps).
>    Anything published by GitHub Pages that shouldn't be (raw exports,
>    scripts, internal docs). PII in committed files. What backups and
>    workflow artifacts contain and who can download them.
> 2. *Frontend.* XSS sinks (`innerHTML`, `insertAdjacentHTML`, attribute
>    interpolation, `href`/`src` scheme checks), the import sanitizer
>    (try to bypass it: unquoted/spaced/slash-separated handlers, entity-
>    encoded `javascript:` URLs, unclosed tags, `<base>`, `<meta refresh>`,
>    `<iframe>`, `<svg>`), Content-Security-Policy coverage on every page and
>    in the article template, third-party scripts, tabnabbing.
> 3. *Backend.* For every edge function: authentication, input validation and
>    size limits, rate limiting (which header does the client IP come from,
>    and can a caller spoof it?), error messages that leak internals,
>    enumeration (does any response reveal whether an email is subscribed?),
>    email header/HTML injection in Resend calls, CORS, admin-token strength
>    and brute-force exposure, abuse that costs money or reputation (email
>    floods, fake subscribers, like/read inflation), consent (double opt-in,
>    re-subscribing someone who unsubscribed).
> 4. *Database.* RLS on every table, policies, grants, `security definer`
>    functions and their `search_path`, data retention.
> 5. *CI/CD and supply chain.* Workflow permissions, secrets handling,
>    action pinning, dependency versions and known advisories.
>
> **How to work**
> - Read the code; don't guess. For each finding, give severity
>   (Critical/High/Medium/Low), the file and line, a concrete attack scenario,
>   and the fix.
> - Only report what you can back with a realistic path from an attacker to
>   the impact. Leave out theoretical noise.
> - Fix what is small and safe directly, on a branch per repo, and open a PR
>   for each. Verify every fix (typecheck, tests, a local Jekyll build, a
>   headless-browser check for CSP violations). Don't change behavior visitors
>   rely on without saying so.
> - Anything that needs a product decision or a dashboard/secret change on my
>   side goes in a clear "action items for Tuur" list.
> - Don't put details of *unfixed* weaknesses in the public repo or its PR.
>   They belong in the private backend PR and in the report to me.
> - Finish with a short executive summary, then the findings table, then the
>   action items, and email the report to me.
