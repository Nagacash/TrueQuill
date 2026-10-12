import { Image, ModelContext, ThemeProvider, useHostContext, useOpenExternal, useToolContext } from "mcp-use/react";
import { useMemo } from "react";
import "./view.css";

const PRO_URL = "https://nagacodex.cloud/pro";
const BRAND_URL = "https://www.nagacodex.cloud/";

const CATEGORY_LABELS: Record<string, string> = {
  vocabulary: "AI vocabulary",
  "sentence-patterns": "AI constructions",
  punctuation: "Punctuation cadence",
  "three-item-lists": "Rule-of-three rhythm",
  "unsupported-proof": "Possible invented proof",
};

function extractQuoted(match: string): string | null {
  const m = match.match(/[“"](.+?)[”"]/);
  return m ? m[1] : null;
}

function highlightRanges(text: string, needles: string[]): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  const low = text.toLowerCase();
  for (const n of needles) {
    if (!n || n.length < 3) continue;
    const idx = low.indexOf(n.toLowerCase());
    if (idx >= 0) ranges.push({ start: idx, end: idx + n.length });
  }
  ranges.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) last.end = Math.max(last.end, r.end);
    else merged.push({ ...r });
  }
  return merged.slice(0, 24);
}

function HighlightedDraft({ text, needles }: { text: string; needles: string[] }) {
  const parts = useMemo(() => {
    if (!text) return [];
    const ranges = highlightRanges(text, needles);
    if (!ranges.length) return [{ text, hit: false }];
    const out: Array<{ text: string; hit: boolean }> = [];
    let pos = 0;
    for (const r of ranges) {
      if (r.start > pos) out.push({ text: text.slice(pos, r.start), hit: false });
      out.push({ text: text.slice(r.start, r.end), hit: true });
      pos = r.end;
    }
    if (pos < text.length) out.push({ text: text.slice(pos), hit: false });
    return out;
  }, [text, needles]);
  return (
    <p className="tq-draft">
      {parts.map((p, i) =>
        p.hit ? (
          <mark key={i} className="tq-hit">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </p>
  );
}

export default function CheckResult() {
  const view = useToolContext<"check_text">();
  const { platform } = useHostContext();
  const openExternal = useOpenExternal();

  if (view.status === "pending") {
    return (
      <ThemeProvider>
        <div className="tq-card" aria-busy="true">
          <div className="tq-head">
            <span className="tq-brand">
              <Image src="/logo.png" alt="TrueQuill logo" className="tq-logo" />
              TrueQuill
            </span>
            <span className="tq-score skeleton">…</span>
          </div>
          <div className="tq-skeleton-line" />
          <div className="tq-skeleton-line short" />
          <p className="tq-foot">
            powered by <span>Naga Codex</span>
          </p>
        </div>
      </ThemeProvider>
    );
  }

  if (view.status === "error") {
    return (
      <ThemeProvider>
        <div className="tq-card">
          <div className="tq-head">
            <span className="tq-brand">
              <Image src="/logo.png" alt="TrueQuill logo" className="tq-logo" />
              TrueQuill
            </span>
          </div>
          <p role="alert" className="tq-error">
            {view.error.message}
          </p>
          <p className="tq-foot">
            powered by <span>Naga Codex</span>
          </p>
        </div>
      </ThemeProvider>
    );
  }

  const draft: string = view.toolInput?.text ?? "";
  const output = view.toolOutput;
  const capped = output.capped === true;
  const score = output.score;
  const categories = output.categories ?? [];
  const upgradeUrl = output.upgradeUrl ?? PRO_URL;
  const verdict = typeof output.verdict === "string" ? output.verdict : "";
  const confidence = typeof output.confidence === "string" ? output.confidence : "";

  const needles = useMemo(() => {
    const list: string[] = [];
    for (const c of categories) {
      for (const m of c.matches ?? []) {
        const q = extractQuoted(m);
        if (q && draft.toLowerCase().includes(q.toLowerCase())) list.push(q);
        else if (!m.includes(":") && m.length <= 40 && draft.toLowerCase().includes(m.toLowerCase())) list.push(m);
      }
    }
    return list;
  }, [categories, draft]);

  return (
    <ThemeProvider>
      <div className="tq-card">
        {!capped && <ModelContext content={`TrueQuill score: ${score}/5${categories.filter((c) => c.matched).map((c) => `; flagged ${c.name} (${c.severity ?? "unknown"} signal)`).join("")}. Verdict: ${verdict}`} />}
        {capped && <ModelContext content="TrueQuill daily cap reached; user should upgrade to Pro." />}
        <div className="tq-head">
          <span className="tq-brand">
            <Image src="/logo.png" alt="TrueQuill logo" className="tq-logo" />
            TrueQuill
          </span>
          {capped ? (
            <span className="tq-score capped">capped</span>
          ) : (
            <span className="tq-score" aria-label={`Score ${score} out of 5`}>
              {score}/5
            </span>
          )}
        </div>

        {capped ? (
          <div className="tq-upgrade">
            <p className="tq-upgrade-title">Daily limit reached (10 checks/day)</p>
            <p className="tq-upgrade-body">
              TrueQuill Pro adds unlimited checks, a cleanse second-pass, and file/CI checks.
            </p>
            <button
              type="button"
              className="tq-button"
              onClick={() => void openExternal({ url: upgradeUrl })}
            >
              Upgrade to Pro
            </button>
          </div>
        ) : (
          <>
            <div
              className="tq-dial"
              role="img"
              aria-label={`Score ${score} out of 5`}
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={score != null && i < score ? "tq-pip on" : "tq-pip"}
                />
              ))}
              <span className="tq-dial-label">
                {score === 5 ? "CLEAN" : "needs a cleanse"}
              </span>
            </div>
            <ul className="tq-cats">
              {categories.map((c) => (
                <li key={c.name} className={c.matched ? "tq-cat hit" : "tq-cat"}>
                  <span className="tq-dot" aria-hidden />
                  <span className="tq-cat-name">{CATEGORY_LABELS[c.name] ?? c.name}</span>
                  <span className="tq-cat-sev">{c.severity === "strong" ? "strong signal" : c.severity === "weak" ? "weak signal" : c.severity === "check-worthy" ? "check-worthy" : ""}</span>
                  <span className="tq-cat-state">{c.matched ? "flagged −1 pt" : "clear"}</span>
                </li>
              ))}
            </ul>
            {verdict && <p className="tq-verdict">{verdict}</p>}
            {confidence && (
              <p className="tq-conf">
                AI-likelihood confidence: <strong>{confidence}</strong>
              </p>
            )}
            {draft && <HighlightedDraft text={draft} needles={needles} />}
            {categories.some((c) => c.matched) && (
              <ul className="tq-matches">
                {categories
                  .filter((c) => c.matched)
                  .flatMap((c) =>
                    (c.matches ?? []).slice(0, 3).map((m, i) => (
                      <li key={`${c.name}-${i}`}>
                        <strong>{CATEGORY_LABELS[c.name] ?? c.name}:</strong> {m}
                      </li>
                    ))
                  )}
              </ul>
            )}
          </>
        )}

        <p className="tq-foot">
          powered by{" "}
          <button
            type="button"
            className="tq-link"
            onClick={() => void openExternal({ url: BRAND_URL })}
          >
            Naga Codex
          </button>
          {platform ? ` · ${platform}` : ""}
        </p>
      </div>
    </ThemeProvider>
  );
}
