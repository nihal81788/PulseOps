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

  if (!stats) return <div style={{ color: '#64748b' }}>Loading worker health...</div>;

  const waiting = stats.queue?.waiting || 0;
  let statusColor = '#16a34a'; // green
  let statusBg = '#dcfce7';
  if (waiting >= 10 && waiting <= 30) {
    statusColor = '#92400e'; // yellow
    statusBg = '#fef9c3';
  } else if (waiting > 30) {
    statusColor = '#dc2626'; // red
    statusBg = '#fee2e2';
  }

  return (
    <div style={{ background: '#ffffff', borderRadius: '10px', padding: '16px 20px', marginBottom: '24px', color: '#0f172a', display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', border: '1px solid #e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontWeight: '600', color: statusColor, background: statusBg, padding: '4px 12px', borderRadius: '999px', fontSize: '13px' }}>System Status</span>
      </div>
      <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '24px' }}>
        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Concurrency</div>
        <div style={{ fontSize: '20px', fontWeight: '700' }}>{stats.concurrency || 0}</div>
      </div>
      <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '24px' }}>
        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Queue</div>
        <div style={{ fontSize: '20px', fontWeight: '700' }}>{waiting}</div>
      </div>
      <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '24px' }}>
        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed</div>
        <div style={{ fontSize: '20px', fontWeight: '700' }}>{stats.queue?.completed || 0}</div>
      </div>
      <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '24px' }}>
        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Failed</div>
        <div style={{ fontSize: '20px', fontWeight: '700' }}>{stats.queue?.failed || 0}</div>
      </div>
      <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: '24px' }}>
        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Processing</div>
        <div style={{ fontSize: '20px', fontWeight: '700' }}>{Math.round(stats.avgProcessingMs || 0)}ms</div>
      </div>
    </div>
  );
}
