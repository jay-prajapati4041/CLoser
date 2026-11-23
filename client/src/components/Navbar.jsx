import Icon from './Icon.jsx'

// Navbar presents the active workspace label and local date.
export default function Navbar({ viewLabel, todayLabel }) {
  return (
    <header className="workspace-topbar">
      <div className="topbar-breadcrumb"><span>Workspace</span><i>/</i> {viewLabel}</div>
      <div className="topbar-date"><Icon className="calendar-icon" name="calendar" />{todayLabel}</div>
    </header>
  )
}
