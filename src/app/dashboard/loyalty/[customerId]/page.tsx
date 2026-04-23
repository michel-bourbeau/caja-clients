"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { LoyaltyService } from "@/features/loyalty/services";
import { LoyalCustomerStats, LoyaltyReward, LoyaltyTransaction } from "@/lib/types";
import { useCurrency } from "@/lib/utils/useCurrency";
import { useTenantId } from "@/lib/utils/tenant";
import { useParams } from "next/navigation";
import { FeatureGuard } from "@/components/FeatureGuard";

export default function CustomerDetailsPage() {
  const tenantId = useTenantId();
  const params = useParams();
  const customerId = params.customerId as string;
  const { fmt } = useCurrency();
  const [customer, setCustomer] = useState<LoyalCustomerStats | null>(null);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null);
  const [rewardThreshold, setRewardThreshold] = useState(2000);
  const [loyaltySettings, setLoyaltySettings] = useState<any>(null);

  useEffect(() => {
    if (!tenantId || !customerId) return;
    loadData();
  }, [tenantId, customerId]);

  const loadData = async () => {
    if (!tenantId || !customerId) return;

    try {
      setLoading(true);
      const [customerData, rewardsData, purchasesData, settings] = await Promise.all([
        LoyaltyService.getCustomerDetails(tenantId, customerId),
        LoyaltyService.getRewardHistory(tenantId, customerId),
        LoyaltyService.getPurchaseHistory(tenantId, customerId),
        LoyaltyService.getLoyaltySettings(tenantId),
      ]);

      setCustomer(customerData);
      setRewards(rewardsData);
      setPurchases(purchasesData);
      setLoyaltySettings(settings);
      setRewardThreshold(settings.loyalty_reward_threshold);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAwardReward = async () => {
    if (!tenantId || !customerId) return;

    try {

      const result = await LoyaltyService.awardReward(tenantId, customerId, {
        reward_type: loyaltySettings?.loyalty_reward_type || "DISCOUNT_PERCENT",
        reward_value: loyaltySettings?.loyalty_reward_value,
        notes: `Recompensa por ${fmt(customer?.total_accumulated || 0)} gastado`,
      });
      

      
      if (result?.updatedCustomer) {

        // Update customer with the returned data immediately
        setCustomer(prev => prev ? { ...prev, ...result.updatedCustomer } : null);
      }

      setShowRewardModal(false);
      
      // Wait a bit then reload data to ensure DB is synced
      setTimeout(() => {
        loadData();
      }, 500);
    } catch (error) {
      console.error("Error awarding reward:", error);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Cargando...</div>;
  }

  if (!customer) {
    return <div className="text-center py-8 text-gray-500">Cliente no encontrado</div>;
  }

  const currentCounter = customer.current_counter || 0;
  const rewardProgress = LoyaltyService.calculateRewardProgress(currentCounter, rewardThreshold);

  return (
    <FeatureGuard feature="loyalty">
      <div className="space-y-6">
        <Link href="/dashboard/loyalty" className="text-blue-600 hover:underline text-sm font-medium">
          ← Volver a Clientes
        </Link>

      {/* Customer header */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{customer.name}</h1>
            <p className="text-gray-600">Tarjeta: {customer.card_number}</p>
          </div>
          <button 
            onClick={() => setShowRewardModal(true)} 
            disabled={currentCounter < rewardThreshold}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentCounter >= rewardThreshold
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={currentCounter < rewardThreshold ? `Falta ${fmt(rewardThreshold - currentCounter)} para recompensa` : 'Dar Recompensa'}
          >
            🎁 Dar Recompensa
          </button>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-600 uppercase font-semibold">Total Gastado</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{fmt(customer.total_accumulated)}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-600 uppercase font-semibold">Visitas</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{customer.total_visits}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-600 uppercase font-semibold">Teléfono</p>
            <p className="text-sm font-medium text-slate-900 mt-1">{customer.phone || "—"}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-xs text-slate-600 uppercase font-semibold">Email</p>
            <p className="text-sm font-medium text-slate-900 mt-1">{customer.email || "—"}</p>
          </div>
        </div>
      </div>

      {/* Reward progress */}
      <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-purple-900 mb-4">Progreso de Recompensa</h2>
        
        <div className="space-y-4">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-purple-900">
                Puntos acumulados
              </p>
              <p className="text-sm font-bold text-purple-900">
                {fmt(currentCounter)} / {fmt(rewardThreshold)}
              </p>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-500 to-purple-600 h-full transition-all duration-300"
                style={{ width: `${Math.min(rewardProgress.percentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-purple-700 mt-1">
              {rewardProgress.percentage.toFixed(0)}% - {
                currentCounter >= rewardThreshold 
                  ? `¡Recompensa disponible! (${Math.floor(currentCounter / rewardThreshold)} recompensas pendientes)`
                  : `Falta ${fmt(rewardProgress.remainingAmount)} para recompensa`
              }
            </p>
          </div>

          {/* Last reward info */}
          {customer.last_reward_date && (
            <div className="p-3 bg-white rounded-lg border border-purple-200">
              <p className="text-xs text-purple-600 uppercase font-semibold">Última Recompensa</p>
              <p className="text-sm text-purple-900 mt-1">
                {new Date(customer.last_reward_date).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Rewards history */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-900">Historial de Recompensas</h2>
        </div>

        {rewards.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No hay recompensas registradas</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Fecha</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Tipo</th>
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Total Acumulado</th>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rewards.map((reward) => (
                <tr key={reward.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-gray-900 font-medium">
                    {new Date(reward.reward_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                      {reward.reward_type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-gray-900">{fmt(reward.amount_at_reward)}</td>
                  <td className="px-6 py-3 text-gray-900 text-xs">{reward.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Purchases history */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-900">Historial de Compras Completo</h2>
        </div>

        {purchases.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No hay compras registradas</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {purchases.map((purchase) => (
              <div key={purchase.id} className="hover:bg-gray-50 transition-colors">
                {/* Purchase summary row */}
                <button
                  onClick={() =>
                    setExpandedPurchase(expandedPurchase === purchase.id ? null : purchase.id)
                  }
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(purchase.purchase_date).toLocaleDateString("es-ES", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {purchase.description || "Compra"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{fmt(purchase.amount)}</p>
                      {purchase.transactionDetails && (
                        <p className="text-xs text-gray-500">
                          {purchase.transactionDetails.payment_method === "CASH"
                            ? "💵 Efectivo"
                            : purchase.transactionDetails.payment_method === "CARD"
                            ? "💳 Tarjeta"
                            : "Pago"}
                        </p>
                      )}
                    </div>
                    <span
                      className={`ml-4 transform transition-transform ${
                        expandedPurchase === purchase.id ? "rotate-180" : ""
                      }`}
                    >
                      ▼
                    </span>
                  </div>
                </button>

                {/* Expanded details */}
                {expandedPurchase === purchase.id && purchase.transactionDetails && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <div className="space-y-4">
                      {/* Items list */}
                      {Array.isArray(purchase.transactionDetails.items) && (
                        <div>
                          <h4 className="font-semibold text-gray-900 text-sm mb-3">
                            Artículos ({purchase.transactionDetails.items.length})
                          </h4>
                          <div className="space-y-2">
                            {purchase.transactionDetails.items.map((item: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex justify-between items-start p-2 bg-white rounded border border-gray-100"
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                  <p className="text-xs text-gray-500">
                                    Qty: {item.quantity} × {fmt(item.price)}
                                  </p>
                                </div>
                                <p className="text-sm font-semibold text-gray-900">
                                  {fmt(item.total)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Payment details */}
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                        <div>
                          <p className="text-xs text-gray-600 uppercase font-semibold">
                            Subtotal
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {fmt(
                              purchase.transactionDetails.total -
                                purchase.transactionDetails.tax +
                                purchase.transactionDetails.discount
                            )}
                          </p>
                        </div>
                        {purchase.transactionDetails.discount > 0 && (
                          <div>
                            <p className="text-xs text-gray-600 uppercase font-semibold">
                              Descuento
                            </p>
                            <p className="text-sm font-medium text-red-600">
                              -{fmt(purchase.transactionDetails.discount)}
                            </p>
                          </div>
                        )}
                        {purchase.transactionDetails.tax > 0 && (
                          <div>
                            <p className="text-xs text-gray-600 uppercase font-semibold">
                              Impuesto
                            </p>
                            <p className="text-sm font-medium text-gray-900">
                              +{fmt(purchase.transactionDetails.tax)}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-600 uppercase font-semibold">
                            Total
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {fmt(purchase.transactionDetails.total)}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-600 uppercase font-semibold">
                            Cajero
                          </p>
                          <p className="text-sm text-gray-900">
                            {purchase.transactionDetails.cashier_name || "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Award Reward Modal */}
      {showRewardModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Dar Recompensa</h2>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-700">
                  <span className="font-semibold">{customer?.name}</span> ha gastado{" "}
                  <span className="font-semibold">{fmt(customer?.total_accumulated || 0)}</span>
                </p>
                <p className="text-sm text-purple-700 mt-2">
                  {loyaltySettings && (
                    <>
                      Recompensa: <span className="font-semibold">{loyaltySettings.loyalty_reward_value}</span>{" "}
                      {loyaltySettings.loyalty_reward_type === "DISCOUNT_PERCENT" ? "%" : "C$"}
                    </>
                  )}
                </p>
              </div>

              <p className="text-sm text-gray-600">
                ¿Deseas dar una recompensa a este cliente? El contador reiniciará desde cero después de registrar esta recompensa.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowRewardModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAwardReward}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
              >
                Dar Recompensa
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </FeatureGuard>
  );
}
