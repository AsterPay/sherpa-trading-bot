/**
 * Alpaca Markets API Client
 * https://alpaca.markets/docs/api-documentation/
 */

const ALPACA_API_BASE = process.env.ALPACA_API_BASE || 'https://api.alpaca.markets';
const ALPACA_DATA_BASE = process.env.ALPACA_DATA_BASE || 'https://data.alpaca.markets';

interface AlpacaOrder {
  symbol: string;
  qty?: number;
  notional?: number;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  time_in_force: 'day' | 'gtc' | 'opg' | 'cls' | 'ioc' | 'fok';
  limit_price?: number;
  stop_price?: number;
}

interface AlpacaPosition {
  symbol: string;
  qty: string;
  side: 'long' | 'short';
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
}

export class AlpacaClient {
  private apiKey: string;
  private secretKey: string;
  private paper: boolean;

  constructor(apiKey: string, secretKey: string, paper: boolean = true) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.paper = paper;
  }

  private getHeaders() {
    return {
      'APCA-API-KEY-ID': this.apiKey,
      'APCA-API-SECRET-KEY': this.secretKey,
      'Content-Type': 'application/json',
    };
  }

  private getBaseUrl() {
    return this.paper 
      ? ALPACA_API_BASE.replace('api.', 'paper-api.')
      : ALPACA_API_BASE;
  }

  /**
   * Get account info
   */
  async getAccount() {
    try {
      const response = await fetch(`${this.getBaseUrl()}/v2/account`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Alpaca getAccount error:', error);
      return null;
    }
  }

  /**
   * Get current positions
   */
  async getPositions(): Promise<AlpacaPosition[]> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/v2/positions`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Alpaca getPositions error:', error);
      return [];
    }
  }

  /**
   * Get position for a symbol
   */
  async getPosition(symbol: string): Promise<AlpacaPosition | null> {
    try {
      const response = await fetch(`${this.getBaseUrl()}/v2/positions/${symbol}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Alpaca getPosition error:', error);
      return null;
    }
  }

  /**
   * Get latest quote
   */
  async getQuote(symbol: string) {
    try {
      const response = await fetch(
        `${ALPACA_DATA_BASE}/v2/stocks/${symbol}/quotes/latest`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.quote;
    } catch (error) {
      console.error('Alpaca getQuote error:', error);
      return null;
    }
  }

  /**
   * Submit order
   */
  async createOrder(order: AlpacaOrder) {
    try {
      const response = await fetch(`${this.getBaseUrl()}/v2/orders`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(order),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Order failed: ${error}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Alpaca createOrder error:', error);
      throw error;
    }
  }

  /**
   * Buy SPY (market order)
   */
  async buySPY(notional: number): Promise<string | null> {
    try {
      const order = await this.createOrder({
        symbol: 'SPY',
        notional,
        side: 'buy',
        type: 'market',
        time_in_force: 'day',
      });

      return order.id || null;
    } catch (error) {
      console.error('Alpaca buySPY error:', error);
      return null;
    }
  }

  /**
   * Sell SPY position
   */
  async sellSPY(qty: number): Promise<string | null> {
    try {
      const order = await this.createOrder({
        symbol: 'SPY',
        qty,
        side: 'sell',
        type: 'market',
        time_in_force: 'day',
      });

      return order.id || null;
    } catch (error) {
      console.error('Alpaca sellSPY error:', error);
      return null;
    }
  }

  /**
   * Close position
   */
  async closePosition(symbol: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/v2/positions/${symbol}`,
        {
          method: 'DELETE',
          headers: this.getHeaders(),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Alpaca closePosition error:', error);
      return false;
    }
  }

  /**
   * Get account buying power
   */
  async getBuyingPower(): Promise<number> {
    const account = await this.getAccount();
    return account ? parseFloat(account.buying_power || '0') : 0;
  }

  /**
   * Check if we have enough buying power
   */
  async hasBuyingPower(required: number): Promise<boolean> {
    const buyingPower = await this.getBuyingPower();
    return buyingPower >= required;
  }
}
