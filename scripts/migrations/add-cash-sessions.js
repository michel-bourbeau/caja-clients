#!/usr/bin/env node
/**
 * Migration: Cash Session system
 * Usage: node scripts/migrations/add-cash-sessions.js
 *
 * Ce script vérifie si les tables existent déjà.
 * Si non, il affiche le SQL à copier-coller dans Supabase SQL Editor.
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local manually (no dotenv dependency needed)
const envPath = path.join(__dirname, "../../.env.local");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
    const [key, ...rest] = line.split("=");
    if (key && !key.startsWith("#")) process.env[key.trim()] = rest.join("=").trim();
  });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Variables manquantes: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function check() {
  console.log("🔍 Vérification de la migration Cash Sessions…\n");

  // 1. Check track_in_count column on products
  const { error: colErr } = await supabase.from("products").select("track_in_count").limit(1);
  const colOk = !colErr;

  // 2. Check cash_sessions table
  const { error: sessErr } = await supabase.from("cash_sessions").select("id").limit(1);
  const sessOk = !sessErr;

  // 3. Check cash_session_counts table
  const { error: cntErr } = await supabase.from("cash_session_counts").select("id").limit(1);
  const cntOk = !cntErr;

  console.log(`  products.track_in_count : ${colOk  ? "✅ existe" : "❌ manquante"}`);
  console.log(`  cash_sessions           : ${sessOk ? "✅ existe" : "❌ manquante"}`);
  console.log(`  cash_session_counts     : ${cntOk  ? "✅ existe" : "❌ manquante"}`);

  if (colOk && sessOk && cntOk) {
    console.log("\n✅ Migration déjà appliquée — tout est en ordre !\n");
    return;
  }

  // Read SQL file
  const sqlPath = path.join(__dirname, "../../db/migrations/add_cash_sessions.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  console.log("\n─────────────────────────────────────────────────────────────────");
  console.log("  La migration n'a pas encore été exécutée.");
  console.log("  Suivez ces étapes :\n");
  console.log("  1. Ouvrez https://supabase.com/dashboard/project/qootshzbwqdhmilklhpx/sql/new");
  console.log("  2. Copiez-collez tout le SQL ci-dessous");
  console.log("  3. Cliquez RUN");
  console.log("─────────────────────────────────────────────────────────────────\n");
  console.log(sql);
  console.log("\n─────────────────────────────────────────────────────────────────");
  console.log("  Après avoir exécuté le SQL, relancez ce script pour vérifier.");
  console.log("─────────────────────────────────────────────────────────────────\n");
  process.exit(1);
}

check().catch((e) => { console.error(e); process.exit(1); });
