import { NextResponse } from 'next/server'
import * as fs from 'fs'

const STOP_FILE = process.env.STOP_FILE || './data/stop_trading.flag'

export async function POST() {
  try {
    // Create stop flag file
    const dir = require('path').dirname(STOP_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(STOP_FILE, '1')
    
    return NextResponse.json({ success: true, message: 'Trading stopped' })
  } catch (error) {
    console.error('Stop API error:', error)
    return NextResponse.json({ error: 'Failed to stop trading' }, { status: 500 })
  }
}
