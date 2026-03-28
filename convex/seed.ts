import { internalMutation } from "./_generated/server";

/**
 * Temporary demo data — 6 makers across Raah nodes (Oaxaca, Kigali, Kashmir).
 * Idempotent by artisan `name`: skips rows that already exist.
 */
const SEED_ARTISANS = [
  {
    name: "Mariana López Hernández",
    craft: "Oaxacan Alebrije Carving",
    region: "Oaxaca de Juárez, Mexico",
    voiceTranscript:
      "I paint copal wood figures in the tradition of San Martín Tilcajete—bright zapotec colours, every scale carved by hand. My grandfather taught me to listen to the grain before the first brushstroke.",
    bio: "Mariana is a third-generation alebrije painter in Oaxaca, known for jewel-toned fantastical creatures rooted in Zapotec symbolism. Collectors seek her work for museum-quality finish and ethically sourced copal.",
    tags: [
      "Alebrije carving",
      "Zapotec colour lore",
      "Copal wood",
      "Fine brushwork",
      "Heritage export",
    ],
    attestation_count: 56,
    phone: "+5251951123456",
  },
  {
    name: "Javier Ramírez Morales",
    craft: "Oaxacan Alebrije Carving",
    region: "San Martín Tilcajete, Oaxaca, Mexico",
    voiceTranscript:
      "We still split logs the old way and let them cure in the courtyard. Tourists call them ‘alebrijes’; here they are spirits we coax out of the wood with knives passed down four generations.",
    bio: "Javier co-leads a family taller in Tilcajete focused on large-format mythical beasts and collaborative pieces with women weavers from the isthmus. His attested sales span CDMX, LA, and Madrid galleries.",
    tags: [
      "Large-format sculpture",
      "Family taller",
      "Isthmus collaboration",
      "Export logistics",
      "Tool restoration",
    ],
    attestation_count: 44,
    phone: "+5251951987654",
  },
  {
    name: "Jeanne Mukamana",
    craft: "Imigongo Relief Panels",
    region: "Kigali, Rwanda",
    voiceTranscript:
      "Cow dung and ash, then ochre and white—geometry that our grandmothers painted on hut walls. I teach young women in Nyamirambo so the zigzags do not flatten into tourist clichés.",
    bio: "Jeanne revives imigongo as architectural-scale panels for hotels and diaspora homes. Buyers value her rigour with natural pigments and peer-reviewed documentation of Kinyarwanda motifs.",
    tags: [
      "Imigongo geometry",
      "Natural pigments",
      "Community workshops",
      "Architectural panels",
      "Kinyarwanda motifs",
    ],
    attestation_count: 38,
    phone: "+250788123456",
  },
  {
    name: "Patrick Nkurunziza",
    craft: "Imigongo Relief Panels",
    region: "Musanze, Northern Province, Rwanda",
    voiceTranscript:
      "Tourists want spirals; elders want meaning. I map each line to proverbs about cattle and hills so the relief is not decoration—it is memory pressed into the wall.",
    bio: "Patrick splits time between Musanze cooperatives and Kigali design studios, supplying imigongo feature walls for eco-lodges. High attestation count reflects repeat hospitality buyers and UNESCO-adjacent projects.",
    tags: [
      "Proverb-based design",
      "Eco-lodge commissions",
      "Cooperative training",
      "Relief engineering",
      "Cross-border shipping",
    ],
    attestation_count: 62,
    phone: "+250785987654",
  },
  {
    name: "Hina Mattoo",
    craft: "Kani Shawl Weaving",
    region: "Srinagar, Jammu and Kashmir",
    voiceTranscript:
      "The kanihama loom is narrow but the pattern map lives in my head—paisleys that took my mother years to teach. Pashmina thread and the slow rhythm of the talim keep the valley’s silk language alive.",
    bio: "Hina weaves certified Kani shawls for collectors in Delhi, Dubai, and London. Her bio on Raah highlights GI-linked provenance, natural dyes, and mentorship of adolescent girls in rural loom clusters.",
    tags: [
      "Kani loom",
      "Pashmina thread",
      "Talim pattern memory",
      "GI provenance",
      "Rural mentorship",
    ],
    attestation_count: 71,
    phone: "+919419876543",
  },
  {
    name: "Basit Ahmed Wani",
    craft: "Pashmina Weaving",
    region: "Pampore, Kashmir",
    voiceTranscript:
      "Saffron fields border our workshop—the same soil colours the dusk we dye in. I blend hand-spun pashmina with subtle zari only where the design asks for starlight, not glitter.",
    bio: "Basit’s atelier in Pampore pairs saffron-farming heritage with ultra-fine pashmina throws. Global buyers attest to his restraint in ornament and transparent batch tracing from flock to finished wrap.",
    tags: [
      "Pashmina fineness",
      "Saffron-region dyes",
      "Zari restraint",
      "Batch tracing",
      "Atelier leadership",
    ],
    attestation_count: 49,
    phone: "+919417654321",
  },
] as const;

export const seedArtisans = internalMutation({
  handler: async (ctx) => {
    const existing = await ctx.db.query("artisans").collect();
    const byName = new Set(existing.map((a) => a.name));
    let inserted = 0;
    for (const row of SEED_ARTISANS) {
      if (byName.has(row.name)) continue;
      await ctx.db.insert("artisans", {
        name: row.name,
        craft: row.craft,
        voiceTranscript: row.voiceTranscript,
        region: row.region,
        bio: row.bio,
        tags: [...row.tags],
        attestation_count: row.attestation_count,
        phone: row.phone,
      });
      byName.add(row.name);
      inserted += 1;
    }
    return {
      inserted,
      skipped: SEED_ARTISANS.length - inserted,
      total: SEED_ARTISANS.length,
    };
  },
});
