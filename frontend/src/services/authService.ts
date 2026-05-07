import api from './api'

export const loginUser = async (email: string, password: string) => {
  const response = await api.post('/api/auth/login', { email, password })
  return response.data
}

export const registerUser = async (email: string, full_name: string, password: string) => {
  const response = await api.post('/api/auth/register', { email, full_name, password })
  return response.data
}

export const createAdminAccount = async (email: string, full_name: string, password: string) => {
  const response = await api.post('/api/auth/create-admin', { email, full_name, password })
  return response.data
}

export const forgotPassword = async (email: string) => {
  const response = await api.post('/api/auth/forgot-password', { email })
  return response.data
}

export const resetPassword = async (token: string, new_password: string) => {
  const response = await api.post('/api/auth/reset-password', { token, new_password })
  return response.data
}

// ── Authorization ──────────────────────────────────────────────────────────

export const requestAuthorization = async (
  token: string,
  page: string,
  remarks?: string
) => {
  const response = await api.post(
    '/api/auth/request-authorization',
    { page, remarks: remarks || null },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return response.data
}

export const getAuthorizationStatus = async (token: string, page: string) => {
  const response = await api.get('/api/auth/authorization-status', {
    params: { page },
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.data
}

export const getPendingAuthorizations = async (token: string) => {
  const response = await api.get('/api/auth/pending-authorizations', {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.data
}

export const getAllAdmins = async (token: string) => {
  const response = await api.get('/api/auth/all-admins', {
    headers: { Authorization: `Bearer ${token}` }
  })
  return response.data
}

export const grantAuthorization = async (
  token: string,
  admin_id: number,
  days: number,
  request_id: number
) => {
  const response = await api.post(
    '/api/auth/grant-authorization',
    { admin_id, days, request_id },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return response.data
}

export const revokeAuthorization = async (token: string, admin_id: number) => {
  const response = await api.post(
    '/api/auth/revoke-authorization',
    { admin_id },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return response.data
}

export const rejectAuthorization = async (token: string, request_id: number) => {
  const response = await api.post(
    '/api/auth/reject-authorization',
    { request_id },
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return response.data
}

// ── User Management ──────────────────────────────────────────────────────────

export const getAllUsers = async () => {
  const response = await api.get('/api/auth/all-users')
  return response.data
}

export const toggleUserStatus = async (user_id: number, is_active: boolean) => {
  const response = await api.post('/api/auth/toggle-user-status', { user_id, is_active })
  return response.data
}

export const requestReactivation = async (email: string) => {
  const response = await api.post('/api/auth/request-reactivation', { email })
  return response.data
}

// ── Assets ────────────────────────────────────────────────────────────────

export const createAsset = async (assetData: any) => {
  const response = await api.post('/api/assets/create', assetData)
  return response.data
}

export const getAllAssets = async () => {
  const response = await api.get('/api/assets/all')
  return response.data
}

export const getAssetById = async (assetId: number) => {
  const response = await api.get(`/api/assets/${assetId}`)
  return response.data
}

export const getAssetByPropertyNumber = async (propertyNumber: string) => {
  const response = await api.get(`/api/assets/by-property/${propertyNumber}`)
  return response.data
}

export const updateAsset = async (assetSerialCode: string, assetData: any) => {
  const response = await api.put(`/api/assets/${assetSerialCode}`, assetData)
  return response.data
}

export const updateAssetByPropertyNumber = async (propertyNumber: string, assetData: any) => {
  const response = await api.put(`/api/assets/by-property/${propertyNumber}`, assetData)
  return response.data
}

export const deleteAsset = async (assetSerialCode: string) => {
  const response = await api.delete(`/api/assets/${assetSerialCode}`)
  return response.data
}

// ── Borrow Requests ───────────────────────────────────────────────────────

export const createBorrowRequest = async (borrowData: any) => {
  const response = await api.post('/api/borrows/create', borrowData)
  return response.data
}

export const getAllBorrowRequests = async () => {
  const response = await api.get('/api/borrows/all')
  return response.data
}

export const getBorrowRequestById = async (borrowId: number) => {
  const response = await api.get(`/api/borrows/${borrowId}`)
  return response.data
}

export const getActiveBorrowByProperty = async (propertyNumber: string) => {
  const response = await api.get(`/api/borrows/property/${propertyNumber}`)
  return response.data
}

export const updateBorrowRequest = async (borrowId: number, borrowData: any) => {
  const response = await api.put(`/api/borrows/${borrowId}`, borrowData)
  return response.data
}

export const deleteBorrowRequest = async (borrowId: number) => {
  const response = await api.delete(`/api/borrows/${borrowId}`)
  return response.data
}

// ── Activity Logs ─────────────────────────────────────────────────────────

export const createActivityLog = async (logData: {
  user_id?: number
  user_name?: string
  email?: string
  action: string
  target: string
  log_type: 'login' | 'asset' | 'request' | 'user' | 'system'
}) => {
  const response = await api.post('/api/activity-logs/create', logData)
  return response.data
}

/**
 * Super admin only — returns ALL logs in the system.
 * Backend route: GET /api/activity-logs/all
 * Token is attached automatically via the api interceptor.
 */
export const getAllActivityLogs = async () => {
  const response = await api.get('/api/activity-logs/all')
  return response.data
}

/**
 * Admin & User — returns only the caller's own logs.
 * Backend reads user ID from the JWT — no ID in the URL.
 * Backend route: GET /api/activity-logs/mine
 * Token is attached automatically via the api interceptor.
 */
export const getMyActivityLogs = async () => {
  const response = await api.get('/api/activity-logs/mine')
  return response.data
}

export const getActivityLogById = async (logId: number) => {
  const response = await api.get(`/api/activity-logs/${logId}`)
  return response.data
}

// ── Logout with Activity Logging ────────────────────────────────────────────

export const logoutUserWithActivity = async (
  userId: number,
  email: string,
  fullName: string,
) => {
  try {
    // Log the logout action for the user themselves — that's all we need.
    // The super admin's /all route will already show this log since it fetches
    // every user's logs. No need to duplicate it under a hardcoded super admin ID.
    await createActivityLog({
      user_id: userId,
      user_name: fullName,
      email,
      action: 'Logged out',
      target: email,
      log_type: 'login',
    })
  } catch (error) {
    console.error('Failed to create logout activity log:', error)
    // Don't throw — logout should proceed even if logging fails
  }
}
