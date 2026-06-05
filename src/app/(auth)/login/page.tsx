import { LoginForm } from "./LoginForm";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function resolveNextRedirect(sp: Record<string, string | string[] | undefined>): string {
  const raw = sp.next;
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v === "string" && v.startsWith("/") && !v.startsWith("//")) {
    return v;
  }
  return "/dashboard";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const sp = await searchParams;
  return <LoginForm redirectAfterLogin={resolveNextRedirect(sp)} />;
}
