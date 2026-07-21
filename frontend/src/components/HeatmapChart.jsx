import { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import apiClient from '../api/client';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const HOURS = Array.from({ length:24 }, (_,i) => `${i}:00`);

export default function HeatmapChart({ monitorId }) {
  const [heatmapData, setHeatmapData] = useState([]);
  const [maxMs, setMaxMs] = useState(1000);

  useEffect(() => {
    if (!monitorId) return;
    apiClient.get(`/monitors/${monitorId}/heatmap`)
      .then(r => {
        const d = (r.data.heatmap || []).map(item => [item.hour, item.day, item.avg_ms]);
        setHeatmapData(d);
        if (d.length > 0) setMaxMs(Math.max(...d.map(x => x[2])));
      }).catch(() => {});
  }, [monitorId]);

  const option = {
    backgroundColor: 'transparent',
    tooltip: { formatter: p => `${DAYS[p.data[1]]} ${HOURS[p.data[0]]}<br/><b>${p.data[2]}ms</b>` },
    grid: { top:20, right:40, bottom:50, left:50 },
    xAxis: { type:'category', data:HOURS, axisLabel: { color:'#94a3b8', fontSize:9, interval:3 } },
    yAxis: { type:'category', data:DAYS, axisLabel: { color:'#94a3b8' } },
    visualMap: { min:0, max:maxMs, calculable:true, orient:'horizontal', left:'center', bottom:0, textStyle: { color:'#94a3b8' }, inRange: { color:['#0f172a','#1e40af','#3b82f6','#facc15','#ef4444'] } },
    series: [{ type:'heatmap', data:heatmapData }],
  };

  return (
    <div>
      <h3 style={{ color:'#f1f5f9', marginBottom:'12px', fontSize:'16px' }}>Latency Heatmap</h3>
      {heatmapData.length === 0 ? <p style={{ color:'#64748b' }}>Not enough data yet.</p> : <ReactECharts option={option} style={{ height:'200px' }} />}
    </div>
  );
}
