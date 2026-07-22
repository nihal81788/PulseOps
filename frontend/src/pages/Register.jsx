import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/register', { name, email, password });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc' }}>
      <div style={{ background:'#ffffff', padding:'40px', borderRadius:'12px', width:'400px', boxShadow:'0 4px 24px rgba(0,0,0,0.08)' }}>
        <h1 style={{ color:'#0f172a', marginBottom:'8px', fontSize:'24px', fontWeight:'700' }}>⚡ PulseOps</h1>
        <p style={{ color:'#64748b', marginBottom:'32px' }}>Create your account</p>
        {error && <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:'6px', padding:'12px', marginBottom:'16px', color:'#ef4444' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:'16px' }}>
            <label style={{ display:'block', color:'#64748b', marginBottom:'6px', fontSize:'14px' }}>Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              style={{ width:'100%', padding:'10px 14px', borderRadius:'8px', border:'1px solid #e2e8f0', background:'#ffffff', color:'#0f172a', fontSize:'14px', boxSizing:'border-box', outline:'none' }} />
          </div>
          <div style={{ marginBottom:'16px' }}>
            <label style={{ display:'block', color:'#64748b', marginBottom:'6px', fontSize:'14px' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width:'100%', padding:'10px 14px', borderRadius:'8px', border:'1px solid #e2e8f0', background:'#ffffff', color:'#0f172a', fontSize:'14px', boxSizing:'border-box', outline:'none' }} />
          </div>
          <div style={{ marginBottom:'24px' }}>
            <label style={{ display:'block', color:'#64748b', marginBottom:'6px', fontSize:'14px' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ width:'100%', padding:'10px 14px', borderRadius:'8px', border:'1px solid #e2e8f0', background:'#ffffff', color:'#0f172a', fontSize:'14px', boxSizing:'border-box', outline:'none' }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'12px', borderRadius:'8px', background:'#6366f1', color:'#fff', border:'none', cursor:'pointer', fontSize:'15px', fontWeight:'600' }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p style={{ textAlign:'center', marginTop:'20px', color:'#64748b', fontSize:'14px' }}>
          Have an account? <Link to="/login" style={{ color:'#6366f1' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
