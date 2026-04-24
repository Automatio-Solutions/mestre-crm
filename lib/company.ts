// Datos de la empresa emisora (aparecen en facturas, presupuestos, etc.)
// Cambia estos valores según tu empresa real.
export interface CompanyInfo {
  legalName: string;
  tradeName: string;   // marca visible en el documento (logotipo)
  nif: string;
  address: string;
  city: string;
  postalCode: string;
  province: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  iban: string;
  logoUrl?: string;
}

export const COMPANY: CompanyInfo = {
  legalName: "KANTARADS DIGITAL S.L.U.",
  tradeName: "Mestre",
  nif: "B23899974",
  address: "Calle Rosales 39",
  city: "Alcántara",
  postalCode: "10980",
  province: "Cáceres",
  country: "España",
  phone: "659602794",
  email: "info@danimestre.com",
  website: "danimestre.com",
  iban: "ES88 0182 1508 5202 0170 3834",
  logoUrl: "/assets/mestre-wordmark.svg",
};
