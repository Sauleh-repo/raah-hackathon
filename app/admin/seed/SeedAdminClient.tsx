"use client";

import { api } from "@/convex/_generated/api";
import { useAction } from "convex/react";
import Link from "next/link";
import { useState } from "react";

export function SeedAdminClient() {
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const trigger = useAction(api.seedTrigger.triggerSeedArtisans);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 font-sans text-heritage-walnut">
      <p className="font-serif text-xs tracking-[0.25em] uppercase text-heritage-walnut/50">
        Temporary · Demo data
      </p>
      <h1 className="mt-2 font-serif text-3xl">Seed artisans</h1>
      <p className="mt-3 text-sm leading-relaxed text-heritage-walnut/70">
        Inserts six international demo makers (Oaxaca alebrijes, Kigali imigongo,
        Kashmir silk/saffron) if their names are not already in the database.
        Set{" "}
        <code className="rounded bg-heritage-walnut/10 px-1.5 py-0.5 text-xs">
          RAAH_SEED_SECRET
        </code>{" "}
        in your Convex deployment to the same passphrase you enter below, then
        remove it after the demo.
      </p>

      <label className="mt-8 block text-sm font-medium text-heritage-walnut/80">
        Seed secret
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          autoComplete="off"
          className="mt-2 w-full min-h-12 rounded-xl border border-heritage-walnut/20 bg-heritage-cream/80 px-4 text-base text-heritage-walnut focus:border-heritage-gold focus:outline-none focus:ring-2 focus:ring-heritage-gold/50"
          placeholder="Matches Convex RAAH_SEED_SECRET"
        />
      </label>

      <button
        type="button"
        disabled={busy || !secret.trim()}
        onClick={async () => {
          setBusy(true);
          setStatus(null);
          try {
            const res = await trigger({ secret: secret.trim() });
            setStatus(
              `Done: inserted ${res.inserted}, skipped ${res.skipped} (already present). Total defined: ${res.total}.`,
            );
          } catch (e) {
            setStatus(
              e instanceof Error ? e.message : "Seed failed. Check Convex logs.",
            );
          } finally {
            setBusy(false);
          }
        }}
        className="mt-6 w-full min-h-12 rounded-xl bg-heritage-walnut text-sm font-semibold text-heritage-cream transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "Seeding…" : "Run seed once"}
      </button>

      {status && (
        <p className="mt-6 rounded-xl border border-heritage-gold/30 bg-heritage-gold/10 px-4 py-3 text-sm text-heritage-walnut">
          {status}
        </p>
      )}

      <div className="mt-10 flex flex-col gap-2 text-sm">
        <Link
          href="/discover"
          className="font-medium text-heritage-gold underline-offset-4 hover:underline"
        >
          Open Global Discovery →
        </Link>
        <Link href="/" className="text-heritage-walnut/60 hover:underline">
          ← Home
        </Link>
      </div>
    </div>
  );
}
