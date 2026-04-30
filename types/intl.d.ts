/**
 * Aumenta `Intl.NumberFormatOptions` con los valores de `useGrouping`
 * que añadió ECMA-402 (2023). TypeScript 5.4 todavía los define como
 * `boolean` en `lib.es5.d.ts`, lo que dispara TS2769 al pasar "always".
 *
 * Spec: https://tc39.es/ecma402/#sec-Intl.NumberFormat
 *
 * Fichero global (sin imports/exports) para que la augmentación se
 * aplique sin necesidad de import.
 */
declare namespace Intl {
  interface NumberFormatOptions {
    useGrouping?: boolean | "always" | "auto" | "min2" | undefined;
  }
}
