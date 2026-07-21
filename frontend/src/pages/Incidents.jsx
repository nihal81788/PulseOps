import { useEffect, useState } from 'react';
import apiClient from '../api/client';

export default function Incidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/incidents?resolved=all&limit=50')
      .then(r => setIncidents(r.data.incidents || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding:'40px', color:'#94a3b8' }}>Loading...</div>;

  return (
    <div style={{ maxWidth:'1100px', margin:'0 auto', padding:'32px 24px' }}>
      <h1 style={{ color:'#f1f5f9', fontSize:'26px', fontWeight:'700', marginBottom:'28px' }}>Incidents</h1>
      {incidents.length === 0 ? (
        <p style={{ color:'#94a3b8' }}>No incidents yet — good news!</p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
          {incidents.map(incident => (
            <div key={incident.id} style={{ background:'#1e293b', borderRadius:'12px', padding:'20px 24px', borderLeft:`4px solid ${incident.is_resolved ? '#22c55e' : '#ef4444'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <span style={{ color:'#f1f5f9', fontWeight:'600' }}>{incident.monitor_name}</span>
                  <span style={{ marginLeft:'12px', fontSize:'12px', padding:'2px 8px', borderRadius:'20px', background: incident.is_resolved ? '#dcfce7' : '#fef2f2', color: incident.is_resolved ? '#16a34a' : '#dc2626' }}>
                    {incident.is_resolved ? 'Resolved' : 'Open'}
                  </span>
                </div>
                <span style={{ color:'#64748b', fontSize:'13px' }}>{Math.round(parseFloat(incident.duration_minutes))} min</span>
              </div>
              <p style={{ color:'#64748b', fontSize:'13px', marginTop:'4px' }}>{incident.monitor_url}</p>
              <p style={{ color:'#94a3b8', fontSize:'12px', marginTop:'4px' }}>Started: {new Date(incident.started_at).toLocaleString()}</p>
              {incident.root_cause && <p style={{ color:'#94a3b8', fontSize:'12px', marginTop:'4px' }}>Root cause: {incident.root_cause}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
