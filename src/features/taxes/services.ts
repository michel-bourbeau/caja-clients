export interface Tax {
  id: string;
  name: string;
  rate: number;
  is_active: boolean;
}

export class TaxService {
  static async fetchTaxes(tenantId: string): Promise<Tax[]> {
    try {
      const response = await fetch(`/api/tenants/${tenantId}/taxes`);
      if (!response.ok) {
        throw new Error(`Failed to fetch taxes: ${response.statusText}`);
      }
      const taxes = await response.json();
      // Filter only active taxes
      return taxes.filter((tax: Tax) => tax.is_active);
    } catch (error) {
      console.error("Error fetching taxes:", error);
      return [];
    }
  }

  static calculateTaxes(
    subtotal: number,
    taxes: Tax[]
  ): { [key: string]: number } & { total: number } {
    const result: { [key: string]: number } & { total: number } = {
      total: subtotal,
    };

    taxes.forEach((tax) => {
      const taxAmount = (subtotal * tax.rate) / 100;
      result[tax.name] = taxAmount;
      result.total += taxAmount;
    });

    return result;
  }
}
