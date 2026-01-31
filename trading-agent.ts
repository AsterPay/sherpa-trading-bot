/**
 * MOLTBOOK TRADING AGENT
 * 
 * Kolme strategiaa:
 * 1. Polymarket Arbitrage - Jatkuva API-skannaus
 * 2. SPY Gamma Squeeze - 3:50 PM ET päivittäin
 * 3. Token Launch Monitor - pump.fun/Clawnch seuranta
 * 
 * Käyttö:
 *   npx ts-node trading-agent.ts
 * 
 * Ympäristömuuttujat:
 *   POLYMARKET_API_KEY - Polymarket API avain (optional)
 *   TELEGRAM_BOT_TOKEN - Telegram alertit (optional)
 *   TELEGRAM_CHAT_ID - Telegram chat ID (optional)
 */

import * as fs from 'fs';

// ============================================
// KONFIGURAATIO
// ============================================

const CONFIG = {
  // Polymarket
  POLYMARKET_API: 'https://clob.polymarket.com',
  POLYMARKET_GAMMA_API: 'https://gamma-api.polymarket.com',
  SCAN_INTERVAL_MS: 60000, // 60 sekuntia
  
  // SPY Gamma Squeeze
  SPY_SQUEEZE_TIME: '15:50', // ET timezone
  SPY_SYMBOLS: ['SPY', 'SPX'],
  
  // Token Launch
  PUMP_FUN_API: 'https://pump.fun/api',
  DEXSCREENER_API: 'https://api.dexscreener.com/latest/dex',
  
  // Risk Management
  MAX_POSITION_SIZE_USD: 100, // Aloita pienellä
  MAX_DAILY_LOSS_USD: 50,
  
  // Alerts
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
  
  // Logging
  LOG_FILE: './trading-agent.log',
  OPPORTUNITIES_FILE: './opportunities.json',
};

// ============================================
// TYYPIT
// ============================================

interface PolymarketMarket {
  id: string;
  question: string;
  outcomes: string[];
  outcomePrices: number[];
  volume: number;
  liquidity: number;
  endDate: string;
  resolutionSource?: string;
  active: boolean;
}

interface ArbitrageOpportunity {
  type: 'polymarket' | 'spy_squeeze' | 'token_launch';
  timestamp: string;
  description: string;
  expectedEdge: number;
  confidence: 'low' | 'medium' | 'high';
  action: string;
  data: any;
}

interface TokenLaunch {
  address: string;
  name: string;
  symbol: string;
  chain: string;
  launchTime: string;
  initialLiquidity: number;
  priceChange24h?: number;
  volume24h?: number;
}

interface TradingState {
  dailyPnL: number;
  openPositions: any[];
  opportunities: ArbitrageOpportunity[];
  lastScanTime: string;
  alertsSent: number;
}

// ============================================
// APUFUNKTIOT
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
        text: `🤖 Trading Agent Alert\n\n${message}`,
        parse_mode: 'HTML',
      }),
    });
    log('Telegram alert sent');
  } catch (error) {
    log(`Telegram error: ${error}`, 'ERROR');
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json() as T;
  } catch (error) {
    log(`Fetch error (${url}): ${error}`, 'ERROR');
    return null;
  }
}

function saveOpportunities(opportunities: ArbitrageOpportunity[]) {
  try {
    fs.writeFileSync(
      CONFIG.OPPORTUNITIES_FILE,
      JSON.stringify(opportunities, null, 2)
    );
  } catch (e) {
    // Ignore
  }
}

// ============================================
// STRATEGIA 1: POLYMARKET ARBITRAGE
// ============================================

class PolymarketStrategy {
  private previousPrices: Map<string, number[]> = new Map();
  private resolutionCache: Map<string, any> = new Map();
  
  async scanMarkets(): Promise<ArbitrageOpportunity[]> {
    log('🔍 Scanning Polymarket markets...');
    const opportunities: ArbitrageOpportunity[] = [];
    
    try {
      // Hae aktiiviset markkinat
      const markets = await fetchJson<any[]>(
        `${CONFIG.POLYMARKET_GAMMA_API}/markets?active=true&limit=100`
      );
      
      if (!markets || !Array.isArray(markets)) {
        log('No markets data received', 'WARN');
        return opportunities;
      }
      
      for (const market of markets) {
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
    const marketId = market.id || market.condition_id;
    
    if (!marketId) return opportunities;
    
    // 1. Price movement detection
    let currentPrices = market.outcomePrices || market.outcomes?.map((o: any) => o.price) || [];
    
    // Ensure it's an array
    if (!Array.isArray(currentPrices)) {
      currentPrices = [];
    }
    
    if (currentPrices.length === 0) return opportunities;
    
    const previousPrices = this.previousPrices.get(marketId);
    
    if (previousPrices) {
      for (let i = 0; i < currentPrices.length; i++) {
        const priceChange = Math.abs(currentPrices[i] - previousPrices[i]);
        
        // Significant price movement (> 5% in 60 seconds)
        if (priceChange > 0.05) {
          opportunities.push({
            type: 'polymarket',
            timestamp: new Date().toISOString(),
            description: `Price movement detected: ${market.question}`,
            expectedEdge: priceChange * 100,
            confidence: priceChange > 0.1 ? 'high' : 'medium',
            action: `Outcome ${i}: ${previousPrices[i].toFixed(2)} → ${currentPrices[i].toFixed(2)} (${(priceChange * 100).toFixed(1)}%)`,
            data: { marketId, market: market.question, priceChange, outcome: i },
          });
        }
      }
    }
    
    this.previousPrices.set(marketId, currentPrices);
    
    // 2. Mispricing detection (prices should sum to ~1)
    const numericPrices = currentPrices.map((p: any) => typeof p === 'number' ? p : parseFloat(p) || 0);
    const priceSum = numericPrices.reduce((a: number, b: number) => a + b, 0);
    if (priceSum < 0.95 || priceSum > 1.05) {
      opportunities.push({
        type: 'polymarket',
        timestamp: new Date().toISOString(),
        description: `Mispricing detected: ${market.question}`,
        expectedEdge: Math.abs(1 - priceSum) * 100,
        confidence: Math.abs(1 - priceSum) > 0.05 ? 'high' : 'low',
        action: `Price sum: ${priceSum.toFixed(3)} (expected: 1.0) - Potential arb: ${((Math.abs(1 - priceSum)) * 100).toFixed(1)}%`,
        data: { marketId, market: market.question, priceSum, prices: currentPrices },
      });
    }
    
    // 3. End date proximity (markets about to resolve)
    if (market.endDate) {
      const endDate = new Date(market.endDate);
      const now = new Date();
      const hoursUntilEnd = (endDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilEnd > 0 && hoursUntilEnd < 24) {
        // Market resolving soon - check for edge
        const maxPrice = Math.max(...currentPrices);
        if (maxPrice < 0.95 && maxPrice > 0.7) {
          opportunities.push({
            type: 'polymarket',
            timestamp: new Date().toISOString(),
            description: `Market resolving soon: ${market.question}`,
            expectedEdge: (1 - maxPrice) * 100,
            confidence: 'medium',
            action: `Resolves in ${hoursUntilEnd.toFixed(1)}h. Leading outcome at ${(maxPrice * 100).toFixed(1)}%`,
            data: { marketId, market: market.question, hoursUntilEnd, maxPrice },
          });
        }
      }
    }
    
    return opportunities;
  }
  
  // Cross-market arbitrage (related markets)
  async findCrossMarketArb(markets: any[]): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    
    // Group markets by similar topics
    const topicGroups: Map<string, any[]> = new Map();
    
    for (const market of markets) {
      const question = (market.question || '').toLowerCase();
      
      // Simple topic extraction
      const topics = ['trump', 'bitcoin', 'election', 'fed', 'rate'];
      for (const topic of topics) {
        if (question.includes(topic)) {
          const group = topicGroups.get(topic) || [];
          group.push(market);
          topicGroups.set(topic, group);
        }
      }
    }
    
    // Find inconsistencies within groups
    for (const [topic, group] of topicGroups) {
      if (group.length >= 2) {
        // Check for logical inconsistencies
        // (e.g., "Trump wins" at 60% but "Republican wins" at 50%)
        log(`Checking ${group.length} ${topic}-related markets for arb`);
      }
    }
    
    return opportunities;
  }
}

// ============================================
// STRATEGIA 2: SPY GAMMA SQUEEZE
// ============================================

class SpyGammaStrategy {
  private lastAlertDate: string = '';
  
  async checkGammaSqueeze(): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    
    // Get current time in ET
    const now = new Date();
    const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const currentHour = etTime.getHours();
    const currentMinute = etTime.getMinutes();
    const currentTimeStr = `${currentHour}:${currentMinute.toString().padStart(2, '0')}`;
    const dateStr = etTime.toDateString();
    
    // Check if it's near squeeze time (3:45-3:55 PM ET)
    const isSqueezeWindow = currentHour === 15 && currentMinute >= 45 && currentMinute <= 55;
    const isWeekday = etTime.getDay() >= 1 && etTime.getDay() <= 5;
    
    if (isSqueezeWindow && isWeekday && this.lastAlertDate !== dateStr) {
      log('⚡ SPY Gamma Squeeze window active!', 'ALERT');
      
      // Fetch current SPY data
      const spyData = await this.getSpyData();
      
      opportunities.push({
        type: 'spy_squeeze',
        timestamp: new Date().toISOString(),
        description: 'SPY Gamma Squeeze Window Active',
        expectedEdge: 0.3, // 0.2-0.4% expected move
        confidence: 'high',
        action: `3:50 PM ET gamma squeeze. Expected SPY move: 0.2-0.4%. Current price: $${spyData?.price || 'N/A'}`,
        data: {
          currentTime: currentTimeStr,
          spyPrice: spyData?.price,
          strategy: '0DTE options or directional position',
        },
      });
      
      this.lastAlertDate = dateStr;
      
      // Send alert
      await sendTelegramAlert(
        `⚡ SPY GAMMA SQUEEZE ALERT\n\n` +
        `Time: ${currentTimeStr} ET\n` +
        `SPY Price: $${spyData?.price || 'N/A'}\n` +
        `Expected Move: 0.2-0.4%\n\n` +
        `Action: Monitor for delta-hedging flow`
      );
    }
    
    // Log status during market hours
    if (currentHour >= 9 && currentHour < 16 && isWeekday) {
      const minutesUntilSqueeze = (15 * 60 + 50) - (currentHour * 60 + currentMinute);
      if (minutesUntilSqueeze > 0 && minutesUntilSqueeze <= 60) {
        log(`⏰ ${minutesUntilSqueeze} minutes until SPY gamma squeeze window`);
      }
    }
    
    return opportunities;
  }
  
  private async getSpyData(): Promise<{ price: number; change: number } | null> {
    try {
      // Using Yahoo Finance unofficial API
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
      log(`SPY data fetch error: ${error}`, 'WARN');
    }
    
    return null;
  }
}

// ============================================
// STRATEGIA 3: TOKEN LAUNCH MONITOR
// ============================================

class TokenLaunchStrategy {
  private seenTokens: Set<string> = new Set();
  
  async scanNewLaunches(): Promise<ArbitrageOpportunity[]> {
    log('🚀 Scanning for new token launches...');
    const opportunities: ArbitrageOpportunity[] = [];
    
    // Scan Solana (pump.fun style)
    const solanaTokens = await this.scanSolanaLaunches();
    opportunities.push(...solanaTokens);
    
    // Scan Base
    const baseTokens = await this.scanBaseLaunches();
    opportunities.push(...baseTokens);
    
    log(`Found ${opportunities.length} token launch opportunities`);
    return opportunities;
  }
  
  private async scanSolanaLaunches(): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    
    try {
      // DexScreener API for new Solana tokens
      const data = await fetchJson<any>(
        `${CONFIG.DEXSCREENER_API}/tokens/solana`
      );
      
      if (!data?.pairs) return opportunities;
      
      for (const pair of data.pairs.slice(0, 20)) {
        const tokenAddress = pair.baseToken?.address;
        
        if (!tokenAddress || this.seenTokens.has(tokenAddress)) continue;
        
        // Check if it's a new launch (< 24h old)
        const pairAge = Date.now() - (pair.pairCreatedAt || 0);
        const isNew = pairAge < 24 * 60 * 60 * 1000;
        
        if (isNew) {
          const priceChange = pair.priceChange?.h24 || 0;
          const volume = pair.volume?.h24 || 0;
          const liquidity = pair.liquidity?.usd || 0;
          
          // Filter for potentially interesting launches
          if (liquidity > 1000 && volume > 5000) {
            opportunities.push({
              type: 'token_launch',
              timestamp: new Date().toISOString(),
              description: `New Solana token: ${pair.baseToken?.symbol}`,
              expectedEdge: Math.abs(priceChange),
              confidence: liquidity > 10000 ? 'medium' : 'low',
              action: `${pair.baseToken?.symbol} - Liq: $${liquidity.toLocaleString()}, Vol: $${volume.toLocaleString()}, 24h: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%`,
              data: {
                chain: 'solana',
                symbol: pair.baseToken?.symbol,
                address: tokenAddress,
                liquidity,
                volume,
                priceChange,
                dexUrl: pair.url,
              },
            });
            
            this.seenTokens.add(tokenAddress);
          }
        }
      }
    } catch (error) {
      log(`Solana scan error: ${error}`, 'WARN');
    }
    
    return opportunities;
  }
  
  private async scanBaseLaunches(): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];
    
    try {
      // DexScreener API for Base tokens
      const data = await fetchJson<any>(
        `${CONFIG.DEXSCREENER_API}/tokens/base`
      );
      
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
              action: `${pair.baseToken?.symbol} - Liq: $${liquidity.toLocaleString()}, Vol: $${volume.toLocaleString()}, 24h: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%`,
              data: {
                chain: 'base',
                symbol: pair.baseToken?.symbol,
                address: tokenAddress,
                liquidity,
                volume,
                priceChange,
                dexUrl: pair.url,
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
}

// ============================================
// PÄÄAGENTTI
// ============================================

class TradingAgent {
  private polymarketStrategy: PolymarketStrategy;
  private spyGammaStrategy: SpyGammaStrategy;
  private tokenLaunchStrategy: TokenLaunchStrategy;
  private state: TradingState;
  private running: boolean = false;
  
  constructor() {
    this.polymarketStrategy = new PolymarketStrategy();
    this.spyGammaStrategy = new SpyGammaStrategy();
    this.tokenLaunchStrategy = new TokenLaunchStrategy();
    this.state = {
      dailyPnL: 0,
      openPositions: [],
      opportunities: [],
      lastScanTime: '',
      alertsSent: 0,
    };
  }
  
  async start() {
    log('═══════════════════════════════════════════════════');
    log('🤖 TRADING AGENT STARTED');
    log('═══════════════════════════════════════════════════');
    log('');
    log('Strategies:');
    log('  1. Polymarket Arbitrage (60s scan interval)');
    log('  2. SPY Gamma Squeeze (3:50 PM ET daily)');
    log('  3. Token Launch Monitor (Solana/Base)');
    log('');
    log(`Risk Limits: Max position $${CONFIG.MAX_POSITION_SIZE_USD}, Max daily loss $${CONFIG.MAX_DAILY_LOSS_USD}`);
    log('');
    
    this.running = true;
    
    // Initial scan
    await this.runScanCycle();
    
    // Start continuous scanning
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
    
    const allOpportunities: ArbitrageOpportunity[] = [];
    
    // 1. Polymarket scan
    try {
      const polyOpps = await this.polymarketStrategy.scanMarkets();
      allOpportunities.push(...polyOpps);
    } catch (e) {
      log(`Polymarket scan failed: ${e}`, 'ERROR');
    }
    
    // 2. SPY Gamma check
    try {
      const spyOpps = await this.spyGammaStrategy.checkGammaSqueeze();
      allOpportunities.push(...spyOpps);
    } catch (e) {
      log(`SPY scan failed: ${e}`, 'ERROR');
    }
    
    // 3. Token launch scan
    try {
      const tokenOpps = await this.tokenLaunchStrategy.scanNewLaunches();
      allOpportunities.push(...tokenOpps);
    } catch (e) {
      log(`Token scan failed: ${e}`, 'ERROR');
    }
    
    // Process opportunities
    const highConfidence = allOpportunities.filter(o => o.confidence === 'high');
    const mediumConfidence = allOpportunities.filter(o => o.confidence === 'medium');
    
    if (highConfidence.length > 0) {
      log('');
      log('🚨 HIGH CONFIDENCE OPPORTUNITIES:');
      for (const opp of highConfidence) {
        log(`  [${opp.type}] ${opp.description}`);
        log(`    Action: ${opp.action}`);
        log(`    Expected Edge: ${opp.expectedEdge.toFixed(2)}%`);
        
        // Send alert for high confidence
        await sendTelegramAlert(
          `🚨 HIGH CONFIDENCE\n\n` +
          `Type: ${opp.type}\n` +
          `${opp.description}\n\n` +
          `Action: ${opp.action}\n` +
          `Edge: ${opp.expectedEdge.toFixed(2)}%`
        );
        this.state.alertsSent++;
      }
    }
    
    if (mediumConfidence.length > 0) {
      log('');
      log('📊 MEDIUM CONFIDENCE OPPORTUNITIES:');
      for (const opp of mediumConfidence.slice(0, 5)) {
        log(`  [${opp.type}] ${opp.description}`);
        log(`    Action: ${opp.action}`);
      }
    }
    
    // Update state
    this.state.opportunities = allOpportunities;
    this.state.lastScanTime = new Date().toISOString();
    saveOpportunities(allOpportunities);
    
    // Summary
    const cycleTime = Date.now() - cycleStart;
    log('');
    log(`✅ Cycle complete in ${cycleTime}ms`);
    log(`   Total opportunities: ${allOpportunities.length}`);
    log(`   High confidence: ${highConfidence.length}`);
    log(`   Medium confidence: ${mediumConfidence.length}`);
    log(`   Alerts sent today: ${this.state.alertsSent}`);
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
// KÄYNNISTYS
// ============================================

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🤖 MOLTBOOK TRADING AGENT                                   ║
║                                                               ║
║   Strategies:                                                 ║
║   1. Polymarket Arbitrage                                     ║
║   2. SPY Gamma Squeeze (3:50 PM ET)                          ║
║   3. Token Launch Monitor                                     ║
║                                                               ║
║   Press Ctrl+C to stop                                        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

  const agent = new TradingAgent();
  
  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    agent.stop();
    process.exit(0);
  });
  
  await agent.start();
}

// Run
main().catch(console.error);
