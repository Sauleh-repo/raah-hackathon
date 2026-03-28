import { SeedAdminClient } from "./SeedAdminClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seed demo data · Raah",
  robots: "noindex, nofollow",
};

export default function AdminSeedPage() {
  return (
    <div className="min-h-screen bg-background">
      <SeedAdminClient />
    </div>
  );
}
