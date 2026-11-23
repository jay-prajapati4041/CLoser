import { useEffect, useRef, useState } from 'react'
import { getLead } from '../api.js'

function formatFollowUp(value) {
  if (!value) return 'Not scheduled'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(value))
}

// LeadDetails fetches and displays the full record from its protected detail endpoint.
export default function LeadDetails({ leadId, onClose, onEdit, onDelete }) {
  const dialogRef = useRef(null)
  const [lead, setLead] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let active = true
    dialogRef.current?.showModal()
    getLead(leadId)
      .then((result) => {
        if (active) setLead(result.lead)
      })
      .catch((error) => {
        if (active) setErrorMessage(error.message)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
      dialogRef.current?.close()
    }
  }, [leadId])

  async function handleDelete() {
    if (!window.confirm(`Delete ${lead.company}? This cannot be undone.`)) return
    setErrorMessage('')
    setIsDeleting(true)
    try {
      await onDelete(lead)
    } catch (error) {
      setErrorMessage(error.message)
      setIsDeleting(false)
    }
  }

  function handleBackdropClick(event) {
    if (event.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      className="lead-dialog detail-dialog"
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={handleBackdropClick}
      aria-labelledby="lead-detail-title"
    >
      {isLoading ? (
        <div className="detail-loading" role="status">Loading lead details…</div>
      ) : errorMessage && !lead ? (
        <div className="detail-error">
          <div className="dialog-heading">
            <h2 id="lead-detail-title">Couldn’t load this lead</h2>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Close details">×</button>
          </div>
          <p className="form-message visible" role="alert">{errorMessage}</p>
        </div>
      ) : (
        <>
          <div className="dialog-heading">
            <div>
              <span className="section-kicker">Lead details</span>
              <h2 id="lead-detail-title">{lead.company}</h2>
            </div>
            <button className="icon-button" type="button" onClick={onClose} aria-label="Close details">×</button>
          </div>
          <div className="detail-status-row">
            <span className={`status-badge status-${lead.status.toLowerCase()}`}>{lead.status}</span>
            <span className="detail-updated">Added {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(lead.createdAt))}</span>
          </div>
          <dl className="lead-detail-list">
            <div><dt>Contact person</dt><dd>{lead.contactPerson || '—'}</dd></div>
            <div><dt>Phone</dt><dd>{lead.phone || '—'}</dd></div>
            <div><dt>Email</dt><dd>{lead.email || '—'}</dd></div>
            <div><dt>City</dt><dd>{lead.city || '—'}</dd></div>
            <div><dt>Next follow-up</dt><dd>{formatFollowUp(lead.nextFollowUpDate)}</dd></div>
          </dl>
          {errorMessage && <p className="form-message visible" role="alert">{errorMessage}</p>}
          <div className="dialog-actions detail-actions">
            <button className="delete-button" type="button" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete lead'}
            </button>
            <button className="submit-button" type="button" onClick={() => onEdit(lead)}>
              <span>Edit lead</span><span className="button-arrow" aria-hidden="true">↗</span>
            </button>
          </div>
        </>
      )}
    </dialog>
  )
}
