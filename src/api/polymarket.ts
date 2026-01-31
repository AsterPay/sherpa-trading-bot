/**
 * Polymarket CLOB API Client
 * https://docs.polymarket.com/developers/CLOB
 */

import { ethers } from 'ethers';
import * as crypto from 'crypto';

const POLYMARKET_CLOB_API = 'https://clob.polymarket.com';
const POLYGON_RPC = process.env.POLYGON_RPC || 'https://polygon-rpc.com';

interface PolymarketOrder {
  token_id: string;
  price: string;
  side: 'buy' | 'sell';
  size: string;
  expiration?: string;
  nonce?: string;
}

interface PolymarketMarket {
  condition_id: string;
  question: string;
  outcomes: string[];
  outcome_prices: number[];
  volume: number;
  liquidity: number;
  end_date: string;
  active: boolean;
}

export class PolymarketClient {
  private wallet: ethers.Wallet;
  private apiKey: string;
  private signer: ethers.JsonRpcSigner | null = null;

  constructor(privateKey: string, apiKey?: string) {
    this.wallet = new ethers.Wallet(privateKey);
    this.apiKey = apiKey || '';
  }

  async initialize() {
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
    this.signer = await provider.getSigner(this.wallet.address);
  }

  /**
   * Get active markets
   */
  async getMarkets(limit: number = 100): Promise<PolymarketMarket[]> {
    try {
      const response = await fetch(
        `${POLYMARKET_CLOB_API}/markets?active=true&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Polymarket getMarkets error:', error);
      return [];
    }
  }

  /**
   * Get orderbook for a market
   */
  async getOrderbook(tokenId: string) {
    try {
      const response = await fetch(
        `${POLYMARKET_CLOB_API}/book?token_id=${tokenId}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Polymarket getOrderbook error:', error);
      return null;
    }
  }

  /**
   * Create a signed order
   */
  async createOrder(order: PolymarketOrder): Promise<string | null> {
    if (!this.signer) {
      await this.initialize();
    }

    try {
      // Generate nonce
      const nonce = order.nonce || crypto.randomBytes(16).toString('hex');
      
      // Create order message
      const orderMessage = {
        ...order,
        nonce,
        expiration: order.expiration || Math.floor(Date.now() / 1000) + 3600, // 1 hour
      };

      // Sign order (simplified - actual implementation needs proper EIP-712 signing)
      // For now, return a placeholder
      // In production, you'd use Polymarket's signing library
      
      const response = await fetch(`${POLYMARKET_CLOB_API}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(orderMessage),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Order failed: ${error}`);
      }

      const result = await response.json();
      return result.order_id || null;
    } catch (error) {
      console.error('Polymarket createOrder error:', error);
      return null;
    }
  }

  /**
   * Buy shares in a market
   */
  async buyShares(
    tokenId: string,
    amount: number,
    maxPrice: number
  ): Promise<string | null> {
    const order: PolymarketOrder = {
      token_id: tokenId,
      price: maxPrice.toString(),
      side: 'buy',
      size: amount.toString(),
    };

    return this.createOrder(order);
  }

  /**
   * Sell shares
   */
  async sellShares(
    tokenId: string,
    amount: number,
    minPrice: number
  ): Promise<string | null> {
    const order: PolymarketOrder = {
      token_id: tokenId,
      price: minPrice.toString(),
      side: 'sell',
      size: amount.toString(),
    };

    return this.createOrder(order);
  }

  /**
   * Get user balance
   */
  async getBalance(): Promise<{ usdc: number; shares: any[] }> {
    try {
      // In production, query Polygon for USDC balance
      const provider = new ethers.JsonRpcProvider(POLYGON_RPC);
      const usdcAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'; // USDC on Polygon
      const usdcContract = new ethers.Contract(
        usdcAddress,
        ['function balanceOf(address) view returns (uint256)'],
        provider
      );
      
      const balance = await usdcContract.balanceOf(this.wallet.address);
      const usdcBalance = parseFloat(ethers.formatUnits(balance, 6)); // USDC has 6 decimals

      return {
        usdc: usdcBalance,
        shares: [], // Would need to query Polymarket for user positions
      };
    } catch (error) {
      console.error('Polymarket getBalance error:', error);
      return { usdc: 0, shares: [] };
    }
  }

  /**
   * Check if we have enough balance
   */
  async hasBalance(requiredUsd: number): Promise<boolean> {
    const balance = await this.getBalance();
    return balance.usdc >= requiredUsd;
  }
}
