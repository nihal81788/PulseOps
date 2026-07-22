import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export default function StatusPage() {
  const { monitorId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:4000';

  useEffect(() => {
    fetch(`${API_URL}/status/${monitorId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load'); setLoading(false); });
  }, [monitorId]);

  if (loading) return <div style={{ padding:'40px', color:'#64748b', background:'#f8fafc', minHeight:'100vh' }}>Loading...</div>;
  if (error || !data) return <div style={{ padding:'40px', color:'#ef4444', background:'#f8fafc', minHeight:'100vh' }}>Status page not found.</div>;

  const COLOR_MAP = { green:'#10b981', yellow:'#f59e0b', red:'#ef4444' };
  const isOnline = data.current_status === 'online';

  return (
    <div style={{ background:'#f8fafc', minHeight:'100vh', padding:'60px 24px' }}>
      <div style={{ maxWidth:'800px', margin:'0 auto', background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:'16px', padding:'40px', boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'40px' }}>
          <div style={{ width:'16px', height:'16px', borderRadius:'50%', background: isOnline ? '#10b981' : '#ef4444' }} />
          <div>
            <h1 style={{ color:'#0f172a', fontSize:'28px', fontWeight:'700', margin:0 }}>{data.monitor?.name}</h1>
            <p style={{ color:'#64748b', fontSize:'14px', margin:0 }}>{data.monitor?.url}</p>
          </div>
          <div style={{ marginLeft:'auto', background: isOnline ? '#dcfce7' : '#fee2e2', color: isOnline ? '#16a34a' : '#dc2626', padding:'6px 16px', borderRadius:'20px', fontWeight:'600', fontSize:'14px' }}>
            {isOnline ? 'Operational' : 'Down'}
          </div>
        </div>

        <div style={{ background:'#ffffff', borderRadius:'10px', padding:'20px', marginBottom:'24px', border:'1px solid #e2e8f0' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
            <span style={{ color:'#64748b', fontSize:'14px' }}>Last 90 days</span>
            <span style={{ color:'#10b981', fontSize:'14px', fontWeight:'600' }}>{data.uptime_30d_percent}% uptime</span>
          </div>
          <div style={{ display:'flex', gap:'2px', alignItems:'flex-end', height:'32px', background: '#f1f5f9', borderRadius: '4px', padding: '4px' }}>
            {(data.uptime_bars_90d || []).map((bar, i) => (
              <div key={i}
                title={`${new Date(bar.date).toLocaleDateString()} — ${bar.uptime_percent}%`}
                style={{ flex:1, height: bar.color === 'green' ? '100%' : bar.color === 'yellow' ? '70%' : '40%', background: COLOR_MAP[bar.color] || '#64748b', borderRadius:'2px' }}
              />
            ))}
          </div>
        </div>

        <div style={{ background:'#f8fafc', borderRadius:'8px', padding:'12px 16px', textAlign:'center', border:'1px solid #e2e8f0' }}>
          <p style={{ color:'#64748b', fontSize:'13px', margin:0 }}>
            Embed badge: <code style={{ color:'#6366f1' }}>{`<img src="${API_URL}/status/badge/${monitorId}.svg" />`}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
