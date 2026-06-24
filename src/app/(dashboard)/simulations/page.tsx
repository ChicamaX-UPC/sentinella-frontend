"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const SimulationsPageContent = dynamic(
  () => import("./SimulationsPageContent").then((mod) => mod.SimulationsPageContent),
  {
    loading: () => <div className="p-8 text-center text-slate-500">Cargando simulaciones…</div>,
  }
);

export default function SimulationsListPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando simulaciones…</div>}>
      <SimulationsPageContent />
    </Suspense>
  );
}
