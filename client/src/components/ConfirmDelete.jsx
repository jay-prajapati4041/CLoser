export default function ConfirmDelete({ lead, onConfirm, onCancel, isDeleting }) {
  return (
    <dialog open className="lead-dialog confirm-delete-dialog" aria-labelledby="confirm-delete-title">
      <div className="dialog-heading">
        <div>
          <span className="section-kicker">Confirm deletion</span>
          <h2 id="confirm-delete-title">Delete {lead.company}?</h2>
        </div>
      </div>
      <p>This lead and its follow-up details will be removed permanently.</p>
      <div className="dialog-actions">
        <button className="cancel-button" type="button" onClick={onCancel} disabled={isDeleting}>Cancel</button>
        <button className="delete-button" type="button" onClick={onConfirm} disabled={isDeleting}>
          {isDeleting ? 'Deleting…' : 'Delete lead'}
        </button>
      </div>
    </dialog>
  )
}
