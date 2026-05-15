import { AuthMarketingPanel } from "@/components/auth/AuthMarketingPanel";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-scheme min-h-dvh min-h-screen bg-auth-bg text-slate-100">
      <div className="grid min-h-screen lg:grid-cols-[1.2fr_0.8fr]">
        <AuthMarketingPanel />
        <div className="relative flex min-h-[50vh] flex-col items-center justify-center bg-auth-bg px-6 py-10 sm:px-10 lg:min-h-screen lg:px-10 lg:py-12 xl:px-12">
          <div className="relative z-10 mx-auto w-full max-w-md">{children}</div>
        </div>
      </div>
      <div className="bg-auth-bg px-6 py-6 lg:hidden">
        <p className="text-center text-xs font-semibold text-accent">Sentinella</p>
        <p className="mt-1 text-center text-[11px] text-slate-500">Monitoreo de tranques de relaves</p>
      </div>
    </div>
  );
}
