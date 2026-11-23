import Icon from './Icon.jsx'
import StatusBadge from './StatusBadge.jsx'

function formatFollowUp(value) {
  if (!value) return 'No follow-up set'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value))
}

// LeadTable renders owner-scoped lead rows and delegates row actions to its parent.
export default function LeadTable({ leads, onView }) {
  return (
    <div className="lead-table-wrap">
      <table className="lead-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Contact</th>
            <th>City</th>
            <th>Status</th>
            <th>Next follow-up</th>
            <th><span className="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id}>
              <td>
                <button className="table-company" type="button" onClick={() => onView(lead.id)}>{lead.company}</button>
                <span className="table-company-email">{lead.email || '—'}</span>
              </td>
              <td>{lead.contactPerson || '—'}<span className="table-secondary">{lead.phone || ''}</span></td>
              <td>{lead.city || '—'}</td>
              <td><StatusBadge status={lead.status} /></td>
              <td>{formatFollowUp(lead.nextFollowUpDate)}</td>
              <td>
                <button className="lead-open-button" type="button" onClick={() => onView(lead.id)} aria-label={`View ${lead.company} details`}>
                  <Icon name="arrow" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
