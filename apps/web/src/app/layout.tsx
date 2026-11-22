import type { Metadata, Viewport } from "next";
import { Open_Sans, Poppins } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["500", "600", "700"] });
const openSans = Open_Sans({ variable: "--font-open-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Luz de Mãe", template: "%s · Luz de Mãe" },
  description: "Caderneta da gestante digital, com alertas para a UBS.",
  icons: { icon: "/logo.svg" },
};

export const viewport: Viewport = { themeColor: "#FAD0C9" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${openSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="bg-rose-pastel">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex size-11 items-center justify-center rounded-full bg-ink">
                <Image src="/logo.svg" alt="" width={28} height={34} priority />
              </span>
              <span className="font-display text-lg font-semibold">Luz de Mãe</span>
            </Link>
            <nav className="flex gap-4 text-sm font-semibold">
              <Link href="/" className="hover:underline">
                Trocar perfil
              </Link>
              <Link href="/indicadores" className="hover:underline">
                Indicadores
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
        <footer className="px-4 py-6 text-center text-xs text-ink-soft">
          Protótipo do FMU Tech Inovação 2026.2 · dados de gestantes fictícios · indicadores do DATASUS
        </footer>
      </body>
    </html>
  );
}
