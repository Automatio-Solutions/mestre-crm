/**
 * Helpers de formato consistentes en toda la app.
 * Locale es-ES con `useGrouping: "always"` para forzar el separador de miles
 * incluso en números de 4 dígitos (que por defecto no lo llevan).
 *
 * Resultado: "1.234,56" siempre.
 */

const BASE: Intl.NumberFormatOptions = { useGrouping: "always" as any };

export const fmtEur = (n: number, decimals = 2) =>
  n.toLocaleString("es-ES", {
    ...BASE,
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const fmtEurShort = (n: number) =>
  n.toLocaleString("es-ES", {
    ...BASE,
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  });

export const fmtAmount = (n: number, decimals = 2) =>
  n.toLocaleString("es-ES", {
    ...BASE,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export const fmtNumber = (n: number) =>
  n.toLocaleString("es-ES", BASE);

export const fmtPercent = (n: number, decimals = 0) =>
  `${n.toLocaleString("es-ES", {
    ...BASE,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`;
