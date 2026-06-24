"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const ReportsPageContent = dynamic(
  () => import("./ReportsPageContent").then((mod) => mod.ReportsPageContent),
  {
    loading: () => <div className="p-8 text-center text-slate-500">Cargando reportes…</div>,
  }
);

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Cargando reportes…</div>}>
      <ReportsPageContent />
    </Suspense>
  );
}
