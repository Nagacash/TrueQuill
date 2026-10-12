# TrueQuill — Check drafts for AI tells

Free MCP server + ChatGPT widget that scores pasted text for AI-writing tells
(5 categories, score out of 5), capped at 10 checks/day. Powered by
[Naga Codex](https://www.nagacodex.cloud/).

Rule logic is a TypeScript port of SlopMonster `tools/deslop.py` (repo upstream
is still named SlopMonster; the product ships as TrueQuill). Rule tables live in
one file — `src/rules.ts` — so updates mirror upstream easily.

## Tools

- `check_text(text)` → `{ score, maxScore: 5, categories, capped }`. Each
  category with ≥1 match costs 1 point; 5/5 = clean; empty input is an error.
  After 10 checks/day (per caller, UTC day) returns
  `{ capped: true, score: null, upgradeUrl: "https://nagacodex.cloud/pro" }`.
- `pro_info()` → static text: Pro adds unlimited checks, a cleanse second-pass,
  and file/CI checks, plus the upgrade URL.

Rate limiting is a simple in-memory map in `index.ts` keyed by best-effort
client-reported id. Production needs persistent storage + verified identity
(OAuth); the map resets on restart/redeploy.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000/mcp/inspector to test. Regression check:

```bash
npx mcp-use client dev tools call check_text text="It's not just a tool, it's a game-changing journey."
# → 3/5, vocabulary + sentence-patterns flagged
```

Run `npm run typecheck` for types, `npm run build` for a production bundle.

## Deploy (Manufact Cloud, no GitHub)

Manufact CLI login is via `~/.mcp-use/config.json` (never print it).

```bash
npx -y mcp-use@latest deploy --no-github -y --org org-6cc38bb8-vhnn2
```

This uses a Manufact-managed repo (no GitHub push). To move the code into
`github.com/Nagacash/TrueQuill` later, the owner pushes this folder there or
provides a GitHub token, then redeploys via the GitHub-connect path.

## Env vars

None required for v1 (no OAuth, no external APIs, no analytics).

## Submission pack

See `SUBMISSION.md` for directory listing copy and test cases.
