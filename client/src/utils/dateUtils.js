export function formatDate(value, options = { month: 'short', day: 'numeric', timeZone: 'UTC' }) {
  if (!value) return 'No follow-up set'
  return new Intl.DateTimeFormat(undefined, options).format(new Date(value))
}

export function toInputDate(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : ''
}
