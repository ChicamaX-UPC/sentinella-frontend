# Sentinella (frontend)

Aplicación web de Sentinella para operadores y administradores: panel operativo, autenticación, vistas móviles y visualización del gemelo digital, construida sobre Next.js.

## Requisitos

- Node.js 20 LTS o superior (recomendado)
- npm (incluido con Node)

## Stack

- **Next.js 16** (App Router), **React 19**, **TypeScript**
- **Tailwind CSS 4**
- **Vitest** y Testing Library para pruebas unitarias
- **Leaflet** (mapas), **Three.js** (escenas 3D), **Dexie** (IndexedDB), **Zustand** (estado)

## Instalación y desarrollo

```bash
npm install
npm run dev
```

La aplicación de desarrollo queda disponible en [http://localhost:3000](http://localhost:3000).

## Otros comandos

| Comando | Descripción |
|---------|-------------|
| `npm run build` | Compilación de producción. |
| `npm run start` | Servidor de producción (tras `build`). |
| `npm run lint` | ESLint con configuración Next.js. |
| `npm test` | Ejecuta Vitest en modo run. |
| `npm run auth-hero:alpha` | Script opcional: convierte el fondo oscuro del PNG del hero de login en transparencia (`sharp`; ver `scripts/knockout-auth-hero-bg.mjs`). |

## Variables de entorno

Definir según el entorno (por ejemplo en `.env.local`, sin commitear secretos):

| Variable | Uso |
|----------|-----|
| `SENTINELLA_API_URL` | URL base del API Gateway o del servicio al que apunta el BFF de Next (por defecto en desarrollo: `http://127.0.0.1:8080`). |
| `SENTINELLA_API_PATH_PREFIX` | Prefijo REST manual cuando el despliegue no sigue la convención `/api/v1` del gateway. |
| `SENTINELLA_USE_IAM_DIRECT` | `true` o `false` para forzar rutas `/v1` frente al IAM sin inferencia por puerto. |
| `NEXT_PUBLIC_WS_BASE_URL` | Base WebSocket en el cliente (por defecto `ws://localhost:8080`). |

La lógica de resolución de origen y prefijo está centralizada en `src/lib/server/api-origin.ts`.

## Estructura orientativa

- `src/app`: rutas y layouts (grupos `(auth)`, `(dashboard)`, `mobile`, etc.).
- `src/components`: UI reutilizable y vistas por dominio.
- `public`: estáticos servidos tal cual (imágenes del flujo de autenticación, favicon, etc.).

## Despliegue

Generar artefacto con `npm run build` y servir con `npm run start` o la integración de su proveedor (contenedor Node, plataforma PaaS, etc.), configurando las variables de entorno anteriores contra el backend desplegado.
