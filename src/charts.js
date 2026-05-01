import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

const MAX_POINTS = 30

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  elements: { line: { tension: 0 } },
  plugins: { legend: { display: false } },
  scales: {
    x: { display: false },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(255,255,255,0.05)' },
      ticks: { color: '#4e5a75', font: { size: 10 } }
    }
  }
}

export function createCpuChart(canvasId) {
  const ctx = document.getElementById(canvasId)
  if (!ctx) return null
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        data: [],
        borderColor: '#f5a623',
        backgroundColor: 'rgba(245,166,35,0.1)',
        fill: true,
        pointRadius: 0,
        borderWidth: 1.5
      }]
    },
    options: {
      ...commonOptions,
      scales: {
        x: { display: false },
        y: { ...commonOptions.scales.y, min: 0, max: 100 }
      }
    }
  })
}

export function createNetChart(canvasId) {
  const ctx = document.getElementById(canvasId)
  if (!ctx) return null
  return new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { data: [], borderColor: '#22d3a0', fill: false, pointRadius: 0, borderWidth: 1.5, label: 'In' },
        { data: [], borderColor: '#4d9cff', fill: false, pointRadius: 0, borderWidth: 1.5, borderDash: [3, 3], label: 'Out' }
      ]
    },
    options: {
      ...commonOptions,
      scales: {
        x: { display: false },
        y: { ...commonOptions.scales.y, min: 0, max: 10 }
      }
    }
  })
}

export function pushToChart(chart, label, values) {
  if (!chart) return
  chart.data.labels.push(label)
  chart.data.datasets.forEach((ds, i) => {
    if (values[i] !== undefined) ds.data.push(values[i])
  })
  if (chart.data.labels.length > MAX_POINTS) {
    chart.data.labels.shift()
    chart.data.datasets.forEach(ds => ds.data.shift())
  }

  if (chart.data.datasets.length === 2) {
    const allVals = chart.data.datasets.flatMap(ds => ds.data)
    const maxVal = Math.max(...allVals, 1)
    const yScale = chart.options.scales.y
    yScale.max = Math.ceil(maxVal / 5) * 5 + 5
  }

  chart.update('none')
}

export function destroyChart(chart) {
  if (chart) chart.destroy()
}