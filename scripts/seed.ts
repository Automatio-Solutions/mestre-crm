/**
 * Seed script — vuelca los datos mock de lib/data.ts a Supabase.
 *
 * Uso:
 *   npm run seed
 *
 * Puedes re-ejecutarlo: hace upsert por id, no duplica filas.
 */
import { config as loadEnv } from "dotenv";
import path from "node:path";
// Next.js usa .env.local; cargamos ambos con prioridad a .env.local
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

import { createClient } from "@supabase/supabase-js";
// @ts-ignore — lib/data.ts tiene @ts-nocheck, tipos laxos a propósito
import * as D from "../lib/data";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  console.error("Faltan env vars. Revisa .env.local (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY).");
  process.exit(1);
}

const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const toISODate = (d: Date | null | undefined) =>
  d instanceof Date && !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null;

const toISO = (d: Date | null | undefined) =>
  d instanceof Date && !isNaN(d.getTime()) ? d.toISOString() : null;

async function upsert<T>(table: string, rows: T[]) {
  if (!rows.length) return;
  const { error, count } = await supabase.from(table).upsert(rows as any, { count: "exact" });
  if (error) {
    console.error(`  ✗ ${table}:`, error.message);
    throw error;
  }
  console.log(`  ✓ ${table}: ${count ?? rows.length} filas`);
}

async function main() {
  console.log("→ Seeding Supabase...");

  // 1) CONTACTS
  const contacts = D.CONTACTS.map((c: any) => ({
    id: c.id,
    type: c.type,
    name: c.name,
    nif: c.nif ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    city: c.city ?? null,
    tags: c.tags ?? [],
    facturado: c.facturado ?? 0,
    last_interaction: toISODate(c.lastInteraction),
    status: c.status ?? null,
  }));
  await upsert("contacts", contacts);

  // 2) CLIENT_SPACES
  const spaces = D.CLIENT_SPACES.map((s: any) => ({
    id: s.id,
    contact_id: s.contactId ?? null,
    name: s.name,
    logo: s.logo ?? null,
    color: s.color ?? null,
    sector: s.sector ?? null,
    description: s.description ?? null,
    active_since: s.activeSince ?? null,
  }));
  await upsert("client_spaces", spaces);

  // 3) MODULES (dentro de cada client_space)
  const modules: any[] = [];
  D.CLIENT_SPACES.forEach((s: any) => {
    (s.modules || []).forEach((m: any) => {
      modules.push({
        id: m.id,
        client_id: s.id,
        icon: m.icon ?? null,
        name: m.name,
        last_updated: toISO(m.lastUpdated),
      });
    });
  });
  await upsert("modules", modules);

  // 4) TASKS
  const tasks = D.TASKS.map((t: any) => ({
    id: t.id,
    client_id: t.clientId,
    module_id: t.moduleId,
    title: t.title,
    description: t.description ?? null,
    status: t.status,
    priority: t.priority,
    assignees: t.assignees ?? [],
    tags: t.tags ?? [],
    start_date: toISODate(t.startDate),
    due_date: toISODate(t.dueDate),
    progress: t.progress ?? 0,
    subtasks: t.subtasks ?? [],
    checklists: t.checklists ?? [],
    comments: (t.comments ?? []).map((c: any) => ({ ...c, when: toISO(c.when) })),
    activity: (t.activity ?? []).map((a: any) => ({ ...a, when: toISO(a.when) })),
    custom_fields: t.customFields ?? {},
    time_tracked: t.timeTracked ?? null,
    time_estimate: t.timeEstimate ?? null,
    attachments: t.attachments ?? [],
  }));
  await upsert("tasks", tasks);

  // 5) INVOICES — con líneas derivadas de INVOICE_LINES
  const invoices = D.INVOICES.map((i: any) => {
    const rawLines = (D.INVOICE_LINES as any)[i.id];
    const lines = Array.isArray(rawLines) && rawLines.length > 0
      ? rawLines.map((l: any, idx: number) => ({
          id: l.id || `l${idx + 1}`,
          concept: (l.description || "").split(" — ")[0] || l.description || "",
          description: l.description || "",
          quantity: l.quantity ?? 1,
          price: l.price ?? 0,
          vat: l.vat ?? 21,
          discount: l.discount ?? 0,
          serviceId: l.serviceId ?? null,
        }))
      : [
          {
            id: "l1",
            concept: i.concept || "",
            description: i.concept || "",
            quantity: 1,
            price: i.base,
            vat: i.vatPct,
            discount: 0,
            serviceId: null,
          },
        ];
    return {
      id: i.id,
      number: i.number,
      client_id: i.clientId ?? null,
      issue_date: toISODate(i.issueDate),
      due_date: toISODate(i.dueDate),
      base: i.base,
      vat_pct: i.vatPct,
      total: i.total,
      status: i.status,
      concept: i.concept ?? null,
      lines,
      payment_method: "transferencia",
      payment_notes:
        "Pagar por transferencia bancaria al siguiente número de cuenta\nES88 0182 1508 5202 0170 3834",
      account: "70500001 · Prestación de servicios",
      account_by_concept: false,
      tags: [],
      show_custom_fields: false,
    };
  });
  await upsert("invoices", invoices);

  // 5b) SERVICES (catálogo)
  const services = (D.SERVICES || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    category: s.category ?? null,
    description: s.description ?? null,
    price: s.price,
    vat: s.vat ?? 21,
    active: true,
  }));
  await upsert("services", services);

  // 6) QUOTES (presupuestos) — con líneas sintéticas (1 línea con amount)
  const quotes = (D.QUOTES || []).map((q: any) => {
    const vatPct = 21;
    const base = +(q.amount / (1 + vatPct / 100)).toFixed(2);
    const lines = [{
      id: "l1",
      concept: q.concept || "",
      description: q.concept || "",
      quantity: 1,
      price: base,
      vat: vatPct,
      discount: 0,
      serviceId: null,
    }];
    return {
      id: q.id,
      number: q.number,
      client_id: q.clientId ?? null,
      concept: q.concept ?? null,
      amount: q.amount,
      vat_pct: vatPct,
      status: q.status,
      issue_date: toISODate(q.issueDate),
      expire_date: toISODate(q.expireDate),
      owner: q.owner ?? null,
      probability: q.probability ?? 0,
      viewed: !!q.viewed,
      view_count: q.viewCount ?? 0,
      accepted_date: toISODate(q.acceptedDate),
      rejected_date: toISODate(q.rejectedDate),
      reject_reason: q.rejectReason ?? null,
      internal_note: q.internalNote ?? null,
      source: q.source ?? null,
      lines,
      tags: [],
      show_custom_fields: false,
    };
  });
  await upsert("quotes", quotes);

  // 7) PURCHASES (gastos / facturas recibidas)
  const purchases = (D.PURCHASES || []).map((p: any) => {
    const rawLines = ((D as any).PURCHASE_LINES as any)?.[p.id];
    const lines = Array.isArray(rawLines) && rawLines.length > 0
      ? rawLines.map((l: any, idx: number) => ({
          id: l.id || `l${idx + 1}`,
          concept: (l.description || p.concept || "").split(" — ")[0] || l.description || p.concept || "",
          description: l.description || p.concept || "",
          quantity: l.quantity ?? 1,
          price: l.price ?? 0,
          vat: l.vat ?? 21,
          discount: 0,
          serviceId: null,
        }))
      : [
          {
            id: "l1",
            concept: p.concept || "",
            description: p.concept || "",
            quantity: 1,
            price: p.base,
            vat: 21,
            discount: 0,
            serviceId: null,
          },
        ];
    return {
      id: p.id,
      supplier_id: p.providerId || p.supplierId || null,
      number: p.number ?? null,
      concept: p.concept ?? null,
      category: p.category ?? null,
      issue_date: toISODate(p.date),
      pay_date: p.status === "pagada" ? toISODate(p.date) : null,
      base: p.base,
      vat_pct: 21,
      vat: p.vat,
      total: p.total,
      status: p.status,
      payment_method: (p.method || "transferencia").toLowerCase() === "tarjeta" ? "tarjeta"
        : (p.method || "transferencia").toLowerCase() === "domiciliado" ? "domiciliado"
        : (p.method || "transferencia").toLowerCase() === "efectivo" ? "efectivo"
        : "transferencia",
      source: p.source === "scan" ? "scan" : p.source === "email" ? "email" : "upload",
      account: null,
      lines,
      tags: [],
      attachments: [],
      internal_note: null,
    };
  });
  await upsert("purchases", purchases);

  // 8) RECURRING INVOICES — mapeamos el nombre de cliente del mock al id en contacts
  const contactsByName = new Map<string, string>();
  D.CONTACTS.forEach((c: any) => contactsByName.set(c.name, c.id));
  const recurring = (D.RECURRING_INVOICES || []).map((r: any) => ({
    id: r.id,
    client_id: contactsByName.get(r.client) || null,
    concept: r.concept ?? null,
    amount: r.amount,
    vat_pct: 21,
    frequency: r.freq || "Mensual",
    next_date: toISODate(r.next),
    active: !!r.active,
    issued_count: r.issued ?? 0,
    payment_method: "transferencia",
  }));
  await upsert("recurring_invoices", recurring);

  // 9) PAYMENT BATCHES — remesas SEPA
  const batches = (D.PAYMENT_BATCHES || []).map((b: any) => ({
    id: `pb-${b.ref.replace(/[^a-z0-9]/gi, "")}`,
    ref: b.ref,
    date: toISODate(b.date),
    invoice_ids: [],
    count: b.count,
    total: b.total,
    status: b.status,
  }));
  await upsert("payment_batches", batches);

  // 10) TAX MODELS (modelos fiscales)
  // La DB solo acepta pendiente/presentado/aplazado; el mock incluye
  // "en preparación" y otros, los normalizamos a pendiente.
  const TAX_STATUS_MAP: Record<string, string> = {
    pendiente: "pendiente",
    presentado: "presentado",
    aplazado: "aplazado",
    "en preparación": "pendiente",
  };
  const taxModels = (D.TAX_MODELS || []).map((m: any) => ({
    id: m.id,
    code: m.code || m.id.replace(/^m/, ""),
    name: m.name,
    description: m.description ?? null,
    period: m.period,
    due_date: toISODate(m.dueDate),
    amount: m.amount,
    status: TAX_STATUS_MAP[m.status] || "pendiente",
    presented_date: toISODate(m.presentedDate),
  }));
  await upsert("tax_models", taxModels);

  console.log("\n✓ Seed completo.");
}

main().catch((e) => {
  console.error("\n✗ Seed falló:", e.message || e);
  process.exit(1);
});
