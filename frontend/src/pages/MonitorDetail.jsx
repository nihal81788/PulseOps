import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import useWebSocket from '../hooks/useWebSocket';
import LatencyChart from '../components/LatencyChart';
import HeatmapChart from '../components/HeatmapChart';
import UptimeBars from '../components/UptimeBars';
import RegionalStats from '../components/RegionalStats';

export default function MonitorDetail() {
  const { id } = useParams();
  const [monitor, setMonitor] = useState(null);
  const [stats, setStats] = useState(null);
  const [ssl, setSSL] = useState(null);

  const { latestResults } = useWebSocket([id]);
  const liveResult = latestResults[id];

  useEffect(() => {
    apiClient.get(`/monitors/${id}`).then(r => setMonitor(r.data.monitor)).catch(() => {});
    apiClient.get(`/monitors/${id}/stats?window=24h`).then(r => setStats(r.data)).catch(() => {});
    apiClient.get(`/monitors/${id}/ssl`).then(r => setSSL(r.data.ssl)).catch(() => {});
  }, [id]);

  if (!monitor) return <div style={{ padding:'40px', color:'#64748b', background:'#f8fafc', minHeight:'100vh' }}>Loading...</div>;

  const isUp = liveResult ? liveResult.isUp : null;
  const dotColor = isUp === null ? '#94a3b8' : isUp ? '#10b981' : '#ef4444';

  return (
    <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'32px 24px', background:'#f8fafc', minHeight:'100vh' }}>
      <Link to="/" style={{ color:'#6366f1', textDecoration:'none', fontSize:'14px' }}>← Back to Monitors</Link>
      
      <div style={{ display:'flex', alignItems:'center', gap:'16px', margin:'20px 0 28px', background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'20px' }}>
        <div style={{ width:'16px', height:'16px', borderRadius:'50%', background:dotColor }} />
        <div>
          <h1 style={{ color:'#0f172a', fontSize:'24px', fontWeight:'700', margin:0 }}>{monitor.name}</h1>
          <a href={monitor.url} target="_blank" rel="noreferrer" style={{ color:'#64748b', fontSize:'13px', textDecoration:'none' }}>{monitor.url}</a>
        </div>
      </div>

      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'16px', marginBottom:'28px' }}>
          {[
            { label:'Uptime (24h)', value: stats.uptime_percent != null ? `${stats.uptime_percent}%` : 'N/A', color:'#10b981' },
            { label:'P50', value: stats.latency?.p50_ms ? `${stats.latency.p50_ms}ms` : 'N/A', color:'#6366f1' },
            { label:'P95', value: stats.latency?.p95_ms ? `${stats.latency.p95_ms}ms` : 'N/A', color:'#f59e0b' },
            { label:'P99', value: stats.latency?.p99_ms ? `${stats.latency.p99_ms}ms` : 'N/A', color:'#ef4444' },
          ].map(card => (
            <div key={card.label} style={{ background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'20px' }}>
              <div style={{ color:'#64748b', fontSize:'12px', marginBottom:'6px' }}>{card.label}</div>
              <div style={{ color:card.color, fontSize:'28px', fontWeight:'700' }}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'24px', marginBottom:'20px' }}>
        <LatencyChart monitorId={id} liveResult={liveResult} />
      </div>

      <div style={{ background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'24px', marginBottom:'20px' }}>
        <h3 style={{ color:'#0f172a', marginBottom:'16px', fontSize:'16px' }}>Historical Uptime</h3>
        <UptimeBars monitorId={id} />
      </div>

      <div style={{ background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'24px', marginBottom:'20px' }}>
        <HeatmapChart monitorId={id} />
      </div>

      <RegionalStats monitorId={id} />

      {ssl && (
        <div style={{ background:'#ffffff', border:'1px solid #e2e8f0', borderRadius:'10px', padding:'24px', marginTop:'20px' }}>
          <h3 style={{ color:'#0f172a', marginBottom:'16px', fontSize:'16px' }}>SSL Certificate</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div style={{ color:'#64748b', fontSize:'14px' }}>Days remaining: <span style={{ color: ssl.days_until_expiry < 14 ? '#ef4444' : '#10b981', fontWeight:'600' }}>{ssl.days_until_expiry}</span></div>
            <div style={{ color:'#64748b', fontSize:'14px' }}>Valid: <span style={{ color: ssl.is_valid ? '#10b981' : '#ef4444', fontWeight:'600' }}>{ssl.is_valid ? 'Yes' : 'No'}</span></div>
            <div style={{ color:'#64748b', fontSize:'14px' }}>Expires: <span style={{ color:'#0f172a', fontWeight:'600' }}>{new Date(ssl.valid_to).toLocaleDateString()}</span></div>
          </div>
          {ssl.expiry_warning && <div style={{ marginTop:'12px', color:'#92400e', background:'#fef9c3', borderRadius:'6px', padding:'10px 14px', fontSize:'14px' }}>⚠️ {ssl.expiry_warning_message}</div>}
        </div>
      )}
    </div>
  );
}
