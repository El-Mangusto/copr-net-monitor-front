
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
    const label = disk.type === 'RAM' ? 'Physical Memory' : `Disk ${diskLabel(disk.name)}`
    const free = (disk.totalSizeGb - disk.usedSizeGb).toFixed(1)
    return `
      <div class="storage-item">
        <div class="storage-row">
          <span class="storage-name">${label}</span>
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


export function renderInterfaces(network) {
  const tbody = document.getElementById('iface-tbody')
  if (!tbody) return

  if (!network || network.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-hint">No interface data</td></tr>'
    return
  }

  tbody.innerHTML = network.map(iface => {
    const inMbps = fmt((iface.inSpeedKbps || 0) / 1024)
    const outMbps = fmt((iface.outSpeedKbps || 0) / 1024)
    const isUp = iface.status === 'UP'
    const statusBadge = isUp
      ? '<span class="badge badge-up">Up</span>'
      : '<span class="badge badge-down">Down</span>'
    return `
      <tr>
        <td class="iface-name">${iface.interfaceName ?? '—'}</td>
        <td>${statusBadge}</td>
        <td class="speed-in">${inMbps}</td>
        <td class="speed-out">${outMbps}</td>
      </tr>
    `
  }).join('')
}


export function renderDevices(devices, selectedId, onSelect, onAdd) {
  const bar = document.getElementById('devices-bar')
  if (!bar) return

  const chips = devices.map(dev => {
    const active = dev.id === selectedId
    return `
      <div class="device-chip ${active ? 'active' : ''}" data-id="${dev.id}">
        <span class="chip-dot" style="background:${active ? '#22d3a0' : '#4e5a75'}"></span>
        <div>
          <div class="chip-name">${dev.name || dev.ipAddress}</div>
          <div class="chip-ip">${dev.ipAddress}</div>
        </div>
      </div>
    `
  }).join('')

  bar.innerHTML = chips + `<button id="btn-add-device" class="device-add">+ Add Device</button>`

  bar.querySelectorAll('.device-chip').forEach(el => {
    el.addEventListener('click', () => onSelect(Number(el.dataset.id)))
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