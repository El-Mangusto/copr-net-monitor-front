export function formatUptime(seconds) {
  if (!seconds || seconds < 0) return '—'
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  let r = ''
  if (d > 0) r += `${d}d `
  if (h > 0 || d > 0) r += `${h}h `
  r += `${m}m`
  return r.trim()
}

export function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function fmt(n, dec = 2) {
  return (n ?? 0).toFixed(dec)
}

function diskLabel(name) {
  if (!name) return ''
  const m = name.match(/[A-Z]:/i)
  return m ? m[0].toUpperCase() : name
}

export function renderStats(metrics) {
  const totalInMbps = (metrics.network?.reduce((a, c) => a + (c.inSpeedKbps || 0), 0) || 0) / 1024

  setText('stat-uptime', formatUptime(metrics.uptime))
  setText('stat-net-in', `${fmt(totalInMbps)} Mbps`)
  setText('stat-cpu', `${fmt(metrics.cpuLoadAvg || 0, 1)}%`)
  setText('stat-processes', metrics.processes ?? 0)
  setText('last-update', formatTime(new Date()))
}

export function renderStorage(storages) {
  const container = document.getElementById('storage-list')
  if (!container) return

  if (!storages || storages.length === 0) {
    container.innerHTML = '<div class="empty-hint">No storage data</div>'
    return
  }

  container.innerHTML = storages.map(disk => {
    const pct = disk.usedPercent ?? 0
    const barColor = pct > 85 ? '#f85149' : '#22d3a0'
    const free = (disk.totalSizeGb - disk.usedSizeGb).toFixed(1)

    let typeLabel, nameLabel
    if (disk.type === 'RAM') {
      typeLabel = 'RAM'
      nameLabel = null
    } else {
      typeLabel = 'Disk'
      nameLabel = diskLabel(disk.name)
    }

    return `
      <div class="storage-item">
        <div class="storage-row">
          <span class="storage-name">
            <span class="storage-type-badge">${typeLabel}</span>
            ${nameLabel ? `<span class="storage-disk-name">${nameLabel}</span>` : ''}
          </span>
          <span class="storage-size">${fmt(disk.usedSizeGb, 1)} / ${fmt(disk.totalSizeGb, 1)} GB</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct}%;background:${barColor}"></div>
        </div>
        <div class="storage-free">${free} GB free (${fmt(pct, 1)}%)</div>
      </div>
    `
  }).join('')
}

const IFACE_TYPE_LABEL = {
  ETHERNET: { label: 'Ethernet', css: 'type-eth' },
  WIFI:     { label: 'Wi-Fi',    css: 'type-wifi' },
  TUNNEL:   { label: 'VPN',      css: 'type-vpn' },
  UNKNOWN:  { label: '—',        css: 'type-unknown' }
}

export function renderInterfaces(network, interfaceMap = new Map()) {
  const tbody = document.getElementById('iface-tbody')
  if (!tbody) return

  if (!network || network.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-hint">No interface data</td></tr>'
    return
  }

  tbody.innerHTML = network.map(iface => {
    const inMbps = fmt((iface.inSpeedKbps || 0) / 1024)
    const outMbps = fmt((iface.outSpeedKbps || 0) / 1024)
    const isUp = iface.status === 'UP'
    const statusBadge = isUp
      ? '<span class="badge badge-up">Up</span>'
      : '<span class="badge badge-down">Down</span>'

    const ifaceInfo = interfaceMap.get(iface.interfaceName)
    const typeKey = ifaceInfo?.type ?? 'UNKNOWN'
    const { label: typeLabel, css: typeCss } = IFACE_TYPE_LABEL[typeKey] ?? IFACE_TYPE_LABEL.UNKNOWN

    return `
      <tr>
        <td class="iface-name">${iface.interfaceName ?? '—'}</td>
        <td><span class="iface-type ${typeCss}">${typeLabel}</span></td>
        <td>${statusBadge}</td>
        <td class="speed-in">${inMbps}</td>
        <td class="speed-out">${outMbps}</td>
      </tr>
    `
  }).join('')
}

export function renderDevices(devices, selectedId, onSelect, onAdd, onDelete) {
  const bar = document.getElementById('devices-bar')
  if (!bar) return

  const chips = devices.map(dev => {
    const active = dev.id === selectedId
    return `
      <div class="device-chip ${active ? 'active' : ''}" data-id="${dev.id}">
        <span class="chip-dot" style="background:${active ? '#22d3a0' : '#4e5a75'}"></span>
        <div class="chip-info">
          <div class="chip-name">${dev.name || dev.ipAddress}</div>
          <div class="chip-ip">${dev.ipAddress}</div>
        </div>
        <button class="chip-delete" data-id="${dev.id}" title="Remove device">×</button>
      </div>
    `
  }).join('')

  bar.innerHTML = chips + `<button id="btn-add-device" class="device-add">+ Add Device</button>`

  bar.querySelectorAll('.device-chip').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('.chip-delete')) return
      onSelect(Number(el.dataset.id))
    })
  })

  bar.querySelectorAll('.chip-delete').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation()
      onDelete(Number(btn.dataset.id))
    })
  })

  document.getElementById('btn-add-device').addEventListener('click', onAdd)
}

export function getChartValues(metrics) {
  const totalInMbps = (metrics.network?.reduce((a, c) => a + (c.inSpeedKbps || 0), 0) || 0) / 1024
  const totalOutMbps = (metrics.network?.reduce((a, c) => a + (c.outSpeedKbps || 0), 0) || 0) / 1024
  return {
    label: formatTime(new Date()),
    cpu: metrics.cpuLoadAvg ?? 0,
    netIn: totalInMbps,
    netOut: totalOutMbps
  }
}

// ── Sensor rendering ────────────────────────────────────────────────────────

const SENSOR_THRESHOLDS = {
  temp:     { warn: 28, crit: 35 },
  humidity: { warnLow: 30, okLow: 40, okHigh: 65, warnHigh: 80 },
  smoke:    { warn: 30, crit: 60 }
}

function sensorClass(value, type) {
  const t = SENSOR_THRESHOLDS
  if (type === 'temp') {
    if (value > t.temp.crit) return 'chip-crit'
    if (value > t.temp.warn) return 'chip-warn'
    return 'chip-ok'
  }
  if (type === 'humidity') {
    if (value > t.humidity.warnHigh || value < t.humidity.warnLow) return 'chip-crit'
    if (value > t.humidity.okHigh   || value < t.humidity.okLow)   return 'chip-warn'
    return 'chip-ok'
  }
  if (type === 'smoke') {
    if (value > t.smoke.crit) return 'chip-crit'
    if (value > t.smoke.warn) return 'chip-warn'
    return 'chip-ok'
  }
  return 'chip-ok'
}

export function renderSensors(sensor) {
  const bar = document.getElementById('sensor-bar')
  if (!bar) return

  if (!sensor) {
    bar.innerHTML = `
      <div class="sensor-chip chip-offline">
        <span class="s-icon">○</span>
        <span class="s-label">Environmental sensor</span>
        <span class="s-val">Offline</span>
        <span class="s-dot"></span>
      </div>`
    return
  }

  const tempClass  = sensorClass(sensor.temperatureC,    'temp')
  const humClass   = sensorClass(sensor.humidityPercent, 'humidity')
  const smokeClass = sensor.smokeDetected
    ? 'chip-crit'
    : sensorClass(sensor.smokePercent, 'smoke')

  bar.innerHTML = `
    <div class="sensor-chip ${tempClass}">
      <span class="s-label">Temp</span>
      <span class="s-val">${sensor.temperatureC.toFixed(1)}°C</span>
      <span class="s-dot"></span>
    </div>

    <div class="sensor-sep"></div>

    <div class="sensor-chip ${humClass}">
      <span class="s-label">Humidity</span>
      <span class="s-val">${sensor.humidityPercent.toFixed(0)}%</span>
      <span class="s-dot"></span>
    </div>

    <div class="sensor-sep"></div>

    <div class="sensor-chip ${smokeClass}">
      <span class="s-label">Smoke</span>
      <span class="s-val ${sensor.smokeDetected ? 'smoke-label-detected' : 'smoke-label-ok'}">
        ${sensor.smokeDetected ? '⚠ DETECTED' : sensor.smokePercent.toFixed(1) + '%'}
      </span>
      <span class="s-dot"></span>
    </div>
  `
}

// ── Modal ────────────────────────────────────────────────────────────────────

export function showModal() {
  document.getElementById('modal').classList.remove('hidden')
  document.getElementById('modal-ip').value = ''
  document.getElementById('modal-ip').focus()
  document.getElementById('modal-error').textContent = ''
}

export function hideModal() {
  document.getElementById('modal').classList.add('hidden')
}

export function setModalError(msg) {
  document.getElementById('modal-error').textContent = msg
}

export function showLoadingOverlay(show) {
  const el = document.getElementById('loading-overlay')
  if (el) el.classList.toggle('hidden', !show)
}

export function setError(msg) {
  const el = document.getElementById('error-banner')
  if (!el) return
  if (msg) {
    el.textContent = msg
    el.classList.remove('hidden')
  } else {
    el.classList.add('hidden')
  }
}

function setText(id, val) {
  const el = document.getElementById(id)
  if (el) el.textContent = val
}