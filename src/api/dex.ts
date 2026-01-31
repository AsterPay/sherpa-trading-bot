/**
 * DEX Trading Client (0x API + Uniswap)
 * For Base chain token trading
 */

import { ethers } from 'ethers';

const BASE_RPC = process.env.BASE_RPC || 'https://mainnet.base.org';
const BASE_CHAIN_ID = 8453; // Base mainnet
const ZEROX_API_KEY = process.env.ZEROX_API_KEY || '';
const ZEROX_API_BASE = 'https://base.api.0x.org';

// Base token addresses
const WETH = '0x4200000000000000000000000000000000000006';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

interface SwapParams {
  sellToken: string;
  buyToken: string;
  sellAmount: string; // in wei
  slippagePercentage?: number;
}

export class DEXClient {
  private wallet: ethers.Wallet;
  private provider: ethers.JsonRpcProvider;

  constructor(privateKey: string) {
    this.wallet = new ethers.Wallet(privateKey);
    this.provider = new ethers.JsonRpcProvider(BASE_RPC);
  }

  /**
   * Get token balance
   */
  async getBalance(tokenAddress: string): Promise<number> {
    try {
      if (tokenAddress.toLowerCase() === 'eth' || tokenAddress.toLowerCase() === 'native') {
        const balance = await this.provider.getBalance(this.wallet.address);
        return parseFloat(ethers.formatEther(balance));
      }

      const tokenContract = new ethers.Contract(
        tokenAddress,
        ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
        this.provider
      );

      const [balance, decimals] = await Promise.all([
        tokenContract.balanceOf(this.wallet.address),
        tokenContract.decimals(),
      ]);

      return parseFloat(ethers.formatUnits(balance, decimals));
    } catch (error) {
      console.error('DEX getBalance error:', error);
      return 0;
    }
  }

  /**
   * Get ETH balance
   */
  async getETHBalance(): Promise<number> {
    return this.getBalance('eth');
  }

  /**
   * Get quote for swap
   */
  async getQuote(params: SwapParams) {
    try {
      const url = `${ZEROX_API_BASE}/swap/v1/quote?` +
        `sellToken=${params.sellToken}&` +
        `buyToken=${params.buyToken}&` +
        `sellAmount=${params.sellAmount}&` +
        `slippagePercentage=${params.slippagePercentage || 1}`;

      const response = await fetch(url, {
        headers: {
          '0x-api-key': ZEROX_API_KEY || '',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('DEX getQuote error:', error);
      return null;
    }
  }

  /**
   * Execute swap
   */
  async swap(params: SwapParams): Promise<string | null> {
    try {
      // Get quote
      const quote = await this.getQuote(params);
      if (!quote) {
        throw new Error('Failed to get quote');
      }

      // Sign and send transaction
      const signer = new ethers.Wallet(this.wallet.privateKey, this.provider);
      
      // For 0x API, we need to use the swap endpoint
      const swapResponse = await fetch(`${ZEROX_API_BASE}/swap/v1/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          '0x-api-key': ZEROX_API_KEY,
        },
        body: JSON.stringify({
          ...params,
          takerAddress: this.wallet.address,
        }),
      });

      if (!swapResponse.ok) {
        throw new Error(`Swap failed: ${swapResponse.status}`);
      }

      const swapData = await swapResponse.json();
      
      // Execute transaction
      const tx = await signer.sendTransaction({
        to: swapData.to,
        data: swapData.data,
        value: swapData.value || '0x0',
        gasLimit: swapData.gas || '500000',
      });

      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('DEX swap error:', error);
      return null;
    }
  }

  /**
   * Buy token with ETH
   */
  async buyToken(
    tokenAddress: string,
    ethAmount: number,
    slippage: number = 1
  ): Promise<string | null> {
    const sellAmount = ethers.parseEther(ethAmount.toString());
    
    return this.swap({
      sellToken: WETH,
      buyToken: tokenAddress,
      sellAmount: sellAmount.toString(),
      slippagePercentage: slippage,
    });
  }

  /**
   * Sell token for ETH
   */
  async sellToken(
    tokenAddress: string,
    tokenAmount: string, // in token units
    slippage: number = 1
  ): Promise<string | null> {
    // Get token decimals
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ['function decimals() view returns (uint8)'],
      this.provider
    );
    
    const decimals = await tokenContract.decimals();
    const sellAmount = ethers.parseUnits(tokenAmount, decimals);

    return this.swap({
      sellToken: tokenAddress,
      buyToken: WETH,
      sellAmount: sellAmount.toString(),
      slippagePercentage: slippage,
    });
  }

  /**
   * Check if we have enough balance
   */
  async hasBalance(tokenAddress: string, requiredAmount: number): Promise<boolean> {
    const balance = await this.getBalance(tokenAddress);
    return balance >= requiredAmount;
  }
}
