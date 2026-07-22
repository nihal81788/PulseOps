import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';

export default function WorkerHealth() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/workers/status');
        setStats(res.data);
      } catch (e) {
        console.error('Failed to fetch worker stats', e);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return <div style={{ color: '#94a3b8' }}>Loading worker health...</div>;

  const waiting = stats.queue?.waiting || 0;
  let statusColor = '#22c55e'; // green
  if (waiting >= 10 && waiting <= 30) statusColor = '#eab308'; // yellow
  else if (waiting > 30) statusColor = '#ef4444'; // red

  return (
    <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '24px', color: '#f1f5f9', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: statusColor }}></div>
        <span style={{ fontWeight: '600' }}>System Status</span>
      </div>
      <div>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Concurrency</div>
        <div style={{ fontSize: '18px', fontWeight: '600' }}>{stats.concurrency || 0}</div>
      </div>
      <div>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Queue (Waiting)</div>
        <div style={{ fontSize: '18px', fontWeight: '600' }}>{waiting}</div>
      </div>
      <div>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Completed</div>
        <div style={{ fontSize: '18px', fontWeight: '600' }}>{stats.queue?.completed || 0}</div>
      </div>
      <div>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Failed</div>
        <div style={{ fontSize: '18px', fontWeight: '600' }}>{stats.queue?.failed || 0}</div>
      </div>
      <div>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Avg Processing</div>
        <div style={{ fontSize: '18px', fontWeight: '600' }}>{Math.round(stats.avgProcessingMs || 0)}ms</div>
      </div>
    </div>
  );
}
