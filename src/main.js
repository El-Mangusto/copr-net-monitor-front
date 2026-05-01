import { api } from './api.js'
import {
  createCpuChart, createNetChart,
  pushToChart, destroyChart
} from './charts.js'
import {
  renderStats, renderStorage, renderInterfaces,
  renderDevices, getChartValues,
  showModal, hideModal, setModalError,
  showLoadingOverlay, setError
} from './render.js'

const state = {
  devices: [],
  selectedId: null,
  cpuChart: null,
  netChart: null,
  pollTimer: null
}

async function init() {
  bindModal()
  await loadDevices()
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
  renderDevices(state.devices, state.selectedId, selectDevice, showModal)
}

async function selectDevice(id) {
  state.selectedId = id
  refreshDeviceBar()
  stopPolling()
  destroyCharts()
  initCharts()
  showLoadingOverlay(true)
  await refreshData()
  showLoadingOverlay(false)
  startPolling()
}

async function refreshData() {
  if (!state.selectedId) return
  try {
    const metrics = await api.getLatestMetrics(state.selectedId)
    setError(null)
    renderStats(metrics)
    renderStorage(metrics.storages)
    renderInterfaces(metrics.network)

    const { label, cpu, netIn, netOut } = getChartValues(metrics)
    pushToChart(state.cpuChart, label, [cpu])
    pushToChart(state.netChart, label, [netIn, netOut])

    // sync cpu chart header value
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

function startPolling() {
  state.pollTimer = setInterval(refreshData, 5000)
}

function stopPolling() {
  if (state.pollTimer) {
    clearInterval(state.pollTimer)
    state.pollTimer = null
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
  // close on backdrop click
  document.getElementById('modal').addEventListener('click', e => {
    if (e.target.id === 'modal') hideModal()
  })
}

async function submitNewDevice() {
  const ip = document.getElementById('modal-ip').value.trim()
  if (!ip) {
    setModalError('IP address is required')
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