"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
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

const RAAH_IDENTITY_KEY = "raah_identity";

function digitsOnlyPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function buildWhatsAppHref(phone: string, craft: string): string | null {
  const d = digitsOnlyPhone(phone);
  if (d.length < 8) return null;
  const text = `Hello, I saw your Raah Skill Passport and I'm interested in your ${craft} work.`;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
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
  const generatePassport = useAction(api.actions.generateArtisanPassport);

  const [pageUrl, setPageUrl] = useState("");
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [identityModalOpen, setIdentityModalOpen] = useState(false);
  const [identityInput, setIdentityInput] = useState("");
  const [storedIdentity, setStoredIdentity] = useState<string | null>(null);
  const [verifySucceeded, setVerifySucceeded] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [bioBusy, setBioBusy] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);

  useEffect(() => {
    setPageUrl(
      typeof window !== "undefined" ? window.location.href.split("#")[0] : "",
    );
  }, []);

  useEffect(() => {
    try {
      const v = localStorage.getItem(RAAH_IDENTITY_KEY)?.trim();
      setStoredIdentity(v && v.length > 0 ? v : null);
    } catch {
      setStoredIdentity(null);
    }
  }, []);

  useEffect(() => {
    setVerifySucceeded(false);
    setVerifyError(null);
  }, [id]);

  const initial = useMemo(() => {
    const c = data?.name?.trim()?.charAt(0);
    return c ? c.toUpperCase() : "—";
  }, [data?.name]);

  const locationLine = data?.region?.trim() || "Srinagar, Kashmir";

  const whatsappHref = useMemo(() => {
    if (!data?.phone) return null;
    return buildWhatsAppHref(data.phone, data.craft);
  }, [data?.phone, data?.craft]);

  const runAttestWithIdentity = useCallback(
    async (voterIdentity: string) => {
      setVerifyBusy(true);
      setVerifyError(null);
      try {
        await addAttestation({ artisanId: id, voterIdentity });
        setVerifySucceeded(true);
      } catch (e) {
        setVerifySucceeded(false);
        setVerifyError(
          e instanceof Error ? e.message : "Verification could not be recorded.",
        );
      } finally {
        setVerifyBusy(false);
      }
    },
    [addAttestation, id],
  );

  const handleVerifyClick = useCallback(() => {
    setVerifyError(null);
    let existing: string | null = null;
    try {
      existing = localStorage.getItem(RAAH_IDENTITY_KEY)?.trim() ?? "";
      if (!existing) existing = storedIdentity?.trim() ?? "";
    } catch {
      existing = storedIdentity?.trim() ?? "";
    }
    if (existing && existing.length > 0) {
      void runAttestWithIdentity(existing);
      return;
    }
    setIdentityInput("");
    setIdentityModalOpen(true);
  }, [runAttestWithIdentity, storedIdentity]);

  const handleIdentityModalSubmit = useCallback(() => {
    if (verifyBusy) return;
    const raw = identityInput.trim();
    if (!raw) {
      setVerifyError("Enter a phone number or email to join the Raah network.");
      return;
    }
    try {
      localStorage.setItem(RAAH_IDENTITY_KEY, raw);
    } catch {
      setVerifyError("Could not save your identity in this browser.");
      return;
    }
    setStoredIdentity(raw);
    setIdentityModalOpen(false);
    void runAttestWithIdentity(raw);
  }, [identityInput, runAttestWithIdentity, verifyBusy]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleRegenerateBio = useCallback(async () => {
    setBioError(null);
    setBioBusy(true);
    try {
      await generatePassport({ artisanId: id });
    } catch (e) {
      setBioError(
        e instanceof Error ? e.message : "Could not generate your heritage bio.",
      );
    } finally {
      setBioBusy(false);
    }
  }, [generatePassport, id]);

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
                <div className="mt-2 space-y-3">
                  <div className="flex gap-3 rounded-xl border border-[#D4AF37]/25 bg-white/40 px-3 py-3 sm:px-4">
                    <div
                      className="mt-0.5 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[#2D1B08]/12 border-t-[#D4AF37]"
                      style={{ animationDuration: "0.85s" }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug text-[#2D1B08]/85">
                        Preparing your heritage bio…
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-[#2D1B08]/55">
                        Your story is already saved. Raah is adding cultural
                        context and AI wording—usually under a minute. This
                        section updates automatically. If it stays empty, use
                        the button below and confirm{" "}
                        <span className="whitespace-nowrap font-medium">
                          GEMINI_API_KEY
                        </span>{" "}
                        is set in Convex.
                      </p>
                    </div>
                  </div>
                  {bioError && (
                    <p className="text-xs leading-relaxed text-[#2D1B08]/80 rounded-lg border border-red-200/80 bg-red-50/90 px-3 py-2">
                      {bioError}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleRegenerateBio()}
                    disabled={bioBusy}
                    className="no-print min-h-10 w-full rounded-lg border border-[#2D1B08]/20 bg-white/60 px-4 text-xs font-semibold text-[#2D1B08] transition-colors hover:bg-white/90 disabled:opacity-50 sm:text-sm"
                  >
                    {bioBusy ? "Working…" : "Run biography again"}
                  </button>
                </div>
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-[#2D1B08]/45">
                    Peer attestations
                  </p>
                  <p className="mt-1 font-serif text-3xl tabular-nums text-[#2D1B08]">
                    {data.attestation_count}
                  </p>
                </div>
                <div className="no-print flex min-w-0 flex-col items-stretch gap-2 sm:max-w-[11rem] sm:items-end">
                  <button
                    type="button"
                    onClick={() => void handleVerifyClick()}
                    disabled={verifyBusy}
                    className="min-h-11 w-full shrink-0 rounded-xl border border-[#2D1B08] bg-[#2D1B08] px-4 py-2.5 text-center text-xs font-semibold leading-tight text-[#F5F5F0] transition-opacity hover:opacity-90 disabled:opacity-50 sm:text-sm"
                  >
                    {verifyBusy ? "Recording…" : "Verify this Artisan's Skill"}
                  </button>
                  {verifySucceeded ? (
                    <p className="flex items-center justify-end gap-1.5 text-right text-[0.7rem] font-semibold text-[#D4AF37]">
                      <svg
                        className="h-4 w-4 shrink-0 text-[#D4AF37]"
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden
                      >
                        <path
                          d="M5 10.5 8.5 14 15 7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Identity verified — welcome to the Raah network
                    </p>
                  ) : null}
                  {verifyError ? (
                    <p className="text-right text-[0.65rem] leading-snug text-red-800/90">
                      {verifyError}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>

            {whatsappHref ? (
              <section className="no-print mt-6 rounded-xl border-2 border-[#D4AF37] bg-gradient-to-b from-[#F5F5F0] to-white/40 px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-[#2D1B08]/45">
                  Contact bridge
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#2D1B08]/75">
                  Reach this maker directly on WhatsApp — no middlemen, same
                  trust layer as the passport.
                </p>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#D4AF37] bg-[#2D1B08] px-4 py-3.5 text-sm font-semibold text-[#F5F5F0] shadow-[0_6px_20px_-8px_rgba(212,175,55,0.55)] transition-opacity hover:opacity-90"
                >
                  <WhatsAppGlyph className="h-5 w-5 text-[#25D366]" />
                  Contact on WhatsApp
                </a>
                <p className="mt-3 text-center">
                  <span className="inline-flex items-center rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1 text-[0.65rem] font-medium uppercase tracking-wide text-[#2D1B08]/70">
                    Response time:{" "}
                    <span className="tabular-nums">Usually {"<"} 24h</span>
                  </span>
                </p>
              </section>
            ) : null}

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

      {identityModalOpen ? (
        <div
          className="no-print fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="raah-identity-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-[#2D1B08]/50 backdrop-blur-[2px]"
            aria-label="Close dialog"
            disabled={verifyBusy}
            onClick={() => setIdentityModalOpen(false)}
          />
          <div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border-2 border-[#D4AF37] bg-[#F5F5F0] p-6 shadow-[0_24px_60px_-20px_rgba(45,27,8,0.35)]"
            style={HERITAGE_PATTERN_STYLE}
          >
            <div className="relative">
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-[#D4AF37]">
                Raah Identity Protocol
              </p>
              <h2
                id="raah-identity-title"
                className="mt-2 font-serif text-2xl leading-tight text-[#2D1B08]"
              >
                Join the Raah network
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#2D1B08]/75">
                To verify this legacy, please identify yourself. Your signal
                joins a global movement of peer-trusted heritage.
              </p>
              <label className="mt-5 block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2D1B08]/50">
                  Phone or email
                </span>
                <input
                  type="text"
                  value={identityInput}
                  onChange={(e) => setIdentityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleIdentityModalSubmit();
                    }
                  }}
                  className="mt-2 w-full rounded-xl border border-[#2D1B08]/12 bg-white/90 px-4 py-3 text-sm text-[#2D1B08] placeholder:text-[#2D1B08]/35 focus:border-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/35"
                  placeholder="+91 … or name@email.com"
                  autoComplete="username"
                  disabled={verifyBusy}
                />
              </label>
              {verifyError ? (
                <p className="mt-3 text-xs leading-relaxed text-red-800/90">
                  {verifyError}
                </p>
              ) : null}
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={verifyBusy}
                  onClick={() => {
                    setVerifyError(null);
                    setIdentityModalOpen(false);
                  }}
                  className="min-h-11 rounded-xl border border-[#2D1B08]/18 bg-transparent px-5 text-sm font-medium text-[#2D1B08]/80 transition-colors hover:bg-[#2D1B08]/5 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={verifyBusy}
                  onClick={() => void handleIdentityModalSubmit()}
                  className="min-h-11 rounded-xl border-2 border-[#D4AF37] bg-[#2D1B08] px-5 text-sm font-semibold text-[#F5F5F0] shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {verifyBusy ? "Joining…" : "Verify & join"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
