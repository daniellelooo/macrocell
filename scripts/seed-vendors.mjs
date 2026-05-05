import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Tiny .env.local parser (avoids needing dotenv as a dep)
const env = Object.fromEntries(
  readFileSync(resolve(".env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, "")];
    })
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const VENDORS = [
  { email: "andres.molina@macrocell-test.co", full_name: "Andrés Molina", phone: "+573114567890" },
  { email: "valentina.cardona@macrocell-test.co", full_name: "Valentina Cardona", phone: "+573157891234" },
  { email: "juan.pereira@macrocell-test.co", full_name: "Juan Pereira", phone: "+573209876543" },
  { email: "camila.osorio@macrocell-test.co", full_name: "Camila Osorio", phone: "+573012345678" },
];

const created = [];
for (const v of VENDORS) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("full_name", v.full_name)
    .maybeSingle();
  if (existing) {
    console.log(`SKIP: ${v.full_name} already exists (${existing.id}, role=${existing.role})`);
    created.push({ ...v, id: existing.id });
    continue;
  }

  const { data: userData, error: ue } = await supabase.auth.admin.createUser({
    email: v.email,
    password: "Demo1234!",
    email_confirm: true,
    user_metadata: { full_name: v.full_name, initial_role: "vendedor" },
  });
  if (ue) { console.error(`ERROR creating ${v.full_name}:`, ue.message); continue; }

  await supabase.from("profiles").upsert({
    id: userData.user.id,
    full_name: v.full_name,
    role: "vendedor",
    is_admin: false,
    phone: v.phone,
  });
  console.log(`OK: ${v.full_name} (${userData.user.id})`);
  created.push({ ...v, id: userData.user.id });
}

console.log("\nVendors ready:");
for (const v of created) console.log(`  ${v.full_name.padEnd(22)} ${v.email.padEnd(42)} id=${v.id}`);
