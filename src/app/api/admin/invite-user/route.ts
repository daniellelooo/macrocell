import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const VALID_ROLES = ["admin", "vendedor", "gestor_inventario"] as const;

export async function POST(req: NextRequest) {
  // 1. Verificar que el llamante es admin
  const cookieStore = await cookies();
  const supabaseCaller = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
  const { data: { user } } = await supabaseCaller.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabaseCaller
    .from("profiles")
    .select("role, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && !profile.is_admin)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  // 2. Parsear body
  const body = await req.json();
  const email: string = body.email?.trim();
  const password: string = body.password?.trim();
  const fullName: string = body.full_name?.trim() ?? "";
  const role: string = body.role ?? "vendedor";

  if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres" }, { status: 400 });
  }
  if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number])) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  // 3. Crear usuario con service role key (email ya confirmado, sin magic link)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, initial_role: role },
  });

  if (createErr) {
    return NextResponse.json({ error: createErr.message }, { status: 400 });
  }

  // 4. Upsert perfil con nombre y rol (el trigger handle_new_user ya leyó initial_role
  //    desde user_metadata, pero hacemos upsert defensivo por si fallara).
  if (created?.user?.id) {
    const { error: upsertErr } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: created.user.id,
        full_name: fullName,
        role,
        is_admin: role === "admin",
      });
    if (upsertErr) {
      return NextResponse.json(
        { error: `Usuario creado pero rol no asignado: ${upsertErr.message}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
