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
    const trades = (data.trades || []).slice(0, 100).reverse()
    
    return NextResponse.json(trades)
  } catch (error) {
    console.error('Trades API error:', error)
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 })
  }
}
