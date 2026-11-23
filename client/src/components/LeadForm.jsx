import { useEffect, useRef, useState } from 'react'

const STATUSES = ['New', 'Contacted', 'Meeting', 'Won', 'Lost']

// LeadForm collects the company and contact fields for creating or editing a lead.
export default function LeadForm({ lead, onSave, onClose }) {
  const dialogRef = useRef(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
    return () => dialogRef.current?.close()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const data = Object.fromEntries(formData.entries())
    setErrorMessage('')
    setIsSaving(true)

    try {
      await onSave(data)
    } catch (error) {
      setErrorMessage(error.message)
      setIsSaving(false)
    }
  }

  function handleBackdropClick(event) {
    if (event.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      className="lead-dialog"
      ref={dialogRef}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={handleBackdropClick}
      aria-labelledby="lead-form-title"
    >
      <div className="dialog-heading">
        <div>
          <span className="section-kicker">{lead ? 'Update your record' : 'A new opportunity'}</span>
          <h2 id="lead-form-title">{lead ? 'Edit lead' : 'Add a lead'}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="Close form">×</button>
      </div>

      <form className="lead-form" onSubmit={handleSubmit}>
        <label className="field" htmlFor="lead-company">
          <span>Company <span className="required-mark">*</span></span>
          <input id="lead-company" name="company" required maxLength="160" defaultValue={lead?.company || ''} placeholder="Company name" />
        </label>
        <label className="field" htmlFor="lead-contact">
          <span>Contact person</span>
          <input id="lead-contact" name="contactPerson" maxLength="120" defaultValue={lead?.contactPerson || ''} placeholder="Full name" />
        </label>
        <div className="lead-form-grid">
          <label className="field" htmlFor="lead-phone">
            <span>Phone</span>
            <input id="lead-phone" name="phone" type="tel" maxLength="40" defaultValue={lead?.phone || ''} placeholder="+1 555 0100" />
          </label>
          <label className="field" htmlFor="lead-email">
            <span>Email</span>
            <input id="lead-email" name="email" type="email" maxLength="254" defaultValue={lead?.email || ''} placeholder="contact@company.com" />
          </label>
        </div>
        <div className="lead-form-grid">
          <label className="field" htmlFor="lead-city">
            <span>City</span>
            <input id="lead-city" name="city" maxLength="100" defaultValue={lead?.city || ''} placeholder="City" />
          </label>
          <label className="field" htmlFor="lead-status">
            <span>Status</span>
            <select id="lead-status" name="status" defaultValue={lead?.status || 'New'}>
              {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>
        <label className="field" htmlFor="lead-follow-up">
          <span>Next follow-up</span>
          <input
            id="lead-follow-up"
            name="nextFollowUpDate"
            type="date"
            defaultValue={lead?.nextFollowUpDate ? new Date(lead.nextFollowUpDate).toISOString().slice(0, 10) : ''}
          />
        </label>

        <p className={`form-message ${errorMessage ? 'visible' : ''}`} role="alert">{errorMessage}</p>
        <div className="dialog-actions">
          <button className="cancel-button" type="button" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button className="submit-button" type="submit" disabled={isSaving}>
            <span>{isSaving ? 'Saving…' : lead ? 'Save changes' : 'Add lead'}</span>
            <span className="button-arrow" aria-hidden="true">↗</span>
          </button>
        </div>
      </form>
    </dialog>
  )
}
