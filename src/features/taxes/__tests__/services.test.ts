import { TaxService } from '@/features/taxes/services';

describe('TaxService', () => {
  describe('calculateTaxes', () => {
    it('should calculate taxes for a single tax', () => {
      const subtotal = 100;
      const taxes = [
        {
          id: 'tax-1',
          name: 'IVA',
          rate: 15,
          is_active: true,
        },
      ];

      const result = TaxService.calculateTaxes(subtotal, taxes);

      expect(result).toEqual({
        total: 115,
        IVA: 15,
      });
    });

    it('should calculate taxes for multiple taxes', () => {
      const subtotal = 100;
      const taxes = [
        {
          id: 'tax-1',
          name: 'IVA',
          rate: 15,
          is_active: true,
        },
        {
          id: 'tax-2',
          name: 'Municipal',
          rate: 5,
          is_active: true,
        },
      ];

      const result = TaxService.calculateTaxes(subtotal, taxes);

      expect(result).toEqual({
        total: 120,
        IVA: 15,
        Municipal: 5,
      });
    });

    it('should handle zero subtotal', () => {
      const subtotal = 0;
      const taxes = [
        {
          id: 'tax-1',
          name: 'IVA',
          rate: 15,
          is_active: true,
        },
      ];

      const result = TaxService.calculateTaxes(subtotal, taxes);

      expect(result).toEqual({
        total: 0,
        IVA: 0,
      });
    });

    it('should handle decimal tax rates', () => {
      const subtotal = 99.99;
      const taxes = [
        {
          id: 'tax-1',
          name: 'IVA',
          rate: 21,
          is_active: true,
        },
      ];

      const result = TaxService.calculateTaxes(subtotal, taxes);

      expect(result.IVA).toBeCloseTo(20.9979, 2);
      expect(result.total).toBeCloseTo(120.9879, 2);
    });

    it('should handle empty tax array', () => {
      const subtotal = 100;
      const taxes: any[] = [];

      const result = TaxService.calculateTaxes(subtotal, taxes);

      expect(result).toEqual({
        total: 100,
      });
    });

    it('should handle high tax rates', () => {
      const subtotal = 500;
      const taxes = [
        {
          id: 'tax-1',
          name: 'Tax1',
          rate: 50,
          is_active: true,
        },
        {
          id: 'tax-2',
          name: 'Tax2',
          rate: 30,
          is_active: true,
        },
      ];

      const result = TaxService.calculateTaxes(subtotal, taxes);

      expect(result.total).toBe(900); // 500 + 250 + 150
      expect(result.Tax1).toBe(250);
      expect(result.Tax2).toBe(150);
    });

    it('should preserve tax name in result', () => {
      const subtotal = 200;
      const taxes = [
        {
          id: 'tax-1',
          name: 'VAT',
          rate: 20,
          is_active: true,
        },
      ];

      const result = TaxService.calculateTaxes(subtotal, taxes);

      expect(result).toHaveProperty('VAT');
      expect(result.VAT).toBe(40);
    });
  });

  describe('fetchTaxes', () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should fetch and filter active taxes', async () => {
      const mockTaxes = [
        {
          id: 'tax-1',
          name: 'IVA',
          rate: 15,
          is_active: true,
        },
        {
          id: 'tax-2',
          name: 'Old Tax',
          rate: 10,
          is_active: false,
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTaxes,
      });

      const result = await TaxService.fetchTaxes('tenant-1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('IVA');
      expect(result[0].is_active).toBe(true);
    });

    it('should return empty array on fetch error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      const result = await TaxService.fetchTaxes('tenant-1');

      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });

    it('should call correct endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await TaxService.fetchTaxes('test-tenant-id');

      expect(global.fetch).toHaveBeenCalledWith('/api/tenants/test-tenant-id/taxes');
    });
  });
});
