import { useCallback, useEffect, useRef, useState } from 'react'
import { leadService } from '../services/leadService.js'
import { getFollowUpCategory } from '../utils/followUps.js'
import FollowUpPanel from './FollowUpPanel.jsx'
import LeadDetails from './LeadDetails.jsx'
import LeadForm from './LeadForm.jsx'
import DashboardStats from './DashboardStats.jsx'
import FilterPanel from './FilterPanel.jsx'
import LeadTable from './LeadTable.jsx'
import Navbar from './Navbar.jsx'
import SearchBar from './SearchBar.jsx'
import Sidebar from './Sidebar.jsx'
import CSVExport from './CSVExport.jsx'
import CSVImport from './CSVImport.jsx'
import { downloadCsvBlob } from '../utils/csvUtils.js'

// Dashboard owns the full-screen workspace, reminders, lead list, and account actions.
export default function Dashboard({ user, onLogout, logoutError }) {
  const [leads, setLeads] = useState([])
  const [followUps, setFollowUps] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isFollowUpsLoading, setIsFollowUpsLoading] = useState(true)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [followUpsError, setFollowUpsError] = useState('')
  const [actionError, setActionError] = useState('')
  const [followUpActionId, setFollowUpActionId] = useState(null)
  const [leadForm, setLeadForm] = useState(null)
  const [viewingLeadId, setViewingLeadId] = useState(null)
  const [activeView, setActiveView] = useState('overview')
  const [now, setNow] = useState(() => new Date())
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [sortFilter, setSortFilter] = useState('newest')
  const [cityOptions, setCityOptions] = useState([])
  const [csvMessage, setCsvMessage] = useState('')
  const [csvError, setCsvError] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const csvInputRef = useRef(null)
  const name = user.name || user.email.split('@')[0]

  const loadLeads = useCallback(async (filters = {}) => {
    setIsLoading(true)
    setLoadError('')
    try {
      const result = await leadService.list(filters)
      setLeads(result.leads)
    } catch (error) {
      setLoadError(error.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadCityOptions = useCallback(async () => {
    try {
      const result = await leadService.list({ sort: 'newest' })
      const cities = [...new Set(
        result.leads
          .map((lead) => lead.city?.trim())
          .filter(Boolean)
      )].sort((first, second) => first.localeCompare(second))
      setCityOptions(cities)
    } catch {
      setCityOptions([])
    }
  }, [])

  const loadFollowUps = useCallback(async () => {
    setIsFollowUpsLoading(true)
    setFollowUpsError('')
    try {
      const result = await leadService.followUps()
      setFollowUps(result.leads)
    } catch (error) {
      setFollowUpsError(error.message)
    } finally {
      setIsFollowUpsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadLeads({ search, status: statusFilter, city: cityFilter, sort: sortFilter })
    }, search ? 250 : 0)
    return () => window.clearTimeout(timer)
  }, [cityFilter, loadLeads, search, sortFilter, statusFilter])

  useEffect(() => {
    loadFollowUps()
  }, [loadFollowUps])

  useEffect(() => {
    loadCityOptions()
  }, [loadCityOptions])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  function syncFollowUp(lead) {
    const isActive = lead.nextFollowUpDate && lead.status !== 'Won' && lead.status !== 'Lost'
    setFollowUps((current) => [
      ...(isActive ? [lead] : []),
      ...current.filter((item) => item.id !== lead.id),
    ])
  }

  async function handleSaveLead(data) {
    const result = leadForm?.id
      ? await leadService.update(leadForm.id, data)
      : await leadService.create(data)
    syncFollowUp(result.lead)
    await loadLeads({ search, status: statusFilter, city: cityFilter, sort: sortFilter })
    await loadCityOptions()
    setLeadForm(null)
    setActionError('')
  }

  async function handleDeleteLead(lead) {
    await leadService.remove(lead.id)
    setFollowUps((current) => current.filter((item) => item.id !== lead.id))
    await loadLeads({ search, status: statusFilter, city: cityFilter, sort: sortFilter })
    await loadCityOptions()
    setViewingLeadId(null)
    setActionError('')
  }

  async function handleMarkContacted(lead) {
    setActionError('')
    setFollowUpActionId(lead.id)
    try {
      const result = await leadService.update(lead.id, { status: 'Contacted' })
      syncFollowUp(result.lead)
      await loadLeads({ search, status: statusFilter, city: cityFilter, sort: sortFilter })
    } catch (error) {
      setActionError(error.message)
    } finally {
      setFollowUpActionId(null)
    }
  }

  async function handleLogout() {
    setIsSigningOut(true)
    await onLogout()
    setIsSigningOut(false)
  }

  async function handleCsvImport(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setCsvError('')
    setCsvMessage('')
    setIsImporting(true)
    try {
      if (!file.name.toLowerCase().endsWith('.csv')) {
        throw new Error('Choose a .csv file.')
      }
      const csvText = await file.text()
      const result = await leadService.importCsv(csvText)
      setCsvMessage(`Imported ${result.imported} lead${result.imported === 1 ? '' : 's'}; ${result.failed} failed.`)
      await loadLeads({ search, status: statusFilter, city: cityFilter, sort: sortFilter })
      await loadCityOptions()
    } catch (error) {
      setCsvError(error.message)
    } finally {
      setIsImporting(false)
      event.target.value = ''
    }
  }

  async function handleCsvExport() {
    setCsvError('')
    setCsvMessage('')
    setIsExporting(true)
    try {
      const blob = await leadService.exportCsv({
        search,
        status: statusFilter,
        city: cityFilter,
        sort: sortFilter,
      })
      downloadCsvBlob(blob)
      setCsvMessage(`Exported ${leads.length} matching lead${leads.length === 1 ? '' : 's'}.`)
    } catch (error) {
      setCsvError(error.message)
    } finally {
      setIsExporting(false)
    }
  }

  const followUpCounts = followUps.reduce((counts, lead) => {
    const category = getFollowUpCategory(lead, now)
    if (category) counts[category] += 1
    return counts
  }, { overdue: 0, today: 0, upcoming: 0 })
  const activeLeadCount = leads.filter((lead) => lead.status !== 'Won' && lead.status !== 'Lost').length
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const todayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now)
  const viewLabel = activeView === 'follow-ups'
    ? 'Follow-ups'
    : activeView === 'leads'
      ? 'All leads'
      : 'Overview'
  const pageTitle = activeView === 'follow-ups'
    ? 'Follow-ups'
    : activeView === 'leads'
      ? 'All leads'
      : `${greeting}, ${name.split(' ')[0]}`
  const pageDescription = activeView === 'follow-ups'
    ? 'Stay on top of today’s calls and the next steps ahead.'
    : activeView === 'leads'
      ? 'Browse and manage every company in your workspace.'
      : 'Here’s what’s happening with your customer relationships.'
  const showOverview = activeView === 'overview'
  const showFollowUps = activeView === 'overview' || activeView === 'follow-ups'
  const showLeads = activeView === 'overview' || activeView === 'leads'
  const hasLeadFilters = Boolean(search || statusFilter || cityFilter || sortFilter !== 'newest')
  const clearLeadFilters = () => {
    setSearch('')
    setStatusFilter('')
    setCityFilter('')
    setSortFilter('newest')
  }

  return (
    <div className="app-dashboard">
      <Sidebar
        user={user}
        name={name}
        activeView={activeView}
        setActiveView={setActiveView}
        followUpCount={followUpCounts.today + followUpCounts.overdue}
        leadCount={leads.length}
        onLogout={handleLogout}
        logoutError={logoutError}
        isSigningOut={isSigningOut}
      />

      <div className="workspace-main">
        <Navbar viewLabel={viewLabel} todayLabel={todayLabel} />

        <main className="workspace-content">
          <section className="workspace-page-heading">
            <div>
              <span className="section-kicker">{activeView === 'overview' ? 'Sales overview' : viewLabel}</span>
              <h1>{pageTitle}{showOverview && <span className="heading-period">.</span>}</h1>
              <p>{pageDescription}</p>
            </div>
            {activeView !== 'follow-ups' && (
              <button className="add-lead-button page-add-button" type="button" onClick={() => setLeadForm({ mode: 'create' })}>
                <span aria-hidden="true">+</span> Add a lead
              </button>
            )}
          </section>

          {showOverview && (
            <DashboardStats
              leads={leads}
              activeLeadCount={activeLeadCount}
              dueToday={followUpCounts.today}
              overdue={followUpCounts.overdue}
            />
          )}

          {actionError && showFollowUps && <p className="form-message visible dashboard-action-error" role="alert">{actionError}</p>}
          {showFollowUps && (
            <div className="workspace-section-anchor">
              <FollowUpPanel
                leads={followUps}
                now={now}
                isLoading={isFollowUpsLoading}
                error={followUpsError}
                actionId={followUpActionId}
                onRetry={loadFollowUps}
                onMarkContacted={handleMarkContacted}
                onReschedule={setLeadForm}
              />
            </div>
          )}

          {showLeads && <section className="leads-section workspace-leads-section" aria-labelledby="leads-title">
            <div className="leads-toolbar">
              <div>
                <span className="section-kicker">Your customer list</span>
                <h2 id="leads-title">All leads <span className="lead-count">{leads.length}</span></h2>
                <p>Every opportunity, thoughtfully kept.</p>
              </div>
              <div className="leads-toolbar-actions">
                <CSVImport inputRef={csvInputRef} isImporting={isImporting} onChange={handleCsvImport} />
                <CSVExport isExporting={isExporting} onExport={handleCsvExport} />
                <button className="secondary-add-button" type="button" onClick={() => setLeadForm({ mode: 'create' })}>
                  <span aria-hidden="true">+</span> Add lead
                </button>
              </div>
            </div>

            {(csvMessage || csvError) && (
              <p className={`csv-result-message${csvError ? ' csv-result-error' : ''}`} role={csvError ? 'alert' : 'status'}>
                {csvError || csvMessage}
              </p>
            )}

            <div className="lead-filter-bar" aria-label="Search and filter leads">
              <SearchBar value={search} onChange={setSearch} />
              <FilterPanel
                status={statusFilter}
                city={cityFilter}
                sort={sortFilter}
                cityOptions={cityOptions}
                onStatusChange={setStatusFilter}
                onCityChange={setCityFilter}
                onSortChange={setSortFilter}
              />
              {hasLeadFilters && (
                <button className="lead-filter-clear" type="button" onClick={clearLeadFilters}>Clear</button>
              )}
            </div>

            {loadError ? (
              <div className="lead-list-message">
                <p role="alert">{loadError}</p>
                <button type="button" className="text-button" onClick={() => loadLeads({
                  search,
                  status: statusFilter,
                  city: cityFilter,
                  sort: sortFilter,
                })}>Try again</button>
              </div>
            ) : isLoading ? (
              <div className="lead-list-message" role="status">Loading your leads…</div>
            ) : leads.length === 0 ? (
              <div className="lead-empty-state">
                <div className="empty-icon" aria-hidden="true"><span /><span /><span /></div>
                <h3>{hasLeadFilters ? 'No leads match these filters.' : 'Your pipeline starts here.'}</h3>
                <p>{hasLeadFilters
                  ? 'Try changing or clearing the search and filter options.'
                  : 'Add your first company to keep the details and next steps close at hand.'}</p>
                {hasLeadFilters ? (
                  <button className="text-button" type="button" onClick={clearLeadFilters}>Clear filters <span aria-hidden="true">↗</span></button>
                ) : (
                  <button className="text-button" type="button" onClick={() => setLeadForm({ mode: 'create' })}>
                    Add your first lead <span aria-hidden="true">↗</span>
                  </button>
                )}
              </div>
            ) : (
              <LeadTable leads={leads} onView={setViewingLeadId} />
            )}
          </section>}

          <footer className="workspace-footer">
            <span>© 2026 Closer</span>
            <span>Customer relationships, kept in view</span>
          </footer>
        </main>
      </div>

      {leadForm && (
        <LeadForm
          key={leadForm.id || 'new-lead'}
          lead={leadForm.id ? leadForm : null}
          onSave={handleSaveLead}
          onClose={() => setLeadForm(null)}
        />
      )}
      {viewingLeadId && (
        <LeadDetails
          leadId={viewingLeadId}
          onClose={() => setViewingLeadId(null)}
          onEdit={(lead) => {
            setViewingLeadId(null)
            setLeadForm(lead)
          }}
          onDelete={handleDeleteLead}
        />
      )}
    </div>
  )
}
