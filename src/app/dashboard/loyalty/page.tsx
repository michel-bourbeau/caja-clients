"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button as UIButton } from "@/components/ui";
import { Button, Container, Section } from "@/components/StripeUIComponents";
import { PageIcon, SearchInput, DashboardHeader, IconButton, Dialog, DialogFooter, FlashMessage, useFlash, EmptyState, DeleteConfirmDialog } from "@/components";
import { LoyaltyService } from "@/features/loyalty/services";
import { LoyalCustomer } from "@/lib/types";
import { useCurrency } from "@/lib/utils/useCurrency";
import { useTenantId } from "@/lib/utils/tenant";
import { FeatureGuard } from "@/components/FeatureGuard";
import { useLanguage } from "@/context/LanguageContext";

export default function LoyaltyPage() {
  const tenantId = useTenantId();
  const { fmt } = useCurrency();
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<LoyalCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const { flash, showFlash, clearFlash } = useFlash();

  // Form state for new customer
  const [formData, setFormData] = useState({
    card_number: "",
    name: "",
    phone: "",
    email: "",
  });

  // Generate random 5-digit card number
  const generateCardNumber = () => {
    return Math.floor(Math.random() * 90000) + 10000; // 5 digits from 10000-99999
  };

  // Check if card number is unique in tenant
  const isCardNumberAvailable = async (cardNumber: string): Promise<boolean> => {
    if (!tenantId) return false;
    try {
      const response = await fetch(`/api/tenants/${tenantId}/loyalty/customers/check-card?card_number=${cardNumber}`);
      const data = await response.json();
      return data.available === true;
    } catch (error) {
      console.error('Error checking card number:', error);
      return false;
    }
  };

  // Generate unique card number - keeps trying until finding available one
  const generateUniqueCardNumber = async () => {
    let cardNumber = generateCardNumber().toString();
    let attempts = 0;
    const maxAttempts = 10;

    while (!(await isCardNumberAvailable(cardNumber)) && attempts < maxAttempts) {
      cardNumber = generateCardNumber().toString();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      showFlash('error', t('loyalty.list.errorUniqueCard'));
      return null;
    }

    return cardNumber;
  };

  // Reset form and generate new unique card number when modal opens
  const handleOpenAddModal = async () => {
    const newCardNumber = await generateUniqueCardNumber();
    if (newCardNumber) {
      setFormData({
        card_number: newCardNumber,
        name: "",
        phone: "",
        email: "",
      });
      setShowAddModal(true);
    }
  };

  useEffect(() => {
    if (!tenantId) return;
    loadCustomers();
  }, [tenantId]);

  const loadCustomers = async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      const data = await LoyaltyService.getCustomers(tenantId, search || undefined);
      setCustomers(data);
    } catch (error) {
      console.error("Error loading customers:", error);
      showFlash("error", t("loyalty.list.errorLoading"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, tenantId]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    try {
      await LoyaltyService.createCustomer(tenantId, formData);
      showFlash("success", t("loyalty.list.msgAdded"));
      setFormData({ card_number: "", name: "", phone: "", email: "" });
      setShowAddModal(false);
      await loadCustomers();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : t("loyalty.list.msgAddError");
      showFlash("error", errorMsg);
    }
  };

  const handleDelete = async (customerId: string) => {
    if (!tenantId) return;

    try {
      await LoyaltyService.deleteCustomer(tenantId, customerId);
      showFlash("success", t("loyalty.list.msgDeleted"));
      setShowDeleteConfirm(null);
      await loadCustomers();
    } catch (error) {
      showFlash("error", t("loyalty.list.msgDeleteError"));
    }
  };

  return (
    <FeatureGuard feature="loyalty">
      <Container>
        <Section>
          <DashboardHeader
            pageType="loyalty"
            title={t("loyalty.list.pageTitle")}
            subtitle={t("loyalty.list.subtitle")}
          >
            <Button variant="primary" onClick={handleOpenAddModal}>
              {t("loyalty.list.newCustomerBtn")}
            </Button>
          </DashboardHeader>

          <FlashMessage flash={flash} onDismiss={clearFlash} />

          {/* Search */}
          <SearchInput
            value={search}
            onChange={(value) => setSearch(value)}
            placeholder={t("loyalty.list.searchPlaceholder")}
            className="flex-1"
          />

          {/* Customers table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <EmptyState state="loading" />
            ) : customers.length === 0 ? (
              <EmptyState
                state="empty"
                message={search ? t("loyalty.list.emptySearch") : t("loyalty.list.emptyList")}
              />
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-900">
                        <th className="px-4 py-3 text-left font-semibold text-white">{t("loyalty.list.colName")}</th>
                        <th className="px-4 py-3 text-left font-semibold text-white">{t("loyalty.list.colCard")}</th>
                        <th className="px-4 py-3 text-left font-semibold text-white hidden md:table-cell">{t("loyalty.list.colPhone")}</th>
                        <th className="px-4 py-3 text-right font-semibold text-white">{t("loyalty.list.colTotalSpent")}</th>
                        <th className="px-4 py-3 text-center font-semibold text-white">{t("loyalty.list.colVisits")}</th>
                        <th className="px-4 py-3 text-center font-semibold text-white">{t("loyalty.list.colActions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {customers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <Link href={`/dashboard/loyalty/${customer.id}`} className="text-blue-600 hover:underline font-medium">
                              {customer.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{customer.card_number}</td>
                          <td className="px-4 py-3 text-slate-700 hidden md:table-cell">{customer.phone || "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmt(customer.total_accumulated)}</td>
                          <td className="px-4 py-3 text-center text-slate-700">{customer.total_visits}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setShowDeleteConfirm(customer.id)}
                              className="text-red-600 hover:text-red-800 text-xs font-semibold hover:underline"
                            >
                              {t("loyalty.list.deleteBtn")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Mobile Cards */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {customers.map((customer) => (
                    <Link
                      key={customer.id}
                      href={`/dashboard/loyalty/${customer.id}`}
                      className="flex items-start justify-between p-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{customer.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{t("loyalty.list.cardPrefix")}{customer.card_number}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{customer.phone || t("loyalty.list.noPhone")}</p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="font-bold text-slate-900">{fmt(customer.total_accumulated)}</p>
                        <p className="text-xs text-slate-600">{customer.total_visits} {t("loyalty.list.visitsLabel")}</p>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            setShowDeleteConfirm(customer.id);
                          }}
                          className="text-red-600 hover:text-red-800 text-xs font-semibold mt-1"
                        >
                          {t("loyalty.list.deleteBtn")}
                        </button>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Add Customer Modal */}
          <Dialog
            isOpen={showAddModal}
            title={t("loyalty.list.addModalTitle")}
            onClose={() => setShowAddModal(false)}
            maxWidth="md"
            footer={
              <div className="flex justify-end">
                <Button variant="primary" type="submit" form="addCustomerForm" className="whitespace-nowrap">
                    {t("loyalty.list.createBtn")}
                  </Button>
              </div>
            }
          >
            <form id="addCustomerForm" onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">{t("loyalty.list.cardNumberLabel")}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={formData.card_number}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-900 font-semibold"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const newCardNumber = await generateUniqueCardNumber();
                      if (newCardNumber) {
                        setFormData({ ...formData, card_number: newCardNumber });
                      }
                    }}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-sm font-medium transition"
                    title="Generar nuevo número"
                  >
                    🔄
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">{t("loyalty.list.nameLabel")}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t("loyalty.list.namePlaceholder")}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">{t("loyalty.list.phoneLabel")}</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t("loyalty.list.phonePlaceholder")}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">{t("loyalty.list.emailLabel")}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={t("loyalty.list.emailPlaceholder")}
                />
              </div>
            </form>
          </Dialog>

          {/* Delete Confirmation */}
          <DeleteConfirmDialog
            isOpen={!!showDeleteConfirm}
            message={t("loyalty.list.deleteConfirmMsg")}
            onConfirm={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
            onCancel={() => setShowDeleteConfirm(null)}
          />
        </Section>
      </Container>
    </FeatureGuard>
  );
}
