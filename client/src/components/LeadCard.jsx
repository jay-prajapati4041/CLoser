import StatusBadge from './StatusBadge.jsx'

export default function LeadCard({ lead, onOpen }) {
  return (
    <article className="lead-card">
      <button type="button" className="table-company" onClick={() => onOpen(lead.id)}>{lead.company}</button>
      <StatusBadge status={lead.status} />
      <p>{lead.contactPerson || 'No contact person'} · {lead.city || 'No city'}</p>
    </article>
  )
}
