#!/usr/bin/env node

/**
 * Test Supabase Connection
 * Vérifie que les clés d'authentification et la connexion fonctionnent
 */

const fs = require("fs");
const path = require("path");

// Load .env.local manually
const envPath = path.join(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, ...rest] = line.split("=");
    if (key && !key.startsWith("#")) {
      process.env[key.trim()] = rest.join("=").trim();
    }
  });
}

async function testSupabaseConnection() {
  console.log("🔍 Vérification de la configuration Supabase...\n");

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("✓ Variables d'environnement :");
  console.log(`  - NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? "✅ Défini" : "❌ Manquant"}`);
  console.log(`  - NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? "✅ Défini" : "❌ Manquant"}`);
  console.log(`  - SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceRoleKey ? "✅ Défini" : "❌ Manquant"}`);

  if (!supabaseUrl || !supabaseAnonKey) {
    console.log("\n❌ Variables d'environnement manquantes !");
    process.exit(1);
  }

  try {
    // Try to import Supabase
    const { createClient } = require("@supabase/supabase-js");
    console.log("\n✓ Supabase JS importé avec succès");

    // Try to create a client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log("✓ Client Supabase créé");

    // Try to fetch tenants
    const { data, error } = await supabase.from("tenants").select("*").limit(1);

    if (error) {
      console.log(`\n⚠️  Erreur lors de la requête : ${error.message}`);
      console.log("   Les tables n'existent peut-être pas encore.");
      console.log("   👉 Exécute le schéma SQL dans Supabase SQL Editor d'abord !");
    } else {
      console.log("\n✅ Connexion Supabase réussie !");
      console.log(`   Nombre de tenants trouvés: ${data?.length || 0}`);
    }
  } catch (err) {
    console.log(`\n❌ Erreur : ${err.message}`);
    process.exit(1);
  }

  console.log("\n📋 Prochaines étapes :");
  console.log("  1. Exécute le schéma SQL dans Supabase : db/supabase-full-schema.sql");
  console.log("  2. Lance : npm run dev");
  console.log("  3. Va à : http://localhost:3000/dashboard/pos");
}

testSupabaseConnection();
