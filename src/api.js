const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || res.statusText)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  getDevices: () => request('/devices'),
  addDevice: (ipAddress) => request('/devices', {
    method: 'POST',
    body: JSON.stringify({ ipAddress })
  }),
  updateDevice: (id, ipAddress) => request(`/devices/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ipAddress })
  }),
  deleteDevice: (id) => request(`/devices/${id}`, { method: 'DELETE' }),

  getLatestMetrics: (deviceId) => request(`/devices/${deviceId}/metrics/latest`),

  getInterfaces: (deviceId) => request(`/devices/${deviceId}/interfaces`),

  syncDevice: (id, ipAddress) => request(`/devices/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ipAddress })
  })
}