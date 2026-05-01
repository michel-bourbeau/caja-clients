"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePaymentStatus } from "@/lib/hooks/usePaymentStatus";
import { useLanguage } from "@/context/LanguageContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Container,
  Alert,
  Button,
} from "@/components/StripeUIComponents";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import Link from "next/link";
import { AlertCircle, Mail, Phone, DollarSign, Calendar } from "lucide-react";

interface PaymentRecord {
  id: string;
  plan: string;
  amount: number;
  paid_until: string;
  payment_date: string;
  payment_method: string;
  notes?: string;
}

interface PaymentInfo {
  plan: string;
  paid_until: string | null;
  history: PaymentRecord[];
}

export default function AccountSuspendedPage() {
  const { user, isLoading } = useAuth();
  const { t, locale } = useLanguage();
  const tenantId = typeof window !== "undefined" ? localStorage.getItem("tenantId") : null;
  const { paymentStatus, loading: paymentLoading } = usePaymentStatus(tenantId);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(true);

  // Fetch payment info
  useEffect(() => {
    const fetchPaymentInfo = async () => {
      if (!tenantId) return;
      try {
        const res = await fetch(`/api/tenants/${tenantId}/payment`);
        if (res.ok) {
          const data = await res.json();
          setPaymentInfo(data);
        }
      } catch (error) {
        console.error("Error fetching payment info:", error);
      } finally {
        setLoadingPayment(false);
      }
    };

    fetchPaymentInfo();
  }, [tenantId]);

  if (isLoading || paymentLoading || loadingPayment) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-[80vh]">
          <LoadingSpinner size="lg" />
        </div>
      </Container>
    );
  }

  // If NOT suspended, redirect to dashboard (shouldn't happen but safety check)
  if (!paymentStatus?.isSuspended) {
    if (typeof window !== "undefined") {
      window.location.href = "/dashboard";
    }
    return null;
  }

  return (
    <Container>
      <div className="space-y-8 py-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <AlertCircle className="w-16 h-16 text-red-600" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900">{t("accountSuspended.title")}</h1>
          <p className="text-xl text-slate-600">{t("accountSuspended.subtitle")}</p>
        </div>

        {/* Main Alert */}
        <Alert variant="error" title={t("accountSuspended.alertTitle")}>
          <div className="space-y-3 mt-3">
            <p className="font-semibold text-red-900">
              {t("accountSuspended.expiredDays", { n: Math.abs(paymentStatus.daysUntilExpiration) })}
            </p>
            <div className="space-y-2 text-sm text-red-800">
              <p>{t("accountSuspended.noModules")}</p>
              <p>{t("accountSuspended.noUsers")}</p>
              <p>{t("accountSuspended.noTransactions")}</p>
              <p>{t("accountSuspended.willReactivate")}</p>
            </div>
          </div>
        </Alert>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              {t("accountSuspended.paymentInfoTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Status */}
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-slate-700 mb-2 font-semibold">{t("accountSuspended.currentStatus")}</p>
              <p className="text-lg text-red-700 font-bold">{t("accountSuspended.suspended")}</p>
              {paymentInfo?.paid_until && (
                <p className="text-sm text-slate-600 mt-2">
                  {t("accountSuspended.expiredSince")} {new Date(paymentInfo.paid_until).toLocaleDateString(locale === "es-ni" ? "es-NI" : locale, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              )}
              {paymentInfo?.plan && (
                <p className="text-sm text-slate-600 mt-1">{t("accountSuspended.plan")} <span className="font-semibold capitalize">{paymentInfo.plan}</span></p>
              )}
            </div>

            {/* Payment History */}
            {paymentInfo?.history && paymentInfo.history.length > 0 && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  {t("accountSuspended.paymentHistory")}
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="text-left py-3 px-3 font-semibold text-slate-700">{t("accountSuspended.colPayDate")}</th>
                        <th className="text-left py-3 px-3 font-semibold text-slate-700">{t("accountSuspended.colPlan")}</th>
                        <th className="text-left py-3 px-3 font-semibold text-slate-700">{t("accountSuspended.colAmount")}</th>
                        <th className="text-left py-3 px-3 font-semibold text-slate-700">{t("accountSuspended.colValidUntil")}</th>
                        <th className="text-left py-3 px-3 font-semibold text-slate-700">{t("accountSuspended.colMethod")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentInfo.history.map((payment) => (
                        <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-3 text-slate-900">
                            {new Date(payment.payment_date).toLocaleDateString(locale === "es-ni" ? "es-NI" : locale)}
                          </td>
                          <td className="py-3 px-3 font-medium capitalize text-slate-900">{payment.plan}</td>
                          <td className="py-3 px-3 text-slate-900 font-semibold">C$ {payment.amount.toFixed(2)}</td>
                          <td className="py-3 px-3 text-slate-600">
                            {new Date(payment.paid_until).toLocaleDateString(locale === "es-ni" ? "es-NI" : locale)}
                          </td>
                          <td className="py-3 px-3 text-slate-600">{payment.payment_method || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Options */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              {t("accountSuspended.contactTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              {t("accountSuspended.contactMsg")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Go to Payment Settings */}
              <Link href="/dashboard/settings">
                <Button variant="primary" className="w-full">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Ir a Configuración de Pago
                </Button>
              </Link>

              {/* Email Option */}
              <a href="mailto:soporte@caja-app.com?subject=Reactivar%20Cuenta%20Suspendida&body=Necesito%20reactivar%20mi%20suscripción">
                <Button variant="secondary" className="w-full">
                  <Mail className="w-4 h-4 mr-2" />
                  Enviar Email
                </Button>
              </a>

              {/* WhatsApp Option */}
              <a href="https://wa.me/50550000000?text=Hola,%20necesito%20reactivar%20mi%20cuenta%20suspendida" target="_blank" rel="noopener noreferrer" className="md:col-start-2">
                <Button variant="secondary" className="w-full">
                  <Phone className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </a>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>{t("accountSuspended.contactInfo")}</strong>
              </p>
              <ul className="mt-2 space-y-1 text-sm text-blue-800">
                <li>{t("accountSuspended.emailLabel")} <span className="font-mono">soporte@caja-app.com</span></li>
                <li>{t("accountSuspended.whatsappLabel")} <span className="font-mono">+505 5000 0000</span></li>
                <li>{t("accountSuspended.available")} {t("accountSuspended.availableHours")}</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Information Alert */}
        <Alert variant="info" title={t("accountSuspended.reactivateInfoTitle")}>
          <ul className="mt-3 space-y-2 text-sm list-disc list-inside">
            <li>{t("accountSuspended.modulesEnabled")}</li>
            <li>{t("accountSuspended.usersEnabled")}</li>
            <li>{t("accountSuspended.transactionsEnabled")}</li>
            <li>{t("accountSuspended.noDataLost")}</li>
            <li>{t("accountSuspended.immediateReactivation")}</li>
          </ul>
        </Alert>
      </div>
    </Container>
  );
}
