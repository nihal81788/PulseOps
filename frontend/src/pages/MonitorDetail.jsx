import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import useWebSocket from '../hooks/useWebSocket';
import LatencyChart from '../components/LatencyChart';
import HeatmapChart from '../components/HeatmapChart';
import UptimeBars from '../components/UptimeBars';

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

  if (!monitor) return <div style={{ padding:'40px', color:'#94a3b8' }}>Loading...</div>;

  const isUp = liveResult ? liveResult.isUp : null;
  const dotColor = isUp === null ? '#94a3b8' : isUp ? '#22c55e' : '#ef4444';

  return (
    <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'32px 24px' }}>
      <Link to="/" style={{ color:'#94a3b8', textDecoration:'none', fontSize:'14px' }}>← Back</Link>
      <div style={{ display:'flex', alignItems:'center', gap:'16px', margin:'20px 0 28px' }}>
        <div style={{ width:'16px', height:'16px', borderRadius:'50%', background:dotColor }} />
        <div>
          <h1 style={{ color:'#f1f5f9', fontSize:'24px', fontWeight:'700' }}>{monitor.name}</h1>
          <a href={monitor.url} target="_blank" rel="noreferrer" style={{ color:'#64748b', fontSize:'13px' }}>{monitor.url}</a>
        </div>
      </div>

      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'16px', marginBottom:'28px' }}>
          {[
            { label:'Uptime (24h)', value: stats.uptime_percent != null ? `${stats.uptime_percent}%` : 'N/A', color:'#22c55e' },
            { label:'P50', value: stats.latency?.p50_ms ? `${stats.latency.p50_ms}ms` : 'N/A', color:'#3b82f6' },
            { label:'P95', value: stats.latency?.p95_ms ? `${stats.latency.p95_ms}ms` : 'N/A', color:'#f59e0b' },
            { label:'P99', value: stats.latency?.p99_ms ? `${stats.latency.p99_ms}ms` : 'N/A', color:'#ef4444' },
          ].map(card => (
            <div key={card.label} style={{ background:'#1e293b', borderRadius:'10px', padding:'20px' }}>
              <div style={{ color:'#94a3b8', fontSize:'12px', marginBottom:'6px' }}>{card.label}</div>
              <div style={{ color:card.color, fontSize:'26px', fontWeight:'700' }}>{card.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background:'#1e293b', borderRadius:'12px', padding:'24px', marginBottom:'20px' }}>
        <LatencyChart monitorId={id} liveResult={liveResult} />
      </div>

      <div style={{ background:'#1e293b', borderRadius:'12px', padding:'24px', marginBottom:'20px' }}>
        <h3 style={{ color:'#f1f5f9', marginBottom:'16px', fontSize:'16px' }}>Historical Uptime</h3>
        <UptimeBars monitorId={id} />
      </div>

      <div style={{ background:'#1e293b', borderRadius:'12px', padding:'24px', marginBottom:'20px' }}>
        <HeatmapChart monitorId={id} />
      </div>

      {ssl && (
        <div style={{ background:'#1e293b', borderRadius:'12px', padding:'24px' }}>
          <h3 style={{ color:'#f1f5f9', marginBottom:'16px', fontSize:'16px' }}>SSL Certificate</h3>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div style={{ color:'#94a3b8', fontSize:'14px' }}>Days remaining: <span style={{ color: ssl.days_until_expiry < 14 ? '#ef4444' : '#22c55e' }}>{ssl.days_until_expiry}</span></div>
            <div style={{ color:'#94a3b8', fontSize:'14px' }}>Valid: <span style={{ color: ssl.is_valid ? '#22c55e' : '#ef4444' }}>{ssl.is_valid ? 'Yes' : 'No'}</span></div>
            <div style={{ color:'#94a3b8', fontSize:'14px' }}>Expires: <span style={{ color:'#f1f5f9' }}>{new Date(ssl.valid_to).toLocaleDateString()}</span></div>
          </div>
          {ssl.expiry_warning && <div style={{ marginTop:'12px', color:'#fbbf24', background:'#451a03', borderRadius:'6px', padding:'10px 14px', fontSize:'14px' }}>⚠️ {ssl.expiry_warning_message}</div>}
        </div>
      )}
    </div>
  );
}
