import { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'

function applyChartDefaults() {
  Chart.defaults.font.family = getComputedStyle(document.documentElement)
    .getPropertyValue('--font-primary')
    .trim()
  Chart.defaults.color = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-text-medium')
    .trim()
  Chart.defaults.borderColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-panel-border')
    .trim()
}

export function ClientMoneyChart({ labels, values }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    applyChartDefaults()
    const clientMoneyColors = ['#4fc3f7', '#ff7043', '#66bb6a', '#ffee58', '#ab47bc', '#ef5350', '#26a69a']

    chartRef.current = new Chart(canvasRef.current, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [
          {
            label: 'Client Deposits',
            data: values,
            backgroundColor: clientMoneyColors,
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-panel-bg').trim(),
            borderWidth: 3,
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
      },
    })

    return () => {
      chartRef.current?.destroy()
    }
  }, [])

  useEffect(() => {
    if (!chartRef.current) return
    chartRef.current.data.labels = labels
    chartRef.current.data.datasets[0].data = values
    chartRef.current.update()
  }, [labels, values])

  return <canvas ref={canvasRef} />
}

export function ActivityChart({ labels, deposits, withdrawals }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current) return
    applyChartDefaults()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Deposits',
            data: deposits,
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-accent-green').trim(),
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.2,
            fill: true,
            pointRadius: 2,
          },
          {
            label: 'Withdrawals',
            data: withdrawals,
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--color-accent-red').trim(),
            backgroundColor: 'rgba(244, 67, 54, 0.1)',
            tension: 0.2,
            fill: true,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
          y: { beginAtZero: true, ticks: { maxTicksLimit: 6 } },
          x: {
            display: true,
            ticks: {
              autoSkip: true,
              maxTicksLimit: 10,
              maxRotation: 35,
              minRotation: 0,
            },
          },
        },
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { mode: 'index', intersect: false },
        },
      },
    })

    return () => {
      chartRef.current?.destroy()
    }
  }, [])

  useEffect(() => {
    if (!chartRef.current) return
    chartRef.current.data.labels = labels
    chartRef.current.data.datasets[0].data = deposits
    chartRef.current.data.datasets[1].data = withdrawals
    chartRef.current.update()
  }, [labels, deposits, withdrawals])

  return <canvas ref={canvasRef} />
}
