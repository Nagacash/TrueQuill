// TrueQuill scoring rules — TypeScript port of SlopMonster tools/deslop.py.
// Keep this file as the single rule table so updates mirror upstream easily.
// Scoring is identical: each of the 5 categories with >=1 match costs 1 point,
// 5/5 = clean, empty input is a failure (not a pass).
//
// deslop.py audit keys -> TrueQuill category names:
//   vocab       -> vocabulary
//   phrases     -> sentence-patterns
//   punctuation -> punctuation
//   rhythm      -> three-item-lists
//   proof       -> unsupported-proof

export const VOCAB = [
  "delve", "leverage", "seamless", "elevate", "robust", "unlock", "unleash",
  "empower", "streamline", "cutting-edge", "state-of-the-art", "game-changer",
  "game-changing", "revolutionize", "revolutionise", "transformative",
  "transformation", "innovate", "holistic", "synergy", "synergies", "paradigm",
  "bespoke", "meticulous", "tapestry", "testament", "beacon", "unparalleled",
  "supercharge", "turbocharge", "effortless", "next-level",
  // second tier: fine once in a long page, damning in every section
  "pivotal", "foster", "showcase", "compelling", "intuitive", "world-class",
  "best-in-class",
];

// Words with an ordinary literal sense — matched exactly, never by root.
export const VOCAB_EXACT = [
  "crafted", "curated", "harnessing", "harness the power", "journey", "realm",
  "landscape", "navigate the", "in the world of", "in today's", "ever-evolving",
  "fast-paced", "look no further", "dive in", "let's dive", "deep dive",
  "embark", "unlock the power", "buckle up", "the secret sauce", "level up",
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rootPatternSource(word: string): string {
  const root = word.replace(/(ed|ing|ly|e)$/, "");
  if (root.length < 4) {
    return `(?<!\\w)${escapeRegExp(word)}(?!\\w)`;
  }
  return `(?<!\\w)${escapeRegExp(root)}(?:e|es|ed|ing|ion|ions|ional|ive|al|ally|s|ly|ness)?(?!\\w)`;
}

const NEG_JUST =
  "(?:\\bnot|n['\u2019]t)\\s+(?:just|only|merely|simply)\\b";
const XY_TAIL =
  "[^!?]{0,80}?[,.]\\s*(?:it|this|that|they|we|you|he|she|i)\\b";

export const PHRASES: Array<[pattern: string, label: string]> = [
  [`${NEG_JUST}[^.!?]{0,80}\\bbut\\b`, "the 'not just X, but Y' construction"],
  [`${NEG_JUST}${XY_TAIL}`, "the 'not just X, it's Y' construction"],
  ["\\bwhether you(?:'?re| are)\\b[^.!?]{0,40}\\bor\\b", "the 'whether you're X or Y' opener"],
  ["\\bmore than just\\b", "'more than just'"],
  ["\\b(that|this)(?:'?s| is) where\\b[^.!?]{0,30}\\bcomes? in\\b", "'that's where X comes in'"],
  ["\\bsay goodbye to\\b", "'say goodbye to'"],
  ["\\bimagine (a|an|the)\\b", "the 'imagine a\u2026' opener"],
  ["\\bin conclusion\\b|\\bto sum up\\b", "essay-summary phrasing"],
  ["\\bwhen it comes to\\b", "'when it comes to' filler"],
  ["\\bat the end of the day\\b", "'at the end of the day'"],
  ["\\bthe key is\\b|\\bthe truth is\\b", "throat-clearing opener"],
  ["\\bhelps? you to\\b|\\bcan help you\\b", "hedged benefit ('helps you to\u2026')"],
  ["\\bmay potentially\\b|\\bcould potentially\\b|\\bmight possibly\\b", "stacked hedging"],
  ["\\bvery unique\\b|\\bquite literally\\b", "intensifier padding"],
  [
    "\\bhere'?s the thing\\b|\\blet'?s break (it|this) down\\b|\\bthe best part\\b",
    "throat-clearing opener",
  ],
  ["\\bready to get started\\b|\\blet'?s get started\\b", "boilerplate CTA"],
  ["\\bthe (result|answer|catch|kicker|upshot)\\?\\s", "self-answering question"],
];

export const COMPOUND_SOURCE =
  "\\b[a-z]{2,}-[a-z]{2,}(?:-[a-z]{2,})*\\b";
export const COMPOUND_FLOOR = 4;

export const PROOF_SOURCE =
  "([\\d][\\d,]*(?:\\.\\d+)?)\\s*\\+?\\s*" +
  "((?:happy|early|active|satisfied|verified|trusted|delighted)\\s+)?" +
  "(?:\\w+\\s+){0,1}" +
  "(users?|customers?|learners?|students?|teams?|members?|companies|businesses" +
  "|homeowners?|subscribers?|clients?|patients?|readers?|sites?|projects?)" +
  "(?!\\w)";

const TRICOLON = [
  "\\b(\\w{4,}),\\s+(\\w{4,}),\\s+and\\s+(\\w{4,})\\b",
  "\\b(\\w{4,}),\\s+(\\w{4,})\\s+and\\s+((?:\\w+\\s+){1,2}\\w+)\\s*[.!?,;:]",
];

export function normalise(t: string): string {
  return t
    .replace(/‑/g, "-")
    .replace(/ /g, " ")
    .replace(/’/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export type CategoryKey =
  | "vocabulary"
  | "sentence-patterns"
  | "punctuation"
  | "three-item-lists"
  | "unsupported-proof";

export interface CategoryResult {
  name: CategoryKey;
  matched: boolean;
  matches: string[];
}

export interface AuditResult {
  categories: CategoryResult[];
  score: number;
  maxScore: 5;
}

export const CATEGORY_META: Record<CategoryKey, { title: string; hint: string }> = {
  vocabulary: { title: "AI vocabulary", hint: "Overused model word choices" },
  "sentence-patterns": { title: "AI constructions", hint: "Stock sentence moves" },
  punctuation: { title: "Punctuation cadence", hint: "Em-dash / compound / semicolon density" },
  "three-item-lists": { title: "Rule-of-three rhythm", hint: "Tricolon list reflex" },
  "unsupported-proof": { title: "Possible invented proof", hint: "Unverifiable social-proof numbers" },
};

export function audit(text: string): AuditResult {
  const low = text.toLowerCase();
  const vocabMatches: string[] = [];
  for (const w of VOCAB) {
    const re = new RegExp(rootPatternSource(w), "g");
    const found = low.match(re);
    if (found) {
      for (const m of found.slice(0, 8)) vocabMatches.push(m);
      if (found.length > 8) vocabMatches.push(`\u2026and ${found.length - 8} more (${w})`);
    }
  }
  for (const w of VOCAB_EXACT) {
    const re = new RegExp(`(?<!\\w)${escapeRegExp(w)}(?!\\w)`, "g");
    const found = low.match(re);
    if (found) {
      for (const m of found.slice(0, 8)) vocabMatches.push(m);
    }
  }

  const phraseMatches: string[] = [];
  for (const [pat, label] of PHRASES) {
    const re = new RegExp(pat, "g");
    const found = low.match(re);
    if (found) {
      for (const m of found.slice(0, 4)) phraseMatches.push(`${label}: \u201c${m.slice(0, 80)}\u201d`);
    }
  }

  const punctMatches: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    let flagged = false;
    for (let i = 0; i < Math.max(1, s.length); i += 220) {
      const window = s.slice(i, i + 220);
      if ((window.match(/—/g) ?? []).length >= 2) {
        punctMatches.push(`two or more em-dashes in one sentence: \u201c${window.slice(0, 70).trim()}\u2026\u201d`);
        flagged = true;
        break;
      }
    }
    if (flagged) break;
  }
  const compoundRe = new RegExp(COMPOUND_SOURCE, "gi");
  for (const s of sentences) {
    let flagged = false;
    for (let i = 0; i < Math.max(1, s.length); i += 220) {
      const window = s.slice(i, i + 220);
      const found = window.match(compoundRe) ?? [];
      if (found.length >= COMPOUND_FLOOR) {
        punctMatches.push(
          `${found.length} hyphenated compounds stacked in one sentence: ${found.slice(0, 4).join(", ")}`
        );
        flagged = true;
        break;
      }
    }
    if (flagged) break;
  }
  const semiCount = (text.match(/;/g) ?? []).length;
  if (semiCount > Math.max(3, Math.floor(text.length / 1200))) {
    punctMatches.push(`semicolon-heavy for web copy (${semiCount} found)`);
  }

  const rhythmMatches: string[] = [];
  for (const pat of TRICOLON) {
    const re = new RegExp(pat, "g");
    for (const m of text.matchAll(re)) {
      rhythmMatches.push(`rule-of-three list: \u201c${m[0].slice(0, 60)}\u201d`);
      if (rhythmMatches.length >= 8) break;
    }
  }

  const proofMatches: string[] = [];
  const proofRe = new RegExp(PROOF_SOURCE, "gi");
  for (const m of text.matchAll(proofRe)) {
    proofMatches.push(m[0].trim());
    if (proofMatches.length >= 8) break;
  }

  const categories: CategoryResult[] = [
    { name: "vocabulary", matched: vocabMatches.length > 0, matches: vocabMatches.slice(0, 12) },
    { name: "sentence-patterns", matched: phraseMatches.length > 0, matches: phraseMatches.slice(0, 12) },
    { name: "punctuation", matched: punctMatches.length > 0, matches: punctMatches.slice(0, 12) },
    { name: "three-item-lists", matched: rhythmMatches.length > 0, matches: rhythmMatches.slice(0, 12) },
    { name: "unsupported-proof", matched: proofMatches.length > 0, matches: proofMatches.slice(0, 12) },
  ];
  const failed = categories.filter((c) => c.matched).length;
  return { categories, score: Math.max(0, 5 - failed), maxScore: 5 };
}
