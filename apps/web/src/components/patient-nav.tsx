"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Início" },
  { href: "/sintomas", label: "Como estou" },
  { href: "/consultas", label: "Consultas" },
  { href: "/caderneta", label: "Caderneta" },
] as const;

export function PatientNav({ patientId }: { patientId: number }) {
  const pathname = usePathname();
  const base = `/gestante/${patientId}`;
  return (
    <nav aria-label="Seções da gestante" className="mb-5 flex gap-1 overflow-x-auto rounded-full bg-white p-1 shadow-sm">
      {TABS.map((tab) => {
        const href = `${base}${tab.href}`;
        const active = pathname === href;
        return (
          <Link
            key={tab.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex-1 whitespace-nowrap rounded-full px-3 py-2 text-center text-sm font-semibold ${
              active ? "bg-rose-pastel" : "hover:bg-rose-baby"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
