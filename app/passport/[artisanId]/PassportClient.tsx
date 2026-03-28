"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";

function ChartInsightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <rect x="7" y="11" width="3" height="8" rx="0.5" />
      <rect x="12" y="7" width="3" height="12" rx="0.5" />
      <rect x="17" y="14" width="3" height="5" rx="0.5" />
    </svg>
  );
}

const HERITAGE_PATTERN_STYLE: CSSProperties = {
  backgroundImage: `
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 13px,
      rgba(212, 175, 55, 0.07) 13px,
      rgba(212, 175, 55, 0.07) 14px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 13px,
      rgba(45, 27, 8, 0.045) 13px,
      rgba(45, 27, 8, 0.045) 14px
    ),
    radial-gradient(
      ellipse 120% 80% at 50% 0%,
      rgba(212, 175, 55, 0.08),
      transparent 55%
    )
  `,
};

export function PassportClient({ artisanId }: { artisanId: string }) {
  const id = artisanId as Id<"artisans">;
  const data = useQuery(api.artisans.getArtisanForPassport, { artisanId: id });
  const market = useQuery(
    api.artisans.getMarketSignalByCategory,
    data?.craft ? { craftCategory: data.craft } : "skip",
  );
  const addAttestation = useMutation(api.artisans.addAttestation);

  const [pageUrl, setPageUrl] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);

  useEffect(() => {
    setPageUrl(
      typeof window !== "undefined" ? window.location.href.split("#")[0] : "",
    );
  }, []);

  const initial = useMemo(() => {
    const c = data?.name?.trim()?.charAt(0);
    return c ? c.toUpperCase() : "—";
  }, [data?.name]);

  const locationLine = data?.region?.trim() || "Srinagar, Kashmir";

  const handleVerify = useCallback(async () => {
    setVerifyBusy(true);
    try {
      await addAttestation({ artisanId: id });
    } finally {
      setVerifyBusy(false);
    }
  }, [addAttestation, id]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (data === undefined) {
    return (
      <div
        className="passport-print-shell flex min-h-screen flex-col items-center justify-center gap-4 px-4"
        style={{ backgroundColor: "#F5F5F0", color: "#2D1B08" }}
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-[#2D1B08]/12 border-t-[#D4AF37]"
          style={{ animationDuration: "0.9s" }}
        />
        <p className="font-sans text-sm text-[#2D1B08]/65">
          Loading passport…
        </p>
      </div>
    );
  }

  if (data === null) {
    return (
      <div
        className="passport-print-shell min-h-screen px-4 py-16 text-center font-sans"
        style={{ backgroundColor: "#F5F5F0", color: "#2D1B08" }}
      >
        <h1 className="font-serif text-2xl text-[#2D1B08]">Passport not found</h1>
        <Link
          href="/"
          className="no-print mt-6 inline-block text-sm font-medium text-[#D4AF37] underline underline-offset-4"
        >
          Return home
        </Link>
      </div>
    );
  }

  return (
    <div
      className="passport-print-shell min-h-screen font-sans px-4 py-8 sm:py-12"
      style={{ backgroundColor: "#F5F5F0", color: "#2D1B08" }}
    >
      <div className="mx-auto w-full max-w-[22rem] sm:max-w-md">
        <article
          className="passport-print-area relative overflow-hidden rounded-2xl border-2 border-[#D4AF37]/45 bg-[#F5F5F0]/95 shadow-[0_12px_40px_-12px_rgba(45,27,8,0.18)]"
          style={{ boxShadow: "0 12px 40px -12px rgba(45,27,8,0.18), inset 0 1px 0 rgba(255,255,255,0.6)" }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={HERITAGE_PATTERN_STYLE}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-2 rounded-xl border border-[#D4AF37]/20"
            aria-hidden
          />

          <div className="relative z-10 px-5 pb-6 pt-6 sm:px-7 sm:pb-8 sm:pt-7">
            <div className="absolute right-4 top-4 max-w-[9.5rem] sm:right-5 sm:top-5 sm:max-w-[10.5rem]">
              <span
                className="inline-flex items-center gap-1 rounded-md border border-[#D4AF37]/50 bg-[#F5F5F0]/90 px-2 py-1 text-[0.62rem] font-medium uppercase tracking-wide text-[#2D1B08]/85 sm:text-[0.65rem]"
                title="Bio and tags generated with Raah AI"
              >
                <svg
                  className="h-3 w-3 shrink-0 text-[#D4AF37]"
                  viewBox="0 0 12 12"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M6 0L7.5 4.2L12 4.9L8.5 8.1L9.4 12L6 9.8L2.6 12L3.5 8.1L0 4.9L4.5 4.2L6 0Z" />
                </svg>
                Verified by Raah AI
              </span>
            </div>

            <p className="font-serif text-[0.65rem] tracking-[0.28em] text-[#2D1B08]/55 sm:text-xs sm:tracking-[0.32em]">
              RAAH SKILL PASSPORT
            </p>

            <div className="mt-5 flex items-start gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[#D4AF37] bg-[#F5F5F0] font-serif text-xl text-[#D4AF37] shadow-sm sm:h-16 sm:w-16 sm:text-2xl"
                aria-hidden
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1 pr-20 sm:pr-24">
                <h1 className="font-serif text-2xl leading-tight text-[#2D1B08] sm:text-[1.65rem]">
                  {data.name}
                </h1>
                <p className="mt-1.5 text-sm leading-snug text-[#2D1B08]/72">
                  {locationLine}
                </p>
                <p className="mt-1 text-sm text-[#2D1B08]/60">{data.craft}</p>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-[#2D1B08]/50">
                  Since {data.sinceYear}
                </p>
              </div>
            </div>

            <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/55 to-transparent" />

            <section className="mt-6">
              <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#2D1B08]/45">
                Heritage bio
              </h2>
              {data.bio ? (
                <p className="mt-2 text-[0.95rem] leading-[1.85] text-[#2D1B08]/92 sm:text-base sm:leading-[1.9]">
                  {data.bio}
                </p>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-[#2D1B08]/55">
                  Your heritage bio is still being prepared.
                </p>
              )}
            </section>

            {data.tags.length > 0 && (
              <section className="mt-6">
                <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#2D1B08]/45">
                  Skill tags
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {data.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full border border-[#D4AF37] bg-transparent px-3.5 py-1.5 text-xs font-medium text-[#2D1B08] sm:text-sm"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="mt-6 rounded-xl border border-[#D4AF37]/35 bg-white/25 p-4">
              <div className="flex gap-3">
                <ChartInsightIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#D4AF37]" />
                <div className="min-w-0">
                  <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#2D1B08]/50">
                    Global market insight
                  </h2>
                  {market === undefined ? (
                    <p className="mt-2 text-sm text-[#2D1B08]/55">
                      Loading market signal…
                    </p>
                  ) : market ? (
                    <p className="mt-2 text-sm leading-relaxed text-[#2D1B08]/88">
                      <span className="font-medium text-[#2D1B08]">
                        Global Market Insight:{" "}
                      </span>
                      {market.advice}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm leading-relaxed text-[#2D1B08]/55">
                      Run the Pricing Advisor for{" "}
                      <span className="font-medium">{data.craft}</span> to see
                      live Etsy guidance here.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-xl border border-[#2D1B08]/10 bg-white/35 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#2D1B08]/45">
                    Peer attestations
                  </p>
                  <p className="mt-1 font-serif text-3xl tabular-nums text-[#2D1B08]">
                    {data.attestation_count}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleVerify()}
                  disabled={verifyBusy}
                  className="no-print min-h-11 shrink-0 rounded-xl border border-[#2D1B08] bg-[#2D1B08] px-4 py-2.5 text-center text-xs font-semibold leading-tight text-[#F5F5F0] transition-opacity hover:opacity-90 disabled:opacity-50 sm:max-w-[9.5rem] sm:text-sm"
                >
                  {verifyBusy ? "Recording…" : "Verify this Artisan's Skill"}
                </button>
              </div>
            </section>

            <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-[#D4AF37]/35 to-transparent" />

            <section className="mt-5 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-lg border border-[#D4AF37]/30 bg-white p-1.5 shadow-sm">
                  {pageUrl ? (
                    <QRCodeCanvas
                      value={pageUrl}
                      size={100}
                      level="M"
                      fgColor="#2D1B08"
                      bgColor="#F5F5F0"
                      marginSize={1}
                    />
                  ) : (
                    <div
                      className="h-[100px] w-[100px] animate-pulse rounded bg-[#2D1B08]/5"
                      aria-hidden
                    />
                  )}
                </div>
                <p className="max-w-[12rem] text-left text-xs leading-relaxed text-[#2D1B08]/72 sm:max-w-[14rem] sm:text-sm">
                  Scan to verify this legacy from anywhere.
                </p>
              </div>
            </section>

            <div className="no-print mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={handlePrint}
                className="min-h-12 w-full rounded-xl border-2 border-[#D4AF37] bg-transparent px-5 text-sm font-semibold text-[#2D1B08] transition-colors hover:bg-[#D4AF37]/10 sm:w-auto"
              >
                Print Passport
              </button>
              <Link
                href="/"
                className="flex min-h-12 w-full items-center justify-center rounded-xl border border-[#2D1B08]/20 px-5 text-sm font-medium text-[#2D1B08]/80 transition-colors hover:bg-[#2D1B08]/5 sm:w-auto"
              >
                ← Back to Raah
              </Link>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
