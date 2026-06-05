"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** El alta de nodos está en Monitoreo → modal «Registrar nodo». */
export default function AdminNodesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/monitoring?registrarNodo=1");
  }, [router]);

  return (
    <div className="p-8 text-center text-sm text-slate-500">
      Redirigiendo a monitoreo para registrar un nodo…
    </div>
  );
}
