/* =========================================
   DASHBOARD.JS (Admin Dashboard)
   Executive Cockpit Portal Logic
   ========================================= */

'use strict';

function loadChartJS(callback) {
  if (window.Chart) { callback(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
  s.onload = callback;
  document.head.appendChild(s);
}

let adminAdmissionsChartInstance = null;
let adminStatusChartInstance = null;

function initAdminCharts(callback) {
  loadChartJS(() => {
    const admCtx = document.getElementById('adminAdmissionsChart');
    if (admCtx) {
      adminAdmissionsChartInstance = new Chart(admCtx, {
        type: 'line',
        data: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: 'Admissions',
            data: [0, 0, 0, 0, 0, 0, 0],
            borderColor: '#4338ca',
            backgroundColor: 'rgba(99,102,241,0.08)',
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#4338ca',
            pointRadius: 4,
          }, {
            label: 'Discharges',
            data: [0, 0, 0, 0, 0, 0, 0],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16,185,129,0.05)',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: '#10b981',
            pointRadius: 4,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'top', labels: { font: { family: 'Manrope', size: 11 }, usePointStyle: true } } },
          scales: {
            x: { grid: { color: 'rgba(100,116,139,0.08)' }, ticks: { font: { family: 'Manrope', size: 11 } } },
            y: { grid: { color: 'rgba(100,116,139,0.08)' }, ticks: { font: { family: 'Manrope', size: 11 } } }
          }
        }
      });
    }

    const donutCtx = document.getElementById('adminStatusChart');
    if (donutCtx) {
      adminStatusChartInstance = new Chart(donutCtx, {
        type: 'doughnut',
        data: {
          labels: ['In-Patient', 'Out-Patient', 'Discharged', 'Critical'],
          datasets: [{
            data: [0, 0, 0, 0],
            backgroundColor: ['#4338ca', '#10b981', '#64748b', '#ef4444'],
            borderWidth: 0,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          cutout: '72%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { font: { family: 'Manrope', size: 10 }, usePointStyle: true, padding: 12 }
            }
          }
        }
      });
    }
    if (typeof callback === 'function') callback();
  });
}

function applyAdminFilter() {
  const startDate = document.getElementById('adminStartDate')?.value;
  const endDate = document.getElementById('adminEndDate')?.value;
  if (!startDate) {
    toast('Please select a start date to filter operations.', 'warning');
    return;
  }
  loadAdminStats(startDate, endDate);
}

function clearAdminFilter() {
  const startD = document.getElementById('adminStartDate');
  const startT = document.getElementById('adminStartTime');
  const endD = document.getElementById('adminEndDate');
  const endT = document.getElementById('adminEndTime');
  if (startD) startD.value = '';
  if (startT) startT.value = '';
  if (endD) endD.value = '';
  if (endT) endT.value = '';
  if (adminAdmissionsChartInstance) {
    adminAdmissionsChartInstance.data.datasets[0].data = [0, 0, 0, 0, 0, 0, 0];
    adminAdmissionsChartInstance.data.datasets[1].data = [0, 0, 0, 0, 0, 0, 0];
    adminAdmissionsChartInstance.update();
  }
  if (adminStatusChartInstance) {
    adminStatusChartInstance.data.datasets[0].data = [0, 0, 0, 0];
    adminStatusChartInstance.update();
  }
  document.querySelectorAll('.stat-value').forEach(el => {
    const target = parseInt(el.getAttribute('data-target') || '0', 10);
    if (el.textContent.includes('₹')) {
      el.textContent = '₹' + target.toLocaleString('en-IN');
    } else {
      el.textContent = target;
    }
  });
  const badge = document.getElementById('adminResultBadge');
  if (badge) badge.classList.remove('visible');
  toast('Global filter cleared. Showing all-time metrics.', 'info');
}

async function loadAdminStats(dateFrom, dateTo) {
  try {
    const params = {};
    if (dateFrom && dateTo) { params.date_from = dateFrom; params.date_to = dateTo; }
    const result = await window.API.getDashboardStats(params);
    const stats = result.data;

    const cardMap = {
      'Total Patients': stats.totalPatients,
      'Total Appointments': stats.totalAppointments,
      'Today Appointments': stats.todayAppointments,
      'Total Staff': stats.totalStaff,
      'Low Stock Items': stats.lowStockItems,
      'Pending Lab Orders': stats.pendingLabOrders,
      'Revenue': stats.totalRevenue,
      'Pending Bills': stats.pendingBills
    };

    document.querySelectorAll('.stat-card .stat-value').forEach(el => {
      const card = el.closest('.stat-card');
      if (!card) return;
      const label = card.querySelector('.stat-label')?.textContent?.trim();
      if (label && cardMap[label] !== undefined) {
        if (label === 'Revenue' || label.includes('₹')) {
          el.textContent = '₹' + Number(cardMap[label]).toLocaleString('en-IN');
        } else {
          el.textContent = cardMap[label];
        }
      }
    });

    if (adminAdmissionsChartInstance && stats.revenueTrend && stats.revenueTrend.length) {
      const days = stats.revenueTrend.map(r => {
        const d = new Date(r.date);
        return d.toLocaleDateString('en', { weekday: 'short' });
      });
      const values = stats.revenueTrend.map(r => r.total);
      adminAdmissionsChartInstance.data.labels = days;
      adminAdmissionsChartInstance.data.datasets[0].data = values;
      adminAdmissionsChartInstance.update();
    }

    if (adminStatusChartInstance && stats.appointmentsByStatus) {
      const statusCounts = { 'in-progress': 0, completed: 0, cancelled: 0, scheduled: 0 };
      stats.appointmentsByStatus.forEach(s => {
        if (statusCounts[s.status] !== undefined) statusCounts[s.status] = s.count;
      });
      adminStatusChartInstance.data.datasets[0].data = [
        statusCounts['in-progress'] || 0,
        statusCounts.completed || 0,
        statusCounts.cancelled || 0,
        statusCounts.scheduled || 0
      ];
      adminStatusChartInstance.update();
    }
  } catch (e) {
    console.warn('Could not load admin stats:', e.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initAdminCharts(() => {
    const todayChip = document.querySelector(`#adminSmartFilter .sf-chip[onclick*="'today'"]`);
    if (todayChip) sfChipSelect(todayChip, 'admin', 'today');
  });
  setTimeout(loadAdminStats, 500);
});
