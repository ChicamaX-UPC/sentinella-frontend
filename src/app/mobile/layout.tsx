import type { Metadata } from "next";
import { MobileShell } from "@/components/mobile/MobileShell";

export const metadata: Metadata = {
  title: "Sentinella — Campo",
  description: "PWA operario",
};

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return <MobileShell>{children}</MobileShell>;
}
