/**
 * Helper para subir y borrar archivos del bucket `expense-scans` de Supabase.
 * Bucket público: el path es no-adivinable (UUID) y el publicUrl
 * sirve directamente para mostrar el documento.
 */
import { supabase } from "@/lib/supabase/client";

const BUCKET = "expense-scans";

const newPath = (filename: string) => {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  // 2026/04/uuid_filename.ext  (organizado por año/mes)
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${yyyy}/${mm}/${uuid}_${safe}`;
};

export interface UploadResult {
  path: string;       // ruta dentro del bucket
  publicUrl: string;  // URL pública para mostrar/descargar
  size: number;
  mediaType: string;
}

export async function uploadScan(file: File): Promise<UploadResult> {
  const path = newPath(file.name);
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
  if (upErr) throw upErr;

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return {
    path,
    publicUrl: urlData.publicUrl,
    size: file.size,
    mediaType: file.type || "application/octet-stream",
  };
}

/** Borra un archivo del bucket. Útil si el usuario descarta el escaneo. */
export async function deleteScan(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

/** Devuelve la URL pública de un path ya guardado. */
export function getScanUrl(path: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
