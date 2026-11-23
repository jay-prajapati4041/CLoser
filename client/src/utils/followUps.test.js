// Follow-up date tests cover day boundaries and exclude completed/lost deals.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getFollowUpCategory } from './followUps.js'

const now = new Date(2026, 10, 20, 15, 30)

test('classifies follow-ups by the local calendar day', () => {
  assert.equal(getFollowUpCategory({ nextFollowUpDate: '2026-11-19T00:00:00.000Z' }, now), 'overdue')
  assert.equal(getFollowUpCategory({ nextFollowUpDate: '2026-11-20T00:00:00.000Z' }, now), 'today')
  assert.equal(getFollowUpCategory({ nextFollowUpDate: '2026-11-21T00:00:00.000Z' }, now), 'upcoming')
})

test('does not remind for unscheduled or terminal leads', () => {
  assert.equal(getFollowUpCategory({ status: 'New' }, now), null)
  assert.equal(getFollowUpCategory({ status: 'Won', nextFollowUpDate: '2026-11-20' }, now), null)
  assert.equal(getFollowUpCategory({ status: 'Lost', nextFollowUpDate: '2026-11-20' }, now), null)
})

test('ignores malformed date values', () => {
  assert.equal(getFollowUpCategory({ nextFollowUpDate: '2026-02-30' }, now), null)
})
