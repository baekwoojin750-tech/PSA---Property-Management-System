import api from './api'

export const loginUser = async (email: string, password: string) => {
  const response = await api.post('/api/auth/login', { email, password })
  return response.data
}

export const registerUser = async (email: string, full_name: string, password: string) => {
  const response = await api.post('/api/auth/register', { email, full_name, password })
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
    { page, remarks: remarks || null }
  )
  return response.data
}

export const getAuthorizationStatus = async (token: string, page: string) => {
  const response = await api.get('/api/auth/authorization-status', {
    params: { page },
  })
  return response.data
}

export const getPendingAuthorizations = async (token: string) => {
  const response = await api.get('/api/auth/pending-authorizations')
  return response.data
}

export const getAllAdmins = async (token: string) => {
  const response = await api.get('/api/auth/all-admins')
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
    { admin_id, days, request_id }
  )
  return response.data
}

export const revokeAuthorization = async (token: string, admin_id: number) => {
  const response = await api.post(
    '/api/auth/revoke-authorization',
    { admin_id }
  )
  return response.data
}

export const rejectAuthorization = async (token: string, request_id: number) => {
  const response = await api.post(
    '/api/auth/reject-authorization',
    { request_id }
  )
  return response.data
}

// ── User Management ──────────────────────────────────────────────────────────

export const getAllUsers = async () => {
  const response = await api.get('/api/auth/all-users')
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

export const createActivityLog = async (logData: any) => {
  const response = await api.post('/api/activity-logs/create', logData)
  return response.data
}

export const getAllActivityLogs = async () => {
  const response = await api.get('/api/activity-logs/all')
  return response.data
}

export const getActivityLogById = async (logId: number) => {
  const response = await api.get(`/api/activity-logs/${logId}`)
  return response.data
}

export const getUserActivityLogs = async (userId: number) => {
  const response = await api.get(`/api/activity-logs/user/${userId}`)
  return response.data
}

// ── Logout with Activity Logging ────────────────────────────────────────────

export const logoutUserWithActivity = async (userId: number, email: string, fullName: string, role: string) => {
  try {
    // Create activity log for the current user
    await createActivityLog({
      user_id: userId,
      user_name: fullName,
      email: email,
      action: 'Logged out',
      target: email,
      log_type: 'login',
    })

    // If user is admin, also create a log for super admin
    if (role === 'admin' || role === 'super admin') {
      // Create activity log for super admin (assuming super admin ID is 1 or we can fetch it)
      // For now, we'll create a system log that super admin will see
      await createActivityLog({
        user_id: 1, // Super admin typically has ID 1
        user_name: 'Super Admin',
        email: 'superadmin@psa.gov.ph',
        action: `User ${fullName} logged out`,
        target: email,
        log_type: 'login',
      })
    }
  } catch (error) {
    console.error('Failed to create logout activity log:', error)
    // Don't throw error - logout should proceed even if logging fails
  }
}