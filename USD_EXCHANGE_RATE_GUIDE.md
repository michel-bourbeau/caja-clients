# 💱 Tasa de Cambio USD/NIO - Guía de Implementación

## Resumen

Se ha añadido soporte para pagos en dólares estadounidenses (USD) al sistema POS con cálculo automático del cambio en Córdobas (NIO) según la tasa de cambio configurada por el tenant.

## Cambios Realizados

### 1. **Base de Datos** 
- Creada migración: `db/migrations/add_usd_exchange_rate.sql`
- **Nuevos campos en `tenant_settings`:**
  - `usd_exchange_rate` (numeric) - Tasa de cambio USD → NIO (default: 37.00)
  - `currency_paid` (text) - Moneda usada en el pago (NIO o USD)
  
- **Nuevos campos en `transactions`:**
  - `currency_paid` (text) - Registro de qué moneda se usó
  - `usd_amount_received` (numeric) - Monto recibido en USD
  - `usd_exchange_rate` (numeric) - Tasa usada en la transacción

### 2. **API REST**
- **Actualizado:** `/api/tenants/[tenantId]/settings`
  - GET: Ahora incluye `usdExchangeRate` 
  - PUT/PATCH: Ahora soporta actualizar `usdExchangeRate`

### 3. **TypeScript Types**
- **Actualizado:** `src/lib/types/index.ts`
  - `Transaction` interface ahora soporta:
    - `paymentMethod: "CASH" | "CARD" | "TRANSFER" | "USD"`
    - `currency_paid: "NIO" | "USD"`
    - `usd_amount_received: number`
    - `usd_exchange_rate: number`

### 4. **POS Service**
- **Actualizado:** `src/features/pos/services.ts`
  - `createTransaction()` ahora acepta:
    - `paymentMethod: "USD"` (nuevo)
    - `currencyPaid: "NIO" | "USD"` (nuevo)
    - `usdAmountReceived: number` (nuevo)
    - `usdExchangeRate: number` (nuevo)

### 5. **Nueva Página de Configuración**
- **Creada:** `/dashboard/settings/exchange-rate`
- Ubicación: `src/app/dashboard/settings/exchange-rate/page.tsx`
- Interfaz para configurar la tasa USD/NIO
- Ejemplos de conversión en tiempo real
- Información sobre cómo funciona en el POS

### 6. **Settings General (UI)**
- Agregado acceso rápido a "Cambio USD" (💱) en `Settings > General`

## Cómo Usar

### Para el Administrador (Configurar Tasa)

1. Ir a **Settings > General**
2. Hacer clic en **"Cambio USD"** (la card con 💱)
3. Ingresar la tasa de cambio USD → NIO (ej: 37.50)
4. Ver ejemplos de conversión en tiempo real
5. Hacer clic en **"Guardar Tasa"**

### Para el Cajero (Usar en POS)

1. En la Caja, realizar una venta normal
2. Al momento de pagar, seleccionar **"USD"** como método de pago
3. Ingresar el monto recibido en dólares
4. El sistema convertirá automáticamente a Córdobas usando la tasa configurada
5. Calcular y mostrar el cambio en Córdobas
6. La transacción guardará:
   - Monto original en USD
   - Monto equivalente en NIO
   - Tasa de cambio usada
   - Cambio en Córdobas

## Flujo de Cálculo

```
Ejemplo: Venta por 100 USD, tasa 37.50

1. Total de venta: 1,500 NIO (ejemplo)
2. Cliente paga: 100 USD
3. Conversión: 100 USD × 37.50 = 3,750 NIO
4. Cambio: 3,750 NIO - 1,500 NIO = 2,250 NIO
5. Guardado en transacción:
   - paymentMethod: "USD"
   - currency_paid: "USD"
   - amount_received: 3,750 (en NIO)
   - usd_amount_received: 100 (en USD)
   - usd_exchange_rate: 37.50
   - change: 2,250 (en NIO)
```

## Estructura de la Transacción

```json
{
  "id": "TX-...",
  "paymentMethod": "USD",
  "currency_paid": "USD",
  "total": 1500,
  "amount_received": 3750,
  "change": 2250,
  "usd_amount_received": 100,
  "usd_exchange_rate": 37.50,
  "items": [...],
  "subtotal": 1500,
  "tax": 0,
  "cashierName": "Juan"
}
```

## Pasos Restantes (Si necesario)

Para completar la integración visual en el POS, necesitarías:

1. **Actualizar la interfaz del POS** (`src/app/dashboard/pos/page.tsx`):
   ```typescript
   - Cambiar type PaymentMethod para incluir "USD"
   - Cargar usdExchangeRate de settings
   - Añadir campo de entrada para USD
   - Mostrar conversión en tiempo real
   - Calcular cambio en NIO automáticamente
   ```

2. **Actualizar la API de transacciones** (`src/app/api/tenants/[tenantId]/transactions/route.ts`):
   ```typescript
   - Soportar los nuevos campos currency_paid, usd_amount_received
   - Guardarlos en la base de datos
   ```

3. **Actualizar el visualizador de transacciones** (`src/app/dashboard/transactions/page.tsx`):
   ```typescript
   - Mostrar si fue pagado en USD o NIO
   - Mostrar el monto en USD si aplica
   ```

## Ejemplo de Uso Completo

```typescript
// En el POS
const handlePay = async () => {
  const usdExchangeRate = settings.usdExchangeRate; // 37.50
  
  // Usuario paga 100 USD
  const usdAmount = 100;
  const equivalentNIO = usdAmount * usdExchangeRate; // 3,750 NIO
  
  // Calcular cambio
  const change = equivalentNIO - totalNIO;
  
  // Crear transacción
  await POSService.createTransaction(
    tenantId,
    cartItems,
    "USD", // paymentMethod
    cashierId,
    discount,
    cashierName,
    equivalentNIO, // amount_received (en NIO)
    "USD", // currencyPaid
    usdAmount, // usd_amount_received
    usdExchangeRate
  );
};
```

## Notas Importantes

⚠️ **Consideraciones:**
- La tasa de cambio es configurada una sola vez por tenant
- Se guarda en cada transacción para auditoría
- El cambio siempre se calcula en Córdobas
- Los reportes pueden mostrar tanto USD como NIO

## Testing

Para probar la nueva funcionalidad:

1. ✅ Crear migration en base de datos
2. ✅ Configurar tasa en Settings > Cambio USD
3. ⏳ Integrar en POS UI (siguiente paso)
4. ⏳ Probar pagos en USD
5. ⏳ Verificar reportes de transacciones

---

**Status:** Infraestructura lista, necesita integración en interfaz POS
