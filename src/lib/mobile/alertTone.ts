/** Sonido / vibración para alertas de campo (PWA móvil). */

export function playFieldAlertChime(): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) {
      return;
    }
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.24);
    void ctx.close();
  } catch {
    /* sin audio (permisos / autoplay) */
  }
}

export function pulseFieldAlertVibration(): void {
  try {
    void navigator.vibrate?.([90, 50, 90]);
  } catch {
    /* no soportado */
  }
}
