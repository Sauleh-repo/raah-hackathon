import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";

export const createArtisan = mutation({
  args: {
    name: v.string(),
    craft: v.string(),
    voiceTranscript: v.string(),
    region: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("artisans", {
      name: args.name.trim(),
      craft: args.craft.trim(),
      voiceTranscript: args.voiceTranscript.trim(),
      region: args.region.trim(),
      attestation_count: 0,
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
    };
  },
});

export const addAttestation = mutation({
  args: { artisanId: v.id("artisans") },
  handler: async (ctx, { artisanId }) => {
    const artisan = await ctx.db.get(artisanId);
    if (!artisan) {
      throw new Error("Artisan not found.");
    }
    const now = Date.now();
    const next = (artisan.attestation_count ?? 0) + 1;
    await ctx.db.patch(artisanId, { attestation_count: next });
    await ctx.db.insert("attestations", {
      artisanId,
      createdAt: now,
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
