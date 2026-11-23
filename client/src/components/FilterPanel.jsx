export default function FilterPanel({ status, city, sort, cityOptions, onStatusChange, onCityChange, onSortChange }) {
  return (
    <>
      <label>
        <span className="visually-hidden">Filter by status</span>
        <select value={status} onChange={(event) => onStatusChange(event.target.value)}>
          <option value="">All statuses</option>
          {['New', 'Contacted', 'Meeting', 'Won', 'Lost'].map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>
        <span className="visually-hidden">Filter by city</span>
        <select value={city} onChange={(event) => onCityChange(event.target.value)}>
          <option value="">All cities</option>
          {cityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>
        <span className="visually-hidden">Sort leads</span>
        <select value={sort} onChange={(event) => onSortChange(event.target.value)}>
          <option value="newest">Newest lead</option>
          <option value="oldest">Oldest lead</option>
          <option value="followUpAsc">Follow-up: earliest</option>
          <option value="followUpDesc">Follow-up: latest</option>
        </select>
      </label>
    </>
  )
}
