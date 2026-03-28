import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Data model aligned with Raah’s three pillars (README):
 * Skill Passport, Price Signal, Trust Bridge — plus core artisan profiles.
 */
export default defineSchema({
  artisans: defineTable({
    name: v.string(),
    craft: v.string(),
    voiceTranscript: v.string(),
    region: v.optional(v.string()),
    bio: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    attestation_count: v.optional(v.number()),
  }).index("by_craft", ["craft"]),

  /** Lightweight peer attestation events (count lives on artisans). */
  attestations: defineTable({
    artisanId: v.id("artisans"),
    createdAt: v.number(),
  })
    .index("by_artisan", ["artisanId"])
    .index("by_createdAt", ["createdAt"]),

  peerAttestations: defineTable({
    artisanId: v.id("artisans"),
    statement: v.string(),
  }).index("by_artisan", ["artisanId"]),

  priceSignals: defineTable({
    craftCategory: v.string(),
    summary: v.string(),
    sourceLabel: v.string(),
  }).index("by_craftCategory", ["craftCategory"]),

  /** Pricing Advisor output (Apify Etsy + Gemini). */
  market_signals: defineTable({
    craftCategory: v.string(),
    advice: v.string(),
    averagePriceUsd: v.optional(v.number()),
    listingCount: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_craftCategory", ["craftCategory"]),

  trustBridgeContexts: defineTable({
    artisanId: v.id("artisans"),
    narrative: v.string(),
  }).index("by_artisan", ["artisanId"]),
});
