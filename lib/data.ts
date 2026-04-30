// @ts-nocheck
/* Mock data ported from prototype. Types are intentionally loose. */

// ============================================================
// MOCK DATA — coherente entre pantallas
// ============================================================

export const TODAY = new Date(2026, 3, 22); // 22 abril 2026

export const daysAgo = (n) => { const d = new Date(TODAY); d.setDate(d.getDate() - n); return d; };
export const daysFromNow = (n) => { const d = new Date(TODAY); d.setDate(d.getDate() + n); return d; };
export const fmtDate = (d) => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
export const fmtShort = (d) => d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
export const iso = (d) => d.toISOString().slice(0, 10);

export const relativeTime = (d) => {
  const diffMs = TODAY - d;
  const diffDays = Math.round(diffMs / (1000*60*60*24));
  if (diffDays === 0) return 'hoy';
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays}d`;
  if (diffDays < 30) return `hace ${Math.floor(diffDays/7)}sem`;
  if (diffDays < 365) return `hace ${Math.floor(diffDays/30)}m`;
  return `hace ${Math.floor(diffDays/365)}a`;
};

// ============================================================
// USERS (team de Dani Mestre)
// ============================================================
export const USERS = [
  { id: 'u1', name: 'Dani Mestre',   initials: 'DM', role: 'Founder',         color: '#6A5ACD' },
  { id: 'u7', name: 'Noelia Pérez',  initials: 'NP', role: 'Operaciones',     color: '#4A7C59' },
  // legacy (referenced by mock data, no longer en el equipo activo)
  { id: 'u2', name: 'María López',  initials: 'ML', role: 'Project Manager', color: '#B84545' },
  { id: 'u3', name: 'Carlos Ruiz',  initials: 'CR', role: 'Content Lead',    color: '#4A7C59' },
  { id: 'u4', name: 'Nora Ibáñez',  initials: 'NI', role: 'Designer',        color: '#C89B3C' },
  { id: 'u5', name: 'Pablo Vega',   initials: 'PV', role: 'Developer',       color: '#2A6FB3' },
  { id: 'u6', name: 'Elena Torres', initials: 'ET', role: 'Social Media',    color: '#9B3A8F' },
];

// Equipo activo (los que aparecen en pickers de asignación)
export const TEAM_USER_IDS = ['u1', 'u7'];
export const TEAM = TEAM_USER_IDS.map((id) => USERS.find((u) => u.id === id)).filter(Boolean);

export const userById = (id) => USERS.find(u => u.id === id);

// Categorías de tareas (paleta de colores corporativa)
export const TASK_CATEGORIES = [
  { id: 'fabricacion',    name: 'Fabricación',    bg: '#E8F1EA', fg: '#2F5A3D' },
  { id: 'logistica',      name: 'Logística',      bg: '#E4EEF7', fg: '#2B5A85' },
  { id: 'comercial',      name: 'Comercial',      bg: '#FAE8E1', fg: '#9B4A2E' },
  { id: 'administrativo', name: 'Administrativo', bg: '#F0EBE0', fg: '#6B5A35' },
  { id: 'calidad',        name: 'Calidad',        bg: '#FAF1DC', fg: '#8C6A1E' },
  { id: 'marketing',      name: 'Marketing',      bg: '#EBE8FB', fg: '#4F42A8' },
  { id: 'compras',        name: 'Compras',        bg: '#E8F1EA', fg: '#2F5A3D' },
  { id: 'gerencia',       name: 'Gerencia',       bg: '#F5E1E1', fg: '#8C2E2E' },
];
export const taskCategoryById = (id) => TASK_CATEGORIES.find((c) => c.id === id);

// ============================================================
// CONTACTS — empresas españolas plausibles (inventadas)
// ============================================================
export const TAGS_PALETTE = {
  'estratégico':  { bg: '#EBE8FB', fg: '#4F42A8' },
  'recurrente':   { bg: '#E8F1EA', fg: '#2F5A3D' },
  'nuevo':        { bg: '#FAF1DC', fg: '#8C6A1E' },
  'vip':          { bg: '#F5E1E1', fg: '#8C2E2E' },
  'freelance':    { bg: '#F0EBE0', fg: '#6B5A35' },
  'e-commerce':   { bg: '#E4EEF7', fg: '#2B5A85' },
  'b2b':          { bg: '#EDE9DD', fg: '#5A4D2E' },
  'salud':        { bg: '#E8F1EA', fg: '#2F5A3D' },
  'retail':       { bg: '#F5E9D8', fg: '#7C4F1E' },
  'alimentación': { bg: '#E8F1EA', fg: '#2F5A3D' },
};

export const CONTACTS = [
  { id:'c1',  type:'cliente',   name:'Lumbre Estudio S.L.',      nif:'B87451236', email:'admin@lumbreestudio.com',    phone:'+34 911 234 567', city:'Madrid',     tags:['estratégico','b2b'], facturado:48720, lastInteraction: daysAgo(3),  status:'activo' },
  { id:'c2',  type:'cliente',   name:'Canela Roja S.A.',         nif:'A62145789', email:'hola@canelaroja.es',         phone:'+34 933 456 789', city:'Barcelona',  tags:['recurrente','retail'], facturado:32180, lastInteraction: daysAgo(8),  status:'activo' },
  { id:'c3',  type:'cliente',   name:'Brío Salud Digital',       nif:'B74125836', email:'contacto@briosalud.com',     phone:'+34 954 123 456', city:'Sevilla',    tags:['salud','estratégico'], facturado:27450, lastInteraction: daysAgo(1), status:'activo' },
  { id:'c4',  type:'cliente',   name:'Valero & Hijos S.L.',      nif:'B48723615', email:'ventas@valerohijos.es',      phone:'+34 963 789 012', city:'Valencia',   tags:['recurrente','alimentación'], facturado:18990, lastInteraction: daysAgo(14), status:'activo' },
  { id:'c5',  type:'cliente',   name:'Pulso Running Co.',        nif:'B91823457', email:'info@pulsorunning.com',      phone:'+34 918 345 678', city:'Madrid',     tags:['nuevo','e-commerce'],  facturado:6200,  lastInteraction: daysAgo(2),  status:'activo' },
  { id:'c6',  type:'cliente',   name:'Atelier Núria Vidal',      nif:'46123789A', email:'nuria@ateliervidal.es',      phone:'+34 934 567 890', city:'Barcelona',  tags:['vip','retail'],        facturado:15400, lastInteraction: daysAgo(5), status:'activo' },
  { id:'c7',  type:'cliente',   name:'Cámara Oscura Films',      nif:'B23456781', email:'produccion@camaraoscura.tv', phone:'+34 915 678 901', city:'Madrid',     tags:['b2b'],                 facturado:22300, lastInteraction: daysAgo(20), status:'activo' },
  { id:'c8',  type:'cliente',   name:'Tierra Hueca Editorial',   nif:'B65432198', email:'editorial@tierrahueca.com',  phone:'+34 944 567 123', city:'Bilbao',     tags:['recurrente'],          facturado:9800,  lastInteraction: daysAgo(35), status:'inactivo' },
  { id:'c9',  type:'lead',      name:'Raíz Cosmética Natural',   nif:'B38571462', email:'marketing@raizcosmetica.com',phone:'+34 911 876 543', city:'Madrid',     tags:['nuevo','e-commerce'],  facturado:0,     lastInteraction: daysAgo(4), status:'lead' },
  { id:'c10', type:'lead',      name:'Forja Legal Abogados',     nif:'B99823145', email:'info@forjalegal.es',         phone:'+34 913 210 987', city:'Madrid',     tags:['b2b'],                 facturado:0,     lastInteraction: daysAgo(6), status:'lead' },
  { id:'c11', type:'proveedor', name:'Holded Technologies S.L.', nif:'B66551122', email:'billing@provider.es',        phone:'+34 932 100 200', city:'Barcelona',  tags:['recurrente'],          facturado:0, lastInteraction: daysAgo(12), status:'activo' },
  { id:'c12', type:'proveedor', name:'Figma Iberia S.L.',        nif:'B12312312', email:'cuentas@designtools.es',     phone:'+34 912 333 444', city:'Madrid',     tags:['recurrente'],          facturado:0, lastInteraction: daysAgo(7),  status:'activo' },
  { id:'c13', type:'proveedor', name:'Paredes Asesores',         nif:'B55778899', email:'luis@paredesasesores.es',    phone:'+34 915 999 888', city:'Madrid',     tags:['estratégico'],         facturado:0, lastInteraction: daysAgo(9),  status:'activo' },
  { id:'c14', type:'cliente',   name:'Salto Café Specialty',     nif:'B88112233', email:'cafe@saltospecialty.com',    phone:'+34 936 112 334', city:'Barcelona',  tags:['retail','alimentación'], facturado:11800, lastInteraction: daysAgo(18), status:'activo' },
  { id:'c15', type:'cliente',   name:'Norte Frío Logística',     nif:'A44556677', email:'ops@nortefrio.es',           phone:'+34 948 334 556', city:'Pamplona',   tags:['b2b'],                 facturado:7650,  lastInteraction: daysAgo(26), status:'activo' },
  { id:'c16', type:'cliente',   name:'Laura Pena Ilustración',   nif:'73456123L', email:'hola@laurapena.art',         phone:'+34 619 887 221', city:'A Coruña',   tags:['freelance'],           facturado:2800,  lastInteraction: daysAgo(11), status:'activo' },
  { id:'c17', type:'lead',      name:'Orbital Pet Supplies',     nif:'B10293847', email:'ecom@orbitalpet.com',        phone:'+34 931 445 223', city:'Barcelona',  tags:['nuevo','e-commerce'],  facturado:0,     lastInteraction: daysAgo(1),  status:'lead' },
  { id:'c18', type:'cliente',   name:'Dársena 12 Restaurantes',  nif:'B78451296', email:'direccion@darsena12.com',    phone:'+34 965 112 234', city:'Alicante',   tags:['retail','alimentación'], facturado:14200, lastInteraction: daysAgo(4), status:'activo' },
  { id:'c19', type:'cliente',   name:'Sílex Ingeniería S.L.',    nif:'B30912384', email:'proyectos@silexing.es',      phone:'+34 914 552 667', city:'Madrid',     tags:['b2b'],                 facturado:19400, lastInteraction: daysAgo(10), status:'activo' },
  { id:'c20', type:'cliente',   name:'Mar de Leva Surf',         nif:'B71234567', email:'shop@mardeleva.com',         phone:'+34 928 556 778', city:'Las Palmas', tags:['nuevo','e-commerce'],  facturado:3900,  lastInteraction: daysAgo(6), status:'activo' },
  { id:'c21', type:'cliente',   name:'Ocre Arquitectura',        nif:'B40112358', email:'estudio@ocrearq.com',        phone:'+34 981 334 226', city:'A Coruña',   tags:['b2b','vip'],           facturado:26700, lastInteraction: daysAgo(2), status:'activo' },
  { id:'c22', type:'proveedor', name:'Google Cloud Spain',       nif:'B77889911', email:'ar@gcpbilling.es',           phone:'+34 900 111 222', city:'Madrid',     tags:['recurrente'],          facturado:0, lastInteraction: daysAgo(3),  status:'activo' },
  { id:'c23', type:'cliente',   name:'Llama Digital Agency',     nif:'B85234671', email:'hola@llamadigital.es',       phone:'+34 932 887 442', city:'Barcelona',  tags:['b2b','nuevo'],         facturado:5100,  lastInteraction: daysAgo(7), status:'activo' },
  { id:'c24', type:'lead',      name:'Horizonte Clínica Dental', nif:'B41238756', email:'admin@horizontedental.es',   phone:'+34 957 334 221', city:'Córdoba',    tags:['salud'],               facturado:0,     lastInteraction: daysAgo(13), status:'lead' },
  { id:'c25', type:'cliente',   name:'Prisma Óptica',            nif:'B12398745', email:'marketing@prismaoptica.com', phone:'+34 944 227 336', city:'Bilbao',     tags:['salud','retail'],      facturado:8400,  lastInteraction: daysAgo(17), status:'activo' },
  { id:'c26', type:'cliente',   name:'Sendero Outdoor',          nif:'B74125896', email:'contacto@senderooutdoor.es', phone:'+34 972 445 118', city:'Girona',     tags:['e-commerce'],          facturado:12600, lastInteraction: daysAgo(9), status:'activo' },
  { id:'c27', type:'cliente',   name:'Fábrica Escénica',         nif:'B85236914', email:'produccion@fabricaescenica.com', phone:'+34 983 225 447', city:'Valladolid', tags:['b2b'],           facturado:6400,  lastInteraction: daysAgo(22), status:'activo' },
  { id:'c28', type:'cliente',   name:'Mirador Turismo Rural',    nif:'B96325874', email:'reservas@miradorturismo.es', phone:'+34 975 334 225', city:'Soria',      tags:['retail'],              facturado:4200,  lastInteraction: daysAgo(30), status:'inactivo' },
  { id:'c29', type:'proveedor', name:'Vodafone Empresas',        nif:'A83052407', email:'facturacion@operadora.es',   phone:'+34 900 500 000', city:'Madrid',     tags:['recurrente'],          facturado:0, lastInteraction: daysAgo(15), status:'activo' },
  { id:'c30', type:'cliente',   name:'Brote Verde Cosmética',    nif:'B55443322', email:'info@brotecosmetica.com',    phone:'+34 931 554 278', city:'Barcelona',  tags:['e-commerce','nuevo'],  facturado:7100,  lastInteraction: daysAgo(5), status:'activo' },
  { id:'c31', type:'cliente',   name:'Raval Bicicletas',         nif:'B33442211', email:'taller@ravalbicis.com',      phone:'+34 932 114 559', city:'Barcelona',  tags:['retail'],              facturado:2300,  lastInteraction: daysAgo(28), status:'activo' },
  { id:'c32', type:'cliente',   name:'Torre Vigía Cine',         nif:'B88223377', email:'produccion@torrevigiacine.es', phone:'+34 915 447 226', city:'Madrid',   tags:['b2b'],                 facturado:16800, lastInteraction: daysAgo(6), status:'activo' },
];

// ============================================================
// SERVICIOS (catálogo para mencionar con @ en facturas)
// ============================================================
export const SERVICES = [
  { id:'s1', name:'Consultoría estratégica (hora)', category:'Consultoría', price:120, vat:21, description:'Sesión de consultoría 1:1 con Dani' },
  { id:'s2', name:'Auditoría de automatización',    category:'Consultoría', price:1800, vat:21, description:'Diagnóstico completo de procesos' },
  { id:'s3', name:'Implementación flujo n8n',       category:'Desarrollo',  price:2400, vat:21, description:'Flujo de automatización a medida' },
  { id:'s4', name:'Mantenimiento mensual',          category:'Retainer',    price:650, vat:21, description:'Soporte y ajustes recurrentes' },
  { id:'s5', name:'Estrategia de contenidos',       category:'Marketing',   price:1200, vat:21, description:'Plan editorial trimestral' },
  { id:'s6', name:'Gestión RRSS (pack mensual)',    category:'Marketing',   price:900, vat:21, description:'12 publicaciones + community' },
  { id:'s7', name:'Producción vídeo corto',         category:'Contenidos',  price:480, vat:21, description:'Pieza de hasta 90 segundos' },
  { id:'s8', name:'Landing page a medida',          category:'Desarrollo',  price:1500, vat:21, description:'Diseño + desarrollo responsive' },
];

// ============================================================
// INVOICES — ventas
// ============================================================
export const INVOICES = [
  { id:'f1',  number:'2026/042', clientId:'c1', issueDate: daysAgo(5),  dueDate: daysFromNow(25), base: 3200, vatPct: 21, total: 3872,  status:'pendiente', concept:'Estrategia Q2 + retainer' },
  { id:'f2',  number:'2026/041', clientId:'c3', issueDate: daysAgo(12), dueDate: daysFromNow(18), base: 1800, vatPct: 21, total: 2178,  status:'pendiente', concept:'Auditoría automatización' },
  { id:'f3',  number:'2026/040', clientId:'c2', issueDate: daysAgo(18), dueDate: daysFromNow(12), base: 2400, vatPct: 21, total: 2904,  status:'pendiente', concept:'Flujo n8n — catálogo' },
  { id:'f4',  number:'2026/039', clientId:'c1', issueDate: daysAgo(35), dueDate: daysAgo(5),      base: 650,  vatPct: 21, total: 786.5, status:'vencida',   concept:'Mantenimiento marzo' },
  { id:'f5',  number:'2026/038', clientId:'c6', issueDate: daysAgo(40), dueDate: daysAgo(10),     base: 1500, vatPct: 21, total: 1815,  status:'pagada',    concept:'Landing temporada' },
  { id:'f6',  number:'2026/037', clientId:'c4', issueDate: daysAgo(45), dueDate: daysAgo(15),     base: 900,  vatPct: 21, total: 1089,  status:'pagada',    concept:'RRSS marzo' },
  { id:'f7',  number:'2026/036', clientId:'c7', issueDate: daysAgo(52), dueDate: daysAgo(22),     base: 2200, vatPct: 21, total: 2662,  status:'pagada',    concept:'Producción 3 piezas' },
  { id:'f8',  number:'2026/035', clientId:'c5', issueDate: daysAgo(58), dueDate: daysAgo(28),     base: 1200, vatPct: 21, total: 1452,  status:'pagada',    concept:'Plan editorial' },
  { id:'f9',  number:'2026/034', clientId:'c21',issueDate: daysAgo(65), dueDate: daysAgo(35),     base: 3400, vatPct: 21, total: 4114,  status:'pagada',    concept:'Rebrand Q1' },
  { id:'f10', number:'2026/043', clientId:'c3', issueDate: daysAgo(1),  dueDate: daysFromNow(29), base: 650,  vatPct: 21, total: 786.5, status:'pendiente', concept:'Mantenimiento abril' },
  { id:'f11', number:'2026/044', clientId:'c19',issueDate: daysAgo(2),  dueDate: daysFromNow(28), base: 480,  vatPct: 21, total: 580.8, status:'pendiente', concept:'Vídeo corporativo' },
  { id:'f12', number:'2026/045', clientId:'c14',issueDate: TODAY,       dueDate: daysFromNow(30), base: 1200, vatPct: 21, total: 1452,  status:'borrador',  concept:'Plan editorial Q2' },
];

// ============================================================
// GASTOS / COMPRAS
// ============================================================
export const PURCHASES = [
  { id:'p1', supplierId:'c11', providerId:'c11', providerName:'Holded Technologies S.L.', number:'H-0421', concept:'Suscripción SaaS mensual', date: daysAgo(8),  base: 79,  vat: 16.59, total: 95.59, category:'Software', status:'pagada', source:'email', method:'Tarjeta' },
  { id:'p2', supplierId:'c12', providerId:'c12', providerName:'Figma Iberia S.L.',        number:'FG-2026-09', concept:'Design tools team seat', date: daysAgo(3), base: 135, vat: 28.35, total: 163.35, category:'Software', status:'pagada', source:'email', method:'Tarjeta' },
  { id:'p3', supplierId:'c13', providerId:'c13', providerName:'Paredes Asesores',         number:'PA-0012', concept:'Asesoría laboral abril',   date: daysAgo(5),  base: 280, vat: 58.8, total: 338.8,  category:'Servicios profesionales', status:'pendiente', source:'upload', method:'Transferencia' },
  { id:'p4', supplierId:'c22', providerId:'c22', providerName:'Google Cloud Spain',       number:'GCP-8822', concept:'Infraestructura cloud',    date: daysAgo(1),  base: 214, vat: 44.94, total: 258.94, category:'Infraestructura', status:'pagada', source:'email', method:'Domiciliado' },
  { id:'p5', supplierId:'c29', providerId:'c29', providerName:'Vodafone Empresas',        number:'VF-44201', concept:'Fibra + móvil empresa',    date: daysAgo(9),  base: 72,  vat: 15.12, total: 87.12,  category:'Telecomunicaciones', status:'pagada', source:'scan', method:'Domiciliado' },
  { id:'p6', supplierId:'c13', providerId:'c13', providerName:'Paredes Asesores',         number:'PA-0013', concept:'Gestoría abril',           date: daysAgo(12), base: 220, vat: 46.20, total: 266.20, category:'Servicios profesionales', status:'pagada', source:'upload', method:'Transferencia' },
];

// ============================================================
// TRANSACTIONS — timeline para dashboard
// ============================================================
export const TIMELINE = [
  { id:'t1', type:'invoice_sent',   when: daysAgo(1), title:'Factura 2026/043 emitida', subtitle:'Brío Salud Digital · 786,50 €', actor:'u1' },
  { id:'t2', type:'payment_in',     when: daysAgo(2), title:'Cobro recibido',            subtitle:'Ocre Arquitectura · 4.114 €',   actor:'u1' },
  { id:'t3', type:'expense',        when: daysAgo(3), title:'Gasto registrado',          subtitle:'Figma Iberia · 163,35 €',        actor:'u1' },
  { id:'t4', type:'task_done',      when: daysAgo(3), title:'Tarea completada',          subtitle:'María cerró "Landing temporada"', actor:'u2' },
  { id:'t5', type:'contact_new',    when: daysAgo(4), title:'Nuevo lead',                subtitle:'Raíz Cosmética Natural',         actor:'u1' },
  { id:'t6', type:'invoice_sent',   when: daysAgo(5), title:'Factura 2026/042 emitida', subtitle:'Lumbre Estudio · 3.872 €',       actor:'u1' },
  { id:'t7', type:'payment_in',     when: daysAgo(6), title:'Cobro recibido',            subtitle:'Cámara Oscura Films · 2.662 €', actor:'u1' },
  { id:'t8', type:'expense',        when: daysAgo(8), title:'Gasto registrado',          subtitle:'Paredes Asesores · 338,80 €',    actor:'u1' },
];

// ============================================================
// CASHFLOW series
// ============================================================
export const CASHFLOW = [
  { month:'nov', ingresos: 8200,  gastos: 3100 },
  { month:'dic', ingresos: 11400, gastos: 3400 },
  { month:'ene', ingresos: 9800,  gastos: 2800 },
  { month:'feb', ingresos: 12600, gastos: 3600 },
  { month:'mar', ingresos: 14800, gastos: 4200 },
  { month:'abr', ingresos: 10200, gastos: 3350 },
];

// ============================================================
// CLIENT SPACES (módulo tipo ClickUp)
// Cada cliente tiene sus módulos, cada módulo sus tareas.
// ============================================================
export const CLIENT_SPACES = [
  {
    id: 'c1',
    contactId: 'c1',
    name: 'Lumbre Estudio',
    logo: 'L', color: '#8C6A1E',
    sector: 'Branding',
    description: 'Agencia creativa boutique. Cliente estratégico.',
    activeSince: 'Ene 2025',
    modules: [
      { id:'m-estrategia',  icon:'📝', name:'Estrategia de contenidos', lastUpdated: daysAgo(1) },
      { id:'m-rrss',        icon:'📅', name:'Calendario RRSS',          lastUpdated: daysAgo(0) },
      { id:'m-onboarding',  icon:'🚀', name:'Onboarding',                lastUpdated: daysAgo(12) },
      { id:'m-passwords',   icon:'🔐', name:'Contraseñas',               lastUpdated: daysAgo(20) },
      { id:'m-reporting',   icon:'📊', name:'Reporting mensual',         lastUpdated: daysAgo(7) },
    ],
  },
  {
    id: 'c3',
    contactId: 'c3',
    name: 'Brío Salud Digital',
    logo: 'B', color: '#2F5A3D',
    sector: 'Salud',
    description: 'Plataforma de teleconsulta. Retainer + consultoría.',
    activeSince: 'Mar 2025',
    modules: [
      { id:'m-estrategia',  icon:'📝', name:'Estrategia de contenidos', lastUpdated: daysAgo(2) },
      { id:'m-rrss',        icon:'📅', name:'Calendario RRSS',          lastUpdated: daysAgo(1) },
      { id:'m-automation',  icon:'⚡', name:'Automatización CRM',       lastUpdated: daysAgo(4) },
      { id:'m-reporting',   icon:'📊', name:'Reporting mensual',         lastUpdated: daysAgo(10) },
    ],
  },
  {
    id: 'c2',
    contactId: 'c2',
    name: 'Canela Roja',
    logo: 'C', color: '#8C2E2E',
    sector: 'Retail / alimentación',
    description: 'Marca de especias y conservas gourmet.',
    activeSince: 'Jun 2025',
    modules: [
      { id:'m-rrss',        icon:'📅', name:'Calendario RRSS',          lastUpdated: daysAgo(3) },
      { id:'m-ecommerce',   icon:'🛒', name:'E-commerce',                lastUpdated: daysAgo(5) },
      { id:'m-onboarding',  icon:'🚀', name:'Onboarding',                lastUpdated: daysAgo(90) },
    ],
  },
  {
    id: 'c6',
    contactId: 'c6',
    name: 'Atelier Núria Vidal',
    logo: 'A', color: '#5A4D2E',
    sector: 'Moda / artesanía',
    description: 'Atelier de moda de autor. VIP.',
    activeSince: 'Sep 2025',
    modules: [
      { id:'m-estrategia',  icon:'📝', name:'Estrategia de contenidos', lastUpdated: daysAgo(6) },
      { id:'m-rrss',        icon:'📅', name:'Calendario RRSS',          lastUpdated: daysAgo(2) },
      { id:'m-reporting',   icon:'📊', name:'Reporting mensual',         lastUpdated: daysAgo(14) },
    ],
  },
];

// ============================================================
// TASKS — ricas, con subtareas, comentarios, custom fields
// ============================================================
export const STATUSES = [
  { id:'todo',     name:'Por hacer',   color:'#9A968D', bg:'#F0ECE2' },
  { id:'doing',    name:'En progreso', color:'#6A5ACD', bg:'#EBE8FB' },
  { id:'review',   name:'En revisión', color:'#C89B3C', bg:'#FAF1DC' },
  { id:'done',     name:'Hecho',       color:'#4A7C59', bg:'#E8F1EA' },
];
export const PRIORITIES = [
  { id:'urgente', name:'Urgente', color:'#B84545' },
  { id:'alta',    name:'Alta',    color:'#C89B3C' },
  { id:'media',   name:'Media',   color:'#6A5ACD' },
  { id:'baja',    name:'Baja',    color:'#9A968D' },
];
export const TAG_COLORS = {
  'copy':       '#EBE8FB',
  'vídeo':      '#FAF1DC',
  'diseño':     '#F5E1E1',
  'revisión':   '#E8F1EA',
  'cliente':    '#E4EEF7',
  'interno':    '#F0ECE2',
  'bug':        '#F5E1E1',
  'urgente':    '#F5E1E1',
  'onboarding': '#EBE8FB',
};

export function makeTask(opts) {
  return Object.assign({
    subtasks: [], checklists: [], comments: [], activity: [], tags: [], customFields: {}, progress: 0,
  }, opts);
}

// generate coherent tasks per client × module
export const TASKS = [
  // --- Lumbre / Estrategia contenidos ---
  makeTask({ id:'t-001', clientId:'c1', moduleId:'m-estrategia', title:'Plan editorial Q2 2026', status:'doing', priority:'alta', assignees:['u3','u1'], startDate: daysAgo(4), dueDate: daysFromNow(6), tags:['estratégico','copy'], progress: 45,
    description:'Definir 3 ejes narrativos para Q2 y mapear piezas por semana. Alinear con lanzamiento de mayo.',
    subtasks:[
      { id:'sub1', title:'Benchmark competidores', done:true,  assignee:'u3', dueDate: daysAgo(2) },
      { id:'sub2', title:'Workshop con cliente',   done:true,  assignee:'u1', dueDate: daysAgo(1) },
      { id:'sub3', title:'Mapa de contenidos 12 semanas', done:false, assignee:'u3', dueDate: daysFromNow(3) },
      { id:'sub4', title:'Validación con Núria',   done:false, assignee:'u3', dueDate: daysFromNow(6) },
    ],
    checklists:[ { id:'cl1', title:'Entregables', items:[{ id:'i1', text:'Documento de estrategia', done:true }, { id:'i2', text:'Calendario editorial exportable', done:false }, { id:'i3', text:'Briefing para diseño', done:false }] } ],
    comments:[
      { id:'cm1', userId:'u1', text:'Propongo que el eje 1 sea "craft" y el 2 "behind the scenes". Revísame la presentación.', when: daysAgo(2) },
      { id:'cm2', userId:'u3', text:'Preparo borrador para mañana. @María ¿me pasas el data del último trimestre?', when: daysAgo(1) },
    ],
    activity:[
      { id:'a1', userId:'u1', action:'creó la tarea', when: daysAgo(4) },
      { id:'a2', userId:'u3', action:'cambió el estado de Por hacer a En progreso', when: daysAgo(3) },
      { id:'a3', userId:'u1', action:'añadió @María López', when: daysAgo(2) },
    ],
    customFields: { 'Presupuesto': '3.200 €', 'Entregable': 'Deck + Sheet' },
  }),
  makeTask({ id:'t-002', clientId:'c1', moduleId:'m-estrategia', title:'Narrativa campaña verano', status:'todo', priority:'media', assignees:['u3'], startDate: daysFromNow(2), dueDate: daysFromNow(12), tags:['copy'], progress: 0, description:'Concepto creativo + copy madre para campaña junio.' }),
  makeTask({ id:'t-003', clientId:'c1', moduleId:'m-estrategia', title:'Revisión blog mayo',     status:'review', priority:'baja',  assignees:['u3','u1'], startDate: daysAgo(2), dueDate: daysFromNow(1), tags:['copy','revisión'], progress: 80 }),
  makeTask({ id:'t-004', clientId:'c1', moduleId:'m-estrategia', title:'Estructura newsletter mensual', status:'done', priority:'media', assignees:['u3'], startDate: daysAgo(15), dueDate: daysAgo(8), tags:['copy'], progress: 100 }),
  makeTask({ id:'t-005', clientId:'c1', moduleId:'m-estrategia', title:'SEO audit contenidos 2025', status:'done', priority:'alta',  assignees:['u5','u3'], startDate: daysAgo(22), dueDate: daysAgo(14), tags:['interno'], progress: 100 }),

  // --- Lumbre / RRSS ---
  makeTask({ id:'t-010', clientId:'c1', moduleId:'m-rrss', title:'Reel lanzamiento colección',    status:'doing',  priority:'urgente', assignees:['u4','u6'], startDate: daysAgo(1), dueDate: daysFromNow(2), tags:['vídeo','diseño'], progress: 60 }),
  makeTask({ id:'t-011', clientId:'c1', moduleId:'m-rrss', title:'Carrusel educativo #1',         status:'review', priority:'media',   assignees:['u6'],      startDate: daysAgo(3), dueDate: TODAY,           tags:['diseño','revisión'], progress: 90 }),
  makeTask({ id:'t-012', clientId:'c1', moduleId:'m-rrss', title:'Stories detrás de cámaras',     status:'todo',   priority:'baja',    assignees:['u6'],      startDate: daysFromNow(1), dueDate: daysFromNow(4), tags:['vídeo'], progress: 0 }),
  makeTask({ id:'t-013', clientId:'c1', moduleId:'m-rrss', title:'Planning semana 17',            status:'done',   priority:'media',   assignees:['u6'],      startDate: daysAgo(9), dueDate: daysAgo(5),      tags:['copy'], progress: 100 }),
  makeTask({ id:'t-014', clientId:'c1', moduleId:'m-rrss', title:'Análisis performance abril',    status:'todo',   priority:'alta',    assignees:['u2'],      startDate: daysFromNow(5), dueDate: daysFromNow(10), tags:['interno'], progress: 0 }),

  // --- Lumbre / Onboarding ---
  makeTask({ id:'t-020', clientId:'c1', moduleId:'m-onboarding', title:'Kick-off con equipo cliente', status:'done', priority:'alta',  assignees:['u1','u2'], startDate: daysAgo(90), dueDate: daysAgo(85), tags:['onboarding'], progress: 100 }),
  makeTask({ id:'t-021', clientId:'c1', moduleId:'m-onboarding', title:'Definición de objetivos 2026', status:'done', priority:'alta', assignees:['u1'],      startDate: daysAgo(82), dueDate: daysAgo(75), tags:['onboarding'], progress: 100 }),
  makeTask({ id:'t-022', clientId:'c1', moduleId:'m-onboarding', title:'Accesos y herramientas',       status:'done', priority:'media', assignees:['u2'],      startDate: daysAgo(75), dueDate: daysAgo(70), tags:['onboarding','interno'], progress: 100 }),

  // --- Brío Salud / Estrategia ---
  makeTask({ id:'t-100', clientId:'c3', moduleId:'m-estrategia', title:'Investigación audiencia B2B', status:'doing', priority:'alta', assignees:['u3'], startDate: daysAgo(5), dueDate: daysFromNow(3), tags:['copy','interno'], progress: 50,
    description:'Entrevistas con 5 médicos y 3 directores de clínica. Mapa de pains.',
    subtasks:[
      { id:'s1', title:'Guion entrevistas', done:true, assignee:'u3', dueDate: daysAgo(3) },
      { id:'s2', title:'5 entrevistas grabadas', done:false, assignee:'u3', dueDate: daysFromNow(1) },
      { id:'s3', title:'Documento de insights', done:false, assignee:'u3', dueDate: daysFromNow(3) },
    ]
  }),
  makeTask({ id:'t-101', clientId:'c3', moduleId:'m-estrategia', title:'Mensajería médicos vs pacientes', status:'todo', priority:'media', assignees:['u3','u1'], startDate: daysFromNow(4), dueDate: daysFromNow(10), tags:['copy'], progress: 0 }),
  makeTask({ id:'t-102', clientId:'c3', moduleId:'m-estrategia', title:'Plan editorial Q2',              status:'review', priority:'alta', assignees:['u3'], startDate: daysAgo(8), dueDate: TODAY, tags:['copy','revisión'], progress: 85 }),
  makeTask({ id:'t-103', clientId:'c3', moduleId:'m-estrategia', title:'Pillar post teleconsulta',       status:'done', priority:'media', assignees:['u3'], startDate: daysAgo(20), dueDate: daysAgo(10), tags:['copy'], progress: 100 }),

  // --- Brío Salud / RRSS ---
  makeTask({ id:'t-110', clientId:'c3', moduleId:'m-rrss', title:'Serie LinkedIn posts abril', status:'doing',  priority:'media', assignees:['u6','u3'], startDate: daysAgo(2), dueDate: daysFromNow(5), tags:['copy','diseño'], progress: 40 }),
  makeTask({ id:'t-111', clientId:'c3', moduleId:'m-rrss', title:'Vídeo testimonial Dr. Mora',  status:'review', priority:'urgente', assignees:['u4'],  startDate: daysAgo(6), dueDate: TODAY, tags:['vídeo','revisión'], progress: 95 }),
  makeTask({ id:'t-112', clientId:'c3', moduleId:'m-rrss', title:'Carrusel infografía 3',       status:'todo',   priority:'baja', assignees:['u6'],      startDate: daysFromNow(2), dueDate: daysFromNow(8), tags:['diseño'], progress: 0 }),
  makeTask({ id:'t-113', clientId:'c3', moduleId:'m-rrss', title:'Planning semana 18',          status:'todo',   priority:'media', assignees:['u6'],     startDate: daysFromNow(1), dueDate: daysFromNow(6), tags:['copy'], progress: 0 }),
  makeTask({ id:'t-114', clientId:'c3', moduleId:'m-rrss', title:'Reel día mundial de la salud', status:'done', priority:'alta', assignees:['u4','u6'], startDate: daysAgo(18), dueDate: daysAgo(12), tags:['vídeo'], progress: 100 }),

  // --- Brío Salud / Automation ---
  makeTask({ id:'t-120', clientId:'c3', moduleId:'m-automation', title:'Flujo notificación cita n8n', status:'doing', priority:'urgente', assignees:['u5'], startDate: daysAgo(3), dueDate: daysFromNow(1), tags:['interno','bug'], progress: 70 }),
  makeTask({ id:'t-121', clientId:'c3', moduleId:'m-automation', title:'Integración HubSpot → Google Sheets', status:'todo', priority:'alta', assignees:['u5'], startDate: daysFromNow(3), dueDate: daysFromNow(9), tags:['interno'], progress: 0 }),
  makeTask({ id:'t-122', clientId:'c3', moduleId:'m-automation', title:'Revisión fallos workflow cobros', status:'review', priority:'alta', assignees:['u5','u1'], startDate: daysAgo(2), dueDate: daysFromNow(1), tags:['bug','revisión'], progress: 80 }),

  // --- Canela Roja / RRSS ---
  makeTask({ id:'t-200', clientId:'c2', moduleId:'m-rrss', title:'Sesión fotos producto mayo',   status:'todo',  priority:'alta',    assignees:['u4','u6'], startDate: daysFromNow(4), dueDate: daysFromNow(11), tags:['diseño','vídeo'], progress: 0 }),
  makeTask({ id:'t-201', clientId:'c2', moduleId:'m-rrss', title:'Reel receta chef invitado',    status:'doing', priority:'urgente', assignees:['u4'],      startDate: daysAgo(2), dueDate: daysFromNow(1),  tags:['vídeo'], progress: 50 }),
  makeTask({ id:'t-202', clientId:'c2', moduleId:'m-rrss', title:'Calendario publicaciones abril', status:'done', priority:'media', assignees:['u6'],      startDate: daysAgo(25), dueDate: daysAgo(20), tags:['copy'], progress: 100 }),
  makeTask({ id:'t-203', clientId:'c2', moduleId:'m-rrss', title:'Carrusel maridajes',            status:'review', priority:'media', assignees:['u6'],     startDate: daysAgo(4), dueDate: TODAY,           tags:['diseño','revisión'], progress: 90 }),

  // --- Canela Roja / Ecommerce ---
  makeTask({ id:'t-210', clientId:'c2', moduleId:'m-ecommerce', title:'Revisión fichas producto top 20', status:'doing', priority:'alta', assignees:['u3','u5'], startDate: daysAgo(6), dueDate: daysFromNow(4), tags:['copy','cliente'], progress: 55 }),
  makeTask({ id:'t-211', clientId:'c2', moduleId:'m-ecommerce', title:'Landing Día de la Madre',          status:'todo',  priority:'urgente', assignees:['u5','u4'], startDate: daysFromNow(1), dueDate: daysFromNow(8), tags:['diseño'], progress: 0 }),
  makeTask({ id:'t-212', clientId:'c2', moduleId:'m-ecommerce', title:'Bug checkout IVA canario',         status:'review', priority:'urgente', assignees:['u5'], startDate: daysAgo(1), dueDate: daysFromNow(1), tags:['bug','urgente'], progress: 90 }),

  // --- Atelier Núria Vidal / Estrategia ---
  makeTask({ id:'t-300', clientId:'c6', moduleId:'m-estrategia', title:'Manifesto de marca refinado', status:'doing', priority:'media', assignees:['u3','u1'], startDate: daysAgo(4), dueDate: daysFromNow(5), tags:['copy'], progress: 50 }),
  makeTask({ id:'t-301', clientId:'c6', moduleId:'m-estrategia', title:'Storytelling capsula otoño', status:'todo',  priority:'alta',  assignees:['u3'],      startDate: daysFromNow(3), dueDate: daysFromNow(10), tags:['copy'], progress: 0 }),
  makeTask({ id:'t-302', clientId:'c6', moduleId:'m-estrategia', title:'Press kit renovado',         status:'review', priority:'media', assignees:['u4','u3'], startDate: daysAgo(6), dueDate: daysFromNow(1), tags:['diseño','revisión'], progress: 85 }),

  // --- Atelier Núria Vidal / RRSS ---
  makeTask({ id:'t-310', clientId:'c6', moduleId:'m-rrss', title:'Editorial fotográfico primavera', status:'doing', priority:'alta', assignees:['u4','u6'], startDate: daysAgo(3), dueDate: daysFromNow(6), tags:['diseño','vídeo'], progress: 45 }),
  makeTask({ id:'t-311', clientId:'c6', moduleId:'m-rrss', title:'Entrevista cliente invitado',     status:'todo',  priority:'baja', assignees:['u6'],     startDate: daysFromNow(6), dueDate: daysFromNow(14), tags:['vídeo'], progress: 0 }),
  makeTask({ id:'t-312', clientId:'c6', moduleId:'m-rrss', title:'Reposiciones reels top',           status:'done', priority:'baja', assignees:['u6'],     startDate: daysAgo(14), dueDate: daysAgo(8),  tags:['vídeo'], progress: 100 }),
];

// ============================================================
// DEPENDENCIES for gantt
// ============================================================
export const TASK_DEPENDENCIES = [
  ['t-001', 't-002'], ['t-002','t-003'], ['t-020','t-021'], ['t-021','t-022'],
  ['t-100','t-101'], ['t-101','t-102'], ['t-210','t-211'],
];

// ============================================================
// OBJETIVOS mes
// ============================================================
export const OBJECTIVES = [
  { id:'o1', title:'Facturación abril', target: 18000, current: 12832, unit:'€' },
  { id:'o2', title:'Nuevos clientes',   target: 3, current: 2, unit:'' },
  { id:'o3', title:'Tareas completadas', target: 45, current: 28, unit:'' },
  { id:'o4', title:'Horas facturables', target: 120, current: 86, unit:'h' },
];

// ============================================================
// IMPUESTOS próximos
// ============================================================
export const TAX_MODELS = [
  { id:'m303', code:'303', name:'Modelo 303', description:'IVA trimestral',        period:'Q1 2026', dueDate: daysFromNow(8),  amount: 2640.35, status:'pendiente' },
  { id:'m130', code:'130', name:'Modelo 130', description:'IRPF pagos fraccionados', period:'Q1 2026', dueDate: daysFromNow(8),  amount: 1245.12, status:'pendiente' },
  { id:'m111', code:'111', name:'Modelo 111', description:'Retenciones trabajadores', period:'Q1 2026', dueDate: daysFromNow(8), amount: 872.00,  status:'pendiente' },
  { id:'m115', code:'115', name:'Modelo 115', description:'Retenciones alquileres', period:'Q1 2026', dueDate: daysFromNow(8), amount: 180.00,  status:'en preparación' },
  { id:'m349', code:'349', name:'Modelo 349', description:'Operaciones intracomunitarias', period:'Q1 2026', dueDate: daysFromNow(8), amount: 0, status:'en preparación' },
  { id:'m347', code:'347', name:'Modelo 347', description:'Operaciones con terceros', period:'2025',   dueDate: daysAgo(50), presentedDate: daysAgo(48), amount: 0, status:'presentado', ref:'ES347-2025-4471125' },
  { id:'m200', code:'200', name:'Modelo 200', description:'Impuesto Sociedades',    period:'2025',    dueDate: daysFromNow(90), amount: 4280.00, status:'en preparación' },
];

// ============================================================
// CONTABILIDAD — asientos (libro diario)
// ============================================================
export const ACCOUNTING = [
  { id:'as1', number:'A-0142', date: daysAgo(1),  account:'430000', accountName:'Clientes — Brío Salud',     concept:'Emisión factura 2026/043',   debit: 786.50, credit: 0,      docRef:'FV 2026/043' },
  { id:'as2', number:'A-0142', date: daysAgo(1),  account:'705000', accountName:'Prestaciones de servicios', concept:'Mantenimiento abril',         debit: 0,      credit: 650.00, docRef:'FV 2026/043' },
  { id:'as3', number:'A-0142', date: daysAgo(1),  account:'477000', accountName:'H.P. IVA repercutido',      concept:'IVA 21%',                     debit: 0,      credit: 136.50, docRef:'FV 2026/043' },
  { id:'as4', number:'A-0141', date: daysAgo(2),  account:'572000', accountName:'Bancos — BBVA Empresa',     concept:'Cobro Ocre Arquitectura',     debit: 4114.00,credit: 0,      docRef:'FV 2026/034' },
  { id:'as5', number:'A-0141', date: daysAgo(2),  account:'430000', accountName:'Clientes — Ocre Arquit.',   concept:'Aplicación cobro',            debit: 0,      credit: 4114.00,docRef:'FV 2026/034' },
  { id:'as6', number:'A-0140', date: daysAgo(3),  account:'629000', accountName:'Otros servicios',           concept:'Figma Iberia · seats',         debit: 135.00, credit: 0,      docRef:'FC FG-2026-09' },
  { id:'as7', number:'A-0140', date: daysAgo(3),  account:'472000', accountName:'H.P. IVA soportado',        concept:'IVA 21%',                     debit: 28.35,  credit: 0,      docRef:'FC FG-2026-09' },
  { id:'as8', number:'A-0140', date: daysAgo(3),  account:'410000', accountName:'Proveedores — Figma',       concept:'Factura recibida',            debit: 0,      credit: 163.35, docRef:'FC FG-2026-09' },
  { id:'as9', number:'A-0139', date: daysAgo(5),  account:'623000', accountName:'Servicios profesionales',   concept:'Asesoría laboral abril',      debit: 280.00, credit: 0,      docRef:'FC PA-0012' },
  { id:'as10',number:'A-0139', date: daysAgo(5),  account:'472000', accountName:'H.P. IVA soportado',        concept:'IVA 21%',                     debit: 58.80,  credit: 0,      docRef:'FC PA-0012' },
  { id:'as11',number:'A-0139', date: daysAgo(5),  account:'410000', accountName:'Proveedores — Paredes',     concept:'Factura recibida',            debit: 0,      credit: 338.80, docRef:'FC PA-0012' },
  { id:'as12',number:'A-0138', date: daysAgo(5),  account:'430000', accountName:'Clientes — Lumbre Estudio', concept:'Estrategia Q2 + retainer',    debit: 3872.00,credit: 0,      docRef:'FV 2026/042' },
  { id:'as13',number:'A-0138', date: daysAgo(5),  account:'705000', accountName:'Prestaciones de servicios', concept:'Servicios facturados',        debit: 0,      credit: 3200.00,docRef:'FV 2026/042' },
  { id:'as14',number:'A-0138', date: daysAgo(5),  account:'477000', accountName:'H.P. IVA repercutido',      concept:'IVA 21%',                     debit: 0,      credit: 672.00, docRef:'FV 2026/042' },
  { id:'as15',number:'A-0137', date: daysAgo(8),  account:'629000', accountName:'Suministros',               concept:'Vodafone empresa',            debit: 72.00,  credit: 0,      docRef:'FC VF-44201' },
  { id:'as16',number:'A-0137', date: daysAgo(8),  account:'472000', accountName:'H.P. IVA soportado',        concept:'IVA 21%',                     debit: 15.12,  credit: 0,      docRef:'FC VF-44201' },
  { id:'as17',number:'A-0137', date: daysAgo(8),  account:'410000', accountName:'Proveedores — Vodafone',    concept:'Factura recibida',            debit: 0,      credit: 87.12,  docRef:'FC VF-44201' },
];

// ============================================================
// BANCOS
// ============================================================
export const BANK_ACCOUNTS = [
  { id:'b1', name:'BBVA Empresa',   logo:'BBVA', color:'#004481', iban:'ES21 0182 **** 9023', balance: 32450.12, synced: true,  lastSync: daysAgo(0) },
  { id:'b2', name:'CaixaBank Pro',  logo:'LCB',  color:'#02458F', iban:'ES55 2100 **** 1145', balance: 14220.78, synced: true,  lastSync: daysAgo(0) },
  { id:'b3', name:'Wise EUR',       logo:'W',    color:'#9FE870', iban:'BE84 9677 **** 5523', balance:  1645.90, synced: false, lastSync: daysAgo(3) },
];

export const BANK_MOVEMENTS = [
  { id:'bm1', accountId:'b1', date: daysAgo(0), concept:'Transferencia Lumbre Estudio',  category:'Ingresos',    amount:  3872.00, matched: true  },
  { id:'bm2', accountId:'b1', date: daysAgo(1), concept:'Transferencia Ocre Arquit.',    category:'Ingresos',    amount:  4114.00, matched: true  },
  { id:'bm3', accountId:'b1', date: daysAgo(2), concept:'Pago Figma · seats',            category:'Software',    amount:  -163.35, matched: true  },
  { id:'bm4', accountId:'b2', date: daysAgo(3), concept:'Nómina María López',            category:'Nóminas',     amount: -2340.00, matched: true  },
  { id:'bm5', accountId:'b1', date: daysAgo(4), concept:'Cobro ATELIER NÚRIA VIDAL',     category:'Ingresos',    amount:  1815.00, matched: false },
  { id:'bm6', accountId:'b1', date: daysAgo(5), concept:'Domiciliación Vodafone',        category:'Telecomunicaciones', amount: -87.12, matched: true  },
  { id:'bm7', accountId:'b2', date: daysAgo(6), concept:'Google Cloud · infra',          category:'Infraestructura', amount: -258.94, matched: true  },
  { id:'bm8', accountId:'b1', date: daysAgo(7), concept:'Devolución Amazon Business',    category:'Ingresos',    amount:    48.90, matched: false },
  { id:'bm9', accountId:'b3', date: daysAgo(8), concept:'Pago contratista Pablo V.',     category:'Freelancers', amount:  -820.00, matched: false },
  { id:'bm10',accountId:'b1', date: daysAgo(9), concept:'Ingreso efectivo',              category:'Ingresos',    amount:   320.00, matched: false },
  { id:'bm11',accountId:'b2', date: daysAgo(10),concept:'Comisión mantenimiento cuenta', category:'Bancarios',   amount:   -18.00, matched: true  },
  { id:'bm12',accountId:'b1', date: daysAgo(11),concept:'Cobro CÁMARA OSCURA FILMS',     category:'Ingresos',    amount:  2662.00, matched: true  },
];

// ============================================================
// ANALÍTICA
// ============================================================
export const ANALYTICS_MONTHLY = [
  { month:'may', value: 9800,  actual: true },
  { month:'jun', value: 11200, actual: true },
  { month:'jul', value: 7400,  actual: true },
  { month:'ago', value: 5600,  actual: true },
  { month:'sep', value: 10800, actual: true },
  { month:'oct', value: 12400, actual: true },
  { month:'nov', value: 11600, actual: true },
  { month:'dic', value: 13800, actual: true },
  { month:'ene', value: 10900, actual: true },
  { month:'feb', value: 13200, actual: true },
  { month:'mar', value: 16400, actual: true },
  { month:'abr', value: 14200, actual: false },
];

export const ANALYTICS_SERVICES = [
  { name:'Consultoría',   value: 48200, color:'#6A5ACD' },
  { name:'Desarrollo',    value: 38600, color:'#2A6FB3' },
  { name:'Retainer',      value: 26400, color:'#4A7C59' },
  { name:'Marketing',     value: 18400, color:'#C89B3C' },
  { name:'Contenidos',    value: 11200, color:'#B84545' },
];

export const ANALYTICS_CATEGORIES = [
  { name:'Nóminas',                 amount: 14200, color:'#6A5ACD' },
  { name:'Servicios profesionales', amount:  3220, color:'#4A7C59' },
  { name:'Software',                amount:  2180, color:'#2A6FB3' },
  { name:'Infraestructura',         amount:  1420, color:'#C89B3C' },
  { name:'Telecomunicaciones',      amount:   680, color:'#B84545' },
  { name:'Otros',                   amount:   540, color:'#9A968D' },
];

// ============================================================
// VENTAS — presupuestos, proformas, líneas, pagos, actividad
// ============================================================
export const QUOTE_STATUSES = [
  { id:'borrador',   name:'Borrador',    color:'#9A968D', bg:'#F0ECE2' },
  { id:'enviado',    name:'Enviado',     color:'#6A5ACD', bg:'#EBE8FB' },
  { id:'negociando', name:'Negociando',  color:'#C89B3C', bg:'#FAF1DC' },
  { id:'aceptado',   name:'Aceptado',    color:'#4A7C59', bg:'#E8F1EA' },
  { id:'rechazado',  name:'Rechazado',   color:'#B84545', bg:'#F5E1E1' },
];

export const QUOTES = [
  { id:'q1',  number:'PR-2026-012', clientId:'c1',  concept:'Rediseño web + identidad',     amount: 12400, status:'negociando', issueDate: daysAgo(4),  expireDate: daysFromNow(10), owner:'u1', probability: 70, viewed: true, viewCount: 3 },
  { id:'q2',  number:'PR-2026-011', clientId:'c3',  concept:'Integración CRM + dashboards', amount: 8600,  status:'enviado',    issueDate: daysAgo(2),  expireDate: daysFromNow(13), owner:'u1', probability: 50, viewed: true, viewCount: 1 },
  { id:'q3',  number:'PR-2026-010', clientId:'c9',  concept:'Branding y guía de marca',     amount: 6200,  status:'enviado',    issueDate: daysAgo(6),  expireDate: daysFromNow(9),  owner:'u1', probability: 45, viewed: false },
  { id:'q4',  number:'PR-2026-009', clientId:'c21', concept:'Campaña primavera',            amount: 4800,  status:'aceptado',   issueDate: daysAgo(12), expireDate: daysFromNow(3),  owner:'u1', probability: 100, viewed: true, viewCount: 5, acceptedDate: daysAgo(2) },
  { id:'q5',  number:'PR-2026-008', clientId:'c7',  concept:'Producción vídeo + fotografía',amount: 7400,  status:'negociando', issueDate: daysAgo(8),  expireDate: daysFromNow(7),  owner:'u2', probability: 60, viewed: true, viewCount: 2 },
  { id:'q6',  number:'PR-2026-007', clientId:'c23', concept:'Landing + ads setup',          amount: 3200,  status:'aceptado',   issueDate: daysAgo(18), expireDate: daysAgo(3),     owner:'u1', probability: 100, viewed: true, viewCount: 4, acceptedDate: daysAgo(10) },
  { id:'q7',  number:'PR-2026-006', clientId:'c17', concept:'E-commerce Shopify + SEO',     amount: 9800,  status:'negociando', issueDate: daysAgo(10), expireDate: daysFromNow(5),  owner:'u5', probability: 55, viewed: true, viewCount: 2 },
  { id:'q8',  number:'PR-2026-005', clientId:'c10', concept:'Rebrand bufete legal',         amount: 14200, status:'rechazado',  issueDate: daysAgo(35), expireDate: daysAgo(15),    owner:'u1', probability: 0, viewed: true, rejectedDate: daysAgo(20), rejectReason:'Fuera de presupuesto' },
  { id:'q9',  number:'PR-2026-004', clientId:'c24', concept:'Clínica · web + reservas',     amount: 5600,  status:'rechazado',  issueDate: daysAgo(45), expireDate: daysAgo(15),    owner:'u5', probability: 0, viewed: true, rejectedDate: daysAgo(22), rejectReason:'Se quedaron con proveedor local' },
  { id:'q10', number:'PR-2026-013', clientId:'c5',  concept:'Optimización conversión',      amount: 2800,  status:'borrador',   issueDate: TODAY,      expireDate: daysFromNow(30), owner:'u1', probability: 30, viewed: false },
  { id:'q11', number:'PR-2026-014', clientId:'c18', concept:'Plan estratégico anual',       amount: 11600, status:'borrador',   issueDate: TODAY,      expireDate: daysFromNow(30), owner:'u1', probability: 40, viewed: false },
];

export const PROFORMAS = [
  { id:'pf1', number:'PF-2026-008', clientId:'c1',  concept:'Anticipo 40% · rediseño web',   amount: 4960,  status:'pendiente', issueDate: daysAgo(3),  validUntil: daysFromNow(11), linkedQuoteId:'q1' },
  { id:'pf2', number:'PF-2026-007', clientId:'c3',  concept:'Retainer abril · pre-pago',     amount: 2178,  status:'facturada', issueDate: daysAgo(14), validUntil: daysAgo(2),      linkedInvoiceId:'f2' },
  { id:'pf3', number:'PF-2026-006', clientId:'c21', concept:'Anticipo campaña primavera',    amount: 1920,  status:'cobrada',   issueDate: daysAgo(10), validUntil: daysFromNow(5),  paidDate: daysAgo(6), linkedQuoteId:'q4' },
  { id:'pf4', number:'PF-2026-005', clientId:'c7',  concept:'Anticipo producción audiovisual',amount: 2960, status:'pendiente', issueDate: daysAgo(5),  validUntil: daysFromNow(10), linkedQuoteId:'q5' },
  { id:'pf5', number:'PF-2026-004', clientId:'c23', concept:'Landing · pago al 50%',         amount: 1280,  status:'cobrada',   issueDate: daysAgo(16), validUntil: daysFromNow(0),  paidDate: daysAgo(12), linkedQuoteId:'q6' },
];

export const INVOICE_LINES = {
  'f1': [
    { id:'l1', description:'Plan editorial Q2 2026 — 12 semanas', quantity: 1, price: 1200, discount: 0, vat: 21 },
    { id:'l2', description:'Consultoría estratégica (8h)', quantity: 8, price: 120, discount: 0, vat: 21 },
    { id:'l3', description:'Retainer mensual · abril', quantity: 1, price: 650, discount: 0, vat: 21 },
    { id:'l4', description:'Descuento fidelidad', quantity: 1, price: 290, discount: 100, vat: 21 },
  ],
  'f2': [{ id:'l1', description:'Auditoría de automatización completa', quantity: 1, price: 1800, discount: 0, vat: 21 }],
  'f3': [
    { id:'l1', description:'Diseño flujo n8n — 3 escenarios', quantity: 1, price: 1800, discount: 0, vat: 21 },
    { id:'l2', description:'Implementación y testing', quantity: 1, price: 600, discount: 0, vat: 21 },
  ],
  'f10': [{ id:'l1', description:'Mantenimiento abril · Brío Salud', quantity: 1, price: 650, discount: 0, vat: 21 }],
  'f4':  [{ id:'l1', description:'Mantenimiento marzo · Lumbre',    quantity: 1, price: 650, discount: 0, vat: 21 }],
  'f5':  [{ id:'l1', description:'Landing temporada — diseño + desarrollo', quantity: 1, price: 1500, discount: 0, vat: 21 }],
};

export const INVOICE_PAYMENTS = {
  'f5': [{ id:'pay1', date: daysAgo(8),  amount: 1815, method:'Transferencia', ref:'TRF-20210' }],
  'f6': [{ id:'pay2', date: daysAgo(14), amount: 1089, method:'Transferencia', ref:'TRF-20180' }],
  'f7': [{ id:'pay3', date: daysAgo(22), amount: 1331, method:'Transferencia', ref:'TRF-20150' }, { id:'pay4', date: daysAgo(10), amount: 1331, method:'Transferencia', ref:'TRF-20198' }],
  'f8': [{ id:'pay5', date: daysAgo(28), amount: 1452, method:'Transferencia', ref:'TRF-20099' }],
  'f9': [{ id:'pay6', date: daysAgo(35), amount: 4114, method:'Transferencia', ref:'TRF-20020' }],
};

export const INVOICE_ACTIVITY = {
  'f1': [
    { id:'a1', when: daysAgo(5), userId:'u1', action:'creó la factura' },
    { id:'a2', when: daysAgo(5), userId:'u1', action:'envió la factura por email a admin@lumbreestudio.com' },
    { id:'a3', when: daysAgo(4), userId:null, action:'el cliente abrió el email' },
    { id:'a4', when: daysAgo(3), userId:null, action:'el cliente descargó el PDF' },
    { id:'a5', when: daysAgo(1), userId:'u1', action:'añadió nota: "Seguimiento programado para viernes"' },
  ],
  'f5': [
    { id:'a1', when: daysAgo(40), userId:'u1', action:'creó la factura' },
    { id:'a2', when: daysAgo(40), userId:'u1', action:'envió la factura' },
    { id:'a3', when: daysAgo(8),  userId:'u1', action:'registró cobro de 1.815 €' },
    { id:'a4', when: daysAgo(8),  userId:'u1', action:'marcó como pagada' },
  ],
};

export const RECURRING_INVOICES = [
  { id:'r1', client:'Lumbre Estudio S.L.',   concept:'Retainer mensual · estrategia', amount: 650,  freq:'Mensual', next: daysFromNow(8),  active: true,  issued: 4 },
  { id:'r2', client:'Brío Salud Digital',    concept:'Mantenimiento web + soporte',  amount: 650,  freq:'Mensual', next: daysFromNow(14), active: true,  issued: 3 },
  { id:'r3', client:'Canela Roja S.A.',      concept:'Gestión RRSS · 12 publicaciones', amount: 900, freq:'Mensual', next: daysFromNow(6),  active: true,  issued: 4 },
  { id:'r4', client:'Atelier Núria Vidal',   concept:'Community + contenidos',       amount: 1200, freq:'Mensual', next: daysFromNow(12), active: true,  issued: 2 },
  { id:'r5', client:'Sílex Ingeniería S.L.', concept:'Licencia anual · plataforma',  amount: 2400, freq:'Anual',   next: daysFromNow(95), active: true,  issued: 1 },
  { id:'r6', client:'Pulso Running Co.',     concept:'SEO mensual',                  amount: 480,  freq:'Mensual', next: daysFromNow(18), active: false, issued: 6 },
];

export const PAYMENT_BATCHES = [
  { ref:'COB-2026-04', date: daysAgo(5),  count: 6, total: 12450.80, status:'cobrada' },
  { ref:'COB-2026-03', date: daysAgo(35), count: 5, total: 9820.30,  status:'cobrada' },
  { ref:'COB-2026-02', date: daysAgo(65), count: 4, total: 6420.50,  status:'cobrada' },
];

// ============================================================
// Global export
// ============================================================
