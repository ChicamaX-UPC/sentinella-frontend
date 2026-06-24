# Lighthouse — baseline Sentinella

Métricas registradas el 2026-06-24 (Next.js dev en `localhost:3000`, Windows).

## Cómo ejecutar

1. Levantar backend (gateway + servicios) y frontend:

   ```bash
   cd sentinella-frontend
   npm run dev
   ```

2. Landing pública (`/`):

   ```bash
   npm run lighthouse:landing
   ```

   Genera `reports/lighthouse/landing.html` y `landing.json`.

3. Rutas del panel (sin sesión: redirigen a login; útil como baseline de carga inicial):

   ```bash
   npm run lighthouse:report
   ```

   Genera JSON/HTML por módulo (`*.report.json`) y `reports/lighthouse/summary.json`.

4. Rutas individuales:

   ```bash
   npm run lighthouse          # /dashboard
   npm run lighthouse:twin     # /digital-twin
   ```

## Objetivos iniciales

| Ruta | Performance | Accessibility | Best practices |
|------|-------------|---------------|----------------|
| `/` (landing) | ≥ 70 | ≥ 90 | ≥ 90 |
| `/dashboard` | ≥ 60 | ≥ 90 | ≥ 90 |
| `/monitoring` | ≥ 60 | ≥ 90 | ≥ 90 |
| `/alerts` | ≥ 65 | ≥ 90 | ≥ 90 |
| `/digital-twin` | ≥ 50 | ≥ 85 | ≥ 90 |

## Registro de ejecuciones

| Fecha | Entorno | `/` perf | `/` a11y | `/dashboard` perf | `/monitoring` perf | Notas |
|-------|---------|----------|----------|-------------------|--------------------|-------|
| 2026-06-24 | local dev | **82** | **96** | **90** | **64** | Sin cookies de sesión en rutas autenticadas |

### Detalle por ruta (2026-06-24)

| Ruta | Perf | A11y | Best |
|------|------|------|------|
| `/` | 82 | 96 | 100 |
| `/dashboard` | 90 | 94 | 100 |
| `/monitoring` | 64 | 94 | 100 |
| `/alerts` | 64 | 94 | 100 |
| `/digital-twin` | 65 | 94 | 100 |
| `/simulations` | 64 | 94 | 100 |
| `/reports` | 58 | 94 | 100 |

## Notas

- MapLibre y Three.js penalizan Performance en dashboard y gemelo digital.
- Rutas autenticadas medidas sin sesión activa (redirect/login); repetir con cookies para baseline real del panel.
- En Windows puede aparecer `EPERM` al cerrar Chrome headless; los JSON suelen generarse igual.
- Chrome headless debe estar instalado; los scripts usan `--headless=new`.
