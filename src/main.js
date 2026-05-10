import { api } from './api.js'
import {
  createCpuChart, createNetChart,
  pushToChart, destroyChart
} from './charts.js'
import {
  renderStats, renderStorage, renderInterfaces,
  renderDevices, getChartValues, renderSensors,
  showModal, hideModal, setModalError,
  showLoadingOverlay, setError
} from './render.js'

const state = {
  devices: [],
  selectedId: null,
  cpuChart: null,
  netChart: null,
  pollTimer: null,
  sensorTimer: null,
  interfaceMap: new Map()
}

async function init() {
  bindModal()
  await loadDevices()
  await refreshSensors()
  startSensorPolling()
}

async function loadDevices() {
  try {
    state.devices = await api.getDevices()
    refreshDeviceBar()
    if (state.devices.length > 0 && !state.selectedId) {
      await selectDevice(state.devices[0].id)
    }
  } catch (e) {
    setError('Failed to load devices: ' + e.message)
  }
}

function refreshDeviceBar() {
  renderDevices(state.devices, state.selectedId, selectDevice, showModal, confirmDeleteDevice)
}

async function selectDevice(id) {
  state.selectedId = id
  state.interfaceMap = new Map()
  refreshDeviceBar()
  stopPolling()
  destroyCharts()
  initCharts()
  showLoadingOverlay(true)
  await loadInterfaces()
  await refreshData()
  showLoadingOverlay(false)
  startPolling()
}

async function confirmDeleteDevice(id) {
  const dev = state.devices.find(d => d.id === id)
  const label = dev ? (dev.name || dev.ipAddress) : `#${id}`
  if (!confirm(`Remove device "${label}"?`)) return

  try {
    await api.deleteDevice(id)
    state.devices = state.devices.filter(d => d.id !== id)

    if (state.selectedId === id) {
      stopPolling()
      destroyCharts()
      state.selectedId = null
      state.interfaceMap = new Map()

      if (state.devices.length > 0) {
        await selectDevice(state.devices[0].id)
      } else {
        refreshDeviceBar()
        clearDashboard()
      }
    } else {
      refreshDeviceBar()
    }
  } catch (e) {
    setError('Failed to delete device: ' + e.message)
  }
}

function clearDashboard() {
  document.getElementById('stat-uptime').textContent = '—'
  document.getElementById('stat-net-in').textContent = '— Mbps'
  document.getElementById('stat-cpu').textContent = '—%'
  document.getElementById('stat-processes').textContent = '—'
  document.getElementById('storage-list').innerHTML = ''
  document.getElementById('iface-tbody').innerHTML = ''
}

async function loadInterfaces() {
  if (!state.selectedId) return
  try {
    const list = await api.getInterfaces(state.selectedId)
    state.interfaceMap = new Map(list.map(i => [i.name, { type: i.type }]))
  } catch {
    state.interfaceMap = new Map()
  }
}

async function syncInterfaces() {
  if (!state.selectedId) return
  const btn = document.getElementById('btn-iface-refresh')
  if (btn) { btn.disabled = true; btn.classList.add('spinning') }

  try {
    const dev = state.devices.find(d => d.id === state.selectedId)
    if (dev) {
      await api.syncDevice(state.selectedId, dev.ipAddress)
    }
    await loadInterfaces()
    await refreshData()
  } catch (e) {
    setError('Interface sync failed: ' + e.message)
  } finally {
    if (btn) { btn.disabled = false; btn.classList.remove('spinning') }
  }
}

async function refreshData() {
  if (!state.selectedId) return
  try {
    const metrics = await api.getLatestMetrics(state.selectedId)
    setError(null)
    renderStats(metrics)
    renderStorage(metrics.storages)
    renderInterfaces(metrics.network, state.interfaceMap)

    const { label, cpu, netIn, netOut } = getChartValues(metrics)
    pushToChart(state.cpuChart, label, [cpu])
    pushToChart(state.netChart, label, [netIn, netOut])

    const cpuVal = document.getElementById('cpu-current')
    if (cpuVal) cpuVal.textContent = (metrics.cpuLoadAvg ?? 0).toFixed(1) + '%'

    const netVal = document.getElementById('net-current')
    if (netVal) {
      const inMbps = (metrics.network?.reduce((a, c) => a + (c.inSpeedKbps || 0), 0) || 0) / 1024
      netVal.textContent = inMbps.toFixed(2) + ' Mbps'
    }
  } catch (e) {
    setError('Metrics unavailable: ' + e.message)
  }
}

async function refreshSensors() {
  try {
    const sensors = await api.getSensors()
    renderSensors(sensors && sensors.length > 0 ? sensors[0] : null)
  } catch {
    renderSensors(null)
  }
}

function startPolling() {
  state.pollTimer = setInterval(refreshData, 15000)
}

function stopPolling() {
  if (state.pollTimer) {
    clearInterval(state.pollTimer)
    state.pollTimer = null
  }
}

function startSensorPolling() {
  state.sensorTimer = setInterval(refreshSensors, 15000)
}

function stopSensorPolling() {
  if (state.sensorTimer) {
    clearInterval(state.sensorTimer)
    state.sensorTimer = null
  }
}

function initCharts() {
  state.cpuChart = createCpuChart('cpuChart')
  state.netChart = createNetChart('netChart')
}

function destroyCharts() {
  destroyChart(state.cpuChart)
  destroyChart(state.netChart)
  state.cpuChart = null
  state.netChart = null
}

function bindModal() {
  document.getElementById('modal-cancel').addEventListener('click', hideModal)
  document.getElementById('modal-save').addEventListener('click', submitNewDevice)
  document.getElementById('modal-ip').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitNewDevice()
    if (e.key === 'Escape') hideModal()
  })
  document.getElementById('modal').addEventListener('click', e => {
    if (e.target.id === 'modal') hideModal()
  })

  document.getElementById('btn-iface-refresh').addEventListener('click', syncInterfaces)
}

async function submitNewDevice() {
  const ip = document.getElementById('modal-ip').value.trim()
  if (!ip) {
    setModalError('IP address is required')
    return
  }

  const duplicate = state.devices.find(d => d.ipAddress === ip)
  if (duplicate) {
    setModalError(`Device with IP ${ip} already exists`)
    return
  }

  const btn = document.getElementById('modal-save')
  btn.textContent = 'Connecting...'
  btn.disabled = true

  try {
    const newDevice = await api.addDevice(ip)
    state.devices.push(newDevice)
    hideModal()
    await selectDevice(newDevice.id)
  } catch (e) {
    setModalError(e.message || 'Failed to add device')
  } finally {
    btn.textContent = 'Save'
    btn.disabled = false
  }
}

init()