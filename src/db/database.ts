/**
 * SQLite Database for Trading Agent
 * Stores trades, positions, P&L, and opportunities
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = process.env.DB_PATH || './data/trading.db';

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ============================================
// SCHEMA
// ============================================

db.exec(`
  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    strategy TEXT NOT NULL,
    type TEXT NOT NULL,
    symbol TEXT,
    market_id TEXT,
    token_address TEXT,
    side TEXT NOT NULL,
    amount REAL NOT NULL,
    price REAL,
    value_usd REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    order_id TEXT,
    tx_hash TEXT,
    error TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    executed_at TEXT,
    closed_at TEXT,
    pnl REAL DEFAULT 0,
    pnl_percent REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    strategy TEXT NOT NULL,
    symbol TEXT NOT NULL,
    market_id TEXT,
    token_address TEXT,
    side TEXT NOT NULL,
    size REAL NOT NULL,
    entry_price REAL NOT NULL,
    current_price REAL,
    value_usd REAL NOT NULL,
    pnl REAL DEFAULT 0,
    pnl_percent REAL DEFAULT 0,
    opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TEXT,
    trade_id INTEGER,
    FOREIGN KEY (trade_id) REFERENCES trades(id)
  );

  CREATE TABLE IF NOT EXISTS opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    strategy TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    expected_edge REAL,
    confidence TEXT NOT NULL,
    action TEXT,
    data TEXT,
    detected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    executed INTEGER DEFAULT 0,
    trade_id INTEGER,
    FOREIGN KEY (trade_id) REFERENCES trades(id)
  );

  CREATE TABLE IF NOT EXISTS daily_stats (
    date TEXT PRIMARY KEY,
    strategy TEXT NOT NULL,
    trades_count INTEGER DEFAULT 0,
    pnl REAL DEFAULT 0,
    volume_usd REAL DEFAULT 0,
    win_rate REAL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_trades_strategy ON trades(strategy);
  CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
  CREATE INDEX IF NOT EXISTS idx_trades_created ON trades(created_at);
  CREATE INDEX IF NOT EXISTS idx_positions_strategy ON positions(strategy);
  CREATE INDEX IF NOT EXISTS idx_positions_open ON positions(closed_at);
  CREATE INDEX IF NOT EXISTS idx_opportunities_strategy ON opportunities(strategy);
  CREATE INDEX IF NOT EXISTS idx_opportunities_executed ON opportunities(executed);
`);

// ============================================
// TRADES
// ============================================

export interface Trade {
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

const insertTrade = db.prepare(`
  INSERT INTO trades (
    strategy, type, symbol, market_id, token_address,
    side, amount, price, value_usd, status, order_id, tx_hash, error
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const updateTrade = db.prepare(`
  UPDATE trades SET
    status = ?,
    executed_at = ?,
    closed_at = ?,
    pnl = ?,
    pnl_percent = ?,
    error = ?
  WHERE id = ?
`);

const getTrades = db.prepare(`
  SELECT * FROM trades
  WHERE strategy = ?
  ORDER BY created_at DESC
  LIMIT ?
`);

const getOpenTrades = db.prepare(`
  SELECT * FROM trades
  WHERE status IN ('pending', 'executed')
    AND strategy = ?
  ORDER BY created_at DESC
`);

// ============================================
// POSITIONS
// ============================================

export interface Position {
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

const insertPosition = db.prepare(`
  INSERT INTO positions (
    strategy, symbol, market_id, token_address,
    side, size, entry_price, value_usd, trade_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const updatePosition = db.prepare(`
  UPDATE positions SET
    current_price = ?,
    pnl = ?,
    pnl_percent = ?,
    closed_at = ?
  WHERE id = ?
`);

const getOpenPositions = db.prepare(`
  SELECT * FROM positions
  WHERE closed_at IS NULL
    AND strategy = ?
`);

// ============================================
// OPPORTUNITIES
// ============================================

export interface Opportunity {
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

const insertOpportunity = db.prepare(`
  INSERT INTO opportunities (
    strategy, type, description, expected_edge,
    confidence, action, data
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const markOpportunityExecuted = db.prepare(`
  UPDATE opportunities SET executed = 1, trade_id = ? WHERE id = ?
`);

// ============================================
// STATS
// ============================================

const getDailyPnL = db.prepare(`
  SELECT 
    strategy,
    SUM(pnl) as total_pnl,
    COUNT(*) as trades_count,
    SUM(value_usd) as volume_usd
  FROM trades
  WHERE DATE(created_at) = DATE('now')
    AND status = 'executed'
  GROUP BY strategy
`);

const getTotalPnL = db.prepare(`
  SELECT 
    strategy,
    SUM(pnl) as total_pnl,
    COUNT(*) as trades_count
  FROM trades
  WHERE status = 'executed'
  GROUP BY strategy
`);

// ============================================
// EXPORTS
// ============================================

export const dbOperations = {
  // Trades
  createTrade: (trade: Omit<Trade, 'id' | 'created_at'>) => {
    const result = insertTrade.run(
      trade.strategy,
      trade.type,
      trade.symbol || null,
      trade.market_id || null,
      trade.token_address || null,
      trade.side,
      trade.amount,
      trade.price || null,
      trade.value_usd,
      trade.status,
      trade.order_id || null,
      trade.tx_hash || null,
      trade.error || null
    );
    return result.lastInsertRowid as number;
  },

  updateTrade: (id: number, updates: Partial<Trade>) => {
    updateTrade.run(
      updates.status || null,
      updates.executed_at || null,
      updates.closed_at || null,
      updates.pnl || null,
      updates.pnl_percent || null,
      updates.error || null,
      id
    );
  },

  getTrades: (strategy: string, limit: number = 100): Trade[] => {
    return getTrades.all(strategy, limit) as Trade[];
  },

  getOpenTrades: (strategy: string): Trade[] => {
    return getOpenTrades.all(strategy) as Trade[];
  },

  // Positions
  createPosition: (position: Omit<Position, 'id' | 'opened_at'>) => {
    const result = insertPosition.run(
      position.strategy,
      position.symbol,
      position.market_id || null,
      position.token_address || null,
      position.side,
      position.size,
      position.entry_price,
      position.value_usd,
      position.trade_id || null
    );
    return result.lastInsertRowid as number;
  },

  updatePosition: (id: number, updates: Partial<Position>) => {
    updatePosition.run(
      updates.current_price || null,
      updates.pnl || null,
      updates.pnl_percent || null,
      updates.closed_at || null,
      id
    );
  },

  getOpenPositions: (strategy: string): Position[] => {
    return getOpenPositions.all(strategy) as Position[];
  },

  // Opportunities
  saveOpportunity: (opp: Omit<Opportunity, 'id' | 'detected_at' | 'executed'>) => {
    const result = insertOpportunity.run(
      opp.strategy,
      opp.type,
      opp.description,
      opp.expected_edge,
      opp.confidence,
      opp.action || null,
      opp.data ? JSON.stringify(opp.data) : null
    );
    return result.lastInsertRowid as number;
  },

  markExecuted: (oppId: number, tradeId: number) => {
    markOpportunityExecuted.run(tradeId, oppId);
  },

  // Stats
  getDailyPnL: () => {
    return getDailyPnL.all() as Array<{
      strategy: string;
      total_pnl: number;
      trades_count: number;
      volume_usd: number;
    }>;
  },

  getTotalPnL: () => {
    return getTotalPnL.all() as Array<{
      strategy: string;
      total_pnl: number;
      trades_count: number;
    }>;
  },
};

export default db;
