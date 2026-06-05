import { AUTH_BULLET_CLASS } from "@/lib/auth/auth-ui";

/**
 * Hero: `auth-hero-mining.png` (puntos blancos, fondo con canal alfa).
 * Regenerar transparencia: `npm run auth-hero:alpha`. SVG alternativo: `auth-hero-terrain-dots.svg`.
 */
const AUTH_HERO = "/auth-hero-mining.png";
const USE_SVG_DOTS = false;
const HERO_SRC = USE_SVG_DOTS ? "/auth-hero-terrain-dots.svg" : AUTH_HERO;

export function AuthMarketingPanel() {
  return (
    <aside className="auth-panel relative hidden min-h-[50vh] w-full lg:flex lg:min-h-screen lg:flex-1 lg:flex-col lg:items-center lg:justify-center">
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-8 px-6 py-10 sm:px-10 lg:flex-row lg:items-end lg:justify-center lg:gap-0 lg:px-10 lg:py-10 xl:max-w-6xl">
        {/* Textos: más arriba, más grande, z alto para quedar por encima de la imagen al cruzarse */}
        <div className="relative z-30 w-full min-w-0 max-w-md shrink-0 lg:max-w-[26rem] xl:max-w-lg lg:-translate-y-10 lg:pb-4 lg:pr-2 xl:-translate-y-14 xl:pr-4">
          <h2 className="text-4xl font-bold leading-[1.12] tracking-tight text-slate-50 drop-shadow-[0_4px_28px_rgba(0,0,0,0.75)] sm:text-[2.35rem] md:text-5xl lg:text-[2.65rem] xl:text-5xl">
            Monitoreo de tranques de relaves en tiempo real
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-slate-300/95 [text-shadow:0_2px_16px_rgba(0,0,0,0.85)]">
            Telemetría IoT, alertas multicanal, rondas de inspección y reportes regulatorios: una sola
            plataforma para operación de campo y sala de control.
          </p>
          <ul className="mt-8 space-y-3 text-[0.9375rem] leading-snug text-slate-200/95">
            <li className="flex gap-2 [text-shadow:0_1px_12px_rgba(2,8,23,0.88)]">
              <span className={AUTH_BULLET_CLASS}>●</span>
              Dashboard ejecutivo y mapa georreferenciado
            </li>
            <li className="flex gap-2 [text-shadow:0_1px_12px_rgba(2,8,23,0.88)]">
              <span className={AUTH_BULLET_CLASS}>●</span>
              PWA offline para operarios en zona altoandina
            </li>
            <li className="flex gap-2 [text-shadow:0_1px_12px_rgba(2,8,23,0.88)]">
              <span className={AUTH_BULLET_CLASS}>●</span>
              Gemelo digital y simulación de escenarios
            </li>
          </ul>

          <p className="mt-10 text-xs text-slate-400/85 [text-shadow:0_1px_8px_rgba(2,8,23,0.95)]">
            ChicamaX - tranques de relaves
          </p>
        </div>

        {/* Ilustración: más cerca del texto para que se crucen; queda debajo del copy (z-10) */}
        <div className="relative z-10 flex w-full shrink-0 justify-center lg:-ml-16 lg:mt-0 lg:w-auto lg:max-w-[min(48vw,28rem)] lg:justify-end xl:-ml-20 xl:max-w-[min(46vw,30rem)]">
          <img
            src={HERO_SRC}
            alt="Vista técnica de tranque y terreno (gemelo digital)"
            decoding="async"
            className="h-[min(52vh,480px)] w-full max-w-sm object-contain object-bottom sm:max-w-md lg:h-[min(72vh,680px)] lg:max-w-none lg:scale-[1.03]"
          />
        </div>
      </div>
    </aside>
  );
}
