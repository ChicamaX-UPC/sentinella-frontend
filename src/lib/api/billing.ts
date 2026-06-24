import { ApiError, apiJson } from "@/lib/api/http";

export type BillingPlan = {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  setupPriceCents: number;
  currency: string;
  sensorLimit: number;
  billingPeriod: string;
};

export type UserProfileBilling = {
  userId: string;
  email: string;
  fullName: string;
  planType: string | null;
  sensorLimit: number | null;
  subscriptionId: string | null;
};

export type ActiveSubscription = {
  id: string;
  userId: string;
  planId: string;
  planType: string;
  sensorLimit: number;
  status: string;
  startedAt: string;
  expiresAt: string | null;
};

export type CheckoutResponse = {
  id: string;
  userId: string;
  planId: string;
  status: string;
  amountCents: number;
  currency: string;
  checkoutUrl: string | null;
};

export type PortalResponse = {
  portalUrl: string;
};

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export async function fetchBillingPlans(): Promise<BillingPlan[]> {
  return apiJson<BillingPlan[]>("payments/plans");
}

export async function fetchUserProfileBilling(): Promise<UserProfileBilling> {
  return apiJson<UserProfileBilling>("profiles/me");
}

export async function fetchActiveSubscription(): Promise<ActiveSubscription | null> {
  try {
    return await apiJson<ActiveSubscription>("subscriptions/active");
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function startCheckout(planId: string, customerEmail: string): Promise<CheckoutResponse> {
  return apiJson<CheckoutResponse>("payments/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId, customerEmail }),
  });
}

export async function openBillingPortal(): Promise<PortalResponse> {
  return apiJson<PortalResponse>("payments/portal", {
    method: "POST",
  });
}

export function planCodeFromQuery(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "economy" || normalized === "premium" || normalized === "max") {
    return normalized.toUpperCase();
  }
  return null;
}
