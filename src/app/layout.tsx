import type { Metadata } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono, Geist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { THEME_INIT_SCRIPT } from "@/stores/useThemeStore";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Sentinella", template: "%s | Sentinella" },
  description: "Gemelo digital y operaciones para tranques de relaves — ChicamaX",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={cn("dark h-full", "antialiased", inter.variable, jetbrainsMono.variable, "font-sans", geist.variable)}
      suppressHydrationWarning
    >
      <head>
        <Script id="sentinella-theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
