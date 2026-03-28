# Raah

AI-powered trust and discovery infrastructure for craft economies in the Global South.

## Overview

Kashmiri artisans produce world-class handicrafts — Pashmina, Khatamband, Sozni embroidery — yet earn a fraction of their market value because they have no digital identity, no price intelligence, and no direct channel to global buyers. Raah fixes that.

The platform has three components:

**Skill Passport:**  Artisans answer guided, low-literacy-friendly questions about their craft and lineage. GPT-4o synthesizes their answers into a buyer-facing heritage biography with a shareable QR code. Other verified artisans attest to each other's skills via a real-time peer verification system backed by Convex.

**Price Signal:**  Apify scrapes live pricing data from Etsy and global marketplaces by craft category. Artisans see what similar work is selling for internationally before they negotiate.

**Semantic Discovery:**  Buyers search by meaning, not keywords. Exa's neural search connects a buyer looking for "authentic 14th-century floral motifs" directly to the right artisan, bypassing the middlemen who typically capture 90% of the value.

## Tech Stack

| Tool | Role |
|---|---|
| Next.js | Frontend framework |
| Convex | Real-time database, peer attestations |
| OpenAI (GPT-4o) | Heritage bio generation, buyer context synthesis |
| Exa | Neural search, historical craft verification |
| Apify | Marketplace price scraping |
| Vercel | Deployment |

## Getting Started

### Prerequisites

- Node.js 18+
- A Convex account
- API keys for OpenAI, Exa, and Apify

### Install

```bash
git clone https://github.com/Sauleh-repo/raah-hackathon
cd raah-hackathon
npm install
```

### Configure

Copy the environment template and fill in your keys:

```bash
cp .env.example .env.local
```

Required variables:

```
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=
OPENAI_API_KEY=
EXA_API_KEY=
APIFY_API_TOKEN=
```

### Run

```bash
# Start the Convex backend
npx convex dev

# In a separate terminal, start the Next.js frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for production

```bash
npm run build
npm start
```

## Live Demo

[raah-hackathon.vercel.app](https://raah-hackathon.vercel.app)

