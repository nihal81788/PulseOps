import { Routes, Route } from 'react-router-dom'
import useWebSocket from './hooks/useWebSocket'

function Dashboard() {
  return <h1>PulseOps</h1>
}

function App() {
  const testMonitorIds = [];
  const { isConnected, latestResults } = useWebSocket(testMonitorIds);

  return (
    <div>
      <div style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: isConnected ? 'green' : 'red'
        }} />
        <span>{isConnected ? 'Connected to Socket.IO' : 'Disconnected'}</span>
      </div>
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </div>
  )
}

export default App
