import { createTailingsWaterShaderBundle, type TailingsWaterUniforms } from "./shaders/TailingsWaterShader";

/** Wrapper del shader de relave — punto único de verdad del agua. */
export type { TailingsWaterUniforms };

export function createTailingsWaterMaterial() {
  const bundle = createTailingsWaterShaderBundle();
  return {
    material: bundle.createMaterial(),
    update: (u: TailingsWaterUniforms) => bundle.update(u),
    bundle,
    dispose: () => bundle.dispose(),
  };
}
