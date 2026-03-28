"use client";

import { api } from "@/convex/_generated/api";
import { useAction, useQuery } from "convex/react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

type NodeId = "all" | "kashmir" | "oaxaca" | "kigali" | "lagos";

const NODES: { id: NodeId; label: string; hint?: string }[] = [
  { id: "all", label: "All nodes" },
  { id: "kashmir", label: "Kashmir", hint: "Node Zero" },
  { id: "oaxaca", label: "Oaxaca" },
  { id: "kigali", label: "Kigali" },
  { id: "lagos", label: "Lagos" },
];

type DiscoverCard = {
  _id: string;
  name: string;
  craft: string;
  region: string;
  bio: string | null;
  tags: string[];
  attestation_count: number;
  phone: string | null;
};

function formatUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatFeedTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DiscoverClient() {
  const [node, setNode] = useState<NodeId>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<DiscoverCard[] | null>(
    null,
  );
  const [searchMode, setSearchMode] = useState<"browse" | "semantic" | "keyword" | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const browse = useQuery(api.artisans.listDiscoverArtisans, { node, limit: 36 });
  const marketPulse = useQuery(api.artisans.getMarketPulse, { limit: 8 });
  const trending = useQuery(api.artisans.trendingCraftsOnRaah, { limit: 8 });
  const attestationFeed = useQuery(api.artisans.recentAttestationFeed, {
    limit: 18,
  });

  const searchArtisans = useAction(api.actions.searchArtisans);

  const displayed = searchResults ?? browse ?? [];
  const loadingBrowse = browse === undefined;

  const tickerItems = useMemo(() => {
    const rows = attestationFeed ?? [];
    if (rows.length === 0) {
      return [
        "Peer verifications will appear here as the community grows on Raah.",
      ];
    }
    return rows.map(
      (r) =>
        `${formatFeedTime(r.createdAt)} · ${r.artisanName} · ${r.craft} · skill verified`,
    );
  }, [attestationFeed]);

  const runSearch = useCallback(async () => {
    setSearchError(null);
    setSearching(true);
    try {
      const res = await searchArtisans({ query: searchInput, node });
      setSearchResults(res.artisans as DiscoverCard[]);
      setSearchMode(res.mode);
    } catch (e) {
      setSearchError(
        e instanceof Error ? e.message : "Search could not complete.",
      );
      setSearchResults(null);
      setSearchMode(null);
    } finally {
      setSearching(false);
    }
  }, [searchArtisans, searchInput, node]);

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSearchResults(null);
    setSearchMode(null);
    setSearchError(null);
  }, []);

  return (
    <div className="min-h-screen bg-background text-heritage-walnut">
      <header className="border-b border-heritage-walnut/10 bg-gradient-to-b from-heritage-cream/80 to-background">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:px-8 sm:py-12">
          <p className="font-serif text-xs tracking-[0.35em] uppercase text-heritage-walnut/50">
            Seeker · Global Discovery
          </p>
          <h1 className="font-serif text-3xl leading-tight sm:text-4xl md:text-[2.35rem] max-w-2xl">
            Find masters of living heritage — trusted, attested, alive.
          </h1>
          <p className="max-w-xl text-heritage-walnut/72 leading-relaxed">
            Neural search reads meaning, not just keywords. Filter by Raah
            infrastructure nodes, then open a Skill Passport.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 lg:grid lg:grid-cols-[1fr_min(20rem,32%)] lg:gap-10 lg:items-start">
        <div className="min-w-0">
          <div className="rounded-2xl border border-heritage-gold/25 bg-white/55 p-4 shadow-sm backdrop-blur-sm sm:p-5">
            <label className="block font-serif text-sm text-heritage-walnut/70">
              Neural search
            </label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void runSearch();
                }}
                placeholder="e.g. indigo resist dyeing, filigree wedding work, backstrap loom…"
                className="min-h-12 flex-1 rounded-xl border border-heritage-walnut/15 bg-heritage-cream/70 px-4 text-base text-heritage-walnut placeholder:text-heritage-walnut/35 focus:border-heritage-gold focus:outline-none focus:ring-2 focus:ring-heritage-gold/40"
              />
              <button
                type="button"
                disabled={searching}
                onClick={() => void runSearch()}
                className="min-h-12 shrink-0 rounded-xl bg-heritage-walnut px-6 text-sm font-semibold text-heritage-cream transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {searching ? "Searching…" : "Search"}
              </button>
            </div>
            {(searchMode === "semantic" || searchMode === "keyword") && (
              <p className="mt-2 text-xs text-heritage-walnut/55">
                {searchMode === "semantic"
                  ? "Ranked with Exa neural context + Raah AI."
                  : "Keyword match (add EXA + Gemini for full semantic ranking)."}
              </p>
            )}
            {searchError && (
              <p className="mt-2 text-sm text-red-700/90">{searchError}</p>
            )}
          </div>

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-heritage-walnut/45">
              Node selector
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {NODES.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    setNode(n.id);
                    setSearchResults(null);
                    setSearchMode(null);
                  }}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    node === n.id
                      ? "border-heritage-gold bg-heritage-gold/15 text-heritage-walnut"
                      : "border-heritage-walnut/15 bg-white/50 text-heritage-walnut/75 hover:border-heritage-gold/40"
                  }`}
                >
                  {n.label}
                  {n.hint ? (
                    <span className="ml-1.5 text-xs font-normal text-heritage-walnut/50">
                      ({n.hint})
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 flex items-end justify-between gap-4">
            <h2 className="font-serif text-xl text-heritage-walnut sm:text-2xl">
              {searchResults ? "Results" : "Featured makers"}
            </h2>
            {searchResults && (
              <button
                type="button"
                onClick={clearSearch}
                className="text-sm font-medium text-heritage-gold underline-offset-4 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>

          {loadingBrowse && !searchResults ? (
            <div className="mt-8 flex flex-col items-center gap-3 py-16">
              <div
                className="h-9 w-9 animate-spin rounded-full border-2 border-heritage-walnut/12 border-t-heritage-gold"
                style={{ animationDuration: "0.85s" }}
              />
              <p className="text-sm text-heritage-walnut/55">Loading makers…</p>
            </div>
          ) : displayed.length === 0 ? (
            <p className="mt-8 rounded-xl border border-dashed border-heritage-walnut/20 bg-heritage-cream/40 px-6 py-12 text-center text-heritage-walnut/65">
              No artisans in this node yet. Try another region or clear filters.
            </p>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {displayed.map((a) => (
                <li key={a._id}>
                  <Link
                    href={`/passport/${a._id}`}
                    className="group flex h-full flex-col rounded-2xl border border-heritage-gold/20 bg-gradient-to-b from-white/90 to-heritage-cream/40 p-5 shadow-sm transition-shadow hover:border-heritage-gold/45 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-serif text-lg text-heritage-walnut group-hover:text-heritage-walnut">
                          {a.name}
                        </p>
                        <p className="mt-0.5 text-sm text-heritage-gold/90">
                          {a.craft}
                        </p>
                        {a.phone ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800/90">
                              <span
                                className="relative flex h-2 w-2"
                                aria-hidden
                              >
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                              </span>
                              Available
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#25D366]/35 bg-[#25D366]/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-emerald-900/85">
                              <svg
                                className="h-3 w-3 text-[#25D366]"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                aria-hidden
                              >
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                              </svg>
                              WhatsApp
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <span className="shrink-0 rounded-full border border-heritage-walnut/10 bg-heritage-cream/80 px-2.5 py-1 text-xs tabular-nums text-heritage-walnut/65">
                        {a.attestation_count} peers
                      </span>
                    </div>
                    {a.region ? (
                      <p className="mt-2 text-xs uppercase tracking-wider text-heritage-walnut/45">
                        {a.region}
                      </p>
                    ) : null}
                    {a.bio ? (
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-heritage-walnut/78">
                        {a.bio}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm italic text-heritage-walnut/45">
                        Passport bio in progress…
                      </p>
                    )}
                    {a.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {a.tags.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="rounded-full border border-heritage-gold/35 px-2.5 py-0.5 text-xs text-heritage-walnut/80"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    <span className="mt-4 text-xs font-medium text-heritage-gold">
                      View Skill Passport →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="mt-10 space-y-8 lg:mt-0 lg:sticky lg:top-6">
          <section className="rounded-2xl border border-heritage-gold/25 bg-white/50 p-5 shadow-sm">
            <h3 className="font-serif text-lg text-heritage-walnut">
              Global Market Pulse
            </h3>
            <p className="mt-1 text-xs text-heritage-walnut/55">
              Etsy-derived averages from Raah&apos;s Apify runs (per craft).
            </p>
            {marketPulse === undefined ? (
              <p className="mt-4 text-sm text-heritage-walnut/50">Loading…</p>
            ) : marketPulse.length === 0 ? (
              <p className="mt-4 text-sm text-heritage-walnut/55">
                Run{" "}
                <code className="rounded bg-heritage-walnut/5 px-1 text-xs">
                  calculateMarketSignal
                </code>{" "}
                for crafts to populate price data.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {marketPulse.map((m) => (
                  <li
                    key={m.craftCategory}
                    className="flex items-start justify-between gap-2 border-b border-heritage-walnut/8 pb-3 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-heritage-walnut">
                        {m.craftCategory}
                      </p>
                      <p className="text-xs text-heritage-walnut/50">
                        {m.listingCount != null
                          ? `${m.listingCount} listings sampled`
                          : "Etsy sample"}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-heritage-gold">
                      {formatUsd(m.averagePriceUsd)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-heritage-walnut/12 bg-heritage-cream/60 p-5">
            <h3 className="font-serif text-lg text-heritage-walnut">
              Trending crafts
            </h3>
            <p className="mt-1 text-xs text-heritage-walnut/55">
              Live volume on Raah (makers onboarded).
            </p>
            {trending === undefined ? (
              <p className="mt-4 text-sm text-heritage-walnut/50">Loading…</p>
            ) : (
              <ol className="mt-4 list-decimal space-y-2 pl-4 text-sm text-heritage-walnut/85">
                {trending.map((t) => (
                  <li key={t.craft} className="marker:text-heritage-gold">
                    <span className="font-medium">{t.craft}</span>
                    <span className="text-heritage-walnut/50">
                      {" "}
                      · {t.artisanCount}{" "}
                      {t.artisanCount === 1 ? "maker" : "makers"}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-heritage-walnut/10 bg-heritage-walnut/[0.03]">
            <div className="border-b border-heritage-walnut/10 px-4 py-3">
              <h3 className="font-serif text-sm text-heritage-walnut">
                Live attestations
              </h3>
              <p className="text-xs text-heritage-walnut/50">
                Peer skill verifications, in real time
              </p>
            </div>
            <div className="relative overflow-hidden py-3">
              <div className="discover-ticker-track flex w-max gap-10 whitespace-nowrap px-4 text-xs text-heritage-walnut/70">
                {[...tickerItems, ...tickerItems].map((line, i) => (
                  <span
                    key={`tick-${i}`}
                    className="inline-flex items-center gap-2"
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-heritage-gold"
                      aria-hidden
                    />
                    {line}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <Link
            href="/"
            className="block text-center text-sm font-medium text-heritage-gold underline-offset-4 hover:underline"
          >
            ← Back to Raah home
          </Link>
        </aside>
      </div>
    </div>
  );
}
