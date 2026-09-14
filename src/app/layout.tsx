import type { Metadata, Viewport } from "next";
import { Geist, Manrope, Open_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Orbibox, A web que se adapta a quem entra",
  description:
    "One link. Infinite experiences. Soft Intelligence para transformar seu catálogo em uma experiência adaptativa.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Adicionado à tela de início, abre em tela cheia (sem barra do Safari)
  // e com o nome curto embaixo do ícone.
  appleWebApp: {
    capable: true,
    title: "Orbibox",
    statusBarStyle: "default",
  },
};

// Impede o zoom por toque/foco no mobile, comportamento de app nativo.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#F7F7F4",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${manrope.variable} ${openSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background-main text-on-background font-body-md">
        {children}
      </body>
    </html>
  );
}
