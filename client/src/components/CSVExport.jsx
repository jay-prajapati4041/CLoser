export default function CSVExport({ isExporting, onExport }) {
  return (
    <button
      className="secondary-add-button csv-action-button"
      type="button"
      disabled={isExporting}
      onClick={onExport}
    >
      {isExporting ? 'Exporting…' : 'Export CSV'}
    </button>
  )
}
