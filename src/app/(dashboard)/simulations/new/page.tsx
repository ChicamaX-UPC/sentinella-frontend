"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewSimulationRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/simulations?nuevo=1");
  }, [router]);

  return (
    <div className="p-8 text-center text-sm text-slate-500">
      Abriendo formulario de nuevo escenario…
    </div>
  );
}
