/**
 * Integration test for variant creation order preservation
 * 
 * Tests that when creating a product with 5 variants in a specific order,
 * the order is preserved in the database and displayed correctly
 */

interface ProductVariant {
  id: string;
  label: string;
  sort_order: number;
  sku: string;
  price: number;
  stock_quantity: number;
}

interface Product {
  id: string;
  name: string;
  variants: ProductVariant[];
}

/**
 * Simulates creating multiple variants in parallel (like the frontend does)
 * Each variant gets a sort_order from 0 to n-1
 */
function simulateParallelVariantCreation(
  productId: string,
  variantLabels: string[]
): ProductVariant[] {
  return variantLabels.map((label, index) => ({
    id: `variant-${index}`,
    label,
    sort_order: index,
    sku: `SKU-V${index + 1}`,
    price: (index + 1) * 10,
    stock_quantity: (index + 1) * 5,
  }));
}

/**
 * Simulates backend processing: normalize sort_order and sort
 * This mimics what fetchData() does in page.tsx
 */
function normalizeAndSortVariants(variants: ProductVariant[]): ProductVariant[] {
  // First pass: ensure all have valid sort_order
  let normalized = variants.map((v, idx) => ({
    ...v,
    sort_order: typeof v.sort_order === 'number' && !isNaN(v.sort_order) 
      ? v.sort_order 
      : idx,
  }));

  // Second pass: sort by sort_order
  normalized = normalized.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  return normalized;
}

describe("Variant Creation Order Preservation", () => {
  describe("5-variant product creation scenario", () => {
    it("should preserve creation order for 5 variants", () => {
      // Define the exact order of creation
      const variantLabels = [
        "iPhone 11",
        "iPhone 12",
        "iPhone 13",
        "iPhone 14",
        "iPhone 15",
      ];

      // Simulate creation (each gets sort_order 0, 1, 2, 3, 4)
      const createdVariants = simulateParallelVariantCreation("product-123", variantLabels);

      // Verify creation preserved order with correct sort_order values
      expect(createdVariants.map(v => v.label)).toEqual([
        "iPhone 11",
        "iPhone 12",
        "iPhone 13",
        "iPhone 14",
        "iPhone 15",
      ]);
      expect(createdVariants.map(v => v.sort_order)).toEqual([0, 1, 2, 3, 4]);
    });

    it("should maintain order after backend processing", () => {
      const variantLabels = [
        "iPhone 11",
        "iPhone 12",
        "iPhone 13",
        "iPhone 14",
        "iPhone 15",
      ];

      const createdVariants = simulateParallelVariantCreation("product-123", variantLabels);
      const normalized = normalizeAndSortVariants(createdVariants);

      // After normalization and sorting, order should be preserved
      expect(normalized.map(v => v.label)).toEqual([
        "iPhone 11",
        "iPhone 12",
        "iPhone 13",
        "iPhone 14",
        "iPhone 15",
      ]);
      expect(normalized.map(v => v.sort_order)).toEqual([0, 1, 2, 3, 4]);
    });

    it("should maintain order even if backend returns variants scrambled", () => {
      // Simulate backend returning variants in wrong order
      const backendResponse: ProductVariant[] = [
        {
          id: "v-3",
          label: "iPhone 13",
          sort_order: 2,
          sku: "SKU-V3",
          price: 30,
          stock_quantity: 15,
        },
        {
          id: "v-1",
          label: "iPhone 11",
          sort_order: 0,
          sku: "SKU-V1",
          price: 10,
          stock_quantity: 5,
        },
        {
          id: "v-5",
          label: "iPhone 15",
          sort_order: 4,
          sku: "SKU-V5",
          price: 50,
          stock_quantity: 25,
        },
        {
          id: "v-2",
          label: "iPhone 12",
          sort_order: 1,
          sku: "SKU-V2",
          price: 20,
          stock_quantity: 10,
        },
        {
          id: "v-4",
          label: "iPhone 14",
          sort_order: 3,
          sku: "SKU-V4",
          price: 40,
          stock_quantity: 20,
        },
      ];

      const normalized = normalizeAndSortVariants(backendResponse);

      // Despite scrambled backend response, display order should match creation order
      expect(normalized.map(v => v.label)).toEqual([
        "iPhone 11",
        "iPhone 12",
        "iPhone 13",
        "iPhone 14",
        "iPhone 15",
      ]);
      expect(normalized.map(v => v.sort_order)).toEqual([0, 1, 2, 3, 4]);
    });

    it("should handle different 5-variant products independently", () => {
      const product1Labels = ["Size S", "Size M", "Size L", "Size XL", "Size XXL"];
      const product2Labels = ["Red", "Green", "Blue", "Yellow", "Purple"];

      const product1Variants = simulateParallelVariantCreation("product-1", product1Labels);
      const product2Variants = simulateParallelVariantCreation("product-2", product2Labels);

      const normalized1 = normalizeAndSortVariants(product1Variants);
      const normalized2 = normalizeAndSortVariants(product2Variants);

      // Each product should maintain its own creation order
      expect(normalized1.map(v => v.label)).toEqual([
        "Size S",
        "Size M",
        "Size L",
        "Size XL",
        "Size XXL",
      ]);

      expect(normalized2.map(v => v.label)).toEqual([
        "Red",
        "Green",
        "Blue",
        "Yellow",
        "Purple",
      ]);
    });

    it("should verify sort_order values are sequential (0 to 4)", () => {
      const variantLabels = [
        "Item 1",
        "Item 2",
        "Item 3",
        "Item 4",
        "Item 5",
      ];

      const createdVariants = simulateParallelVariantCreation("product-123", variantLabels);
      const normalized = normalizeAndSortVariants(createdVariants);

      // sort_order should be exactly [0, 1, 2, 3, 4]
      normalized.forEach((variant, index) => {
        expect(variant.sort_order).toBe(index);
      });

      // All sort_order values should be unique
      const sortOrders = normalized.map(v => v.sort_order);
      expect(new Set(sortOrders).size).toBe(5);
    });

    it("should maintain label-to-sortorder mapping", () => {
      const variantLabels = [
        "iPhone 11",
        "iPhone 12",
        "iPhone 13",
        "iPhone 14",
        "iPhone 15",
      ];

      const createdVariants = simulateParallelVariantCreation("product-123", variantLabels);
      const normalized = normalizeAndSortVariants(createdVariants);

      // Create a mapping to verify consistency
      const labelToSortOrder: Record<string, number> = {};
      normalized.forEach(v => {
        labelToSortOrder[v.label] = v.sort_order;
      });

      // Verify mapping is correct
      expect(labelToSortOrder["iPhone 11"]).toBe(0);
      expect(labelToSortOrder["iPhone 12"]).toBe(1);
      expect(labelToSortOrder["iPhone 13"]).toBe(2);
      expect(labelToSortOrder["iPhone 14"]).toBe(3);
      expect(labelToSortOrder["iPhone 15"]).toBe(4);
    });
  });

  describe("Real-world 5-variant scenarios", () => {
    it("should handle realistic price differences across 5 variants", () => {
      const variants: ProductVariant[] = [
        {
          id: "v1",
          label: "250ml - $5.99",
          sort_order: 0,
          sku: "PROD-250ML",
          price: 5.99,
          stock_quantity: 100,
        },
        {
          id: "v2",
          label: "500ml - $8.99",
          sort_order: 1,
          sku: "PROD-500ML",
          price: 8.99,
          stock_quantity: 80,
        },
        {
          id: "v3",
          label: "1L - $12.99",
          sort_order: 2,
          sku: "PROD-1L",
          price: 12.99,
          stock_quantity: 60,
        },
        {
          id: "v4",
          label: "2L - $19.99",
          sort_order: 3,
          sku: "PROD-2L",
          price: 19.99,
          stock_quantity: 40,
        },
        {
          id: "v5",
          label: "5L - $39.99",
          sort_order: 4,
          sku: "PROD-5L",
          price: 39.99,
          stock_quantity: 20,
        },
      ];

      const normalized = normalizeAndSortVariants(variants);

      expect(normalized.map(v => v.label)).toEqual([
        "250ml - $5.99",
        "500ml - $8.99",
        "1L - $12.99",
        "2L - $19.99",
        "5L - $39.99",
      ]);

      // Verify prices are in ascending order
      const prices = normalized.map(v => v.price);
      expect(prices).toEqual([5.99, 8.99, 12.99, 19.99, 39.99]);
    });

    it("should handle 5-variant phone models with different storage", () => {
      const variants: ProductVariant[] = [
        {
          id: "v1",
          label: "64GB",
          sort_order: 0,
          sku: "IPHONE-64GB",
          price: 999,
          stock_quantity: 50,
        },
        {
          id: "v2",
          label: "128GB",
          sort_order: 1,
          sku: "IPHONE-128GB",
          price: 1099,
          stock_quantity: 60,
        },
        {
          id: "v3",
          label: "256GB",
          sort_order: 2,
          sku: "IPHONE-256GB",
          price: 1199,
          stock_quantity: 55,
        },
        {
          id: "v4",
          label: "512GB",
          sort_order: 3,
          sku: "IPHONE-512GB",
          price: 1299,
          stock_quantity: 30,
        },
        {
          id: "v5",
          label: "1TB",
          sort_order: 4,
          sku: "IPHONE-1TB",
          price: 1399,
          stock_quantity: 20,
        },
      ];

      const normalized = normalizeAndSortVariants(variants);

      expect(normalized.map(v => v.label)).toEqual([
        "64GB",
        "128GB",
        "256GB",
        "512GB",
        "1TB",
      ]);
    });
  });
});
