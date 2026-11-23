import Icon from './Icon.jsx'

// BrandPanel introduces Closer and gives the sign-in screen its product context.
export default function BrandPanel() {
  return (
    <aside className="welcome-panel">
      <a className="brand" href="/" aria-label="Closer home">
        <span className="brand-mark" aria-hidden="true">c</span>
        <span>closer<span className="brand-period">.</span></span>
      </a>

      <div className="welcome-copy">
        <span className="eyebrow"><span className="eyebrow-dot" /> A clearer view of every conversation</span>
        <h1>Make every conversation <span>count.</span></h1>
        <p>Keep customer details, next steps, and the people behind each opportunity in one considered workspace.</p>
      </div>

      <div className="auth-promise">
        <span className="auth-promise-icon"><Icon name="check" /></span>
        <div>
          <strong>Made for steady progress</strong>
          <p>Good follow-through begins with a clear next step.</p>
        </div>
      </div>

      <div className="welcome-footer">
        <span>YOUR CUSTOMER RELATIONSHIPS, IN GOOD HANDS</span>
      </div>
    </aside>
  )
}
