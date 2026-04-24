import { supabase } from "@/lib/supabase/client";

export interface Module {
  id: string;
  clientId: string;
  icon: string | null;
  name: string;
  lastUpdated: Date | null;
}

export interface ClientSpace {
  id: string;
  contactId: string | null;
  name: string;
  logo: string | null;
  color: string | null;
  sector: string | null;
  description: string | null;
  activeSince: string | null;
  modules: Module[];
}

export interface NewClientSpace {
  id?: string;
  contactId?: string | null;
  name: string;
  logo?: string | null;
  color?: string | null;
  sector?: string | null;
  description?: string | null;
  activeSince?: string | null;
}

export interface NewModule {
  id?: string;
  clientId: string;
  icon?: string | null;
  name: string;
}

// ---- row <-> model ----
const spaceFromRow = (r: any): ClientSpace => ({
  id: r.id,
  contactId: r.contact_id,
  name: r.name,
  logo: r.logo,
  color: r.color,
  sector: r.sector,
  description: r.description,
  activeSince: r.active_since,
  modules: [],
});

const moduleFromRow = (r: any): Module => ({
  id: r.id,
  clientId: r.client_id,
  icon: r.icon,
  name: r.name,
  lastUpdated: r.last_updated ? new Date(r.last_updated) : null,
});

const spaceToRow = (s: Partial<ClientSpace>) => {
  const r: Record<string, unknown> = {};
  if (s.id !== undefined) r.id = s.id;
  if (s.contactId !== undefined) r.contact_id = s.contactId;
  if (s.name !== undefined) r.name = s.name;
  if (s.logo !== undefined) r.logo = s.logo;
  if (s.color !== undefined) r.color = s.color;
  if (s.sector !== undefined) r.sector = s.sector;
  if (s.description !== undefined) r.description = s.description;
  if (s.activeSince !== undefined) r.active_since = s.activeSince;
  return r;
};

// ---- fetches ----
export async function fetchClientSpaces(): Promise<ClientSpace[]> {
  const [spacesRes, modulesRes] = await Promise.all([
    supabase.from("client_spaces").select("*").order("name"),
    supabase.from("modules").select("*"),
  ]);
  if (spacesRes.error) throw spacesRes.error;
  if (modulesRes.error) throw modulesRes.error;
  const spaces = (spacesRes.data || []).map(spaceFromRow);
  const modules = (modulesRes.data || []).map(moduleFromRow);
  const byClient = new Map<string, Module[]>();
  modules.forEach((m) => {
    const arr = byClient.get(m.clientId) || [];
    arr.push(m);
    byClient.set(m.clientId, arr);
  });
  spaces.forEach((s) => { s.modules = byClient.get(s.id) || []; });
  return spaces;
}

export async function createClientSpace(input: NewClientSpace): Promise<ClientSpace> {
  const id = input.id || `cs-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const { data, error } = await supabase
    .from("client_spaces")
    .insert(spaceToRow({ ...input, id }))
    .select()
    .single();
  if (error) throw error;
  const space = spaceFromRow(data);
  return space;
}

export async function updateClientSpace(id: string, patch: Partial<ClientSpace>): Promise<ClientSpace> {
  const { data, error } = await supabase
    .from("client_spaces")
    .update(spaceToRow(patch))
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return spaceFromRow(data);
}

export async function deleteClientSpace(id: string): Promise<void> {
  const { error } = await supabase.from("client_spaces").delete().eq("id", id);
  if (error) throw error;
}

// ---- modules ----
export async function createModule(input: NewModule): Promise<Module> {
  const id = input.id || `m-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
  const { data, error } = await supabase
    .from("modules")
    .insert({
      id,
      client_id: input.clientId,
      icon: input.icon ?? null,
      name: input.name,
      last_updated: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return moduleFromRow(data);
}

export async function deleteModule(clientId: string, moduleId: string): Promise<void> {
  const { error } = await supabase
    .from("modules")
    .delete()
    .eq("client_id", clientId)
    .eq("id", moduleId);
  if (error) throw error;
}
