#!/usr/bin/env node

/**
 * Migration Script: Add discount column to transactions table
 * 
 * Usage: node scripts/migrations/add-discount-column.js
 * 
 * This script will connect to Supabase and add the discount column
 * to the transactions table if it doesn't already exist.
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "❌ Missing Supabase environment variables. Please check your .env.local file."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runMigration() {
  try {
    console.log("🔄 Starting migration: Add discount column to transactions...\n");

    // First, try to check if the column already exists
    console.log("📋 Checking if discount column already exists...");
    const { data: tableInfo, error: tableError } = await supabase
      .from("transactions")
      .select("discount")
      .limit(1);

    if (!tableError && tableInfo !== null) {
      console.log("✅ Discount column already exists!\n");
      console.log("No migration needed. You can start using the discount feature.");
      process.exit(0);
    }

    console.log("❌ Discount column not found. Instructions to add it:\n");

    console.log("📝 Please run the following SQL in your Supabase SQL Editor:\n");
    console.log("1. Go to: https://app.supabase.com/projects");
    console.log("2. Select your project");
    console.log("3. Click 'SQL Editor' in the left sidebar");
    console.log("4. Click 'New Query'");
    console.log("5. Copy and paste this SQL:\n");

    const sql = `ALTER TABLE transactions 
ADD COLUMN discount NUMERIC(10, 2) DEFAULT 0 NOT NULL;`;

    console.log("---");
    console.log(sql);
    console.log("---\n");

    console.log("6. Click 'Run' or press Ctrl+Enter");
    console.log("7. After the migration completes, refresh this page and try the discount feature again\n");

    console.log("📚 For more details, see: DISCOUNT_MIGRATION.md");
  } catch (error) {
    console.error("❌ Error during migration check:", error);
    process.exit(1);
  }
}

runMigration();
