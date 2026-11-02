import { redirect } from "next/navigation";

export default async function RootPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  // Password-reset emails land on the Site URL (this page) with ?code= when
  // /auth/reset isn't in Supabase's redirect allow list — pass it along.
  const { code } = await searchParams;
  if (code) redirect(`/auth/reset?code=${encodeURIComponent(code)}`);

  redirect("/dashboard");
}
