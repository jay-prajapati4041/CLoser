import {
  createLead,
  deleteLead,
  exportLeads,
  getFollowUps,
  getLead,
  getLeads,
  importLeads,
  updateLead,
} from './api.js'

// Lead service keeps lead data operations grouped in one frontend module.
export const leadService = {
  list: getLeads,
  followUps: getFollowUps,
  get: getLead,
  create: createLead,
  update: updateLead,
  remove: deleteLead,
  importCsv: importLeads,
  exportCsv: exportLeads,
}
