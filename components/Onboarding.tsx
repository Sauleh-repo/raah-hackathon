"use client";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const CRAFT_OPTIONS = [
  "Kani Weaving",
  "Wood Carving",
  "Papier Mâché",
] as const;

type Craft = (typeof CRAFT_OPTIONS)[number] | "";

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.webkitSpeechRecognition ?? window.SpeechRecognition ?? null;
}

type SubmissionPhase =
  | "idle"
  | "saving"
  | "generating"
  | "passport_error"
  | "error";

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [craft, setCraft] = useState<Craft>("");
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [submissionPhase, setSubmissionPhase] =
    useState<SubmissionPhase>("idle");
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [pendingArtisanId, setPendingArtisanId] =
    useState<Id<"artisans"> | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const router = useRouter();

  const createArtisan = useMutation(api.artisans.createArtisan);
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
    recognition.interimResults = true;
    recognition.lang = "en-IN";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let piece = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        piece += event.results[i]![0]!.transcript;
      }
      if (piece) {
        setTranscript((prev) =>
          prev ? `${prev.trimEnd()} ${piece.trim()}` : piece.trim(),
        );
      }
    };

    recognition.onerror = () => {
      setSpeechError("We could not hear you clearly. Try again or type below.");
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
  }, [stopRecognition]);

  const toggleRecord = () => {
    if (listening) stopRecognition();
    else startListening();
  };

  const canAdvanceStep0 = name.trim().length > 0 && region.trim().length > 0;
  const canAdvanceStep1 = craft !== "";

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
        });
        setPendingArtisanId(id);
      }
      setSubmissionPhase("generating");
      await generatePassport({ artisanId: id });
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
    setSubmissionPhase("generating");
    try {
      await generatePassport({ artisanId: pendingArtisanId });
      router.push(`/passport/${pendingArtisanId}`);
    } catch (e) {
      setSubmissionError(
        e instanceof Error ? e.message : "Something went wrong. Please try again.",
      );
      setSubmissionPhase("passport_error");
    }
  };

  if (submissionPhase === "generating") {
    return (
      <div className="w-full max-w-lg mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div
          className="relative overflow-hidden rounded-2xl border border-heritage-walnut/10 bg-gradient-to-b from-white/90 to-heritage-cream/90 px-6 py-14 sm:px-10 sm:py-16 text-center shadow-md"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div
            className="pointer-events-none absolute -left-24 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-heritage-gold/15 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -right-20 bottom-0 h-48 w-48 rounded-full bg-heritage-walnut/5 blur-3xl"
            aria-hidden
          />

          <div className="relative mx-auto mb-10 flex h-24 w-24 items-center justify-center sm:h-28 sm:w-28">
            <div
              className="absolute inset-0 rounded-full border-2 border-heritage-walnut/10"
              aria-hidden
            />
            <div
              className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-heritage-gold border-r-heritage-gold/40"
              style={{ animationDuration: "1.15s" }}
              aria-hidden
            />
            <div
              className="absolute inset-3 rounded-full border border-heritage-gold/25"
              aria-hidden
            />
            <span
              className="font-serif text-2xl text-heritage-gold"
              aria-hidden
            >
              ر
            </span>
          </div>

          <h2 className="font-serif text-2xl leading-tight text-heritage-walnut sm:text-3xl">
            Generating your Heritage Passport…
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-heritage-walnut/70">
            We are shaping your story into a credential you can share with
            pride. This may take a moment.
          </p>
          <div className="mx-auto mt-10 flex justify-center gap-1.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-heritage-gold/80 animate-pulse"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

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
          <button
            type="button"
            onClick={() => void handleRetryPassport()}
            className="relative mt-8 min-h-14 w-full max-w-xs rounded-xl bg-heritage-walnut px-8 text-base font-medium text-heritage-cream"
          >
            Retry passport
          </button>
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
          aria-valuemax={3}
          aria-label={`Step ${step + 1} of 3`}
        >
          {[0, 1, 2].map((i) => (
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
              Speak in your own words. We will use this to honour your work with
              care.
            </p>

            <div className="flex flex-col items-center gap-6 py-4">
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
              <p className="text-sm text-heritage-walnut/60 text-center max-w-xs">
                {listening
                  ? "Listening… speak naturally."
                  : "Tap Record, then share your story."}
              </p>
            </div>

            {speechError && (
              <p className="text-sm text-heritage-walnut/80 bg-heritage-gold/15 border border-heritage-gold/30 rounded-xl px-4 py-3">
                {speechError}
              </p>
            )}

            <label className="block">
              <span className="text-sm font-medium text-heritage-walnut/80 mb-2 block">
                Transcript
              </span>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-heritage-walnut/20 bg-white px-4 py-3 text-base text-heritage-walnut placeholder:text-heritage-walnut/40 focus:outline-none focus:ring-2 focus:ring-heritage-gold/60 focus:border-heritage-gold resize-y min-h-[10rem]"
                placeholder="Your words will appear here. You can also type or edit."
              />
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
                onClick={() => void handleFinish()}
                disabled={submissionPhase === "saving"}
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
              Saving your story…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
