"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SimulationEditRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";

  useEffect(() => {
    if (id) {
      router.replace(`/simulations?editar=${encodeURIComponent(id)}`);
    } else {
      router.replace("/simulations");
    }
  }, [id, router]);

  return (
    <div className="p-8 text-center text-sm text-slate-500">
      Abriendo escenario…
    </div>
  );
}
