import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../../services/authService'

// ── 5 attempts/day limit (tracked per token in localStorage) ─────────────────
const MAX_ATTEMPTS = 5
const ATTEMPTS_KEY = 'reset_attempts'

function getTodayKey() {
  return new Date().toISOString().slice(0, 10) // "2025-01-01"
}

function getAttemptCount(token: string): number {
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY)
    if (!raw) return 0
    const data = JSON.parse(raw)
    if (data.token !== token || data.date !== getTodayKey()) return 0
    return data.count || 0
  } catch { return 0 }
}

function incrementAttempt(token: string) {
  const count = getAttemptCount(token) + 1
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify({ token, count, date: getTodayKey() }))
  return count
}

type Step = 'password' | 'success' | 'invalid'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Token comes from the URL: /reset-password?token=xxx
  const tokenFromUrl = searchParams.get('token') || ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<Step>('password')
  const [attemptsUsed, setAttemptsUsed] = useState(0)

  useEffect(() => {
    // If no token in URL, mark as invalid immediately
    if (!tokenFromUrl) {
      setStep('invalid')
      return
    }
    setAttemptsUsed(getAttemptCount(tokenFromUrl))
  }, [tokenFromUrl])

  const remainingAttempts = MAX_ATTEMPTS - attemptsUsed
  const isLocked = remainingAttempts <= 0

  const handleReset = async () => {
    if (isLocked) return
    if (!newPassword || !confirmPassword) { setError('Please fill in all fields'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return }

    setLoading(true)
    setError('')
    try {
      await resetPassword(tokenFromUrl, newPassword)
      setStep('success')
      setTimeout(() => navigate('/login'), 2500)
    } catch (err: any) {
      const newCount = incrementAttempt(tokenFromUrl)
      setAttemptsUsed(newCount)
      const left = MAX_ATTEMPTS - newCount

      if (left <= 0) {
        setError('You have used all 5 attempts for today. Please request a new reset link tomorrow.')
      } else {
        setError(
          err.response?.data?.detail ||
          `Invalid or expired token. ${left} attempt${left === 1 ? '' : 's'} remaining today.`
        )
      }
    } finally {
      setLoading(false)
    }
  }

  // Password strength helper
  const getStrength = (pw: string) => {
    if (!pw) return null
    const score =
      (pw.length >= 8 ? 1 : 0) +
      (/[A-Z]/.test(pw) ? 1 : 0) +
      (/\d/.test(pw) ? 1 : 0) +
      (/[^a-zA-Z0-9]/.test(pw) ? 1 : 0)
    if (score <= 1) return { level: 'weak', label: 'Weak – add uppercase, numbers, symbols', bars: 1 }
    if (score <= 2) return { level: 'medium', label: 'Medium – getting stronger', bars: 2 }
    return { level: 'strong', label: 'Strong password ✓', bars: 3 }
  }
  const strength = getStrength(newPassword)

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .auth-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          background: #060d1f;
          display: flex; align-items: center; justify-content: center;
          padding: 1.5rem;
          position: relative; overflow: hidden;
        }
        .glow-1 {
          position: absolute; width: 600px; height: 600px;
          background: radial-gradient(circle, rgba(29,78,216,0.18) 0%, transparent 70%);
          top: -150px; left: -100px; pointer-events: none;
        }
        .glow-2 {
          position: absolute; width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%);
          bottom: -100px; right: -100px; pointer-events: none;
        }
        .grid-bg {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 48px 48px; pointer-events: none;
        }
        .card {
          position: relative; width: 100%; max-width: 960px; min-height: 560px;
          display: grid; grid-template-columns: 1fr 1fr;
          border-radius: 24px; overflow: hidden;
          box-shadow: 0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06);
        }

        /* LEFT */
        .panel-left {
          background: linear-gradient(145deg, #0f2a6e 0%, #0a1f52 50%, #071540 100%);
          padding: 3rem 2.5rem;
          display: flex; flex-direction: column; justify-content: space-between;
          position: relative; overflow: hidden;
        }
        .panel-left::before {
          content: ''; position: absolute; width: 320px; height: 320px;
          background: radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 65%);
          top: -60px; right: -60px; pointer-events: none;
        }
        .panel-left::after {
          content: ''; position: absolute; width: 200px; height: 200px;
          background: radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 65%);
          bottom: 40px; left: -40px; pointer-events: none;
        }
        .logo-area { display: flex; align-items: center; gap: 14px; position: relative; z-index: 1; }
        .logo-icon {
          width: 48px; height: 48px;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05));
          border: 1px solid rgba(255,255,255,0.2); border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; backdrop-filter: blur(8px); flex-shrink: 0;
        }
        .logo-text { font-family: 'Playfair Display', serif; font-size: 1.1rem; font-weight: 700; color: #fff; line-height: 1.3; }
        .logo-sub { font-size: 0.65rem; color: rgba(147,197,253,0.8); letter-spacing: 0.08em; text-transform: uppercase; margin-top: 1px; }
        .panel-headline { position: relative; z-index: 1; }
        .panel-headline h2 { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 700; color: #fff; line-height: 1.2; margin-bottom: 0.75rem; }
        .panel-headline p { font-size: 0.82rem; color: rgba(147,197,253,0.75); line-height: 1.7; max-width: 240px; }
        .access-levels { position: relative; z-index: 1; }
        .access-label { font-size: 0.6rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(147,197,253,0.5); margin-bottom: 10px; }
        .access-badge {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; margin-bottom: 6px;
        }
        .badge-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .badge-name { font-size: 0.75rem; font-weight: 500; color: #fff; flex: 1; }
        .badge-role { font-size: 0.68rem; color: rgba(147,197,253,0.6); }

        /* RIGHT */
        .panel-right {
          background: #0b1628; padding: 3rem 2.8rem;
          display: flex; flex-direction: column; justify-content: center;
          position: relative; overflow: hidden;
        }
        .form-title { font-family: 'Playfair Display', serif; font-size: 1.75rem; font-weight: 700; color: #f1f5f9; margin-bottom: 4px; }
        .form-subtitle { font-size: 0.78rem; color: #475569; margin-bottom: 1.8rem; font-weight: 300; line-height: 1.6; }

        .field { margin-bottom: 1rem; }
        .field-label { display: block; font-size: 0.68rem; font-weight: 500; color: #475569; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 6px; }

        .pw-input-wrap { position: relative; }
        .field-input {
          width: 100%;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px; padding: 10px 44px 10px 14px;
          font-size: 0.82rem; color: #e2e8f0; font-family: 'DM Sans', sans-serif;
          outline: none; transition: all 0.2s;
        }
        .field-input::placeholder { color: #1e3a5f; }
        .field-input:focus {
          border-color: rgba(59,130,246,0.5);
          background: rgba(59,130,246,0.05);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.08);
        }
        .field-input:disabled { opacity: 0.4; cursor: not-allowed; }
        .pw-toggle {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: #475569; cursor: pointer;
          padding: 2px; display: flex; align-items: center; transition: color 0.2s;
          font-size: 1rem;
        }
        .pw-toggle:hover { color: #93c5fd; }

        /* Strength */
        .pw-strength { display: flex; gap: 4px; margin-top: 6px; }
        .pw-strength-bar { flex: 1; height: 3px; border-radius: 2px; background: rgba(255,255,255,0.08); transition: background 0.3s; }
        .pw-strength-bar.weak { background: #ef4444; }
        .pw-strength-bar.medium { background: #f59e0b; }
        .pw-strength-bar.strong { background: #22c55e; }
        .pw-strength-text { font-size: 0.6rem; color: #475569; margin-top: 3px; }

        /* Attempts */
        .attempts-bar {
          margin-bottom: 1rem; padding: 10px 12px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
        }
        .attempts-bar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .attempts-bar-label { font-size: 0.65rem; color: #475569; letter-spacing: 0.08em; text-transform: uppercase; }
        .attempts-dots { display: flex; gap: 5px; }
        .attempt-dot { width: 100%; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.08); transition: background 0.3s; }
        .attempt-dot.used { background: #ef4444; }
        .attempt-dot.remaining { background: rgba(59,130,246,0.45); }

        /* Alerts */
        .alert-error {
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px; padding: 9px 12px;
          font-size: 0.75rem; color: #fca5a5; margin-bottom: 1rem;
          display: flex; gap: 8px; align-items: flex-start;
        }
        .alert-locked {
          background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.2);
          border-radius: 12px; padding: 20px 16px; margin-bottom: 1rem; text-align: center;
        }
        .alert-locked .lock-icon { font-size: 2rem; margin-bottom: 10px; }
        .alert-locked .lock-title { font-size: 0.9rem; font-weight: 600; color: #fca5a5; margin-bottom: 6px; }
        .alert-locked .lock-desc { font-size: 0.72rem; color: #7f1d1d; line-height: 1.6; }

        .alert-invalid {
          background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.2);
          border-radius: 12px; padding: 20px 16px; text-align: center;
        }
        .alert-invalid .inv-icon { font-size: 2rem; margin-bottom: 10px; }
        .alert-invalid .inv-title { font-size: 0.9rem; font-weight: 600; color: #fcd34d; margin-bottom: 6px; }
        .alert-invalid .inv-desc { font-size: 0.72rem; color: #78350f; line-height: 1.6; }

        /* Button */
        .btn-primary {
          width: 100%; padding: 11px;
          background: linear-gradient(135deg, #1d4ed8, #1e40af);
          border: none; border-radius: 12px; color: #fff;
          font-size: 0.85rem; font-weight: 600; cursor: pointer;
          font-family: 'DM Sans', sans-serif; transition: all 0.2s;
          letter-spacing: 0.02em; box-shadow: 0 4px 20px rgba(29,78,216,0.35);
          margin-top: 0.5rem;
        }
        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          transform: translateY(-1px); box-shadow: 0 6px 24px rgba(29,78,216,0.45);
        }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .switch-text { text-align: center; font-size: 0.73rem; color: #334155; margin-top: 1.2rem; }
        .switch-btn { background: none; border: none; color: #3b82f6; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.73rem; }
        .switch-btn:hover { text-decoration: underline; }

        /* Success */
        .success-message { text-align: center; padding: 1rem; }
        .success-icon {
          width: 72px; height: 72px;
          background: rgba(34,197,94,0.1); border: 2px solid rgba(34,197,94,0.3);
          border-radius: 20px; display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1.5rem; font-size: 36px;
          animation: pop 0.4s ease;
        }
        @keyframes pop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
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
              <div className="logo-icon">🏛️</div>
              <div>
                <div className="logo-text">PSA</div>
                <div className="logo-sub">Philippine Statistics Authority</div>
              </div>
            </div>
            <div className="panel-headline">
              <h2>Secure<br />Reset</h2>
              <p>Reset your password securely for PSA Property Management.</p>
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

            {/* ── No token in URL ── */}
            {step === 'invalid' && (
              <>
                <div className="alert-invalid">
                  <div className="inv-icon">⚠️</div>
                  <div className="inv-title">Invalid Reset Link</div>
                  <div className="inv-desc">
                    This password reset link is missing or has expired.<br />
                    Please request a new one from the Forgot Password page.
                  </div>
                </div>
                <button className="btn-primary" onClick={() => navigate('/forgot-password')}>
                  Request New Reset Link
                </button>
                <div className="switch-text">
                  <button className="switch-btn" onClick={() => navigate('/login')}>Back to Login</button>
                </div>
              </>
            )}

            {/* ── Password form ── */}
            {step === 'password' && (
              <>
                <div className="form-title">Reset Password</div>
                <div className="form-subtitle">
                  Enter your new password below. Make it strong!
                </div>

                {/* Attempts tracker */}
                {attemptsUsed > 0 && (
                  <div className="attempts-bar">
                    <div className="attempts-bar-header">
                      <span className="attempts-bar-label">Daily Attempts</span>
                      <span style={{
                        fontSize: '0.7rem', fontWeight: 600,
                        color: remainingAttempts <= 1 ? '#ef4444' : remainingAttempts <= 2 ? '#f59e0b' : '#86efac'
                      }}>
                        {remainingAttempts} / {MAX_ATTEMPTS} remaining
                      </span>
                    </div>
                    <div className="attempts-dots">
                      {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                        <div key={i} className={`attempt-dot ${i < attemptsUsed ? 'used' : 'remaining'}`} />
                      ))}
                    </div>
                  </div>
                )}

                {isLocked ? (
                  <div className="alert-locked">
                    <div className="lock-icon">🔒</div>
                    <div className="lock-title">Too Many Attempts</div>
                    <div className="lock-desc">
                      You've used all 5 attempts for today.<br />
                      Please request a new reset link or try again tomorrow.
                    </div>
                  </div>
                ) : (
                  <>
                    {error && (
                      <div className="alert-error">
                        <span>⚠</span><span>{error}</span>
                      </div>
                    )}

                    <div className="field">
                      <label className="field-label">New Password</label>
                      <div className="pw-input-wrap">
                        <input
                          className="field-input"
                          type={showNew ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                          placeholder="••••••••"
                          disabled={loading}
                        />
                        <button className="pw-toggle" onClick={() => setShowNew(v => !v)} type="button">
                          {showNew ? '🙈' : '👁️'}
                        </button>
                      </div>
                      {strength && (
                        <>
                          <div className="pw-strength">
                            {[0, 1, 2].map(i => (
                              <div key={i} className={`pw-strength-bar ${i < strength.bars ? strength.level : ''}`} />
                            ))}
                          </div>
                          <div className="pw-strength-text">{strength.label}</div>
                        </>
                      )}
                    </div>

                    <div className="field">
                      <label className="field-label">Confirm Password</label>
                      <div className="pw-input-wrap">
                        <input
                          className="field-input"
                          type={showConfirm ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleReset()}
                          placeholder="••••••••"
                          disabled={loading}
                        />
                        <button className="pw-toggle" onClick={() => setShowConfirm(v => !v)} type="button">
                          {showConfirm ? '🙈' : '👁️'}
                        </button>
                      </div>
                      {confirmPassword.length > 0 && (
                        <div className="pw-strength-text" style={{ color: newPassword === confirmPassword ? '#22c55e' : '#ef4444' }}>
                          {newPassword === confirmPassword ? 'Passwords match ✓' : 'Passwords do not match'}
                        </div>
                      )}
                    </div>

                    <button
                      className="btn-primary"
                      onClick={handleReset}
                      disabled={loading || !newPassword || !confirmPassword}
                    >
                      {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </>
                )}

                <div className="switch-text">
                  {isLocked
                    ? <button className="switch-btn" onClick={() => navigate('/forgot-password')}>Request New Link</button>
                    : <button className="switch-btn" onClick={() => navigate('/login')}>Back to Login</button>
                  }
                </div>
              </>
            )}

            {/* ── Success ── */}
            {step === 'success' && (
              <div className="success-message">
                <div className="success-icon">✓</div>
                <div className="form-title">Password Reset!</div>
                <div className="form-subtitle" style={{ marginBottom: 0 }}>
                  Your password has been updated successfully.<br />
                  Redirecting you to login...
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}