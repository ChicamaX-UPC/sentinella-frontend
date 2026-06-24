import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Sentinella · Monitoreo de relaves para minería",
  description:
    "Plataforma IoT para empresas mineras: alertas en tiempo real, gemelo digital, reportes normativos y operación en campo.",
};

export default function HomePage() {
  return <LandingPage />;
}
