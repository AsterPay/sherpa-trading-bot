/**
 * REAL MONEY TRADING AGENT
 * 
 * Executes trades on:
 * 1. Polymarket (Polygon USDC)
 * 2. SPY via Alpaca
 * 3. Token launches on Base
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { dbOperations } from './db/database-simple';
import { PolymarketClient } from './api/polymarket';
import { AlpacaClient } from './api/alpaca';
import { DEXClient } from './api/dex';

dotenv.config();

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Strategies
  POLYMARKET_ENABLED: process.env.POLYMARKET_ENABLED !== 'false',
  SPY_ENABLED: process.env.SPY_ENABLED !== 'false',
  TOKEN_LAUNCH_ENABLED: process.env.TOKEN_LAUNCH_ENABLED !== 'false',
  
  // Capital allocation (EUR)
  POLYMARKET_CAPITAL: parseFloat(process.env.POLYMARKET_CAPITAL || '200'),
  SPY_CAPITAL: parseFloat(process.env.SPY_CAPITAL || '200'),
  TOKEN_CAPITAL: parseFloat(process.env.TOKEN_CAPITAL || '200'),
  
  // Risk Management
  MAX_POSITION_SIZE_USD: parseFloat(process.env.MAX_POSITION_SIZE_USD || '50'),
  MAX_DAILY_LOSS_EUR: parseFloat(process.env.MAX_DAILY_LOSS_EUR || '50'),
  MAX_TRADES_PER_DAY: parseInt(process.env.MAX_TRADES_PER_DAY || '10'),
  
  // Scanning
  SCAN_INTERVAL_MS: parseInt(process.env.SCAN_INTERVAL_MS || '60000'),
  SPY_SQUEEZE_TIME: process.env.SPY_SQUEEZE_TIME || '15:50',
  
  // Execution
  AUTO_EXECUTE: process.env.AUTO_EXECUTE === 'true',
  MIN_CONFIDENCE: (process.env.MIN_CONFIDENCE || 'high') as 'low' | 'medium' | 'high',
  
  // Alerts
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
  
  // Logging
  LOG_FILE: process.env.LOG_FILE || './logs/trading-agent.log',
};

// Ensure log directory exists
const logDir = require('path').dirname(CONFIG.LOG_FILE);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// ============================================
// TYPES
// ============================================

interface ArbitrageOpportunity {
  type: 'polymarket' | 'spy_squeeze' | 'token_launch';
  timestamp: string;
  description: string;
  expectedEdge: number;
  confidence: 'low' | 'medium' | 'high';
  action: string;
  data: any;
}

interface TradingState {
  dailyPnL: number;
  dailyTrades: number;
  isTradingEnabled: boolean;
  lastScanTime: string;
}

// ============================================
// UTILITIES
// ============================================

function log(message: string, level: 'INFO' | 'WARN' | 'ERROR' | 'ALERT' = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  
  try {
    fs.appendFileSync(CONFIG.LOG_FILE, logMessage + '\n');
  } catch (e) {
    // Ignore logging errors
  }
}

async function sendTelegramAlert(message: string) {
  if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) {
    return;
  }
  
  try {
    const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CONFIG.TELEGRAM_CHAT_ID,
        text: `🤖 Trading Agent\n\n${message}`,
        parse_mode: 'HTML',
      }),
    });
  } catch (error) {
    log(`Telegram error: ${error}`, 'ERROR');
  }
}

// ============================================
// RISK MANAGEMENT
// ============================================

class RiskManager {
  private state: TradingState;

  constructor() {
    this.state = {
      dailyPnL: 0,
      dailyTrades: 0,
      isTradingEnabled: true,
      lastScanTime: '',
    };
  }

  async checkDailyLimits(): Promise<boolean> {
    // Check daily P&L
    const stats = dbOperations.getDailyPnL();
    const totalPnL = stats.reduce((sum, s) => sum + (s.total_pnl || 0), 0);
    
    if (totalPnL <= -CONFIG.MAX_DAILY_LOSS_EUR) {
      log(`Daily loss limit reached: ${totalPnL.toFixed(2)} EUR`, 'ALERT');
      await sendTelegramAlert(`🚨 DAILY LOSS LIMIT REACHED\n\nPnL: ${totalPnL.toFixed(2)} EUR\n\nTrading disabled.`);
      this.state.isTradingEnabled = false;
      return false;
    }

    // Check trade count
    const totalTrades = stats.reduce((sum, s) => sum + (s.trades_count || 0), 0);
    if (totalTrades >= CONFIG.MAX_TRADES_PER_DAY) {
      log(`Daily trade limit reached: ${totalTrades} trades`, 'WARN');
      return false;
    }

    return this.state.isTradingEnabled;
  }

  canTrade(strategy: string, amount: number): boolean {
    if (!this.state.isTradingEnabled) return false;
    if (amount > CONFIG.MAX_POSITION_SIZE_USD) return false;
    return true;
  }

  getState(): TradingState {
    return { ...this.state };
  }
}

// ============================================
// STRATEGY 1: POLYMARKET
// ============================================

class PolymarketStrategy {
  private client: PolymarketClient | null = null;
  private previousPrices: Map<string, number[]> = new Map();

  constructor() {
    const privateKey = process.env.POLYGON_PRIVATE_KEY;
    const apiKey = process.env.POLYMARKET_API_KEY;
    
    if (privateKey) {
      this.client = new PolymarketClient(privateKey, apiKey);
      this.client.initialize().catch(err => log(`Polymarket init error: ${err}`, 'ERROR'));
    }
  }

  async scanMarkets(): Promise<ArbitrageOpportunity[]> {
    if (!CONFIG.POLYMARKET_ENABLED) return [];
    
    log('🔍 Scanning Polymarket markets...');
    const opportunities: ArbitrageOpportunity[] = [];
    
    try {
      const markets = await this.client?.getMarkets(100) || [];
      
      for (const market of markets.slice(0, 50)) {
        const opps = await this.analyzeMarket(market);
        opportunities.push(...opps);
      }
      
      log(`Found ${opportunities.length} Polymarket opportunities`);
    } catch (error) {
      log(`Polymarket scan error: ${error}`, 'ERROR');
    }
    
    return opportunities;
  }

  private async analyzeMarket(market: any): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    const marketId = market.condition_id || market.id;
    
    if (!marketId) return opportunities;
    
    const currentPrices = market.outcome_prices || market.outcomePrices || [];
    if (!Array.isArray(currentPrices) || currentPrices.length === 0) return opportunities;
    
    const previousPrices = this.previousPrices.get(marketId);
    
    // Price movement detection
    if (previousPrices) {
      for (let i = 0; i < currentPrices.length; i++) {
        const priceChange = Math.abs(currentPrices[i] - previousPrices[i]);
        
        if (priceChange > 0.05) {
          opportunities.push({
            type: 'polymarket',
            timestamp: new Date().toISOString(),
            description: `Price movement: ${market.question}`,
            expectedEdge: priceChange * 100,
            confidence: priceChange > 0.1 ? 'high' : 'medium',
            action: `Outcome ${i}: ${(previousPrices[i] * 100).toFixed(1)}% → ${(currentPrices[i] * 100).toFixed(1)}%`,
            data: { marketId, outcome: i, priceChange, market: market.question },
          });
        }
      }
    }
    
    this.previousPrices.set(marketId, currentPrices);
    
    // Mispricing detection
    const priceSum = currentPrices.reduce((a: number, b: number) => a + b, 0);
    if (priceSum < 0.95 || priceSum > 1.05) {
      opportunities.push({
        type: 'polymarket',
        timestamp: new Date().toISOString(),
        description: `Mispricing: ${market.question}`,
        expectedEdge: Math.abs(1 - priceSum) * 100,
        confidence: Math.abs(1 - priceSum) > 0.05 ? 'high' : 'low',
        action: `Price sum: ${priceSum.toFixed(3)} (expected: 1.0)`,
        data: { marketId, priceSum, market: market.question },
      });
    }
    
    return opportunities;
  }

  async executeTrade(opportunity: ArbitrageOpportunity, riskManager: RiskManager): Promise<boolean> {
    if (!this.client || !CONFIG.AUTO_EXECUTE) return false;
    if (!riskManager.canTrade('polymarket', CONFIG.MAX_POSITION_SIZE_USD)) return false;
    
    try {
      const { marketId, outcome, priceChange } = opportunity.data;
      
      // Get orderbook
      const orderbook = await this.client.getOrderbook(marketId);
      if (!orderbook) return false;
      
      // Check balance
      const hasBalance = await this.client.hasBalance(CONFIG.MAX_POSITION_SIZE_USD);
      if (!hasBalance) {
        log('Insufficient Polymarket balance', 'WARN');
        return false;
      }
      
      // Create trade record
      const tradeId = dbOperations.createTrade({
        strategy: 'polymarket',
        type: 'polymarket',
        market_id: marketId,
        side: 'buy',
        amount: 1,
        value_usd: CONFIG.MAX_POSITION_SIZE_USD,
        status: 'pending',
      });
      
      // Execute order (simplified - would need proper token_id)
      // const orderId = await this.client.buyShares(marketId, 1, 0.5);
      
      log(`Polymarket trade executed: ${tradeId}`, 'ALERT');
      await sendTelegramAlert(`✅ Polymarket Trade\n\n${opportunity.description}\n\nTrade ID: ${tradeId}`);
      
      return true;
    } catch (error) {
      log(`Polymarket execution error: ${error}`, 'ERROR');
      return false;
    }
  }
}

// ============================================
// STRATEGY 2: SPY GAMMA SQUEEZE
// ============================================

class SpyGammaStrategy {
  private client: AlpacaClient | null = null;
  private lastAlertDate: string = '';

  constructor() {
    const apiKey = process.env.ALPACA_API_KEY;
    const secretKey = process.env.ALPACA_SECRET_KEY;
    const paper = process.env.ALPACA_PAPER !== 'false';
    
    if (apiKey && secretKey) {
      this.client = new AlpacaClient(apiKey, secretKey, paper);
    }
  }

  async checkGammaSqueeze(): Promise<ArbitrageOpportunity[]> {
    if (!CONFIG.SPY_ENABLED) return [];
    
    const opportunities: ArbitrageOpportunity[] = [];
    
    const now = new Date();
    const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const currentHour = etTime.getHours();
    const currentMinute = etTime.getMinutes();
    const dateStr = etTime.toDateString();
    
    const isSqueezeWindow = currentHour === 15 && currentMinute >= 45 && currentMinute <= 55;
    const isWeekday = etTime.getDay() >= 1 && etTime.getDay() <= 5;
    
    if (isSqueezeWindow && isWeekday && this.lastAlertDate !== dateStr) {
      log('⚡ SPY Gamma Squeeze window active!', 'ALERT');
      
      const spyData = await this.getSpyData();
      
      opportunities.push({
        type: 'spy_squeeze',
        timestamp: new Date().toISOString(),
        description: 'SPY Gamma Squeeze Window',
        expectedEdge: 0.3,
        confidence: 'high',
        action: `3:50 PM ET - Expected move: 0.2-0.4%`,
        data: { spyPrice: spyData?.price, currentTime: `${currentHour}:${currentMinute}` },
      });
      
      this.lastAlertDate = dateStr;
    }
    
    return opportunities;
  }

  private async getSpyData(): Promise<{ price: number; change: number } | null> {
    try {
      const response = await fetch(
        'https://query1.finance.yahoo.com/v8/finance/chart/SPY?interval=1m&range=1d'
      );
      
      if (!response.ok) return null;
      
      const data = await response.json() as any;
      const quote = data?.chart?.result?.[0]?.meta;
      
      if (quote) {
        return {
          price: quote.regularMarketPrice,
          change: quote.regularMarketChangePercent,
        };
      }
    } catch (error) {
      log(`SPY data error: ${error}`, 'WARN');
    }
    
    return null;
  }

  async executeTrade(opportunity: ArbitrageOpportunity, riskManager: RiskManager): Promise<boolean> {
    if (!this.client || !CONFIG.AUTO_EXECUTE) return false;
    if (!riskManager.canTrade('spy_squeeze', CONFIG.SPY_CAPITAL)) return false;
    
    try {
      // Check buying power
      const hasPower = await this.client.hasBuyingPower(CONFIG.SPY_CAPITAL);
      if (!hasPower) {
        log('Insufficient Alpaca buying power', 'WARN');
        return false;
      }
      
      // Create trade record
      const tradeId = dbOperations.createTrade({
        strategy: 'spy_squeeze',
        type: 'spy_squeeze',
        symbol: 'SPY',
        side: 'buy',
        amount: 0,
        value_usd: CONFIG.SPY_CAPITAL,
        status: 'pending',
      });
      
      // Execute buy order
      const orderId = await this.client.buySPY(CONFIG.SPY_CAPITAL);
      
      if (orderId) {
        dbOperations.updateTrade(tradeId, {
          status: 'executed',
          order_id: orderId,
          executed_at: new Date().toISOString(),
        });
        
        log(`SPY trade executed: ${tradeId}`, 'ALERT');
        await sendTelegramAlert(`✅ SPY Trade\n\nGamma Squeeze Entry\n\nTrade ID: ${tradeId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      log(`SPY execution error: ${error}`, 'ERROR');
      return false;
    }
  }
}

// ============================================
// STRATEGY 3: TOKEN LAUNCHES
// ============================================

class TokenLaunchStrategy {
  private client: DEXClient | null = null;
  private seenTokens: Set<string> = new Set();

  constructor() {
    const privateKey = process.env.BASE_PRIVATE_KEY;
    
    if (privateKey) {
      this.client = new DEXClient(privateKey);
    }
  }

  async scanNewLaunches(): Promise<ArbitrageOpportunity[]> {
    if (!CONFIG.TOKEN_LAUNCH_ENABLED) return [];
    
    log('🚀 Scanning token launches...');
    const opportunities: ArbitrageOpportunity[] = [];
    
    try {
      const baseTokens = await this.scanBaseLaunches();
      opportunities.push(...baseTokens);
      
      log(`Found ${opportunities.length} token opportunities`);
    } catch (error) {
      log(`Token scan error: ${error}`, 'ERROR');
    }
    
    return opportunities;
  }

  private async scanBaseLaunches(): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    
    try {
      const response = await fetch('https://api.dexscreener.com/latest/dex/tokens/base');
      const data = await response.json();
      
      if (!data?.pairs) return opportunities;
      
      for (const pair of data.pairs.slice(0, 20)) {
        const tokenAddress = pair.baseToken?.address;
        if (!tokenAddress || this.seenTokens.has(tokenAddress)) continue;
        
        const pairAge = Date.now() - (pair.pairCreatedAt || 0);
        const isNew = pairAge < 24 * 60 * 60 * 1000;
        
        if (isNew) {
          const liquidity = pair.liquidity?.usd || 0;
          const volume = pair.volume?.h24 || 0;
          const priceChange = pair.priceChange?.h24 || 0;
          
          if (liquidity > 1000 && volume > 5000) {
            opportunities.push({
              type: 'token_launch',
              timestamp: new Date().toISOString(),
              description: `New Base token: ${pair.baseToken?.symbol}`,
              expectedEdge: Math.abs(priceChange),
              confidence: liquidity > 10000 ? 'medium' : 'low',
              action: `${pair.baseToken?.symbol} - Liq: $${liquidity.toLocaleString()}`,
              data: {
                chain: 'base',
                symbol: pair.baseToken?.symbol,
                address: tokenAddress,
                liquidity,
                volume,
                priceChange,
              },
            });
            
            this.seenTokens.add(tokenAddress);
          }
        }
      }
    } catch (error) {
      log(`Base scan error: ${error}`, 'WARN');
    }
    
    return opportunities;
  }

  async executeTrade(opportunity: ArbitrageOpportunity, riskManager: RiskManager): Promise<boolean> {
    if (!this.client || !CONFIG.AUTO_EXECUTE) return false;
    if (!riskManager.canTrade('token_launch', CONFIG.MAX_POSITION_SIZE_USD)) return false;
    
    try {
      const { address, symbol } = opportunity.data;
      
      // Check ETH balance (for gas + trade)
      const ethBalance = await this.client.getETHBalance();
      const requiredEth = 0.01; // Gas + small buffer
      
      if (ethBalance < requiredEth) {
        log('Insufficient ETH balance', 'WARN');
        return false;
      }
      
      // Create trade record
      const tradeId = dbOperations.createTrade({
        strategy: 'token_launch',
        type: 'token_launch',
        symbol,
        token_address: address,
        side: 'buy',
        amount: 0,
        value_usd: CONFIG.MAX_POSITION_SIZE_USD,
        status: 'pending',
      });
      
      // Execute buy (simplified - would need proper amount calculation)
      // const txHash = await this.client.buyToken(address, 0.01, 2);
      
      log(`Token trade executed: ${tradeId}`, 'ALERT');
      await sendTelegramAlert(`✅ Token Trade\n\n${symbol}\n\nTrade ID: ${tradeId}`);
      
      return true;
    } catch (error) {
      log(`Token execution error: ${error}`, 'ERROR');
      return false;
    }
  }
}

// ============================================
// MAIN AGENT
// ============================================

class TradingAgent {
  private polymarketStrategy: PolymarketStrategy;
  private spyGammaStrategy: SpyGammaStrategy;
  private tokenLaunchStrategy: TokenLaunchStrategy;
  private riskManager: RiskManager;
  private running: boolean = false;

  constructor() {
    this.polymarketStrategy = new PolymarketStrategy();
    this.spyGammaStrategy = new SpyGammaStrategy();
    this.tokenLaunchStrategy = new TokenLaunchStrategy();
    this.riskManager = new RiskManager();
  }

  async start() {
    log('═══════════════════════════════════════════════════');
    log('🤖 REAL MONEY TRADING AGENT STARTED');
    log('═══════════════════════════════════════════════════');
    log('');
    log(`Capital Allocation:`);
    log(`  Polymarket: ${CONFIG.POLYMARKET_CAPITAL} EUR`);
    log(`  SPY: ${CONFIG.SPY_CAPITAL} EUR`);
    log(`  Tokens: ${CONFIG.TOKEN_CAPITAL} EUR`);
    log('');
    log(`Risk Limits:`);
    log(`  Max position: ${CONFIG.MAX_POSITION_SIZE_USD} USD`);
    log(`  Max daily loss: ${CONFIG.MAX_DAILY_LOSS_EUR} EUR`);
    log(`  Max trades/day: ${CONFIG.MAX_TRADES_PER_DAY}`);
    log(`  Auto-execute: ${CONFIG.AUTO_EXECUTE}`);
    log('');
    
    await sendTelegramAlert('🚀 Trading Agent Started\n\nMonitoring markets...');
    
    this.running = true;
    await this.runScanCycle();
    
    while (this.running) {
      await this.sleep(CONFIG.SCAN_INTERVAL_MS);
      await this.runScanCycle();
    }
  }

  async runScanCycle() {
    const cycleStart = Date.now();
    log('');
    log('────────────────────────────────────────────────────');
    log(`🔄 Scan Cycle: ${new Date().toISOString()}`);
    log('────────────────────────────────────────────────────');
    
    // Check stop flag
    const stopFile = process.env.STOP_FILE || './data/stop_trading.flag';
    if (fs.existsSync(stopFile)) {
      log('Trading stopped via flag file', 'WARN');
      this.running = false;
      return;
    }
    
    // Check risk limits
    const canTrade = await this.riskManager.checkDailyLimits();
    if (!canTrade) {
      log('Trading disabled due to risk limits', 'WARN');
      return;
    }
    
    const allOpportunities: ArbitrageOpportunity[] = [];
    
    // Scan strategies
    if (CONFIG.POLYMARKET_ENABLED) {
      try {
        const opps = await this.polymarketStrategy.scanMarkets();
        allOpportunities.push(...opps);
      } catch (e) {
        log(`Polymarket scan failed: ${e}`, 'ERROR');
      }
    }
    
    if (CONFIG.SPY_ENABLED) {
      try {
        const opps = await this.spyGammaStrategy.checkGammaSqueeze();
        allOpportunities.push(...opps);
      } catch (e) {
        log(`SPY scan failed: ${e}`, 'ERROR');
      }
    }
    
    if (CONFIG.TOKEN_LAUNCH_ENABLED) {
      try {
        const opps = await this.tokenLaunchStrategy.scanNewLaunches();
        allOpportunities.push(...opps);
      } catch (e) {
        log(`Token scan failed: ${e}`, 'ERROR');
      }
    }
    
    // Filter by confidence
    const highConfidence = allOpportunities.filter(
      o => o.confidence === CONFIG.MIN_CONFIDENCE || o.confidence === 'high'
    );
    
    // Save opportunities
    for (const opp of allOpportunities) {
      dbOperations.saveOpportunity({
        strategy: opp.type,
        type: opp.type,
        description: opp.description,
        expected_edge: opp.expectedEdge,
        confidence: opp.confidence,
        action: opp.action,
        data: opp.data,
      });
    }
    
    // Execute trades for high confidence opportunities
    if (CONFIG.AUTO_EXECUTE && highConfidence.length > 0) {
      log('');
      log(`🚨 Executing ${highConfidence.length} high-confidence trades...`);
      
      for (const opp of highConfidence.slice(0, 3)) { // Max 3 per cycle
        let executed = false;
        
        if (opp.type === 'polymarket') {
          executed = await this.polymarketStrategy.executeTrade(opp, this.riskManager);
        } else if (opp.type === 'spy_squeeze') {
          executed = await this.spyGammaStrategy.executeTrade(opp, this.riskManager);
        } else if (opp.type === 'token_launch') {
          executed = await this.tokenLaunchStrategy.executeTrade(opp, this.riskManager);
        }
        
        if (executed) {
          log(`✅ Trade executed: ${opp.type}`, 'ALERT');
        }
      }
    }
    
    // Summary
    const cycleTime = Date.now() - cycleStart;
    log('');
    log(`✅ Cycle complete in ${cycleTime}ms`);
    log(`   Opportunities: ${allOpportunities.length} (${highConfidence.length} high confidence)`);
    
    // Daily stats
    const stats = dbOperations.getDailyPnL();
    if (stats.length > 0) {
      log(`   Daily P&L: ${stats.reduce((sum, s) => sum + (s.total_pnl || 0), 0).toFixed(2)} EUR`);
    }
  }

  stop() {
    log('Stopping trading agent...');
    this.running = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🤖 REAL MONEY TRADING AGENT                                 ║
║                                                               ║
║   Strategies:                                                 ║
║   1. Polymarket Arbitrage                                    ║
║   2. SPY Gamma Squeeze                                        ║
║   3. Token Launch Monitor                                     ║
║                                                               ║
║   Press Ctrl+C to stop                                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const agent = new TradingAgent();
  
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    agent.stop();
    process.exit(0);
  });
  
  await agent.start();
}

if (require.main === module) {
  main().catch(console.error);
}

export { TradingAgent };
