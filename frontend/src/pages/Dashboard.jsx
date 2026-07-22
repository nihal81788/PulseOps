import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';
import useWebSocket from '../hooks/useWebSocket';
import WorkerHealth from '../components/WorkerHealth';

export default function Dashboard() {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const [newMonitor, setNewMonitor] = useState({ name:'', url:'', check_interval:60 });
  const [error, setError] = useState('');

  const monitorIds = monitors.map(m => m.id);
  const { latestResults, isConnected } = useWebSocket(monitorIds);

  useEffect(() => {
    apiClient.get('/monitors')
      .then(r => setMonitors(r.data.monitors || []))
      .finally(() => setLoading(false));
  }, []);

  const addMonitor = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await apiClient.post('/monitors', newMonitor);
      setMonitors(prev => [res.data.monitor, ...prev]);
      setShowForm(false);
      setNewMonitor({ name:'', url:'', check_interval:60 });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add monitor');
    }
  };

  const deleteMonitor = async (id) => {
    if (!confirm('Delete this monitor?')) return;
    await apiClient.delete(`/monitors/${id}`);
    setMonitors(prev => prev.filter(m => m.id !== id));
  };

  if (loading) return <div style={{ padding:'40px', color:'#64748b' }}>Loading...</div>;

  return (
    <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'32px 24px', background:'#f8fafc', minHeight:'100vh' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'32px' }}>
        <div>
          <h1 style={{ color:'#0f172a', fontSize:'24px', fontWeight:'700' }}>Monitors</h1>
          <p style={{ color:'#64748b', marginTop:'4px', fontSize:'14px' }}>
            {monitors.length} endpoints
            <span style={{ marginLeft:'12px', color: isConnected ? '#10b981' : '#ef4444' }}>
              ● {isConnected ? 'Live' : 'Offline'}
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setShowHealth(!showHealth)}
            style={{ padding:'10px 20px', background:'#ffffff', color:'#0f172a', border:'1px solid #e2e8f0', borderRadius:'8px', cursor:'pointer', fontWeight:'600', boxShadow:'0 1px 2px rgba(0,0,0,0.04)' }}>
            System Health ⌄
          </button>
          <button onClick={() => setShowForm(true)}
            style={{ padding:'10px 20px', background:'#6366f1', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'600' }}>
            + Add Monitor
          </button>
        </div>
      </div>

      {showHealth && <WorkerHealth />}

      {showForm && (
        <div style={{ background:'#ffffff', borderRadius:'12px', padding:'24px', marginBottom:'24px', border:'1px solid #e2e8f0', boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ color:'#0f172a', marginBottom:'16px' }}>Add Monitor</h3>
          {error && <div style={{ color:'#ef4444', marginBottom:'12px', fontSize:'14px' }}>{error}</div>}
          <form onSubmit={addMonitor} style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
            <input placeholder="Name" value={newMonitor.name} onChange={e => setNewMonitor(p => ({...p, name:e.target.value}))} required
              style={{ padding:'10px 14px', borderRadius:'8px', border:'1px solid #e2e8f0', background:'#ffffff', color:'#0f172a', flex:'1', minWidth:'140px', outline:'none' }} />
            <input placeholder="https://example.com" value={newMonitor.url} onChange={e => setNewMonitor(p => ({...p, url:e.target.value}))} required
              style={{ padding:'10px 14px', borderRadius:'8px', border:'1px solid #e2e8f0', background:'#ffffff', color:'#0f172a', flex:'2', minWidth:'220px', outline:'none' }} />
            <select value={newMonitor.check_interval} onChange={e => setNewMonitor(p => ({...p, check_interval:parseInt(e.target.value)}))}
              style={{ padding:'10px 14px', borderRadius:'8px', border:'1px solid #e2e8f0', background:'#ffffff', color:'#0f172a', outline:'none' }}>
              <option value={30}>Every 30s</option>
              <option value={60}>Every 60s</option>
              <option value={300}>Every 5min</option>
            </select>
            <button type="submit" style={{ padding:'10px 20px', background:'#6366f1', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'600' }}>Create</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding:'10px 20px', background:'#ffffff', color:'#64748b', border:'1px solid #e2e8f0', borderRadius:'8px', cursor:'pointer' }}>Cancel</button>
          </form>
        </div>
      )}

      {monitors.length === 0 ? (
        <div style={{ textAlign:'center', color:'#64748b', padding:'60px' }}>
          <p style={{ fontSize:'18px' }}>No monitors yet. Add your first URL.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          {monitors.map(monitor => {
            const live = latestResults[monitor.id];
            const isUp = live ? live.isUp : monitor.is_currently_up;
            const responseTime = live ? live.responseTimeMs : monitor.last_response_time_ms;
            const contentWarning = live ? live.contentWarning : monitor.content_warning;
            const dotColor = isUp === null || isUp === undefined ? '#94a3b8' : isUp ? '#10b981' : '#ef4444';
            return (
              <div key={monitor.id} style={{ background:'#ffffff', borderRadius:'10px', padding:'16px 20px', display:'flex', alignItems:'center', gap:'16px', border:'1px solid #e2e8f0', boxShadow:'0 1px 2px rgba(0,0,0,0.04)', transition:'box-shadow 0.2s', cursor:'pointer' }}>
                <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:dotColor, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <Link to={`/monitor/${monitor.id}`} style={{ color:'#0f172a', fontWeight:'600', textDecoration:'none', fontSize:'16px' }}>{monitor.name}</Link>
                  <p style={{ color:'#64748b', fontSize:'13px', marginTop:'2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{monitor.url}</p>
                </div>
                {contentWarning && <span title="Content Warning" style={{ fontSize: '14px' }}>⚠️</span>}
                {responseTime && <div style={{ color:'#64748b', fontSize:'13px' }}>{Math.round(responseTime)}ms</div>}
                <div style={{ background:'#f1f5f9', borderRadius:'6px', padding:'2px 8px', color:'#475569', fontSize:'12px' }}>{monitor.check_interval}s</div>
                <button onClick={() => deleteMonitor(monitor.id)} style={{ background:'none', border:'none', color:'#94a3b8', cursor:'pointer', fontSize:'18px' }}>×</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
