"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchActiveSubscription,
  fetchBillingPlans,
  fetchUserProfileBilling,
  formatUsd,
  openBillingPortal,
  planCodeFromQuery,
  startCheckout,
  type ActiveSubscription,
  type BillingPlan,
  type UserProfileBilling,
} from "@/lib/api/billing";
import { ApiError } from "@/lib/api/http";

type Props = {
  customerEmail: string;
  highlight?: boolean;
  preselectedPlanCode?: string | null;
};

function parseError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.body) {
      try {
        const parsed = JSON.parse(err.body) as { message?: string };
        if (parsed.message) {
          return parsed.message;
        }
      } catch {
        if (err.body.length < 200) {
          return err.body;
        }
      }
    }
    return `Error ${err.status}`;
  }
  return "No se pudo completar la operación";
}

function planLabel(code: string): string {
  switch (code) {
    case "ECONOMY":
      return "Economy";
    case "PREMIUM":
      return "Premium";
    case "MAX":
      return "Max";
    default:
      return code;
  }
}

export function SubscriptionSection({ customerEmail, highlight, preselectedPlanCode }: Props) {
  const searchParams = useSearchParams();
  const billingStatus = searchParams.get("billing");

  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [profileBilling, setProfileBilling] = useState<UserProfileBilling | null>(null);
  const [subscription, setSubscription] = useState<ActiveSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedCode = useMemo(
    () => preselectedPlanCode ?? planCodeFromQuery(searchParams.get("plan")),
    [preselectedPlanCode, searchParams]
  );

  const reload = useCallback(async () => {
    setError(null);
    const [plansData, profileData, subscriptionData] = await Promise.all([
      fetchBillingPlans(),
      fetchUserProfileBilling(),
      fetchActiveSubscription(),
    ]);
    setPlans(plansData);
    setProfileBilling(profileData);
    setSubscription(subscriptionData);
  }, []);

  useEffect(() => {
    void reload()
      .catch((err: unknown) => setError(parseError(err)))
      .finally(() => setLoading(false));
  }, [reload]);

  useEffect(() => {
    if (billingStatus === "success") {
      setNotice("Pago recibido. Tu plan se activará en unos segundos.");
      void reload().catch(() => {});
    } else if (billingStatus === "cancel") {
      setNotice("Checkout cancelado. Puedes elegir un plan cuando quieras.");
    }
  }, [billingStatus, reload]);

  async function onSubscribe(plan: BillingPlan) {
    setError(null);
    setNotice(null);
    setBusyPlanId(plan.id);
    try {
      const checkout = await startCheckout(plan.id, customerEmail);
      if (checkout.checkoutUrl) {
        window.location.href = checkout.checkoutUrl;
        return;
      }
      setNotice(
        "Stripe no está configurado en el servidor. En desarrollo puedes confirmar el pago con el endpoint demo del backend."
      );
    } catch (err: unknown) {
      setError(parseError(err));
    } finally {
      setBusyPlanId(null);
    }
  }

  async function onManagePayment() {
    setError(null);
    setPortalLoading(true);
    try {
      const portal = await openBillingPortal();
      window.location.href = portal.portalUrl;
    } catch (err: unknown) {
      setError(parseError(err));
    } finally {
      setPortalLoading(false);
    }
  }

  const currentPlanType = profileBilling?.planType ?? subscription?.planType ?? null;
  const hasActivePlan = Boolean(subscription && subscription.status === "ACTIVE");

  if (loading) {
    return (
      <section className="rounded-2xl border border-white/10 bg-surface-elevated/55 p-5 sm:p-6">
        <div className="h-24 animate-pulse rounded-xl bg-white/5" />
      </section>
    );
  }

  return (
    <section
      id="billing"
      className={`rounded-2xl border bg-surface-elevated/55 p-5 sm:p-6 ${
        highlight ? "border-accent/40 ring-1 ring-accent/20" : "border-white/10"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100">Suscripción y facturación</h3>
          <p className="mt-1 text-xs text-slate-500">
            Elige un plan para activar Sentinella. Los pagos se procesan de forma segura con Stripe.
          </p>
        </div>
        {hasActivePlan ? (
          <button
            type="button"
            onClick={() => void onManagePayment()}
            disabled={portalLoading}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-200 hover:bg-white/5 disabled:opacity-50"
          >
            {portalLoading ? "Abriendo…" : "Gestionar método de pago"}
          </button>
        ) : null}
      </div>

      {!hasActivePlan ? (
        <p className="mt-4 rounded-xl border border-amber-900/35 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90">
          Aún no tienes una suscripción activa. Selecciona un plan para comenzar.
        </p>
      ) : (
        <div className="mt-4 rounded-xl border border-emerald-900/35 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100/90">
          Plan actual: <strong>{planLabel(currentPlanType ?? "")}</strong>
          {profileBilling?.sensorLimit != null ? (
            <span className="text-emerald-200/80"> · hasta {profileBilling.sensorLimit} dispositivos</span>
          ) : null}
          {subscription?.startedAt ? (
            <span className="block mt-1 text-xs text-emerald-200/70">
              Activo desde{" "}
              {new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(new Date(subscription.startedAt))}
            </span>
          ) : null}
        </div>
      )}

      {notice ? (
        <p className="mt-4 rounded-xl border border-sky-900/35 bg-sky-950/20 px-4 py-3 text-sm text-sky-100/90">{notice}</p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-xl border border-red-900/40 bg-red-950/25 px-4 py-3 text-sm text-red-300">{error}</p>
      ) : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = currentPlanType === plan.code;
          const isFeatured = plan.code === "PREMIUM";
          const isPreselected = selectedCode === plan.code;
          return (
            <article
              key={plan.id}
              className={`relative rounded-2xl border p-4 ${
                isFeatured
                  ? "border-accent/45 bg-accent/[0.06]"
                  : isPreselected
                    ? "border-sky-500/40 bg-sky-950/15"
                    : "border-white/10 bg-black/15"
              }`}
            >
              {isFeatured ? (
                <span className="mb-2 inline-block rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
                  Popular
                </span>
              ) : null}
              <h4 className="text-lg font-semibold text-slate-100">{planLabel(plan.code)}</h4>
              <p className="mt-2 text-2xl font-semibold text-slate-50">
                {formatUsd(plan.priceCents)}
                <span className="text-sm font-normal text-slate-400">/mes</span>
              </p>
              {plan.setupPriceCents > 0 ? (
                <p className="mt-1 text-xs text-slate-500">
                  Primer mes: {formatUsd(plan.priceCents + plan.setupPriceCents)} (incluye setup IoT)
                </p>
              ) : null}
              <ul className="mt-3 space-y-1 text-xs text-slate-400">
                <li>Hasta {plan.sensorLimit} dispositivos</li>
                <li>Facturación {plan.billingPeriod === "MONTHLY" ? "mensual" : plan.billingPeriod.toLowerCase()}</li>
              </ul>
              <button
                type="button"
                disabled={busyPlanId === plan.id || isCurrent}
                onClick={() => void onSubscribe(plan)}
                className={`mt-4 w-full rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${
                  isFeatured
                    ? "bg-accent text-[#1a0f08] hover:bg-accent-hover"
                    : "border border-white/15 text-slate-100 hover:bg-white/5"
                }`}
              >
                {isCurrent ? "Plan actual" : busyPlanId === plan.id ? "Redirigiendo…" : hasActivePlan ? "Cambiar plan" : "Suscribirse"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
