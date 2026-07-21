import { useEffect, useState } from 'react';
import apiClient from '../api/client';

const COLOR_MAP = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' };

export default function UptimeBars({ monitorId }) {
  const [bars, setBars] = useState([]);
  const [uptime, setUptime] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!monitorId) return;
    apiClient.get(`/monitors/${monitorId}/uptime-bars`)
      .then(r => { setBars(r.data.bars || []); setLoading(false); })
      .catch(() => setLoading(false));
    apiClient.get(`/monitors/${monitorId}/sla?target=99.9&period=30d`)
      .then(r => setUptime(r.data.actual_uptime_percent))
      .catch(() => {});
  }, [monitorId]);

  if (loading) return <div style={{ color:'#94a3b8' }}>Loading...</div>;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
        <span style={{ color:'#94a3b8', fontSize:'13px' }}>Last 90 days</span>
        {uptime !== null && <span style={{ color:'#22c55e', fontSize:'13px', fontWeight:'600' }}>{uptime}% uptime</span>}
      </div>
      <div style={{ display:'flex', gap:'2px', alignItems:'flex-end', height:'32px' }}>
        {bars.length === 0
          ? <span style={{ color:'#64748b', fontSize:'12px' }}>No data yet</span>
          : bars.map((bar, i) => (
            <div key={i}
              title={`${new Date(bar.date).toLocaleDateString()} — ${bar.uptime_percent}%`}
              style={{ flex:1, height: bar.color === 'green' ? '100%' : bar.color === 'yellow' ? '70%' : '40%', background: COLOR_MAP[bar.color] || '#64748b', borderRadius:'2px', cursor:'pointer' }}
            />
          ))
        }
      </div>
    </div>
  );
}
