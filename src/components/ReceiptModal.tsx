"use client";

import { Transaction, ReceiptSettings } from "@/lib/types";
import { Dialog } from "@/components/Dialog";
import { Printer, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  settings?: ReceiptSettings;
  /** Currency format function, e.g. from useCurrency() */
  fmt: (amount: number) => string;
}

function pad(n: string, width: number): string {
  return n.length >= width ? n : n + " ".repeat(width - n.length);
}

function buildPrintHtml(
  transaction: Transaction,
  settings: ReceiptSettings,
  fmt: (amount: number) => string
): string {
  const date = new Intl.DateTimeFormat("es-NI", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(transaction.timestamp);

  const paymentLabel: Record<string, string> = {
    CASH: "Efectivo",
    CARD: "Tarjeta",
    TRANSFER: "Transferencia",
  };

  const itemRows = transaction.items
    .map((item) => {
      const qty = `${item.quantity}x`;
      const name = item.name ?? "Producto";
      const total = fmt(item.total);
      return `<tr>
        <td style="padding:1px 0">${qty} ${name}</td>
        <td style="text-align:right;padding:1px 0;white-space:nowrap">${total}</td>
      </tr>`;
    })
    .join("");

  const taxRows =
    transaction.tax_breakdown && transaction.tax_breakdown.length > 0
      ? transaction.tax_breakdown
          .map(
            (t) =>
              `<tr>
          <td style="padding:1px 0;color:#555">${t.name} (${t.rate}%)</td>
          <td style="text-align:right;padding:1px 0;color:#555">${fmt(t.amount)}</td>
        </tr>`
          )
          .join("")
      : "";

  const discountRow =
    transaction.discount && transaction.discount > 0
      ? `<tr>
          <td style="padding:1px 0;color:#555">Descuento</td>
          <td style="text-align:right;padding:1px 0;color:#555">-${fmt(transaction.discount)}</td>
        </tr>`
      : "";

  const changeRow =
    transaction.paymentMethod === "CASH" && transaction.amount_received
      ? `<tr>
          <td style="padding:2px 0;color:#555">Recibido${transaction.currency_paid === "USD" ? " (USD)" : ""}</td>
          <td style="text-align:right;padding:2px 0;color:#555">${
            transaction.currency_paid === "USD"
              ? `$${transaction.usd_amount_received?.toFixed(2) ?? "0.00"}`
              : fmt(transaction.amount_received)
          }</td>
        </tr>
        <tr>
          <td style="padding:2px 0;color:#555">Vuelto</td>
          <td style="text-align:right;padding:2px 0;color:#555">${fmt(transaction.change ?? 0)}</td>
        </tr>`
      : "";

  const usdRow =
    transaction.currency_paid === "USD" && transaction.usd_exchange_rate
      ? `<tr>
          <td colspan="2" style="padding:2px 0;font-size:10px;color:#777">
            T.C.: 1 USD = ${fmt(transaction.usd_exchange_rate)}
          </td>
        </tr>`
      : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Recibo</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      color: #000;
      background: #fff;
      width: 300px;
      padding: 8px;
    }
    h1 { font-size: 16px; text-align: center; margin-bottom: 2px; }
    .sub { text-align: center; font-size: 11px; color: #444; margin-bottom: 2px; }
    .divider { border-top: 1px dashed #000; margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { font-size: 12px; vertical-align: top; }
    .total-row td { font-size: 14px; font-weight: bold; padding-top: 4px; }
    .footer { text-align: center; margin-top: 12px; font-size: 11px; color: #444; }
    @media print {
      body { width: 100%; padding: 4px; }
    }
  </style>
</head>
<body>
  <h1>${settings.companyName || "COMPROBANTE DE VENTA"}</h1>
  ${settings.companyPhone ? `<p class="sub">Tel: ${settings.companyPhone}</p>` : ""}
  ${settings.companyRuc ? `<p class="sub">RUC: ${settings.companyRuc}</p>` : ""}
  <div class="divider"></div>
  <p>Fecha: ${date}</p>
  <p>No. ${transaction.id.slice(-8).toUpperCase()}</p>
  ${transaction.cashierName ? `<p>Cajero: ${transaction.cashierName}</p>` : ""}
  <div class="divider"></div>
  <table>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="divider"></div>
  <table>
    <tbody>
      ${discountRow}
      ${taxRows}
      <tr class="total-row">
        <td>TOTAL</td>
        <td style="text-align:right">${fmt(transaction.total)}</td>
      </tr>
      <tr>
        <td style="padding:2px 0;color:#555">Pago: ${paymentLabel[transaction.paymentMethod] ?? transaction.paymentMethod}</td>
        <td></td>
      </tr>
      ${usdRow}
      ${changeRow}
    </tbody>
  </table>
  <div class="divider"></div>
  <div class="footer">
    <p>¡Gracias por su compra!</p>
  </div>
  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
    };
  </script>
</body>
</html>`;
}

export function ReceiptModal({
  isOpen,
  onClose,
  transaction,
  settings = {},
  fmt,
}: ReceiptModalProps) {
  if (!transaction) return null;

  const { t, locale } = useLanguage();

  const date = new Intl.DateTimeFormat(locale === "es-ni" ? "es-NI" : locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(transaction.timestamp);

  const paymentLabel: Record<string, string> = {
    CASH: t("receipt.cash"),
    CARD: t("receipt.card"),
    TRANSFER: t("receipt.transfer"),
  };

  const handlePrint = () => {
    const html = buildPrintHtml(transaction, settings, fmt);
    const w = window.open("", "_blank", "width=380,height=650,toolbar=0,menubar=0");
    if (!w) {
      alert(t("receipt.popupBlocked"));
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  const footer = (
    <div className="flex justify-end gap-3">
      <button
        onClick={handlePrint}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        <Printer className="w-4 h-4" />
        {t("receipt.print")}
      </button>
      <button
        onClick={onClose}
        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors"
      >
        <X className="w-4 h-4" />
        {t("common.close")}
      </button>
    </div>
  );

  return (
    <Dialog
      isOpen={isOpen}
      title={t("receipt.title")}
      onClose={onClose}
      maxWidth="sm"
      footer={footer}
    >
      {/* Receipt preview */}
      <div className="font-mono text-xs bg-white border border-slate-200 rounded-lg p-4 space-y-1">
        {/* Header */}
        <div className="text-center space-y-0.5 pb-2 border-b border-dashed border-slate-300">
          {settings.companyName && (
            <p className="font-bold text-sm">{settings.companyName}</p>
          )}
          {settings.companyPhone && (
            <p className="text-slate-500">Tel: {settings.companyPhone}</p>
          )}
          {settings.companyRuc && (
            <p className="text-slate-500">RUC: {settings.companyRuc}</p>
          )}
          {!settings.companyName && (
            <p className="font-bold text-sm">{t("receipt.defaultCompanyName")}</p>
          )}
        </div>

        {/* Meta */}
        <div className="py-1 border-b border-dashed border-slate-300 space-y-0.5">
          <p>{t("receipt.date")}: {date}</p>
          <p>{t("receipt.number")} {transaction.id.slice(-8).toUpperCase()}</p>
          {transaction.cashierName && <p>{t("receipt.cashier")}: {transaction.cashierName}</p>}
        </div>

        {/* Items */}
        <div className="py-1 border-b border-dashed border-slate-300 space-y-0.5">
          {transaction.items.map((item, i) => (
            <div key={i} className="flex justify-between gap-2">
              <span className="truncate">
                {item.quantity}× {item.name ?? "Producto"}
              </span>
              <span className="shrink-0">{fmt(item.total)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="py-1 space-y-0.5">
          {transaction.discount != null && transaction.discount > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>{t("receipt.discount")}</span>
              <span>-{fmt(transaction.discount)}</span>
            </div>
          )}
          {transaction.tax_breakdown?.map((t) => (
            <div key={t.name} className="flex justify-between text-slate-500">
              <span>
                {t.name} ({t.rate}%)
              </span>
              <span>{fmt(t.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between font-bold text-sm border-t border-dashed border-slate-300 pt-1">
            <span>{t("receipt.total")}</span>
            <span>{fmt(transaction.total)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>{t("receipt.payment")}: {paymentLabel[transaction.paymentMethod] ?? transaction.paymentMethod}</span>
          </div>
          {transaction.currency_paid === "USD" && transaction.usd_exchange_rate && (
            <p className="text-slate-400 text-[10px]">
              T.C.: 1 USD = {fmt(transaction.usd_exchange_rate)}
            </p>
          )}
          {transaction.paymentMethod === "CASH" && transaction.amount_received != null && (
            <>
              <div className="flex justify-between text-slate-500">
                <span>
                  {t("receipt.received")}{transaction.currency_paid === "USD" ? " (USD)" : ""}
                </span>
                <span>
                  {transaction.currency_paid === "USD"
                    ? `$${transaction.usd_amount_received?.toFixed(2) ?? "0.00"}`
                    : fmt(transaction.amount_received)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>{t("receipt.change")}</span>
                <span>{fmt(transaction.change ?? 0)}</span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-slate-400 pt-1 border-t border-dashed border-slate-300">
          {t("receipt.thanks")}
        </div>
      </div>
    </Dialog>
  );
}
