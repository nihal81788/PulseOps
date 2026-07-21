import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav style={{ background:'#0f172a', borderBottom:'1px solid #1e293b', padding:'0 24px', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div style={{ display:'flex', gap:'24px', alignItems:'center' }}>
        <Link to="/" style={{ color:'#f1f5f9', fontWeight:'700', fontSize:'18px', textDecoration:'none' }}>⚡ PulseOps</Link>
        <Link to="/" style={{ color:'#94a3b8', fontSize:'14px', textDecoration:'none' }}>Monitors</Link>
        <Link to="/incidents" style={{ color:'#94a3b8', fontSize:'14px', textDecoration:'none' }}>Incidents</Link>
      </div>
      <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
        {user && <span style={{ color:'#64748b', fontSize:'13px' }}>{user.email}</span>}
        <button onClick={logout} style={{ background:'none', border:'1px solid #334155', color:'#94a3b8', padding:'6px 12px', borderRadius:'6px', cursor:'pointer', fontSize:'13px' }}>
          Logout
        </button>
      </div>
    </nav>
  );
}
