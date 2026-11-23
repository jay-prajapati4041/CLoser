import { getFollowUpCategory } from '../utils/followUps.js'
import Icon from './Icon.jsx'

const GROUPS = [
  { key: 'overdue', title: 'Overdue', description: 'Needs attention', icon: 'alert' },
  { key: 'today', title: 'Due today', description: 'On today’s list', icon: 'followUp' },
  { key: 'upcoming', title: 'Upcoming', description: 'Coming up next', icon: 'calendar' },
]

function formatFollowUp(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

// FollowUpPanel groups saved dates dynamically and offers contact/reschedule actions.
export default function FollowUpPanel({
  leads,
  now,
  isLoading,
  error,
  actionId,
  onRetry,
  onMarkContacted,
  onReschedule,
}) {
  const groupedLeads = Object.fromEntries(GROUPS.map(({ key }) => [key, []]))

  for (const lead of leads) {
    const category = getFollowUpCategory(lead, now)
    if (category) groupedLeads[category].push(lead)
  }

  const totalCount = Object.values(groupedLeads).reduce((total, items) => total + items.length, 0)

  return (
    <section className="follow-up-section" aria-labelledby="follow-ups-title">
      <div className="leads-toolbar follow-up-toolbar">
        <div>
          <h3 id="follow-ups-title">Follow-ups <span className="lead-count">{totalCount}</span></h3>
          <p>Today’s priorities, without missing what’s next.</p>
        </div>
      </div>

      {error ? (
        <div className="follow-up-message">
          <p role="alert">{error}</p>
          <button type="button" className="text-button" onClick={onRetry}>Try again</button>
        </div>
      ) : isLoading ? (
        <div className="follow-up-message" role="status">Loading follow-ups…</div>
      ) : (
        <div className="follow-up-groups">
          {GROUPS.map((group) => (
            <section className={`follow-up-group follow-up-${group.key}`} key={group.key} aria-labelledby={`follow-up-${group.key}`}>
              <header className="follow-up-group-heading">
                <span className="follow-up-icon"><Icon name={group.icon} /></span>
                <div>
                  <h4 id={`follow-up-${group.key}`}>{group.title}</h4>
                  <p>{groupedLeads[group.key].length || group.description}</p>
                </div>
                <span className="follow-up-count">{groupedLeads[group.key].length}</span>
              </header>

              {groupedLeads[group.key].length === 0 ? (
                <p className="follow-up-empty">Nothing here right now.</p>
              ) : (
                <ul className="follow-up-list">
                  {groupedLeads[group.key].map((lead) => (
                    <li className="follow-up-card" key={lead.id}>
                      <div className="follow-up-company">{lead.company}</div>
                      <div className="follow-up-contact">{lead.contactPerson || lead.city || 'Contact details not added'}</div>
                      <time className="follow-up-date" dateTime={String(lead.nextFollowUpDate).slice(0, 10)}>
                        {formatFollowUp(lead.nextFollowUpDate)}
                      </time>
                      <div className="follow-up-actions">
                        <button
                          type="button"
                          className="follow-up-contacted"
                          disabled={actionId === lead.id}
                          onClick={() => onMarkContacted(lead)}
                        >
                          {actionId === lead.id ? 'Updating…' : 'Mark contacted'}
                        </button>
                        <button type="button" className="follow-up-reschedule" onClick={() => onReschedule(lead)}>
                          Reschedule
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </section>
  )
}
