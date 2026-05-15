"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function InspectionRoundRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const roundId = typeof params?.roundId === "string" ? params.roundId : "";

  useEffect(() => {
    if (roundId) {
      router.replace(`/inspections?ronda=${encodeURIComponent(roundId)}`);
    } else {
      router.replace("/inspections");
    }
  }, [roundId, router]);

  return (
    <div className="p-8 text-center text-sm text-slate-500">
      Abriendo ronda de inspección…
    </div>
  );
}
