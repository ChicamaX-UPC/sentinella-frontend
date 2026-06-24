#!/usr/bin/env node
/**
 * Lighthouse por módulo del dashboard.
 * Requiere: servidor en LH_BASE_URL (default http://localhost:3000) y Chrome instalado.
 *
 * Uso:
 *   npm run lighthouse:report
 *   LH_BASE_URL=http://127.0.0.1:3000 npm run lighthouse:report
 */

import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.LH_BASE_URL ?? "http://localhost:3000";
const OUT_DIR = path.join(process.cwd(), "reports", "lighthouse");

const MODULES = [
  { id: "dashboard", path: "/dashboard", label: "Inicio" },
  { id: "monitoring", path: "/monitoring", label: "Monitoreo" },
  { id: "alerts", path: "/alerts", label: "Alertas" },
  { id: "digital-twin", path: "/digital-twin", label: "Gemelo digital" },
  { id: "simulations", path: "/simulations", label: "Simulaciones" },
  { id: "reports", path: "/reports", label: "Reportes" },
];

function scorePct(report, category) {
  const raw = report?.categories?.[category]?.score;
  return typeof raw === "number" ? Math.round(raw * 100) : null;
}

function metricMs(report, id) {
  const v = report?.audits?.[id]?.numericValue;
  return typeof v === "number" ? Math.round(v) : null;
}

mkdirSync(OUT_DIR, { recursive: true });

const summary = [];
const chromeFlags = '--chrome-flags="--headless=new --no-sandbox"';

console.log(`\nLighthouse — base ${BASE}\n`);

for (const mod of MODULES) {
  const url = `${BASE}${mod.path}`;
  const jsonPath = path.join(OUT_DIR, `${mod.id}.json`);
  const htmlPath = path.join(OUT_DIR, `${mod.id}.html`);

  console.log(`→ ${mod.label} (${mod.path})`);

  try {
    execSync(
      `npx --yes lighthouse "${url}" --only-categories=performance,accessibility,best-practices --output=json --output=html --output-path="${jsonPath.replace(/\.json$/, "")}" --quiet ${chromeFlags}`,
      { stdio: "inherit", shell: true }
    );

    const report = JSON.parse(readFileSync(jsonPath, "utf8"));
    const entry = {
      module: mod.id,
      label: mod.label,
      path: mod.path,
      url,
      performance: scorePct(report, "performance"),
      accessibility: scorePct(report, "accessibility"),
      bestPractices: scorePct(report, "best-practices"),
      lcpMs: metricMs(report, "largest-contentful-paint"),
      tbtMs: metricMs(report, "total-blocking-time"),
      cls: report?.audits?.["cumulative-layout-shift"]?.numericValue ?? null,
      reportJson: path.relative(process.cwd(), jsonPath),
      reportHtml: path.relative(process.cwd(), htmlPath),
    };
    summary.push(entry);
    console.log(
      `   performance ${entry.performance ?? "—"} | LCP ${entry.lcpMs ?? "—"} ms | TBT ${entry.tbtMs ?? "—"} ms\n`
    );
  } catch (err) {
    console.error(`   Error en ${mod.id}:`, err instanceof Error ? err.message : err);
    summary.push({
      module: mod.id,
      label: mod.label,
      path: mod.path,
      url,
      error: "lighthouse_failed",
    });
  }
}

const summaryPath = path.join(OUT_DIR, "summary.json");
writeFileSync(summaryPath, JSON.stringify({ generatedAt: new Date().toISOString(), base: BASE, modules: summary }, null, 2));

console.log("Resumen guardado en:", path.relative(process.cwd(), summaryPath));
console.table(
  summary.map((m) => ({
    Módulo: m.label ?? m.module,
    Performance: m.performance ?? "—",
    A11y: m.accessibility ?? "—",
    LCP_ms: m.lcpMs ?? "—",
    TBT_ms: m.tbtMs ?? "—",
  }))
);
