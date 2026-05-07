import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { forgotPassword } from '../../services/authService'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const handleSubmit = async () => {
    if (!email) { setError('Please enter your email'); return }
    setLoading(true)
    setError('')
    try {
      await forgotPassword(email)
      setSuccess('Reset link sent! Check your email.')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Email not found')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .auth-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          background: #060d1f;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          position: relative;
          overflow: hidden;
        }

        /* Ambient glows */
        .glow-1 {
          position: absolute;
          width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(29,78,216,0.18) 0%, transparent 70%);
          top: -150px; left: -100px;
          pointer-events: none;
        }
        .glow-2 {
          position: absolute;
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%);
          bottom: -100px; right: -100px;
          pointer-events: none;
        }
        .grid-bg {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
          pointer-events: none;
        }

        /* Card */
        .card {
          position: relative;
          width: 100%;
          max-width: 960px;
          min-height: 580px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06);
        }

        /* Left panel */
        .panel-left {
          background: linear-gradient(145deg, #0f2a6e 0%, #0a1f52 50%, #071540 100%);
          padding: 3rem 2.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }
        .panel-left::before {
          content: '';
          position: absolute;
          width: 320px; height: 320px;
          background: radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 65%);
          top: -60px; right: -60px;
          pointer-events: none;
        }
        .panel-left::after {
          content: '';
          position: absolute;
          width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 65%);
          bottom: 40px; left: -40px;
          pointer-events: none;
        }

        .logo-area {
          display: flex;
          align-items: center;
          gap: 14px;
          position: relative;
          z-index: 1;
        }
        .logo-icon {
          width: 48px; height: 48px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .logo-icon img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }
        .logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 1.1rem;
          font-weight: 700;
          color: #fff;
          line-height: 1.3;
        }
        .logo-sub {
          font-size: 0.65rem;
          font-weight: 400;
          color: rgba(147,197,253,0.8);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-top: 1px;
        }

        .panel-headline {
          position: relative;
          z-index: 1;
        }
        .panel-headline h2 {
          font-family: 'Playfair Display', serif;
          font-size: 2rem;
          font-weight: 700;
          color: #fff;
          line-height: 1.2;
          margin-bottom: 0.75rem;
        }
        .panel-headline p {
          font-size: 0.82rem;
          color: rgba(147,197,253,0.75);
          line-height: 1.7;
          max-width: 240px;
        }

        /* Access level badges */
        .access-levels {
          position: relative;
          z-index: 1;
        }
        .access-label {
          font-size: 0.6rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(147,197,253,0.5);
          margin-bottom: 10px;
        }
        .access-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          margin-bottom: 6px;
          transition: background 0.2s;
        }
        .badge-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .badge-name {
          font-size: 0.75rem;
          font-weight: 500;
          color: #fff;
          flex: 1;
        }
        .badge-role {
          font-size: 0.68rem;
          color: rgba(147,197,253,0.6);
        }

        /* Right panel */
        .panel-right {
          background: #0b1628;
          padding: 3rem 2.8rem;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .form-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.75rem;
          font-weight: 700;
          color: #f1f5f9;
          margin-bottom: 4px;
        }
        .form-subtitle {
          font-size: 0.78rem;
          color: #475569;
          margin-bottom: 1.8rem;
          font-weight: 300;
        }

        /* Form fields */
        .field { margin-bottom: 1rem; }
        .field-label {
          display: block;
          font-size: 0.68rem;
          font-weight: 500;
          color: #475569;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .field-input {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 0.82rem;
          color: #e2e8f0;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          transition: all 0.2s;
        }
        .field-input::placeholder { color: #1e3a5f; }
        .field-input:focus {
          border-color: rgba(59,130,246,0.5);
          background: rgba(59,130,246,0.05);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.08);
        }

        /* Primary button */
        .btn-primary {
          width: 100%;
          padding: 11px;
          background: linear-gradient(135deg, #1d4ed8, #1e40af);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.2s;
          letter-spacing: 0.02em;
          box-shadow: 0 4px 20px rgba(29,78,216,0.35);
        }
        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(29,78,216,0.45);
        }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Error / Success */
        .alert-error {
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 0.75rem;
          color: #fca5a5;
          margin-bottom: 1rem;
        }
        .alert-success {
          background: rgba(34,197,94,0.08);
          border: 1px solid rgba(34,197,94,0.2);
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 0.75rem;
          color: #86efac;
          margin-bottom: 1rem;
        }

        .switch-text {
          text-align: center;
          font-size: 0.73rem;
          color: #334155;
          margin-top: 1.2rem;
        }
        .switch-btn {
          background: none;
          border: none;
          color: #3b82f6;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.73rem;
        }
        .switch-btn:hover { text-decoration: underline; }

        .domain-hint {
          font-size: 0.65rem;
          color: #1e3a5f;
          margin-top: 4px;
          padding-left: 2px;
        }

        @media (max-width: 700px) {
          .card { grid-template-columns: 1fr; min-height: unset; }
          .panel-left { display: none; }
          .panel-right { padding: 2rem 1.5rem; }
        }
      `}</style>

      <div className="auth-root">
        <div className="glow-1" />
        <div className="glow-2" />
        <div className="grid-bg" />

        <div className="card">
          {/* LEFT PANEL */}
          <div className="panel-left">
            <div className="logo-area">
              <div className="logo-icon">
                <img src="/psa_logo.svg" alt="PSA logo" />
              </div>
              <div>
                <div className="logo-text">PSA</div>
                <div className="logo-sub">Philippine Statistics Authority</div>
              </div>
            </div>

            <div className="panel-headline">
              <h2>Password<br />Reset</h2>
              <p>Secure password recovery for authorized PSA personnel.</p>
            </div>

            <div className="access-levels">
              <div className="access-label">Access Levels</div>
              <div className="access-badge">
                <span className="badge-dot" style={{ background: '#facc15' }} />
                <span className="badge-name">Super Admin</span>
                <span className="badge-role">Full access</span>
              </div>
              <div className="access-badge">
                <span className="badge-dot" style={{ background: '#93c5fd' }} />
                <span className="badge-name">Admin</span>
                <span className="badge-role">Partial + authorized</span>
              </div>
              <div className="access-badge">
                <span className="badge-dot" style={{ background: '#64748b' }} />
                <span className="badge-name">User</span>
                <span className="badge-role">Profile + Requests</span>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="panel-right">
            <div className="form-title">Forgot Password</div>
            <div className="form-subtitle">Enter your email to receive a reset link</div>

            {error && <div className="alert-error">{error}</div>}
            {success && <div className="alert-success">{success}</div>}

            <div className="field">
              <label className="field-label">Email</label>
              <input
                className="field-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="your.email@example.com"
              />
            </div>

            <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="switch-text">
              Remember your password?{' '}
              <button className="switch-btn" onClick={() => navigate('/login')}>Back to Login</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
