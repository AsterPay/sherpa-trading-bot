import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), '../data/trading.json')

export async function GET() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json([])
    }
    
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
    const today = new Date().toISOString().split('T')[0]
    const todayTrades = (data.trades || []).filter(
      (t: any) => t.status === 'executed' && t.created_at?.startsWith(today)
    )

    const byStrategy = new Map<string, { total_pnl: number; trades_count: number; volume_usd: number }>()

    for (const trade of todayTrades) {
      const existing = byStrategy.get(trade.strategy) || { total_pnl: 0, trades_count: 0, volume_usd: 0 }
      existing.total_pnl += trade.pnl || 0
      existing.trades_count += 1
      existing.volume_usd += trade.value_usd
      byStrategy.set(trade.strategy, existing)
    }

    const stats = Array.from(byStrategy.entries()).map(([strategy, s]) => ({
      strategy,
      ...s,
    }))
    
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
