# TrueQuill — submission pack (draft)

## Listing copy

- Name: TrueQuill
- One-liner: Check drafts for AI tells — write like a human
- Description: Paste any draft and get a 5-category AI-tell score with flagged
  phrases highlighted. Free up to 10 checks/day. Powered by Naga Codex.
- Icon: `public/icon.svg`
- Tool justifications:
  - `check_text`: scores user-pasted drafts only; no external calls.
  - `pro_info`: static upgrade text quoted at the daily cap.

## Test cases (Inspector)

1. `check_text` on `It's not just a tool, it's a game-changing journey.`
   → 3/5, vocabulary + sentence-patterns flagged.
2. `check_text` on plain human copy (e.g. `The roof was replaced in June.`)
   → 5/5 CLEAN.
3. 11th `check_text` in one UTC day → `{ capped: true, upgradeUrl:
   "https://nagacodex.cloud/pro" }`; `pro_info` returns the upgrade text.
4. Widget renders score dial, per-category rows, draft highlights, capped-state
   upgrade panel, TrueQuill brand + powered-by-Naga-Codex link.

## Review notes

- No invented facts in copy; unresolved items are flagged, not faked.
- No external network calls; no analytics in v1.
- Daily cap is in-memory per deploy (resets on redeploy); persistent storage is
  the known Pro-phase upgrade.
