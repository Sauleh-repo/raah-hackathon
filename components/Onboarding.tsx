"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  CRAFT_CATALOG_COUNT,
  CRAFT_OPTIONS,
  type CraftOption,
} from "@/lib/crafts";

/** Voice alone is often empty or noisy; typed text is required for a reliable passport. */
const MIN_STORY_LENGTH = 25;

/** Minimum digits (after stripping non-digits) for a plausible WhatsApp number. */
const MIN_PHONE_DIGITS = 8;

function PhoneFieldIcon({ className }: { className?: string }) {
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
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

type Craft = CraftOption | "";

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.webkitSpeechRecognition ?? window.SpeechRecognition ?? null;
}

const SPEECH_LANG_OPTIONS = [
  { value: "en-IN", label: "English (India)" },
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "hi-IN", label: "Hindi (India)" },
  { value: "ur-PK", label: "Urdu (Pakistan)" },
] as const;

function speechErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
      return "Microphone access was blocked. Use the lock or mic icon in the address bar to allow the microphone, or type your story below.";
    case "no-speech":
      return "No speech was detected. Move closer to the mic, reduce noise, pause briefly between sentences, or type below.";
    case "audio-capture":
      return "No microphone is available or it is in use. Check Windows Sound settings—or type your story below.";
    case "network":
      return "Voice recognition needs the internet (your browser sends audio to a speech service). Check your connection or type below.";
    case "aborted":
      return "Listening stopped. Try Record again or type your story.";
    default:
      return "Voice input had a problem. Typing in the box above is enough—Raah does not require voice.";
  }
}

type SubmissionPhase =
  | "idle"
  | "saving"
  | "passport_error"
  | "error";

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [craft, setCraft] = useState<Craft>("");
  const [transcript, setTranscript] = useState("");
  const [phone, setPhone] = useState("");
  const [listening, setListening] = useState(false);
  const [speechLang, setSpeechLang] =
    useState<(typeof SPEECH_LANG_OPTIONS)[number]["value"]>("en-IN");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [submissionPhase, setSubmissionPhase] =
    useState<SubmissionPhase>("idle");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [pendingArtisanId, setPendingArtisanId] =
    useState<Id<"artisans"> | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const router = useRouter();

  const createArtisan = useMutation(api.artisans.createArtisan);
  const updateVoiceTranscript = useMutation(
    api.artisans.updateArtisanVoiceTranscript,
  );
  const generatePassport = useAction(api.actions.generateArtisanPassport);

  const stopRecognition = useCallback(() => {
    const r = recognitionRef.current;
    if (r) {
      try {
        r.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  useEffect(() => {
    return () => stopRecognition();
  }, [stopRecognition]);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setSpeechError(
        "Voice input is not supported in this browser. You can type your story below.",
      );
      return;
    }
    setSpeechError(null);
    stopRecognition();

    const recognition = new Ctor();
    recognition.continuous = true;
    // Final results only avoids duplicated/garbled lines while the mic is open.
    recognition.interimResults = false;
    recognition.lang = speechLang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let piece = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const row = event.results[i]!;
        if (!row.isFinal) continue;
        piece += row[0]!.transcript;
      }
      if (piece) {
        setTranscript((prev) =>
          prev ? `${prev.trimEnd()} ${piece.trim()}` : piece.trim(),
        );
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "aborted") {
        setSpeechError(speechErrorMessage(event.error));
      }
      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setSpeechError("Could not start the microphone. Check permissions.");
      recognitionRef.current = null;
      setListening(false);
    }
  }, [stopRecognition, speechLang]);

  const toggleRecord = () => {
    if (listening) stopRecognition();
    else startListening();
  };

  const canAdvanceStep0 = name.trim().length > 0 && region.trim().length > 0;
  const canAdvanceStep1 = craft !== "";
  const storyReady = transcript.trim().length >= MIN_STORY_LENGTH;
  const phoneDigits = phone.replace(/\D/g, "").length;
  const canAdvanceStep3 =
    phone.trim().length > 0 && phoneDigits >= MIN_PHONE_DIGITS;

  const handleFinish = async () => {
    stopRecognition();
    setSubmissionError(null);
    setSubmissionPhase("saving");
    let id: Id<"artisans"> | null = pendingArtisanId;
    try {
      if (!id) {
        id = await createArtisan({
          name: name.trim(),
          craft: craft.trim(),
          voiceTranscript: transcript.trim(),
          region: region.trim(),
          phone: phone.trim(),
        });
        setPendingArtisanId(id);
      } else {
        await updateVoiceTranscript({
          artisanId: id,
          voiceTranscript: transcript.trim(),
        });
      }
      void generatePassport({ artisanId: id }).catch(() => {
        /* Errors surfaced on passport page via retry; avoids blocking navigation. */
      });
      setSubmissionPhase("idle");
      router.push(`/passport/${id}`);
    } catch (e) {
      setSubmissionError(
        e instanceof Error ? e.message : "Something went wrong. Please try again.",
      );
      setSubmissionPhase(id ? "passport_error" : "error");
    }
  };

  const handleRetryPassport = async () => {
    if (!pendingArtisanId) return;
    setSubmissionError(null);
    setSubmissionPhase("saving");
    try {
      await updateVoiceTranscript({
        artisanId: pendingArtisanId,
        voiceTranscript: transcript.trim(),
      });
      void generatePassport({ artisanId: pendingArtisanId }).catch(() => {});
      setSubmissionPhase("idle");
      router.push(`/passport/${pendingArtisanId}`);
    } catch (e) {
      setSubmissionError(
        e instanceof Error ? e.message : "Something went wrong. Please try again.",
      );
      setSubmissionPhase("passport_error");
    }
  };

  if (submissionPhase === "passport_error") {
    return (
      <div className="w-full max-w-lg mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="relative overflow-hidden rounded-2xl border border-heritage-walnut/10 bg-gradient-to-b from-white/95 to-heritage-cream/90 px-6 py-12 sm:px-10 sm:py-14 text-center shadow-md">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            aria-hidden
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 0%, var(--accent), transparent 55%)",
            }}
          />
          <h2 className="relative font-serif text-2xl text-heritage-walnut sm:text-3xl">
            We saved your story
          </h2>
          <p className="relative mx-auto mt-4 max-w-md text-base leading-relaxed text-heritage-walnut/75">
            Your heritage passport could not be generated yet. Check Convex
            env keys{" "}
            <span className="whitespace-nowrap font-medium">
              GEMINI_API_KEY
            </span>{" "}
            (and optionally{" "}
            <span className="whitespace-nowrap font-medium">EXA_API_KEY</span>)
            , then try again.
          </p>
          {submissionError && (
            <p className="relative mx-auto mt-4 max-w-lg rounded-xl border border-red-200/80 bg-red-50/90 px-4 py-3 text-left text-sm text-heritage-walnut">
              {submissionError}
            </p>
          )}
          <div className="relative mt-8 flex w-full max-w-xs flex-col gap-3 sm:max-w-sm">
            <button
              type="button"
              onClick={() => void handleRetryPassport()}
              className="min-h-14 w-full rounded-xl bg-heritage-walnut px-8 text-base font-medium text-heritage-cream"
            >
              Retry passport
            </button>
            <button
              type="button"
              onClick={() => {
                setSubmissionPhase("idle");
                setSubmissionError(null);
                setStep(2);
              }}
              className="min-h-14 w-full rounded-xl border border-heritage-walnut/25 bg-white/80 px-8 text-base font-medium text-heritage-walnut"
            >
              Edit story, then try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="relative rounded-2xl border border-heritage-walnut/10 bg-white/60 backdrop-blur-sm shadow-sm px-5 py-8 sm:px-8 sm:py-10">
        <p className="font-serif text-sm tracking-wide text-heritage-walnut/70 mb-1">
          Your path
        </p>
        <div
          className="flex gap-2 mb-8"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={4}
          aria-label={`Step ${step + 1} of 4`}
        >
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? "bg-heritage-gold" : "bg-heritage-walnut/15"
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-6">
            <h2 className="font-serif text-2xl sm:text-3xl text-heritage-walnut leading-tight">
              Who are you, and where do you create?
            </h2>
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-heritage-walnut/80 mb-2 block">
                  Your name
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="w-full min-h-12 rounded-xl border border-heritage-walnut/20 bg-heritage-cream/80 px-4 text-base text-heritage-walnut placeholder:text-heritage-walnut/40 focus:outline-none focus:ring-2 focus:ring-heritage-gold/60 focus:border-heritage-gold"
                  placeholder="e.g. Amina"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-heritage-walnut/80 mb-2 block">
                  Region
                </span>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full min-h-12 rounded-xl border border-heritage-walnut/20 bg-heritage-cream/80 px-4 text-base text-heritage-walnut placeholder:text-heritage-walnut/40 focus:outline-none focus:ring-2 focus:ring-heritage-gold/60 focus:border-heritage-gold"
                  placeholder="e.g. Srinagar, Kashmir"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={!canAdvanceStep0}
              onClick={() => setStep(1)}
              className="w-full min-h-14 rounded-xl bg-heritage-walnut text-heritage-cream text-base font-medium disabled:opacity-40 disabled:pointer-events-none active:scale-[0.99] transition-transform"
            >
              Continue
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="font-serif text-2xl sm:text-3xl text-heritage-walnut leading-tight">
              What is your craft?
            </h2>
            <p className="text-sm leading-relaxed text-heritage-walnut/65">
              This menu should show{" "}
              <span className="font-medium tabular-nums text-heritage-walnut/80">
                {CRAFT_CATALOG_COUNT}
              </span>{" "}
              options (A–Z). That number on your screen means this build has the
              full catalog.
            </p>
            <label className="block">
              <span className="text-sm font-medium text-heritage-walnut/80 mb-2 block">
                Craft category
              </span>
              <select
                value={craft}
                onChange={(e) => setCraft(e.target.value as Craft)}
                className="w-full min-h-14 rounded-xl border border-heritage-walnut/20 bg-heritage-cream/80 px-4 text-base text-heritage-walnut focus:outline-none focus:ring-2 focus:ring-heritage-gold/60 focus:border-heritage-gold appearance-none bg-[length:1.25rem] bg-[right_1rem_center] bg-no-repeat pr-12"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%232D1B08'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                }}
              >
                <option value="">Choose your craft</option>
                {CRAFT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="w-full min-h-14 rounded-xl border border-heritage-walnut/25 text-heritage-walnut font-medium"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!canAdvanceStep1}
                onClick={() => setStep(2)}
                className="w-full min-h-14 rounded-xl bg-heritage-walnut text-heritage-cream font-medium disabled:opacity-40 disabled:pointer-events-none"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="font-serif text-2xl sm:text-3xl text-heritage-walnut leading-tight">
              Tell your story
            </h2>
            <p className="text-heritage-walnut/75 text-base leading-relaxed">
              <span className="font-medium text-heritage-walnut/85">
                Type here first
              </span>{" "}
              if the room is noisy, the mic is unclear, or voice is hard to use.
              You can still use Record below to add more. The passport only needs
              your words in the box—not speakers or playback.
            </p>

            <label className="block">
              <span className="text-sm font-medium text-heritage-walnut/80 mb-2 block">
                Your story (type here — main way to enter text)
              </span>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-heritage-walnut/20 bg-white px-4 py-3 text-base text-heritage-walnut placeholder:text-heritage-walnut/40 focus:outline-none focus:ring-2 focus:ring-heritage-gold/60 focus:border-heritage-gold resize-y min-h-[10rem]"
                placeholder="Write a few sentences: your craft, how you learned it, what you make…"
              />
              <p
                className={`mt-2 text-sm ${storyReady ? "text-heritage-walnut/55" : "text-heritage-walnut/80"}`}
              >
                {storyReady
                  ? "Ready when you are."
                  : `Add at least ${MIN_STORY_LENGTH} characters (about one short sentence) to generate your passport.`}
              </p>
            </label>

            <div
              className="rounded-xl border border-heritage-walnut/15 bg-heritage-cream/50 px-4 py-5 sm:px-5"
              aria-labelledby="optional-voice-heading"
            >
              <h3
                id="optional-voice-heading"
                className="text-sm font-semibold text-heritage-walnut/90"
              >
                Optional: speak your story
              </h3>
              <p className="mt-1 text-sm text-heritage-walnut/65">
                Choose the language you are speaking, then tap Record. Pause
                briefly between sentences so each line is captured clearly.
              </p>
              <label className="mt-4 block">
                <span className="text-sm font-medium text-heritage-walnut/80 mb-2 block">
                  Speech language
                </span>
                <select
                  value={speechLang}
                  onChange={(e) =>
                    setSpeechLang(
                      e.target.value as (typeof SPEECH_LANG_OPTIONS)[number]["value"],
                    )
                  }
                  disabled={listening}
                  className="w-full min-h-12 rounded-xl border border-heritage-walnut/20 bg-white px-4 text-base text-heritage-walnut focus:outline-none focus:ring-2 focus:ring-heritage-gold/60 focus:border-heritage-gold disabled:opacity-50"
                >
                  {SPEECH_LANG_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-5 flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={toggleRecord}
                  aria-pressed={listening}
                  aria-label={
                    listening ? "Stop recording your story" : "Record your story"
                  }
                  className={`relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-full border-2 border-heritage-walnut/20 bg-heritage-cream text-heritage-walnut shadow-md transition-colors ${
                    listening
                      ? "bg-heritage-walnut text-heritage-cream border-heritage-walnut animate-pulse-record"
                      : "hover:border-heritage-gold/50"
                  }`}
                >
                  <span className="font-serif text-sm sm:text-base font-medium text-center px-2 leading-snug">
                    {listening ? "Stop" : "Record"}
                  </span>
                </button>
                <p className="text-sm text-heritage-walnut/60 text-center max-w-sm">
                  {listening
                    ? "Listening… speak clearly. Words will appear in the box above after each pause."
                    : "Tap Record, speak, then Stop when finished. Text is added above."}
                </p>
              </div>
            </div>

            {speechError && (
              <p className="text-sm text-heritage-walnut/80 bg-heritage-gold/15 border border-heritage-gold/30 rounded-xl px-4 py-3">
                {speechError}
              </p>
            )}

            {submissionError && (
              <p className="text-sm text-heritage-walnut bg-red-50 border border-red-200/80 rounded-xl px-4 py-3">
                {submissionError}
              </p>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setSubmissionPhase("idle");
                  setSubmissionError(null);
                }}
                disabled={submissionPhase === "saving"}
                className="w-full min-h-14 rounded-xl border border-heritage-walnut/25 text-heritage-walnut font-medium disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                disabled={submissionPhase === "saving" || !storyReady}
                onClick={() => setStep(3)}
                className="w-full min-h-14 rounded-xl bg-heritage-walnut text-heritage-cream font-semibold disabled:opacity-60"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="font-serif text-2xl sm:text-3xl text-heritage-walnut leading-tight">
              How can seekers reach you?
            </h2>
            <p className="text-sm leading-relaxed text-heritage-walnut/70">
              Add a WhatsApp number with country code so collectors and partners
              can message you directly from your Skill Passport.
            </p>
            <label className="block">
              <span className="text-sm font-medium text-heritage-walnut/80 mb-2 flex items-center gap-2">
                <PhoneFieldIcon className="h-4 w-4 text-heritage-gold shrink-0" />
                WhatsApp number
              </span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full min-h-12 rounded-xl border border-heritage-walnut/20 bg-heritage-cream/80 pl-4 pr-4 text-base text-heritage-walnut placeholder:text-heritage-walnut/40 focus:outline-none focus:ring-2 focus:ring-heritage-gold/60 focus:border-heritage-gold"
                placeholder="e.g. +52 951 123 4567"
              />
              <p
                className={`mt-2 text-sm ${canAdvanceStep3 ? "text-heritage-walnut/55" : "text-heritage-walnut/75"}`}
              >
                {canAdvanceStep3
                  ? "Seekers will see a WhatsApp button on your passport."
                  : `Include country code — at least ${MIN_PHONE_DIGITS} digits total.`}
              </p>
            </label>
            {submissionError && (
              <p className="text-sm text-heritage-walnut bg-red-50 border border-red-200/80 rounded-xl px-4 py-3">
                {submissionError}
              </p>
            )}
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep(2);
                  setSubmissionPhase("idle");
                  setSubmissionError(null);
                }}
                disabled={submissionPhase === "saving"}
                className="w-full min-h-14 rounded-xl border border-heritage-walnut/25 text-heritage-walnut font-medium disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleFinish()}
                disabled={
                  submissionPhase === "saving" || !storyReady || !canAdvanceStep3
                }
                className="w-full min-h-14 rounded-xl bg-heritage-gold text-heritage-walnut font-semibold disabled:opacity-60"
              >
                {submissionPhase === "saving" ? "Saving…" : "Finish"}
              </button>
            </div>
          </div>
        )}

        {submissionPhase === "saving" && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-heritage-cream/85 backdrop-blur-[2px]"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-heritage-walnut/15 border-t-heritage-gold"
              style={{ animationDuration: "0.9s" }}
            />
            <p className="mt-4 text-sm font-medium text-heritage-walnut/80">
              Saving to Raah…
            </p>
            <p className="mt-1 max-w-[14rem] text-center text-xs text-heritage-walnut/55">
              Only takes a moment. You will open your passport next; the bio
              appears there when AI finishes.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
