import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import apiClient from '../api/client';

const MAX_POINTS = 50;

export default function LatencyChart({ monitorId, liveResult }) {
  const [data, setData] = useState([]);
  const [p50, setP50] = useState(null);
  const [p95, setP95] = useState(null);

  useEffect(() => {
    if (!monitorId) return;
    apiClient.get(`/monitors/${monitorId}/stats?window=1h`)
      .then(r => {
        setP50(r.data.p50_ms || null);
        setP95(r.data.p95_ms || null);
      }).catch(() => {});
  }, [monitorId]);

  useEffect(() => {
    if (!monitorId) return;
    apiClient.get(`/monitors/${monitorId}/history?hours=1`)
      .then(r => {
        const points = (r.data.results || []).slice(0, MAX_POINTS).reverse()
          .map(p => ({ time: new Date(p.time).toLocaleTimeString(), ms: p.response_time_ms }));
        setData(points);
      }).catch(() => {});
  }, [monitorId]);

  useEffect(() => {
    if (!liveResult) return;
    setData(prev => [...prev, { time: new Date(liveResult.timestamp).toLocaleTimeString(), ms: liveResult.responseTimeMs }].slice(-MAX_POINTS));
  }, [liveResult]);

  const option = {
    backgroundColor: 'transparent',
    grid: { top:30, right:20, bottom:40, left:60 },
    tooltip: { trigger:'axis', formatter: p => `${p[0].axisValue}<br/><b>${p[0].data}ms</b>` },
    legend: {
      data: ['Response Time', 'P50', 'P95'],
      textStyle: { color: '#94a3b8' },
      bottom: 0,
    },
    xAxis: { type:'category', data: data.map(p => p.time), axisLabel: { color:'#94a3b8', fontSize:10 }, axisLine: { lineStyle: { color:'#334155' } } },
    yAxis: { type:'value', axisLabel: { color:'#94a3b8', formatter: v => `${v}ms` }, splitLine: { lineStyle: { color:'#1e293b' } } },
    series: [{ 
      name: 'Response Time',
      type:'line', 
      data: data.map(p => p.ms), 
      smooth:true, 
      symbol:'none', 
      lineStyle: { color:'#3b82f6', width:2 }, 
      areaStyle: { color: { type:'linear', x:0,y:0,x2:0,y2:1, colorStops: [{ offset:0, color:'rgba(59,130,246,0.3)' }, { offset:1, color:'rgba(59,130,246,0)' }] } },
      markLine: {
        silent: true,
        data: [
          { yAxis: p50, name: 'P50', lineStyle: { color: '#3b82f6', type: 'dashed' } },
          { yAxis: p95, name: 'P95', lineStyle: { color: '#f59e0b', type: 'dashed' } }
        ],
        label: { formatter: '{b}: {c}ms', color: '#94a3b8' }
      }
    }],
  };

  return (
    <div>
      <h3 style={{ color:'#f1f5f9', marginBottom:'12px', fontSize:'16px' }}>Response Time <span style={{ fontSize:'12px', color:'#22c55e' }}>● LIVE</span></h3>
      {data.length === 0 ? <p style={{ color:'#64748b' }}>No data yet — trigger a ping first.</p> : <ReactECharts option={option} style={{ height:'220px' }} />}
    </div>
  );
}
