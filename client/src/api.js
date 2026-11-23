// API helpers keep cookie-based HTTP requests and error handling in one place.


//     Property	Purpose
// ...options       	Adds method, body and other options
// credentials:     'include'	Sends cookies with the request
// Content-Type	        Tells backend JSON is being sent
// ...options.headers	 Adds custom headers
async function request(path, options = {}) {    //path end point of api 
      // options: HTTP configuration such as GET, POST, PATCH, DELETE, body, headers
  let response
  try {
    response = await fetch(path, {
      ...options,
      credentials: 'include',   //from the browser to backend send  A cookies automatically when req send to backedn 
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new Error('Can’t reach the server. Check your connection and try again.')
  }

  const result = await response.json().catch(() => ({}))    //convert json to object 
  if (!response.ok) {
    const error = new Error(result.error || 'Something went wrong. Please try again.')
    error.status = response.status
    throw error
  }
  return result    //if not error then return the response 
}

export function getCurrentUser() {
  return request('/api/auth/me')
}

export function authenticate(mode, credentials) {
  return request(`/api/auth/${mode}`, {     //mode == register or login   based on that backend logic works 
    method: 'POST',
    body: JSON.stringify(credentials),
  })
}

export function signOut() {
  return request('/api/auth/logout', { method: 'POST' })
}

// Lead API methods expose the authenticated user's CRUD operations to React.
export function getLeads(filters = {}) {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.status) params.set('status', filters.status)
  if (filters.city) params.set('city', filters.city)
  if (filters.sort) params.set('sort', filters.sort)
  const query = params.toString()
  return request(query ? `/api/leads?${query}` : '/api/leads')
}

// Fetch only scheduled, active reminders for the currently authenticated user.
export function getFollowUps() {
  return request('/api/leads/follow-ups')
}

export function getLead(id) {
  return request(`/api/leads/${encodeURIComponent(id)}`)
}

export function createLead(lead) {
  return request('/api/leads', {
    method: 'POST',
    body: JSON.stringify(lead),
  })
}

export function updateLead(id, lead) {
  return request(`/api/leads/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(lead),
  })
}

export function deleteLead(id) {
  return request(`/api/leads/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function importLeads(csvText) {
  let response
  try {
    response = await fetch('/api/leads/import', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'text/csv' },
      body: csvText,
    })
  } catch {
    throw new Error('Can’t reach the server. Check your connection and try again.')
  }
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error || 'The CSV could not be imported.')
  return result
}

export async function exportLeads(filters = {}) {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.status) params.set('status', filters.status)
  if (filters.city) params.set('city', filters.city)
  if (filters.sort) params.set('sort', filters.sort)
  const query = params.toString()
  const response = await fetch(`/api/leads/export.csv${query ? `?${query}` : ''}`, {
    credentials: 'include',
  })
  if (!response.ok) {
    throw new Error('The CSV could not be exported.')
  }
  return response.blob()
}

/*
Follow-up API workflow:
1. LeadForm sends nextFollowUpDate through createLead or updateLead; the server stores it.
2. getFollowUps calls the protected endpoint, which returns this user's scheduled leads except Won/Lost.
3. Dashboard classifies each saved date against today's local date without saving a reminder status.
4. Mark Contacted sends a status-only PATCH; Reschedule opens LeadForm to PATCH a new date.

Search and filtering workflow:
1. Dashboard controls update search, status, city, and sort React state.
2. getLeads encodes those values as URL query parameters.
3. The backend runs MongoDB text matching and filtering, then returns the matching lead array.
4. Search text is debounced in Dashboard to reduce repeated API requests.

CSV workflow:
1. The dashboard reads a chosen .csv file and sends its text to POST /api/leads/import.
2. The server validates and inserts each valid row for the signed-in user.
3. Imported and failed counts are shown to the user; lead lists and city options refresh.
4. Export CSV sends the active filters to the server and downloads the returned CSV blob.
*/
