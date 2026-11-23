import Icon from './Icon.jsx'

function getInitials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('')
}

// Sidebar owns workspace navigation and account actions.
export default function Sidebar({
  user,
  name,
  activeView,
  setActiveView,
  followUpCount,
  leadCount,
  onLogout,
  logoutError,
  isSigningOut,
}) {
  return (
    <aside className="workspace-sidebar">
      <div>
        <button className="brand sidebar-brand" type="button" onClick={() => setActiveView('overview')} aria-label="Closer overview">
          <span className="brand-mark" aria-hidden="true">c</span>
          <span>closer<span className="brand-period">.</span></span>
        </button>
        <p className="sidebar-label">Workspace</p>
        <nav className="workspace-nav" aria-label="Workspace navigation">
          <button className={`workspace-nav-link${activeView === 'overview' ? ' active' : ''}`} type="button" onClick={() => setActiveView('overview')} aria-current={activeView === 'overview' ? 'page' : undefined}>
            <Icon className="nav-icon" name="overview" /> Overview
          </button>
          <button className={`workspace-nav-link${activeView === 'follow-ups' ? ' active' : ''}`} type="button" onClick={() => setActiveView('follow-ups')} aria-current={activeView === 'follow-ups' ? 'page' : undefined}>
            <Icon className="nav-icon" name="followUp" /> Follow-ups
            <span className="nav-count">{followUpCount}</span>
          </button>
          <button className={`workspace-nav-link${activeView === 'leads' ? ' active' : ''}`} type="button" onClick={() => setActiveView('leads')} aria-current={activeView === 'leads' ? 'page' : undefined}>
            <Icon className="nav-icon" name="leads" /> All leads
            <span className="nav-count">{leadCount}</span>
          </button>
        </nav>
      </div>
      <div className="sidebar-bottom">
        <div className="privacy-note">
          <span className="online-dot" />
          <span><strong>Private workspace</strong><small>Only you can see your leads</small></span>
        </div>
        <div className="sidebar-account">
          <span className="account-avatar">{getInitials(name)}</span>
          <span className="account-copy"><strong>{name}</strong><small>{user.email}</small></span>
          <button className="sidebar-logout" type="button" onClick={onLogout} disabled={isSigningOut} aria-label="Sign out">
            <Icon name="arrow" />
          </button>
        </div>
        {logoutError && <p className="sidebar-error" role="alert">{logoutError}</p>}
      </div>
    </aside>
  )
}
