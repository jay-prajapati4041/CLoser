import Icon from './Icon.jsx'

export default function SearchBar({ value, onChange }) {
  return (
    <label className="lead-search-field">
      <span className="visually-hidden">Search leads</span>
      <Icon name="search" />
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search company, contact or phone" />
    </label>
  )
}
