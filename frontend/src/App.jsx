import { Routes, Route } from 'react-router-dom'

function Dashboard() {
  return <h1>PulseOps</h1>
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
    </Routes>
  )
}

export default App
