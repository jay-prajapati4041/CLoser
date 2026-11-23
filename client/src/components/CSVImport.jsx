export default function CSVImport({ inputRef, isImporting, onChange }) {
  return (
    <>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept=".csv,text/csv"
        onChange={onChange}
        aria-label="Import leads CSV"
      />
      <button
        className="secondary-add-button csv-action-button"
        type="button"
        disabled={isImporting}
        onClick={() => inputRef.current?.click()}
      >
        {isImporting ? 'Importing…' : 'Import CSV'}
      </button>
    </>
  )
}
