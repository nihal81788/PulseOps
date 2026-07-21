import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MonitorDetail from './pages/MonitorDetail';
import StatusPage from './pages/StatusPage';
import Incidents from './pages/Incidents';
import Navbar from './components/Navbar';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('pulseops_token');
  return token ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/status/:monitorId" element={<StatusPage />} />
      <Route path="/" element={<PrivateRoute><><Navbar /><Dashboard /></></PrivateRoute>} />
      <Route path="/monitor/:id" element={<PrivateRoute><><Navbar /><MonitorDetail /></></PrivateRoute>} />
      <Route path="/incidents" element={<PrivateRoute><><Navbar /><Incidents /></></PrivateRoute>} />
    </Routes>
  );
}

export default App;
