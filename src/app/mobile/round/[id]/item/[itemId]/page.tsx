"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, apiJson } from "@/lib/api/http";
import { mobileDb } from "@/lib/mobile/db";
import { deletePhotoDraftsForItem, savePhotoDraft } from "@/lib/mobile/offlineCache";
import { enqueueMutation } from "@/lib/mobile/outbox";

export default function MobileRoundItemPage() {
  const params = useParams();
  const router = useRouter();
  const roundId = typeof params?.id === "string" ? params.id : "";
  const itemId = typeof params?.itemId === "string" ? params.itemId : "";
  const [observations, setObservations] = useState("");
  const [anomaly, setAnomaly] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!roundId || !itemId) {
      return;
    }
    void (async () => {
      const draft = await mobileDb.photoDrafts.where("roundId").equals(roundId).filter((r) => r.itemId === itemId).first();
      if (draft) {
        setPhotoName("Foto en borrador local");
      }
    })();
  }, [roundId, itemId]);

  function captureGeo() {
    if (!navigator.geolocation) {
      setError("Geolocalización no disponible");
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGeoBusy(false);
      },
      () => {
        setGeoBusy(false);
        setError("No se pudo obtener la ubicación");
      },
      { enableHighAccuracy: true, timeout: 12_000 }
    );
  }

  async function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !roundId || !itemId) {
      return;
    }
    await savePhotoDraft(roundId, itemId, file, file.type || "image/jpeg");
    setPhotoName(file.name);
  }

  async function submitBody(): Promise<string> {
    const body: Record<string, unknown> = {
      observations: observations.trim() || "Campo",
      anomaly,
    };
    if (lat != null && lng != null) {
      body.latitude = lat;
      body.longitude = lng;
    }
    return JSON.stringify(body);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roundId || !itemId) {
      return;
    }
    setBusy(true);
    setError(null);
    const body = await submitBody();
    try {
      if (!navigator.onLine) {
        await enqueueMutation({
          method: "PATCH",
          path: `rounds/${roundId}/items/${itemId}`,
          body,
          createdAt: Date.now(),
        });
        router.push(`/mobile/round/${roundId}`);
        return;
      }
      await apiJson(`rounds/${roundId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body,
      });
      await deletePhotoDraftsForItem(roundId, itemId);
      router.push(`/mobile/round/${roundId}`);
    } catch (err: unknown) {
      if (!navigator.onLine || (err instanceof TypeError && String(err.message).includes("fetch"))) {
        await enqueueMutation({
          method: "PATCH",
          path: `rounds/${roundId}/items/${itemId}`,
          body,
          createdAt: Date.now(),
        });
        router.push(`/mobile/round/${roundId}`);
        return;
      }
      setError(err instanceof ApiError ? err.body ?? `Error ${err.status}` : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 text-sm">
      <h1 className="text-xl font-bold text-slate-50">Hallazgo</h1>
      <p className="text-xs text-slate-500">Observación, foto en IndexedDB, geolocalización</p>
      {error ? <p className="text-amber-400">{error}</p> : null}
      <form onSubmit={(ev) => void onSubmit(ev)} className="space-y-4 rounded-2xl border-2 border-slate-800 p-4">
        <div>
          <label className="text-xs text-slate-500">Observaciones</label>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Foto (borrador local)</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(ev) => void onPhotoChange(ev)}
            className="block w-full text-xs text-slate-400"
          />
          {photoName ? <p className="mt-1 text-xs text-accent">{photoName}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={geoBusy}
            onClick={() => captureGeo()}
            className="min-h-11 rounded-xl bg-slate-800 px-3 py-2 text-xs text-slate-200"
          >
            {geoBusy ? "GPS…" : "Capturar ubicación"}
          </button>
          {lat != null && lng != null ? (
            <span className="text-xs text-slate-500">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </span>
          ) : null}
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={anomaly} onChange={(e) => setAnomaly(e.target.checked)} />
          Anomalía
        </label>
        <button
          type="submit"
          disabled={busy}
          className="min-h-12 w-full rounded-xl bg-accent py-3 text-base font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Enviando…" : "Guardar"}
        </button>
      </form>
      <Link href={`/mobile/round/${roundId}`} className="block text-center text-xs text-accent underline">
        Volver a la ronda
      </Link>
    </div>
  );
}
