// Follow-up dates are date-only values; compare them as local calendar days.
export function getFollowUpCategory(lead, now = new Date()) {
  if (
    !lead?.nextFollowUpDate ||
    lead.status === 'Won' ||
    lead.status === 'Lost'
  ) {
    return null
  }

  const dateParts = String(lead.nextFollowUpDate).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!dateParts) return null

  const [, yearText, monthText, dayText] = dateParts
  const year = Number(yearText)
  const month = Number(monthText) - 1
  const day = Number(dayText)
  const followUpDate = new Date(year, month, day)
  if (
    followUpDate.getFullYear() !== year ||
    followUpDate.getMonth() !== month ||
    followUpDate.getDate() !== day
  ) {
    return null
  }
  followUpDate.setHours(0, 0, 0, 0)

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  if (followUpDate < today) return 'overdue'
  if (followUpDate.getTime() === today.getTime()) return 'today'
  return 'upcoming'
}
