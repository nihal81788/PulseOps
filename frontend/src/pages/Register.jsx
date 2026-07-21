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
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f172a' }}>
      <div style={{ background:'#1e293b', padding:'40px', borderRadius:'12px', width:'400px' }}>
        <h1 style={{ color:'#f1f5f9', marginBottom:'8px' }}>⚡ PulseOps</h1>
        <p style={{ color:'#94a3b8', marginBottom:'32px' }}>Create your account</p>
        {error && <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:'6px', padding:'12px', marginBottom:'16px', color:'#dc2626' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:'16px' }}>
            <label style={{ display:'block', color:'#94a3b8', marginBottom:'6px', fontSize:'14px' }}>Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #334155', background:'#0f172a', color:'#f1f5f9', fontSize:'14px', boxSizing:'border-box' }} />
          </div>
          <div style={{ marginBottom:'16px' }}>
            <label style={{ display:'block', color:'#94a3b8', marginBottom:'6px', fontSize:'14px' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #334155', background:'#0f172a', color:'#f1f5f9', fontSize:'14px', boxSizing:'border-box' }} />
          </div>
          <div style={{ marginBottom:'24px' }}>
            <label style={{ display:'block', color:'#94a3b8', marginBottom:'6px', fontSize:'14px' }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ width:'100%', padding:'10px', borderRadius:'6px', border:'1px solid #334155', background:'#0f172a', color:'#f1f5f9', fontSize:'14px', boxSizing:'border-box' }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'12px', borderRadius:'6px', background:'#3b82f6', color:'#fff', border:'none', cursor:'pointer', fontSize:'15px', fontWeight:'600' }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p style={{ textAlign:'center', marginTop:'20px', color:'#94a3b8', fontSize:'14px' }}>
          Have an account? <Link to="/login" style={{ color:'#3b82f6' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
