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
    /** WhatsApp / contact bridge (digits and +; shown on passport & discovery). */
    phone: v.optional(v.string()),
  }).index("by_craft", ["craft"]),

  /** Lightweight peer attestation events (count lives on artisans). */
  attestations: defineTable({
    artisanId: v.id("artisans"),
    createdAt: v.number(),
    /** Normalized phone or email — Raah Identity Protocol (one verify per artisan per identity). */
    voterIdentity: v.optional(v.string()),
  })
    .index("by_artisan", ["artisanId"])
    .index("by_createdAt", ["createdAt"])
    // One row per (artisanId, voterIdentity); uniqueness enforced in addAttestation.
    .index("by_artisan_and_voterIdentity", ["artisanId", "voterIdentity"]),

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
