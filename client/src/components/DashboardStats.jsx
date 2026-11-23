import Icon from './Icon.jsx'

export default function DashboardStats({ leads, activeLeadCount, dueToday, overdue }) {
  return (
    <section className="summary-grid" aria-label="Lead summary">
      <article className="summary-card">
        <span className="summary-icon summary-icon-leads"><Icon name="leads" /></span>
        <span className="summary-label">Total leads</span>
        <strong>{leads.length}</strong>
        <span className="summary-note">Across your workspace</span>
      </article>
      <article className="summary-card">
        <span className="summary-icon summary-icon-active"><Icon name="pipeline" /></span>
        <span className="summary-label">Active pipeline</span>
        <strong>{activeLeadCount}</strong>
        <span className="summary-note">Not yet won or lost</span>
      </article>
      <article className="summary-card summary-card-today">
        <span className="summary-icon summary-icon-today"><Icon name="followUp" /></span>
        <span className="summary-label">Due today</span>
        <strong>{dueToday}</strong>
        <span className="summary-note">Follow-ups to make</span>
      </article>
      <article className="summary-card summary-card-overdue">
        <span className="summary-icon summary-icon-overdue"><Icon name="alert" /></span>
        <span className="summary-label">Overdue</span>
        <strong>{overdue}</strong>
        <span className="summary-note">Ready for your attention</span>
      </article>
    </section>
  )
}
