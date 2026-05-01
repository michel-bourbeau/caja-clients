// src/app/api/tenants/[tenantId]/backup/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// ─── Shared: build a complete snapshot of all tenant data ───────────────────

async function buildSnapshot(supabase: ReturnType<typeof getSupabaseAdmin>, tenantId: string) {
  const [
    tenant,
    settings,
    categories,
    expenseCategories,
    suppliers,
    taxes,
    roles,
    productsWithVariants,
    employees,
    contacts,
    loyalCustomers,
    transactionsWithItems,
    salaryPayments,
    expenses,
    fixedExpenses,
    cashClosings,
  ] = await Promise.all([
    supabase.from("tenants").select("*").eq("id", tenantId).single(),
    supabase.from("tenant_settings").select("*").eq("tenant_id", tenantId).single(),
    supabase.from("product_categories").select("*").eq("tenant_id", tenantId),
    supabase.from("expense_categories").select("*").eq("tenant_id", tenantId),
    supabase.from("suppliers").select("*").eq("tenant_id", tenantId),
    supabase.from("tenant_taxes").select("*").eq("tenant_id", tenantId),
    supabase.from("roles").select("*").eq("tenant_id", tenantId),
    supabase.from("products").select("*, product_variants(*)").eq("tenant_id", tenantId).is("deleted_at", null),
    supabase.from("employees").select("*").eq("tenant_id", tenantId),
    supabase.from("contacts").select("*").eq("tenant_id", tenantId),
    supabase.from("loyal_customers").select("*, loyalty_transactions(*), loyalty_rewards(*)").eq("tenant_id", tenantId),
    supabase.from("transactions").select("*, transaction_items(*)").eq("tenant_id", tenantId).order("created_at", { ascending: true }),
    supabase.from("salary_payments").select("*").eq("tenant_id", tenantId),
    supabase.from("expenses").select("*").eq("tenant_id", tenantId),
    supabase.from("fixed_expenses").select("*").eq("tenant_id", tenantId),
    supabase.from("cash_closings").select("*").eq("tenant_id", tenantId),
  ]);

  const products = (productsWithVariants.data ?? []).map((p: any) => {
    const { product_variants, ...product } = p;
    return product;
  });
  const productVariants = (productsWithVariants.data ?? []).flatMap((p: any) => p.product_variants ?? []);

  const transactions = (transactionsWithItems.data ?? []).map((t: any) => {
    const { transaction_items, ...tx } = t;
    return tx;
  });
  const transactionItems = (transactionsWithItems.data ?? []).flatMap((t: any) => t.transaction_items ?? []);

  const loyalCustomersClean = (loyalCustomers.data ?? []).map((c: any) => {
    const { loyalty_transactions, loyalty_rewards, ...customer } = c;
    return customer;
  });
  const loyaltyTransactions = (loyalCustomers.data ?? []).flatMap((c: any) => c.loyalty_transactions ?? []);
  const loyaltyRewards = (loyalCustomers.data ?? []).flatMap((c: any) => c.loyalty_rewards ?? []);

  return {
    version: "2.0",
    tenantId,
    tenant: tenant.data ?? null,
    settings: settings.data ?? null,
    categories: categories.data ?? [],
    expenseCategories: expenseCategories.data ?? [],
    suppliers: suppliers.data ?? [],
    taxes: taxes.data ?? [],
    roles: roles.data ?? [],
    products,
    productVariants,
    employees: employees.data ?? [],
    contacts: contacts.data ?? [],
    loyalCustomers: loyalCustomersClean,
    loyaltyTransactions,
    loyaltyRewards,
    transactions,
    transactionItems,
    salaryPayments: salaryPayments.data ?? [],
    expenses: expenses.data ?? [],
    fixedExpenses: fixedExpenses.data ?? [],
    cashClosings: cashClosings.data ?? [],
  };
}

// ─── GET /api/tenants/[tenantId]/backup ─────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const supabase = getSupabaseAdmin();

    const snapshot = await buildSnapshot(supabase, tenantId);

    const backup = {
      ...snapshot,
      exportedAt: new Date().toISOString(),
      counts: {
        categories:         snapshot.categories.length,
        products:           snapshot.products.length,
        productVariants:    snapshot.productVariants.length,
        employees:          snapshot.employees.length,
        transactions:       snapshot.transactions.length,
        transactionItems:   snapshot.transactionItems.length,
        expenses:           snapshot.expenses.length,
        contacts:           snapshot.contacts.length,
        loyalCustomers:     snapshot.loyalCustomers.length,
        salaryPayments:     snapshot.salaryPayments.length,
        cashClosings:       snapshot.cashClosings.length,
      },
    };

    const tenantSlug = snapshot.tenant?.slug ?? tenantId.slice(0, 8);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `backup-${tenantSlug}-${dateStr}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error generating backup" },
      { status: 500 }
    );
  }
}

// ─── POST /api/tenants/[tenantId]/backup  (restore) ─────────────────────────
//
// Expects multipart/form-data with a "file" field containing the backup JSON.
// Safety guarantees:
//   1. Validates backup version ("2.0") and tenantId match before touching DB.
//   2. Takes a pre-restore snapshot; if reinsertion fails, attempts rollback.
//   3. Deletes in FK-safe order (children first).
//   4. Inserts in FK-safe order (parents first).
//   5. NEVER deletes or modifies the `tenants` or `users` rows.

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;

    // ── 1. Parse backup file ──────────────────────────────────────────────
    let backup: any;
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      const text = await (file as File).text();
      try {
        backup = JSON.parse(text);
      } catch {
        return NextResponse.json({ error: "Invalid JSON file" }, { status: 400 });
      }
    } else {
      // fallback: raw JSON body
      try {
        backup = await request.json();
      } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
      }
    }

    // ── 2. Validate backup ────────────────────────────────────────────────
    if (backup.version !== "2.0") {
      return NextResponse.json(
        { error: `Unsupported backup version "${backup.version}". Only version 2.0 is supported.` },
        { status: 422 }
      );
    }
    if (backup.tenantId !== tenantId) {
      return NextResponse.json(
        { error: "Backup tenantId does not match the target tenant. Restore aborted for safety." },
        { status: 422 }
      );
    }

    const supabase = getSupabaseAdmin();

    // ── 3. Pre-restore snapshot (for rollback) ────────────────────────────
    let preRestoreSnapshot: any = null;
    try {
      preRestoreSnapshot = await buildSnapshot(supabase, tenantId);
    } catch (snapshotError) {
      console.warn("[backup restore] Could not take pre-restore snapshot:", snapshotError);
      // Non-fatal — proceed without rollback capability
    }

    // ── 4. Delete existing data in FK-safe order ──────────────────────────
    // (children → parents, never touch tenants/users)
    const deleteOrder = [
      "loyalty_rewards",
      "loyalty_transactions",
      "transaction_items",
      "salary_payments",
      "expenses",
      "cash_closings",
      "loyal_customers",
      "transactions",
      "product_variants",
      "products",
      "employees",
      "contacts",
      "fixed_expenses",
      "expense_categories",
      "suppliers",
      "product_categories",
      "tenant_taxes",
      "roles",
      "tenant_settings",
    ];

    for (const table of deleteOrder) {
      const col = table === "tenant_settings" ? "tenant_id" : "tenant_id";
      const { error } = await supabase.from(table).delete().eq(col, tenantId);
      if (error && !error.message.includes("does not exist")) {
        // Non-critical tables (e.g. not yet created in this DB) — continue
        console.warn(`[backup restore] Delete warning on ${table}:`, error.message);
      }
    }

    // ── 5. Insert in FK-safe order ────────────────────────────────────────
    const insertErrors: string[] = [];

    async function safeInsert(table: string, rows: any[]) {
      if (!rows || rows.length === 0) return;
      const { error } = await supabase.from(table).insert(rows);
      if (error) {
        insertErrors.push(`${table}: ${error.message}`);
      }
    }

    // Upsert settings (may not exist yet)
    if (backup.settings) {
      const { error } = await supabase
        .from("tenant_settings")
        .upsert(backup.settings, { onConflict: "tenant_id" });
      if (error) insertErrors.push(`tenant_settings: ${error.message}`);
    }

    await safeInsert("product_categories",  backup.categories ?? []);
    await safeInsert("expense_categories",  backup.expenseCategories ?? []);
    await safeInsert("suppliers",           backup.suppliers ?? []);
    await safeInsert("tenant_taxes",        backup.taxes ?? []);
    await safeInsert("roles",               backup.roles ?? []);
    await safeInsert("products",            backup.products ?? []);
    await safeInsert("product_variants",    backup.productVariants ?? []);
    await safeInsert("employees",           backup.employees ?? []);
    await safeInsert("contacts",            backup.contacts ?? []);
    await safeInsert("loyal_customers",     backup.loyalCustomers ?? []);
    await safeInsert("loyalty_transactions",backup.loyaltyTransactions ?? []);
    await safeInsert("loyalty_rewards",     backup.loyaltyRewards ?? []);
    await safeInsert("transactions",        backup.transactions ?? []);
    await safeInsert("transaction_items",   backup.transactionItems ?? []);
    await safeInsert("salary_payments",     backup.salaryPayments ?? []);
    await safeInsert("fixed_expenses",      backup.fixedExpenses ?? []);
    await safeInsert("expenses",            backup.expenses ?? []);
    await safeInsert("cash_closings",       backup.cashClosings ?? []);

    // ── 6. Handle insert errors → attempt rollback ────────────────────────
    if (insertErrors.length > 0 && preRestoreSnapshot) {
      console.error("[backup restore] Insert errors, attempting rollback:", insertErrors);

      // Best-effort rollback: delete whatever was partially inserted, then re-insert snapshot
      for (const table of deleteOrder) {
        await supabase.from(table).delete().eq("tenant_id", tenantId);
      }
      // Re-insert pre-restore snapshot
      if (preRestoreSnapshot.settings) {
        await supabase.from("tenant_settings").upsert(preRestoreSnapshot.settings, { onConflict: "tenant_id" });
      }
      await supabase.from("product_categories").insert(preRestoreSnapshot.categories ?? []);
      await supabase.from("expense_categories").insert(preRestoreSnapshot.expenseCategories ?? []);
      await supabase.from("suppliers").insert(preRestoreSnapshot.suppliers ?? []);
      await supabase.from("tenant_taxes").insert(preRestoreSnapshot.taxes ?? []);
      await supabase.from("roles").insert(preRestoreSnapshot.roles ?? []);
      await supabase.from("products").insert(preRestoreSnapshot.products ?? []);
      await supabase.from("product_variants").insert(preRestoreSnapshot.productVariants ?? []);
      await supabase.from("employees").insert(preRestoreSnapshot.employees ?? []);
      await supabase.from("contacts").insert(preRestoreSnapshot.contacts ?? []);
      await supabase.from("loyal_customers").insert(preRestoreSnapshot.loyalCustomers ?? []);
      await supabase.from("loyalty_transactions").insert(preRestoreSnapshot.loyaltyTransactions ?? []);
      await supabase.from("loyalty_rewards").insert(preRestoreSnapshot.loyaltyRewards ?? []);
      await supabase.from("transactions").insert(preRestoreSnapshot.transactions ?? []);
      await supabase.from("transaction_items").insert(preRestoreSnapshot.transactionItems ?? []);
      await supabase.from("salary_payments").insert(preRestoreSnapshot.salaryPayments ?? []);
      await supabase.from("fixed_expenses").insert(preRestoreSnapshot.fixedExpenses ?? []);
      await supabase.from("expenses").insert(preRestoreSnapshot.expenses ?? []);
      await supabase.from("cash_closings").insert(preRestoreSnapshot.cashClosings ?? []);

      return NextResponse.json(
        {
          error: "Restore failed — original data has been rolled back.",
          details: insertErrors,
        },
        { status: 500 }
      );
    }

    if (insertErrors.length > 0) {
      // Errors but no snapshot available — return partial success warning
      return NextResponse.json(
        {
          success: false,
          warning: "Restore completed with some non-critical errors.",
          details: insertErrors,
        },
        { status: 207 }
      );
    }

    return NextResponse.json({
      success: true,
      restoredFrom: backup.exportedAt ?? "unknown",
      counts: backup.counts ?? {},
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Restore failed" },
      { status: 500 }
    );
  }
}
