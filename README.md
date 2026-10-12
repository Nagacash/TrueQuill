<p align="center">
  <img src="public/logo.png" width="128" alt="TrueQuill cobra mark">
</p>

<h1 align="center">TrueQuill</h1>

<p align="center">
  Check a draft for AI tells before you send it.
</p>

<p align="center">
  <a href="https://nagacodex.cloud">nagacodex.cloud</a>
  &nbsp;·&nbsp;
  Free MCP
  &nbsp;·&nbsp;
  Score out of 5
</p>

<p align="center">
  <img src="public/social.png" width="880" alt="TrueQuill. Check drafts for AI tells.">
</p>

Paste a paragraph. TrueQuill returns a score from 0 to 5, the categories that fired, and a short note on each one. It does not rewrite the draft.

The free server allows 10 checks per day. The cap is kept in memory, so a restart clears it. Pro is not live yet. When the cap is hit, `pro_info` points at [nagacodex.cloud/pro](https://nagacodex.cloud/pro), which is marked coming soon.

## Connect

| Client | How |
| --- | --- |
| ChatGPT | Settings, then Apps, then add the server URL |
| Claude | Settings, then Connectors, then add the server URL |
| Any MCP client | Add the URL below |

```
https://keen-spark-amvi2.run.mcp-use.com/mcp
```

## Tools

| Tool | What it returns |
| --- | --- |
| `check_text` | Score out of 5, fired categories, and a note for each |
| `pro_info` | The coming-soon Pro link, once the daily cap is reached |

Categories: vocabulary, sentence patterns, punctuation, three-item lists, unsupported proof.

A sentence such as “It’s not just a tool, it’s a game-changing journey.” scores 3 out of 5, on vocabulary and sentence patterns.

The patterns are a port of [SlopMonster](https://github.com/Nagacash/SlopMonster) `patterns.py`.

## Develop

Requires Node 22.22.2 or newer.

```bash
npm install
npm run dev
```

Inspector: [http://localhost:3000/mcp/inspector](http://localhost:3000/mcp/inspector)

```bash
npx -y mcp-use@latest call check_text --args '{"text":"It is not just a tool, it is a game-changing journey."}'
```

Deploy with the Manufact CLI:

```bash
npx -y mcp-use@latest deploy --no-github -y --org org-6cc38bb8-vhnn2
```

No environment variables. See `SUBMISSION.md` for the ChatGPT listing fields.
