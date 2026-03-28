import { DiscoverClient } from "@/components/DiscoverClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Discover · Raah",
  description:
    "Neural search across Raah artisans — Global South heritage crafts, market pulse, and live peer attestations.",
};

export default function DiscoverPage() {
  return <DiscoverClient />;
}
