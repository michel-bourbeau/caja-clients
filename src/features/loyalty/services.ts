import { LoyalCustomer, LoyalCustomerStats, LoyaltyReward, LoyaltyTransaction } from '@/lib/types';

export class LoyaltyService {
  /**
   * Get loyalty settings for a tenant
   */
  static async getLoyaltySettings(tenantId: string): Promise<{
    loyalty_module_enabled: boolean;
    loyalty_reward_threshold: number;
    loyalty_reward_type: string;
    loyalty_reward_value: number;
  }> {
    const response = await fetch(`/api/tenants/${tenantId}/loyalty/settings`);
    if (!response.ok) throw new Error('Failed to fetch loyalty settings');
    return response.json();
  }

  /**
   * Create a new loyal customer
   */
  static async createCustomer(
    tenantId: string,
    data: {
      card_number: string;
      name: string;
      phone?: string;
      email?: string;
    }
  ): Promise<LoyalCustomer> {
    const response = await fetch(`/api/tenants/${tenantId}/loyalty/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create customer');
    }

    return response.json();
  }

  /**
   * Get all loyal customers for a tenant
   */
  static async getCustomers(tenantId: string, search?: string): Promise<LoyalCustomer[]> {
    const url = new URL(`/api/tenants/${tenantId}/loyalty/customers`, window.location.origin);
    if (search) url.searchParams.append('search', search);

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('Failed to fetch customers');
    return response.json();
  }

  /**
   * Get a specific loyal customer with stats and history
   */
  static async getCustomerDetails(tenantId: string, customerId: string): Promise<LoyalCustomerStats> {
    const response = await fetch(`/api/tenants/${tenantId}/loyalty/customers/${customerId}`);
    if (!response.ok) throw new Error('Failed to fetch customer details');
    return response.json();
  }

  /**
   * Update a loyal customer
   */
  static async updateCustomer(
    tenantId: string,
    customerId: string,
    data: Partial<Omit<LoyalCustomer, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>
  ): Promise<LoyalCustomer> {
    const response = await fetch(`/api/tenants/${tenantId}/loyalty/customers/${customerId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Failed to update customer');
    return response.json();
  }

  /**
   * Delete a loyal customer
   */
  static async deleteCustomer(tenantId: string, customerId: string): Promise<void> {
    const response = await fetch(`/api/tenants/${tenantId}/loyalty/customers/${customerId}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('Failed to delete customer');
  }

  /**
   * Record a purchase/transaction for a customer
   */
  static async recordPurchase(
    tenantId: string,
    customerId: string,
    data: {
      amount: number;
      transaction_id?: string;
      description?: string;
    }
  ): Promise<LoyaltyTransaction> {
    const response = await fetch(`/api/tenants/${tenantId}/loyalty/customers/${customerId}/record-purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error('Failed to record purchase');
    return response.json();
  }

  /**
   * Award a reward to a customer
   */
  static async awardReward(
    tenantId: string,
    customerId: string,
    data: {
      reward_type: string;
      reward_value?: number;
      notes?: string;
    }
  ): Promise<LoyaltyReward> {
    const response = await fetch(`/api/tenants/${tenantId}/loyalty/customers/${customerId}/award-reward`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to award reward');
    }

    return response.json();
  }

  /**
   * Get reward history for a customer
   */
  static async getRewardHistory(tenantId: string, customerId: string): Promise<LoyaltyReward[]> {
    const response = await fetch(`/api/tenants/${tenantId}/loyalty/customers/${customerId}/rewards`);
    if (!response.ok) throw new Error('Failed to fetch reward history');
    return response.json();
  }

  /**
   * Get purchase history for a customer
   */
  static async getPurchaseHistory(tenantId: string, customerId: string): Promise<LoyaltyTransaction[]> {
    const response = await fetch(`/api/tenants/${tenantId}/loyalty/customers/${customerId}/purchases`);
    if (!response.ok) throw new Error('Failed to fetch purchase history');
    return response.json();
  }

  /**
   * Calculate current counter (amount since last reward)
   * totalAccumulated - sum of all reward amounts = current counter
   */
  static calculateCurrentCounter(
    totalAccumulated: number,
    rewards: LoyaltyReward[]
  ): number {
    const totalRewarded = rewards.reduce((sum, r) => sum + (r.amount_at_reward || 0), 0);
    return Math.max(0, totalAccumulated - totalRewarded);
  }

  /**
   * Calculate progress towards next reward
   */
  static calculateRewardProgress(
    currentCounter: number,
    rewardThreshold: number
  ): { percentage: number; remainingAmount: number } {
    const percentage = Math.min(100, (currentCounter / rewardThreshold) * 100);
    const remainingAmount = Math.max(0, rewardThreshold - currentCounter);
    return { percentage, remainingAmount };
  }
}
