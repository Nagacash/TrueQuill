import { MCPServer } from "mcp-use";
import { z } from "zod";
import { audit, normalise, CATEGORY_SEVERITY, SCORE_GUIDE, verdictFor, confidenceFor } from "./src/rules.js";

const server = new MCPServer({
  name: "truequill",
  title: "TrueQuill",
  version: "1.0.0",
  description: "Check drafts for AI tells — write like a human",
  instructions:
    "Use check_text to score pasted text for AI-writing tells (5 categories, score out of 5). Use pro_info when the user hits the daily cap or asks about Pro.",
  websiteUrl: "https://www.nagacodex.cloud/",
  icons: [
    {
      src: "logo.png",
      mimeType: "image/png",
      sizes: ["860x1024"],
    },
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
});

export const UPGRADE_URL = "https://nagacodex.cloud/pro";
export const DAILY_CAP = 10;

// v1 rate limiting: simple in-memory map keyed by best-effort client-reported
// id. Production needs persistent storage + verified identity (OAuth), since
// ctx.client.user() hints are unverified and this map resets on restart/deploy.
const usage = new Map<string, { day: string; count: number }>();

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function callerKey(ctx: unknown): string {
  try {
    const user = (
      ctx as {
        client?: { user?: () => { conversationId?: string; subject?: string; organizationId?: string } | undefined };
      }
    ).client?.user?.();
    return user?.conversationId || user?.subject || user?.organizationId || "anonymous";
  } catch {
    return "anonymous";
  }
}

function checkCap(key: string): { capped: boolean; remaining: number } {
  const day = todayKey();
  const entry = usage.get(key);
  if (!entry || entry.day !== day) {
    usage.set(key, { day, count: 0 });
    return { capped: false, remaining: DAILY_CAP };
  }
  if (entry.count >= DAILY_CAP) return { capped: true, remaining: 0 };
  return { capped: false, remaining: DAILY_CAP - entry.count };
}

function recordUse(key: string): void {
  const day = todayKey();
  const entry = usage.get(key);
  if (!entry || entry.day !== day) usage.set(key, { day, count: 1 });
  else entry.count += 1;
}

const checkTextInputSchema = z.object({
  text: z.string().describe("Draft text to score for AI-writing tells"),
});

const categorySchema = z.object({
  name: z.string().describe("Category key"),
  matched: z.boolean().describe("True when this category fired"),
  matches: z.array(z.string()).describe("Flagged phrases for this category"),
  severity: z.enum(["strong", "weak", "check-worthy"]).describe("Signal strength: strong AI tell, weak style signal, or worth checking"),
  points: z.number().describe("Score points this category cost (1 when matched, 0 when clear)"),
});

const checkTextOutputSchema = z.object({
  score: z.number().min(0).max(5).nullable().describe("Score out of 5, or null when capped"),
  maxScore: z.number().describe("Always 5"),
  categories: z.array(categorySchema).describe("Per-category hits with severity and point contribution"),
  capped: z.boolean().describe("True when the daily cap was hit"),
  upgradeUrl: z.string().optional().describe("Upgrade URL, present when capped"),
  verdict: z.string().describe("Plain-language overall verdict"),
  confidence: z.enum(["Low", "Moderate", "High"]).describe("Confidence that the text is AI-generated, from strong-signal count"),
  strongSignals: z.number().describe("How many strong-signal categories fired"),
  scoreGuide: z.string().describe("What the score ranges mean"),
});

export const checkText = server.tool(
  {
    name: "check_text",
    title: "Check text for AI tells",
    description:
      "Score pasted text for AI-writing tells across 5 categories (vocabulary, sentence patterns, punctuation, three-item lists, unsupported proof). Returns a score out of 5. Capped at 10 checks/day; when capped, returns capped:true with the Pro upgrade URL. Always lead your answer with the verdict and confidence lines verbatim, then the score — do not paraphrase them away.",
    inputSchema: checkTextInputSchema,
    outputSchema: checkTextOutputSchema,
    view: {
      name: "check-result",
      description: "TrueQuill score card with category hits and highlights",
      prefersBorder: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async ({ text }, ctx) => {
    if (!text || !normalise(text).split(" ").filter(Boolean).length) {
      return {
        isError: true as const,
        content: [{ type: "text" as const, text: "TrueQuill: no visible copy to score — empty input." }],
      };
    }
    const key = callerKey(ctx);
    if (checkCap(key).capped) {
      const data = {
        score: null as number | null,
        maxScore: 5,
        categories: [] as Array<{ name: string; matched: boolean; matches: string[]; severity: "strong" | "weak" | "check-worthy"; points: number }>,
        capped: true,
        upgradeUrl: UPGRADE_URL,
        verdict: "Daily limit reached — upgrade to Pro for unlimited checks.",
        confidence: "Low" as const,
        strongSignals: 0,
        scoreGuide: SCORE_GUIDE,
      };
      return {
        content: [
          {
            type: "text" as const,
            text: `TrueQuill daily limit reached (10 checks/day). Upgrade: ${UPGRADE_URL}`,
          },
        ],
        structuredContent: data,
      };
    }
    recordUse(key);
    const result = audit(normalise(text));
    const withSeverity = result.categories.map((c) => ({
      name: c.name,
      matched: c.matched,
      matches: c.matches,
      severity: CATEGORY_SEVERITY[c.name],
      points: c.matched ? 1 : 0,
    }));
    const strongCount = withSeverity.filter((c) => c.matched && c.severity === "strong").length;
    const verdict = verdictFor(
      result.score,
      strongCount > 0,
      strongCount
    );
    const data = {
      score: result.score,
      maxScore: 5 as number,
      categories: withSeverity,
      capped: false,
      verdict,
      confidence: confidenceFor(strongCount),
      strongSignals: strongCount,
      scoreGuide: SCORE_GUIDE,
    };
    const failed = result.categories.filter((c) => c.matched).map((c) => c.name);
    const summary =
      result.score === 5
        ? `TrueQuill: 5/5 CLEAN. ${verdict}`
        : `TrueQuill: ${result.score}/5 (confidence: ${confidenceFor(strongCount)}) — flagged: ${failed.join(", ") || "none"}. ${verdict}`;
    return {
      content: [{ type: "text" as const, text: summary }],
      structuredContent: data,
    };
  }
);

const proInfoOutputSchema = z.object({
  info: z.string().describe("What TrueQuill Pro adds"),
  upgradeUrl: z.string().describe("Pro upgrade URL"),
});

export const proInfo = server.tool(
  {
    name: "pro_info",
    title: "TrueQuill Pro info",
    description:
      "Explain what TrueQuill Pro adds (unlimited checks, cleanse second-pass, file/CI checks) and where to upgrade. Quote this when the user hits the daily cap.",
    inputSchema: z.object({}),
    outputSchema: proInfoOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async () => {
    const info =
      "TrueQuill Pro adds unlimited checks, a cleanse second-pass that rewrites flagged passages in your voice, plus file and CI checks for whole drafts and sites. Upgrade here: " +
      UPGRADE_URL;
    const data = { info, upgradeUrl: UPGRADE_URL };
    return {
      content: [{ type: "text" as const, text: info }],
      structuredContent: data,
    };
  }
);

export default server;
