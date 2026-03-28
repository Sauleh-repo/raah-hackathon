/**
 * Equirectangular projection to SVG coords (viewBox 1000×500).
 * x = (lon + 180) / 360 * 1000, y = (90 - lat) / 180 * 500
 */
const MARKERS = {
  srinagar: { x: 708, y: 155 },
  oaxaca: { x: 231, y: 203 },
  kigali: { x: 584, y: 255 },
  lagos: { x: 509, y: 232 },
} as const;

function MapPulse({
  cx,
  cy,
  variant,
  animationDelaySec = 0,
}: {
  cx: number;
  cy: number;
  variant: "nodeZero" | "future";
  animationDelaySec?: number;
}) {
  const isPrimary = variant === "nodeZero";
  const coreR = isPrimary ? 5.5 : 3.5;
  const ringR = isPrimary ? 14 : 9;
  const delayStyle =
    animationDelaySec > 0
      ? ({ animationDelay: `${animationDelaySec}s` } as const)
      : undefined;
  const ringClass = isPrimary
    ? "expansion-svg-pulse fill-heritage-gold/30 animate-expansion-pulse-gold"
    : "expansion-svg-pulse fill-heritage-walnut/18 animate-expansion-pulse-dim";
  const coreClass = isPrimary
    ? "fill-heritage-gold"
    : "fill-heritage-walnut/42";

  return (
    <g transform={`translate(${cx} ${cy})`} aria-hidden>
      <circle r={ringR} className={ringClass} style={delayStyle} />
      <circle r={coreR} className={coreClass} />
      {isPrimary && (
        <circle
          r={20}
          className="expansion-svg-pulse fill-none stroke-heritage-gold/40 animate-expansion-pulse-ring"
          strokeWidth={0.9}
          style={delayStyle}
        />
      )}
    </g>
  );
}

export function GlobalExpansion() {
  return (
    <section
      aria-labelledby="global-expansion-heading"
      className="border-t border-heritage-walnut/10 bg-background"
    >
      <div className="mx-auto max-w-3xl px-4 py-16 sm:py-20 sm:px-8">
        <h2
          id="global-expansion-heading"
          className="text-center font-serif text-2xl tracking-tight text-heritage-walnut sm:text-3xl"
        >
          Global Expansion
        </h2>

        <p className="sr-only">
          Stylized world map: a bright gold pulse marks Srinagar, Kashmir (Node
          Zero); softer pulses mark Oaxaca, Lagos, and Kigali.
        </p>

        <div className="relative mx-auto mt-10 max-w-2xl">
          <div
            className="rounded-2xl border border-heritage-gold/20 bg-heritage-cream/50 p-4 shadow-sm sm:p-6"
            style={{
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.5), 0 8px 32px -8px rgba(45,27,8,0.08)",
            }}
          >
            <svg
              viewBox="0 0 1000 500"
              className="h-auto w-full text-heritage-walnut"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden
            >
              <defs>
                <linearGradient
                  id="expansion-ocean"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#f5f5f0" />
                  <stop offset="100%" stopColor="#ebe8df" />
                </linearGradient>
                <filter
                  id="expansion-soft-glow"
                  x="-50%"
                  y="-50%"
                  width="200%"
                  height="200%"
                >
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <rect
                width="1000"
                height="500"
                rx="12"
                fill="url(#expansion-ocean)"
              />

              {/* Graticule — fine, elegant */}
              <g
                stroke="currentColor"
                strokeWidth="0.35"
                className="text-heritage-walnut/[0.11]"
                fill="none"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                  <line
                    key={`v-${i}`}
                    x1={100 + i * 80}
                    y1="20"
                    x2={100 + i * 80}
                    y2="480"
                  />
                ))}
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <line
                    key={`h-${i}`}
                    x1="40"
                    y1={60 + i * 80}
                    x2="960"
                    y2={60 + i * 80}
                  />
                ))}
              </g>

              {/* Stylized landmasses — single elegant silhouette */}
              <g
                className="text-heritage-walnut"
                fill="currentColor"
                fillOpacity={0.07}
                stroke="currentColor"
                strokeOpacity={0.14}
                strokeWidth={0.55}
              >
                <path d="M128,118c42-32 118-28 188-18s102 48 88 102-62 72-132 68-118-38-144-152zm198-18c58-12 108 2 148 38s48 92 8 128-108 28-158-8-52-98 2-158zm128,8c72-18 158-8 228 22s108 88 62 158-138 78-218 52-132-98-72-232zm-18,168c38-5 72 12 68 62s-48 78-92 72-68-48-58-88 32-42 82-46zm388-155c52-8 98 22 92 72s-42 78-98 72-88-32-82-82 38-58 88-62zm28,158c45-2 78 32 72 72s-38 62-82 58-68-38-62-72 27-56 72-58z" />
              </g>

              <g filter="url(#expansion-soft-glow)">
                <MapPulse
                  cx={MARKERS.oaxaca.x}
                  cy={MARKERS.oaxaca.y}
                  variant="future"
                  animationDelaySec={0.2}
                />
                <MapPulse
                  cx={MARKERS.lagos.x}
                  cy={MARKERS.lagos.y}
                  variant="future"
                  animationDelaySec={0.55}
                />
                <MapPulse
                  cx={MARKERS.kigali.x}
                  cy={MARKERS.kigali.y}
                  variant="future"
                  animationDelaySec={0.9}
                />
                <MapPulse
                  cx={MARKERS.srinagar.x}
                  cy={MARKERS.srinagar.y}
                  variant="nodeZero"
                />
              </g>
            </svg>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-base leading-relaxed text-heritage-walnut/78 sm:text-lg">
          Raah is expanding. Starting from Node Zero, we are building the
          infrastructure for the 1.5 billion artisans of the Global South.
        </p>
      </div>
    </section>
  );
}
