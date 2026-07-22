import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';

const RegionalStats = ({ monitorId }) => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.get(`/monitors/${monitorId}/regional-stats`);
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch regional stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [monitorId]);

  if (loading) return <div>Loading regional stats...</div>;

  return (
    <div className="regional-stats-container" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '20px' }}>
      <h3 style={{ color: '#0f172a', fontSize: '15px', fontWeight: '600', marginBottom: '16px' }}>Regional Performance (24h)</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
            <th style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px' }}>Region</th>
            <th style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px' }}>Uptime %</th>
            <th style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 12px' }}>Avg Latency (ms)</th>
          </tr>
        </thead>
        <tbody>
          {stats.map(stat => {
            const uptime = ((stat.up_count / stat.total) * 100).toFixed(2);
            let uptimeColor = '#ef4444'; // red <95
            if (uptime >= 99) uptimeColor = '#10b981'; // green >99
            else if (uptime >= 95) uptimeColor = '#f59e0b'; // yellow 95-99

            return (
              <tr key={stat.region} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 12px', color: '#0f172a', fontWeight: '500' }}>{stat.region}</td>
                <td style={{ padding: '10px 12px', color: uptimeColor, fontWeight: '600' }}>{uptime}%</td>
                <td style={{ padding: '10px 12px', color: '#64748b' }}>{stat.avg_ms} ms</td>
              </tr>
            );
          })}
          {stats.length === 0 && (
            <tr><td colSpan="3" style={{ padding: '10px 12px', color: '#64748b' }}>No regional data available yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default RegionalStats;
