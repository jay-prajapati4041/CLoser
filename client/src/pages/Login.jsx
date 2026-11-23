import AuthForm from '../components/AuthForm.jsx'
import BrandPanel from '../components/BrandPanel.jsx'

export default function Login({ onAuthenticated, loading, connectionError, onRetry }) {
  return (
    <main className="shell auth-shell">
      <BrandPanel />
      <section className="form-panel" aria-live="polite">
        <div className="form-topline">
          <span className="secure-label"><span className="lock-icon" aria-hidden="true" /> Secure sign in</span>
        </div>
        <div className="auth-content">
          {loading ? (
            <div className="loading-state"><span className="loading-mark" aria-hidden="true">c</span><p>Opening your workspace…</p></div>
          ) : connectionError ? (
            <div className="connection-error">
              <span className="section-kicker">A SMALL PAUSE</span>
              <h2>Your workspace is just out of reach.</h2>
              <p>{connectionError}</p>
              <button className="submit-button" type="button" onClick={onRetry}><span>Try again</span><span className="button-arrow" aria-hidden="true">↗</span></button>
            </div>
          ) : (
            <AuthForm onAuthenticated={onAuthenticated} />
          )}
        </div>
        <div className="form-footer"><span>© 2026 Closer</span><span>Your account stays private</span></div>
      </section>
    </main>
  )
}
