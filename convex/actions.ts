"use node";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { ApifyClient } from "apify-client";
import Exa from "exa-js";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { action } from "./_generated/server";

const discoverNodeFilter = v.optional(
  v.union(
    v.literal("all"),
    v.literal("kashmir"),
    v.literal("oaxaca"),
    v.literal("kigali"),
    v.literal("lagos"),
  ),
);

/** Omit gemini-2.0-flash by default — free tier often hits 429 / zero quota; set GEMINI_MODEL if you need it. */
const GEMINI_MODEL_FALLBACKS = ["gemini-3.0-pro", "gemini-2.5-pro"] as const;

function parsePassportJson(
  text: string,
  craft: string,
): { bio: string; tags: string[] } {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  const parsed = JSON.parse(t) as { bio?: unknown; tags?: unknown };
  const bio = typeof parsed.bio === "string" ? parsed.bio.trim() : "";
  const rawTags = Array.isArray(parsed.tags) ? parsed.tags : [];
  const tags = rawTags
    .slice(0, 5)
    .map((x) => String(x).trim())
    .filter(Boolean);
  const fallbacks = [
    `${craft}`,
    "Traditional techniques",
    "Cultural preservation",
    "Handmade quality",
    "Regional heritage",
  ];
  let i = 0;
  while (tags.length < 5) {
    tags.push(fallbacks[i] ?? "Artisan skill");
    i += 1;
  }
  return {
    bio: bio || "A dedicated artisan preserving traditional skill.",
    tags: tags.slice(0, 5),
  };
}

function parseGeminiRetryDelayMs(message: string): number | null {
  const m = message.match(/retry in ([\d.]+)s/i);
  if (!m) return null;
  const sec = parseFloat(m[1]);
  if (!Number.isFinite(sec)) return null;
  // Cap wait so Convex actions don’t sit forever; API suggests ~20–60s for 429.
  return Math.min(55_000, Math.ceil(sec * 1000) + 800);
}

function isGemini429(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /429|Too Many Requests|RESOURCE_EXHAUSTED/i.test(msg);
}

async function runGeminiCompletion(
  genAI: GoogleGenerativeAI,
  prompt: string,
  jsonMode: boolean,
): Promise<string> {
  const fromEnv = process.env.GEMINI_MODEL?.trim();
  const modelOrder = [...(fromEnv ? [fromEnv] : []), ...GEMINI_MODEL_FALLBACKS];
  const seen = new Set<string>();
  const uniqueModels = modelOrder.filter((m) => {
    if (!m || seen.has(m)) return false;
    seen.add(m);
    return true;
  });
  let lastErr: unknown;
  for (const modelName of uniqueModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: jsonMode
            ? { responseMimeType: "application/json" }
            : undefined,
        });
        const result = await model.generateContent(prompt);
        return result.response.text().trim();
      } catch (e) {
        lastErr = e;
        const msg = e instanceof Error ? e.message : String(e);
        const waitMs =
          attempt === 0 && isGemini429(e) ? parseGeminiRetryDelayMs(msg) : null;
        if (waitMs !== null) {
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        break;
      }
    }
  }
  throw new Error(
    lastErr instanceof Error
      ? lastErr.message
      : "Gemini request failed for all configured models.",
  );
}

const CRAFT_ETSY_SEARCH: Record<string, string> = {
  // Legacy labels (existing artisan rows)
  "Kani Weaving": "Handmade Kani Shawl",
  // Current onboarding labels
  "Kani Shawl Weaving": "Handmade Kani Shawl",
  "Wood Carving": "Handmade wood carving wall art",
  "Papier Mâché": "Handmade papier mache",
  "Batik Textiles": "Handmade batik fabric",
  "Ikat Weaving": "Handmade ikat textile",
  "Persian Carpet Weaving": "Handmade Persian rug small",
  "Wayuu Mochila Weaving": "Handmade Wayuu bag",
  "Pashmina Weaving": "Handmade pashmina shawl",
  "Silver Filigree Jewelry": "Handmade silver filigree jewelry",
  "Mud & Terracotta Pottery": "Handmade terracotta pottery",
};

function buildEtsySearchQuery(craftCategory: string): string {
  const t = craftCategory.trim();
  return CRAFT_ETSY_SEARCH[t] ?? `Handmade ${t}`;
}

function parseListingPrice(item: Record<string, unknown>): number | null {
  const raw = item.price;
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/\s/g, "").replace(/,/g, ".");
  const match = cleaned.match(/[\d]+(?:\.[\d]+)?/);
  if (!match) return null;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) ? n : null;
}

async function gatherExaContext(
  exa: Exa,
  craft: string,
  region: string,
): Promise<string> {
  const query = [
    "Historical and cultural heritage of",
    craft,
    "traditional craft in",
    region || "Kashmir and South Asia",
    "— history, techniques, UNESCO, museums, ethnography.",
  ].join(" ");

  try {
    const response = await exa.search(query, {
      numResults: 5,
      contents: {
        highlights: {
          query: `${craft} ${region} heritage history culture tradition`,
          maxCharacters: 8000,
        },
      },
    });

    const chunks: string[] = [];
    for (const r of response.results ?? []) {
      if ("highlights" in r && Array.isArray(r.highlights)) {
        chunks.push(...r.highlights);
      }
    }
    const merged = chunks.join("\n---\n").trim();
    return merged || "No third-party highlights returned; rely on the transcript.";
  } catch {
    return "Historical search unavailable; rely on the artisan's transcript.";
  }
}

export const generateArtisanPassport = action({
  args: { artisanId: v.id("artisans") },
  handler: async (ctx, { artisanId }) => {
    const exaKey = process.env.EXA_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey?.trim()) {
      throw new Error("Missing GEMINI_API_KEY in Convex environment.");
    }

    const artisan = await ctx.runQuery(internal.artisans.getArtisanForAction, {
      artisanId,
    });
    if (!artisan) {
      throw new Error("Artisan not found.");
    }

    const craft = artisan.craft;
    const region = (artisan.region ?? "").trim() || "Kashmir";
    const displayName = artisan.name.trim() || "Artisan";

    let exaData = "";
    if (exaKey?.trim()) {
      const exa = new Exa(exaKey.trim());
      exaData = await gatherExaContext(exa, craft, region);
    } else {
      exaData =
        "No Exa API key configured; use PROFILE and ARTISAN STORY only, plus general craft knowledge.";
    }

    const rawStory = (artisan.voiceTranscript ?? "").trim();
    const profileBlock = [
      `Name: ${displayName}`,
      `Craft: ${craft}`,
      `Region: ${region}`,
    ].join("\n");

    const storyBlock =
      rawStory.length > 0
        ? rawStory
        : "(No personal narrative was stored; write a respectful, specific bio using PROFILE, EXA DATA, and craft knowledge. Address the artisan by name.)";

    const prompt = `You are preserving intangible cultural heritage. Combine [PROFILE] (ground truth), [EXA DATA] (historical/cultural context), and [ARTISAN STORY] (their own words, possibly brief). Write a dignified ~60-word bio that uses their name and craft, and exactly 5 concise skill tags. Tags should match their practice, not generic filler. Return JSON: { bio: string, tags: string[] }

[PROFILE]
${profileBlock}

[EXA DATA]
${exaData}

[ARTISAN STORY]
${storyBlock}`;

    const genAI = new GoogleGenerativeAI(geminiKey.trim());
    const text = await runGeminiCompletion(genAI, prompt, true);
    const parsed = parsePassportJson(text, craft);

    await ctx.runMutation(internal.artisans.updateArtisanBio, {
      artisanId,
      bio: parsed.bio,
      tags: parsed.tags,
    });

    return { ok: true as const };
  },
});

/**
 * Pricing Advisor: Apify Etsy scraper (default `crawlerbros/etsy-scraper`; override with
 * `APIFY_ETSY_ACTOR_ID` — there is no public `apify/etsy-scraper` store actor).
 */
export const calculateMarketSignal = action({
  args: { craft_category: v.string() },
  handler: async (ctx, { craft_category }) => {
    const token = process.env.APIFY_API_TOKEN?.trim();
    if (!token) {
      throw new Error("Missing APIFY_API_TOKEN in Convex environment.");
    }
    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    if (!geminiKey) {
      throw new Error("Missing GEMINI_API_KEY in Convex environment.");
    }

    const craftKey = craft_category.trim();
    if (!craftKey) {
      throw new Error("craft_category is required.");
    }

    const actorId =
      process.env.APIFY_ETSY_ACTOR_ID?.trim() || "crawlerbros/etsy-scraper";
    const searchQuery = buildEtsySearchQuery(craftKey);

    const client = new ApifyClient({ token });
    const input = {
      searchQueries: [searchQuery],
      maxItems: 10,
    };

    const run = await client.actor(actorId).call(input, { waitSecs: 600 });
    if (run.status !== "SUCCEEDED") {
      throw new Error(
        `Apify actor run status: ${run.status}${run.statusMessage ? ` — ${run.statusMessage}` : ""}`,
      );
    }

    const page = await client.dataset(run.defaultDatasetId).listItems({
      limit: 10,
    });
    const items = page.items as Record<string, unknown>[];

    const samples: { title?: unknown; price?: unknown; currency?: unknown }[] =
      [];
    const values: number[] = [];
    for (const item of items) {
      const p = parseListingPrice(item);
      if (p != null) values.push(p);
      samples.push({
        title: item.title,
        price: item.price,
        currency: item.currency,
      });
    }

    if (values.length === 0) {
      throw new Error(
        "No parseable prices in Etsy results. Try APIFY_ETSY_ACTOR_ID or another Apify Etsy actor with a `price` field.",
      );
    }

    const average =
      Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) /
      100;

    const genAI = new GoogleGenerativeAI(geminiKey);
    const summaryPrompt = `You are Raah's Pricing Advisor. Etsy-style listing samples for craft category "${craftKey}" (search: "${searchQuery}"):

${JSON.stringify(samples)}
Parsed numeric prices (listing currency, often USD when currency is "$"): ${JSON.stringify(values)}
Arithmetic mean: ${average}

Output exactly ONE sentence using this template (fill in real amounts; use $ when listings use USD / $):
Based on Etsy data, your craft sells for an average of [PRICE]. We suggest a session rate of [RATE].

[PRICE] must reflect the average (sensible rounding).
[RATE] is one fair USD session price (workshop, sitting, or consult) relative to [PRICE] — typically well below 2× the average unless the data clearly supports more.
No extra text, no markdown, no surrounding quotes.`;

    const advice = await runGeminiCompletion(genAI, summaryPrompt, false);

    await ctx.runMutation(internal.artisans.updateMarketSignal, {
      craftCategory: craftKey,
      advice,
      averagePriceUsd: average,
      listingCount: values.length,
    });

    return {
      ok: true as const,
      averagePriceUsd: average,
      listingCount: values.length,
      advice,
    };
  },
});

function parseRankedArtisanIds(text: string): string[] {
  let t = text.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  const parsed = JSON.parse(t) as { rankedIds?: unknown };
  const arr = Array.isArray(parsed.rankedIds) ? parsed.rankedIds : [];
  return arr.map((x) => String(x).trim()).filter(Boolean);
}

type DiscoverCard = {
  _id: string;
  name: string;
  craft: string;
  region: string;
  bio: string | null;
  tags: string[];
  attestation_count: number;
};

function keywordDiscoveryScore(q: string, c: DiscoverCard): number {
  const hay = [c.name, c.craft, c.region, c.bio ?? "", ...c.tags]
    .join(" ")
    .toLowerCase();
  const qLower = q.toLowerCase().trim();
  let score = 0;
  if (hay.includes(qLower) && qLower.length > 2) score += 6;
  const words = qLower.split(/\s+/).filter((w) => w.length > 1);
  for (const w of words) {
    if (hay.includes(w)) score += 2;
  }
  return score;
}

/**
 * Seeker discovery: Exa neural web context + Gemini ranks artisans in our DB by semantic fit.
 * Falls back to keyword scoring when EXA / Gemini are unavailable.
 */
export const searchArtisans = action({
  args: {
    query: v.string(),
    node: discoverNodeFilter,
  },
  handler: async (ctx, { query: rawQuery, node }) => {
    const nodeKey = node ?? "all";
    const candidates = (await ctx.runQuery(api.artisans.listDiscoverArtisans, {
      node: nodeKey,
      limit: 80,
    })) as DiscoverCard[];

    const trim = rawQuery.trim();
    if (!trim) {
      return {
        artisans: candidates.slice(0, 28),
        mode: "browse" as const,
      };
    }

    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    const exaKey = process.env.EXA_API_KEY?.trim();

    let exaContext = "";
    if (exaKey) {
      try {
        const exa = new Exa(exaKey);
        const res = await exa.search(
          `${trim} traditional craft artisan heritage handmade skills`,
          {
            type: "neural",
            numResults: 6,
            contents: { text: { maxCharacters: 3200 } },
          },
        );
        const parts: string[] = [];
        for (const r of res.results ?? []) {
          if ("text" in r && typeof r.text === "string") {
            parts.push(r.text.slice(0, 1100));
          }
        }
        exaContext = parts.join("\n---\n").slice(0, 7500);
      } catch {
        exaContext = "";
      }
    }

    if (geminiKey && exaContext.length > 20) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const payload = candidates.map((c) => ({
          id: c._id,
          name: c.name,
          craft: c.craft,
          region: c.region,
          bio: (c.bio ?? "").slice(0, 420),
          tags: c.tags,
        }));
        const prompt = `You are Raah's heritage discovery engine. A seeker searched: "${trim}".

NEURAL WEB CONTEXT (semantic hints from the open web — not our database):
${exaContext}

CANDIDATE ARTISANS (verified Raah community, JSON):
${JSON.stringify(payload)}

Return ONLY valid JSON: { "rankedIds": string[] }.
- Each string must be an exact "id" from candidates.
- Order from strongest semantic / cultural fit to the seeker's intent (not keyword overlap).
- At most 24 ids. Omit poor fits.
- If none fit, return { "rankedIds": [] }.`;

        const text = await runGeminiCompletion(genAI, prompt, true);
        const rankedIds = parseRankedArtisanIds(text);
        const byId = new Map(candidates.map((c) => [c._id, c]));
        const ordered: DiscoverCard[] = [];
        const seen = new Set<string>();
        for (const id of rankedIds) {
          const row = byId.get(id);
          if (row && !seen.has(id)) {
            ordered.push(row);
            seen.add(id);
          }
        }
        for (const c of candidates) {
          if (!seen.has(c._id)) ordered.push(c);
        }
        return {
          artisans: ordered.slice(0, 32),
          mode: "semantic" as const,
        };
      } catch {
        /* keyword fallback */
      }
    }

    const scored = candidates.map((c) => ({
      c,
      s: keywordDiscoveryScore(trim, c),
    }));
    scored.sort((a, b) => b.s - a.s);
    const withHits = scored.filter((x) => x.s > 0).map((x) => x.c);
    const artisans = (withHits.length > 0 ? withHits : candidates).slice(0, 32);
    return { artisans, mode: "keyword" as const };
  },
});
