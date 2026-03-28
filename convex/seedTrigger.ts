import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

/**
 * Calls internal `seed.seedArtisans`. Set `RAAH_SEED_SECRET` in Convex env
 * to match the value entered in the admin form (remove after demo).
 */
export const triggerSeedArtisans = action({
  args: { secret: v.string() },
  handler: async (ctx, { secret }): Promise<{
    inserted: number;
    skipped: number;
    total: number;
  }> => {
    const expected = process.env.RAAH_SEED_SECRET?.trim();
    if (!expected || secret.trim() !== expected) {
      throw new Error(
        "Invalid seed secret. Set RAAH_SEED_SECRET in Convex and match it here.",
      );
    }
    return await ctx.runMutation(internal.seed.seedArtisans, {});
  },
});
