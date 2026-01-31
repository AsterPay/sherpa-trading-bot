'use client'

import { useEffect, useState } from 'react'

interface Trade {
  id: number
  strategy: string
  type: string
  symbol?: string
  side: string
  value_usd: number
  status: string
  pnl?: number
  created_at: string
}

interface Stats {
  strategy: string
  total_pnl: number
  trades_count: number
  volume_usd: number
}

export default function Dashboard() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [stats, setStats] = useState<Stats[]>([])
  const [isTradingEnabled, setIsTradingEnabled] = useState(true)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000) // Refresh every 5s
    return () => clearInterval(interval)
  }, [])

  async function fetchData() {
    try {
      const [tradesRes, statsRes] = await Promise.all([
        fetch('/api/trades'),
        fetch('/api/stats'),
      ])

      if (tradesRes.ok) {
        const tradesData = await tradesRes.json()
        setTrades(tradesData)
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error('Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleEmergencyStop() {
    if (!confirm('Are you sure you want to stop all trading?')) return

    try {
      const res = await fetch('/api/stop', { method: 'POST' })
      if (res.ok) {
        setIsTradingEnabled(false)
        alert('Trading stopped')
      }
    } catch (error) {
      console.error('Stop error:', error)
    }
  }

  const totalPnL = stats.reduce((sum, s) => sum + (s.total_pnl || 0), 0)
  const totalTrades = stats.reduce((sum, s) => sum + (s.trades_count || 0), 0)
  const totalVolume = stats.reduce((sum, s) => sum + (s.volume_usd || 0), 0)

  if (loading) {
    return (
      <div className="container">
        <h1>Loading...</h1>
      </div>
    )
  }

  return (
    <div className="container">
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>Trading Agent Dashboard</h1>
        <button className="btn btn-danger" onClick={handleEmergencyStop}>
          🛑 Emergency Stop
        </button>
      </header>

      {/* Summary Stats */}
      <div className="grid">
        <div className="card">
          <h2>Total P&L</h2>
          <div className="stat">
            <span className="stat-label">Today</span>
            <span className={`stat-value ${totalPnL >= 0 ? 'positive' : 'negative'}`}>
              {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} EUR
            </span>
          </div>
        </div>

        <div className="card">
          <h2>Activity</h2>
          <div className="stat">
            <span className="stat-label">Total Trades</span>
            <span className="stat-value">{totalTrades}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Volume</span>
            <span className="stat-value">${totalVolume.toFixed(2)}</span>
          </div>
        </div>

        <div className="card">
          <h2>Status</h2>
          <div className="stat">
            <span className="stat-label">Trading</span>
            <span className={`stat-value ${isTradingEnabled ? 'positive' : 'negative'}`}>
              {isTradingEnabled ? 'Active' : 'Stopped'}
            </span>
          </div>
        </div>
      </div>

      {/* Strategy Stats */}
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Strategy Performance</h2>
        <div className="grid">
          {stats.map((stat) => (
            <div key={stat.strategy} className="card">
              <h2>{stat.strategy}</h2>
              <div className="stat">
                <span className="stat-label">P&L</span>
                <span className={`stat-value ${stat.total_pnl >= 0 ? 'positive' : 'negative'}`}>
                  {stat.total_pnl >= 0 ? '+' : ''}{stat.total_pnl.toFixed(2)} EUR
                </span>
              </div>
              <div className="stat">
                <span className="stat-label">Trades</span>
                <span className="stat-value">{stat.trades_count}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Volume</span>
                <span className="stat-value">${stat.volume_usd.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Trades */}
      <div style={{ marginTop: '2rem' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>Recent Trades</h2>
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#888' }}>Time</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#888' }}>Strategy</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#888' }}>Symbol</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#888' }}>Side</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', color: '#888' }}>Value</th>
                <th style={{ padding: '0.75rem', textAlign: 'right', color: '#888' }}>P&L</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#888' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {trades.slice(0, 20).map((trade) => (
                <tr key={trade.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={{ padding: '0.75rem' }}>
                    {new Date(trade.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '0.75rem' }}>{trade.strategy}</td>
                  <td style={{ padding: '0.75rem' }}>{trade.symbol || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{trade.side}</td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    ${trade.value_usd.toFixed(2)}
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    {trade.pnl !== null && trade.pnl !== undefined ? (
                      <span className={trade.pnl >= 0 ? 'stat-value positive' : 'stat-value negative'}>
                        {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      background: trade.status === 'executed' ? '#10b98120' : '#88820',
                      color: trade.status === 'executed' ? '#10b981' : '#888',
                    }}>
                      {trade.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
