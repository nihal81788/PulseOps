import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RegionalStats = ({ monitorId }) => {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/monitors/${monitorId}/regional-stats`, { withCredentials: true });
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
    <div className="regional-stats-container" style={{ marginTop: '20px' }}>
      <h3>Regional Performance (24h)</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #ccc' }}>
            <th>Region</th>
            <th>Uptime %</th>
            <th>Avg Latency (ms)</th>
          </tr>
        </thead>
        <tbody>
          {stats.map(stat => {
            const uptime = ((stat.up_count / stat.total) * 100).toFixed(2);
            return (
              <tr key={stat.region} style={{ borderBottom: '1px solid #eee', padding: '8px 0' }}>
                <td style={{ padding: '8px 0' }}>{stat.region}</td>
                <td style={{ padding: '8px 0' }}>{uptime}%</td>
                <td style={{ padding: '8px 0' }}>{stat.avg_ms} ms</td>
              </tr>
            );
          })}
          {stats.length === 0 && (
            <tr><td colSpan="3" style={{ padding: '8px 0' }}>No regional data available yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default RegionalStats;
