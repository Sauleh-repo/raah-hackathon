import { PassportClient } from "./PassportClient";

export default async function PassportPage({
  params,
}: {
  params: Promise<{ artisanId: string }>;
}) {
  const { artisanId } = await params;
  return <PassportClient artisanId={artisanId} />;
}
