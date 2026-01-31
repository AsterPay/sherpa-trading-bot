/**
 * Simple JSON-based database for testing
 * For production, use SQLite on Linux server
 */

import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = process.env.DB_PATH || './data/trading.json';

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

interface Trade {
  id?: number;
  strategy: string;
  type: 'polymarket' | 'spy_squeeze' | 'token_launch';
  symbol?: string;
  market_id?: string;
  token_address?: string;
  side: 'buy' | 'sell';
  amount: number;
  price?: number;
  value_usd: number;
  status: 'pending' | 'executed' | 'failed' | 'cancelled';
  order_id?: string;
  tx_hash?: string;
  error?: string;
  created_at?: string;
  executed_at?: string;
  closed_at?: string;
  pnl?: number;
  pnl_percent?: number;
}

interface Position {
  id?: number;
  strategy: string;
  symbol: string;
  market_id?: string;
  token_address?: string;
  side: 'long' | 'short';
  size: number;
  entry_price: number;
  current_price?: number;
  value_usd: number;
  pnl?: number;
  pnl_percent?: number;
  opened_at?: string;
  closed_at?: string;
  trade_id?: number;
}

interface Opportunity {
  id?: number;
  strategy: string;
  type: string;
  description: string;
  expected_edge: number;
  confidence: 'low' | 'medium' | 'high';
  action?: string;
  data?: any;
  detected_at?: string;
  executed?: number;
  trade_id?: number;
}

interface Database {
  trades: Trade[];
  positions: Position[];
  opportunities: Opportunity[];
}

let db: Database = { trades: [], positions: [], opportunities: [] };

// Load database
function loadDB(): Database {
  if (fs.existsSync(DB_PATH)) {
    try {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      db = JSON.parse(data);
    } catch (e) {
      console.error('Failed to load database:', e);
      db = { trades: [], positions: [], opportunities: [] };
    }
  }
  return db;
}

// Save database
function saveDB() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('Failed to save database:', e);
  }
}

// Initialize
loadDB();

export const dbOperations = {
  // Trades
  createTrade: (trade: Omit<Trade, 'id' | 'created_at'>): number => {
    const id = db.trades.length > 0 
      ? Math.max(...db.trades.map(t => t.id || 0)) + 1 
      : 1;
    const newTrade: Trade = {
      ...trade,
      id,
      created_at: new Date().toISOString(),
    };
    db.trades.push(newTrade);
    saveDB();
    return id;
  },

  updateTrade: (id: number, updates: Partial<Trade>) => {
    const trade = db.trades.find(t => t.id === id);
    if (trade) {
      Object.assign(trade, updates);
      saveDB();
    }
  },

  getTrades: (strategy: string, limit: number = 100): Trade[] => {
    return db.trades
      .filter(t => t.strategy === strategy)
      .slice(0, limit)
      .reverse();
  },

  getOpenTrades: (strategy: string): Trade[] => {
    return db.trades.filter(
      t => t.strategy === strategy && ['pending', 'executed'].includes(t.status)
    );
  },

  // Positions
  createPosition: (position: Omit<Position, 'id' | 'opened_at'>): number => {
    const id = db.positions.length > 0
      ? Math.max(...db.positions.map(p => p.id || 0)) + 1
      : 1;
    const newPosition: Position = {
      ...position,
      id,
      opened_at: new Date().toISOString(),
    };
    db.positions.push(newPosition);
    saveDB();
    return id;
  },

  updatePosition: (id: number, updates: Partial<Position>) => {
    const position = db.positions.find(p => p.id === id);
    if (position) {
      Object.assign(position, updates);
      saveDB();
    }
  },

  getOpenPositions: (strategy: string): Position[] => {
    return db.positions.filter(
      p => p.strategy === strategy && !p.closed_at
    );
  },

  // Opportunities
  saveOpportunity: (opp: Omit<Opportunity, 'id' | 'detected_at' | 'executed'>): number => {
    const id = db.opportunities.length > 0
      ? Math.max(...db.opportunities.map(o => o.id || 0)) + 1
      : 1;
    const newOpp: Opportunity = {
      ...opp,
      id,
      detected_at: new Date().toISOString(),
      executed: 0,
    };
    db.opportunities.push(newOpp);
    saveDB();
    return id;
  },

  markExecuted: (oppId: number, tradeId: number) => {
    const opp = db.opportunities.find(o => o.id === oppId);
    if (opp) {
      opp.executed = 1;
      opp.trade_id = tradeId;
      saveDB();
    }
  },

  // Stats
  getDailyPnL: () => {
    const today = new Date().toISOString().split('T')[0];
    const todayTrades = db.trades.filter(
      t => t.status === 'executed' && t.created_at?.startsWith(today)
    );

    const byStrategy = new Map<string, { total_pnl: number; trades_count: number; volume_usd: number }>();

    for (const trade of todayTrades) {
      const existing = byStrategy.get(trade.strategy) || { total_pnl: 0, trades_count: 0, volume_usd: 0 };
      existing.total_pnl += trade.pnl || 0;
      existing.trades_count += 1;
      existing.volume_usd += trade.value_usd;
      byStrategy.set(trade.strategy, existing);
    }

    return Array.from(byStrategy.entries()).map(([strategy, stats]) => ({
      strategy,
      ...stats,
    }));
  },

  getTotalPnL: () => {
    const executedTrades = db.trades.filter(t => t.status === 'executed');
    const byStrategy = new Map<string, { total_pnl: number; trades_count: number }>();

    for (const trade of executedTrades) {
      const existing = byStrategy.get(trade.strategy) || { total_pnl: 0, trades_count: 0 };
      existing.total_pnl += trade.pnl || 0;
      existing.trades_count += 1;
      byStrategy.set(trade.strategy, existing);
    }

    return Array.from(byStrategy.entries()).map(([strategy, stats]) => ({
      strategy,
      ...stats,
    }));
  },
};

export default dbOperations;
