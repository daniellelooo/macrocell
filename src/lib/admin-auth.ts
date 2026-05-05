"use client";

import { getSupabaseBrowserClient } from "./supabase/client";

/**
 * Autenticación admin via Supabase Auth.
 *
 * - El cliente `@supabase/ssr` persiste la sesión en cookies (no en
 *   localStorage), así que `isAuthed()` consulta `supabase.auth.getSession()`
 *   directamente. Es async — cualquier consumidor debe `await`.
 * - Las RLS policies restringen las operaciones por rol del perfil
 *   (admin / vendedor / gestor_inventario). Estar autenticado no implica
 *   acceso a operaciones administrativas.
 */

export type AdminCredentials = {
  username: string; // email en Supabase Auth
  password: string;
};

export async function login(creds: AdminCredentials): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: creds.username,
    password: creds.password,
  });
  return !error;
}

export async function logout(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
}

/**
 * Devuelve true si hay una sesión válida vigente.
 * Async — Supabase `@supabase/ssr` persiste en cookies y verificar la sesión
 * requiere consultar el cliente.
 */
export async function isAuthed(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return false;
  return true;
}

export async function getCurrentUserEmail(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}
