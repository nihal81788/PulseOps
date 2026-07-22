import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav style={{ background:'#ffffff', borderBottom:'1px solid #e2e8f0', boxShadow:'0 1px 3px rgba(0,0,0,0.06)', padding:'0 24px', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div style={{ display:'flex', gap:'24px', alignItems:'center', height: '100%' }}>
        <Link to="/" style={{ color:'#0f172a', fontWeight:'700', fontSize:'18px', textDecoration:'none' }}>⚡ PulseOps</Link>
        <Link to="/" style={{ color:'#64748b', fontSize:'14px', textDecoration:'none', borderBottom: '2px solid #6366f1', height: '100%', display: 'flex', alignItems: 'center' }}>Monitors</Link>
        <Link to="/incidents" style={{ color:'#64748b', fontSize:'14px', textDecoration:'none', height: '100%', display: 'flex', alignItems: 'center' }}>Incidents</Link>
      </div>
      <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
        {user && <span style={{ color:'#64748b', fontSize:'13px' }}>{user.email}</span>}
        <button onClick={logout} style={{ background:'none', border:'1px solid #e2e8f0', color:'#64748b', padding:'6px 12px', borderRadius:'6px', cursor:'pointer', fontSize:'13px' }}>
          Logout
        </button>
      </div>
    </nav>
  );
}
