import type { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";

const discoverNodeValue = v.union(
  v.literal("all"),
  v.literal("kashmir"),
  v.literal("oaxaca"),
  v.literal("kigali"),
  v.literal("lagos"),
);

type DiscoverNodeId = "all" | "kashmir" | "oaxaca" | "kigali" | "lagos";

function regionMatchesNode(region: string, node: DiscoverNodeId): boolean {
  if (node === "all") return true;
  const r = region.toLowerCase();
  switch (node) {
    case "kashmir":
      return /kashmir|srinagar|jammu|leh|anantnag|pahalgam/.test(r);
    case "oaxaca":
      return /oaxaca|oaxaca\s+de\s+juárez|juarez/.test(r);
    case "kigali":
      return /kigali|rwanda/.test(r);
    case "lagos":
      return /lagos|nigeria|abuja/.test(r);
    default:
      return true;
  }
}

function toDiscoverCard(doc: Doc<"artisans">) {
  const phone = doc.phone?.trim() ?? "";
  return {
    _id: doc._id,
    name: doc.name,
    craft: doc.craft,
    region: doc.region ?? "",
    bio: doc.bio ?? null,
    tags: doc.tags ?? [],
    attestation_count: doc.attestation_count ?? 0,
    phone: phone.length > 0 ? phone : null,
  };
}

/** Stable key for Raah Identity (trim + lowercase). */
function normalizeVoterIdentity(raw: string): string {
  return raw.trim().toLowerCase();
}

export const createArtisan = mutation({
  args: {
    name: v.string(),
    craft: v.string(),
    voiceTranscript: v.string(),
    region: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const phone = args.phone.trim();
    const id = await ctx.db.insert("artisans", {
      name: args.name.trim(),
      craft: args.craft.trim(),
      voiceTranscript: args.voiceTranscript.trim(),
      region: args.region.trim(),
      attestation_count: 0,
      ...(phone ? { phone } : {}),
    });
    return id;
  },
});

export const getArtisanForAction = internalQuery({
  args: { artisanId: v.id("artisans") },
  handler: async (ctx, { artisanId }) => {
    return await ctx.db.get(artisanId);
  },
});

export const updateArtisanBio = internalMutation({
  args: {
    artisanId: v.id("artisans"),
    bio: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.artisanId, {
      bio: args.bio,
      tags: args.tags,
    });
  },
});

/** Lets onboarding refresh stored narrative before re-running passport generation. */
export const updateArtisanVoiceTranscript = mutation({
  args: {
    artisanId: v.id("artisans"),
    voiceTranscript: v.string(),
  },
  handler: async (ctx, { artisanId, voiceTranscript }) => {
    const doc = await ctx.db.get(artisanId);
    if (!doc) {
      throw new Error("Artisan not found.");
    }
    await ctx.db.patch(artisanId, {
      voiceTranscript: voiceTranscript.trim(),
    });
  },
});

export const updateMarketSignal = internalMutation({
  args: {
    craftCategory: v.string(),
    advice: v.string(),
    averagePriceUsd: v.optional(v.number()),
    listingCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const key = args.craftCategory.trim();
    const existing = await ctx.db
      .query("market_signals")
      .withIndex("by_craftCategory", (q) => q.eq("craftCategory", key))
      .first();
    const payload = {
      craftCategory: key,
      advice: args.advice.trim(),
      averagePriceUsd: args.averagePriceUsd,
      listingCount: args.listingCount,
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }
    return await ctx.db.insert("market_signals", payload);
  },
});

export const getArtisanForPassport = query({
  args: { artisanId: v.id("artisans") },
  handler: async (ctx, { artisanId }) => {
    const doc = await ctx.db.get(artisanId);
    if (!doc) return null;
    return {
      name: doc.name,
      region: doc.region ?? "",
      craft: doc.craft,
      bio: doc.bio ?? null,
      tags: doc.tags ?? [],
      attestation_count: doc.attestation_count ?? 0,
      sinceYear: new Date(doc._creationTime).getFullYear(),
      phone: doc.phone?.trim() ?? "",
    };
  },
});

export const addAttestation = mutation({
  args: {
    artisanId: v.id("artisans"),
    voterIdentity: v.string(),
  },
  handler: async (ctx, { artisanId, voterIdentity }) => {
    const artisan = await ctx.db.get(artisanId);
    if (!artisan) {
      throw new Error("Artisan not found.");
    }
    const key = normalizeVoterIdentity(voterIdentity);
    if (!key) {
      throw new Error("Identity is required to verify.");
    }
    const existing = await ctx.db
      .query("attestations")
      .withIndex("by_artisan_and_voterIdentity", (q) =>
        q.eq("artisanId", artisanId).eq("voterIdentity", key),
      )
      .first();
    if (existing) {
      throw new Error(
        "This identity has already verified this artisan on Raah.",
      );
    }
    const now = Date.now();
    const next = (artisan.attestation_count ?? 0) + 1;
    await ctx.db.patch(artisanId, { attestation_count: next });
    await ctx.db.insert("attestations", {
      artisanId,
      createdAt: now,
      voterIdentity: key,
    });
    return { attestation_count: next };
  },
});

export const getMarketSignalByCategory = query({
  args: { craftCategory: v.string() },
  handler: async (ctx, { craftCategory }) => {
    const key = craftCategory.trim();
    if (!key) return null;
    const rows = await ctx.db
      .query("market_signals")
      .withIndex("by_craftCategory", (q) => q.eq("craftCategory", key))
      .collect();
    if (rows.length === 0) return null;
    const latest = rows.reduce((a, b) =>
      a.updatedAt >= b.updatedAt ? a : b,
    );
    return {
      advice: latest.advice,
      updatedAt: latest.updatedAt,
      averagePriceUsd: latest.averagePriceUsd,
      listingCount: latest.listingCount,
    };
  },
});

export const listDiscoverArtisans = query({
  args: {
    node: v.optional(discoverNodeValue),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { node = "all", limit }) => {
    const cap = Math.min(100, Math.max(1, limit ?? 36));
    const all = await ctx.db.query("artisans").collect();
    const filtered = all.filter((a) =>
      regionMatchesNode(a.region ?? "", node as DiscoverNodeId),
    );
    filtered.sort((a, b) => {
      const w = (x: Doc<"artisans">) =>
        (x.bio ? 2 : 0) + Math.min(5, (x.attestation_count ?? 0) * 0.15);
      return w(b) - w(a);
    });
    return filtered.slice(0, cap).map(toDiscoverCard);
  },
});

export const getMarketPulse = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const cap = Math.min(20, Math.max(1, limit ?? 10));
    const rows = await ctx.db.query("market_signals").collect();
    rows.sort((a, b) => b.updatedAt - a.updatedAt);
    return rows.slice(0, cap).map((r) => ({
      craftCategory: r.craftCategory,
      averagePriceUsd: r.averagePriceUsd ?? null,
      listingCount: r.listingCount ?? null,
      updatedAt: r.updatedAt,
    }));
  },
});

export const trendingCraftsOnRaah = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const cap = Math.min(16, Math.max(1, limit ?? 8));
    const artisans = await ctx.db.query("artisans").collect();
    const counts = new Map<string, number>();
    for (const a of artisans) {
      counts.set(a.craft, (counts.get(a.craft) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, cap)
      .map(([craft, artisanCount]) => ({ craft, artisanCount }));
  },
});

export const recentAttestationFeed = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const cap = Math.min(40, Math.max(1, limit ?? 22));
    const rows = await ctx.db
      .query("attestations")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", 0))
      .order("desc")
      .take(cap);
    const out: {
      _id: (typeof rows)[number]["_id"];
      createdAt: number;
      artisanId: (typeof rows)[number]["artisanId"];
      artisanName: string;
      craft: string;
      region: string;
    }[] = [];
    for (const row of rows) {
      const a = await ctx.db.get(row.artisanId);
      if (!a) continue;
      out.push({
        _id: row._id,
        createdAt: row.createdAt,
        artisanId: row.artisanId,
        artisanName: a.name,
        craft: a.craft,
        region: a.region ?? "",
      });
    }
    return out;
  },
});
