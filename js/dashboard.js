/* =========================================
   DASHBOARD.JS – Charts & interactivity
   ========================================= */

'use strict';

// Auth guard
HMS.requireAuth();
const user = HMS.getUser();

/* --- Role Logic --- */
function initRoleDashboard() {
  const role = user.role; // 'Admin', 'Doctor', or 'Staff'
  
  // Update Header
  const titleEl = document.getElementById('dashboardTitle');
  const greetingEl = document.getElementById('dashboardGreeting');
  const actionBtn = document.getElementById('headerActionBtn');

  if (titleEl) titleEl.textContent = role === 'Doctor' ? "Doctor's Workspace" : role === 'Admin' ? "Hospital Overview" : "Staff Portal";
  if (greetingEl) greetingEl.textContent = `Welcome back, ${user.name.split(' ')[0]}! Here's your ${role.toLowerCase()} overview.`;
  
  if (actionBtn && role === 'Staff') {
    actionBtn.innerHTML = '<span class="material-icons-round">person_add</span> New Registration';
    actionBtn.onclick = () => location.href = 'patients.html';
  }

  // Show correct view
  document.querySelectorAll('.role-view').forEach(v => v.hidden = true);
  const activeView = document.getElementById(`view-${role}`);
  if (activeView) activeView.hidden = false;

  // Initialize Charts based on role
  if (role === 'Admin') initAdminCharts();
  else if (role === 'Doctor') initDoctorCharts();
  else if (role === 'Staff') initStaffCharts();
  
  // Re-run counter animation for the newly visible view
  if (window.animateCounters) window.animateCounters();
}

/* --- Admin Charts --- */
function initAdminCharts() {
  const ctx = document.getElementById('adminAdmissionsChart')?.getContext('2d');
  if (ctx) {
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
        datasets: [{
          label: 'Admissions',
          data: [12, 19, 8, 22, 15, 7, 14],
          borderColor: '#0D9488',
          backgroundColor: 'rgba(13,148,136,0.1)',
          fill: true, tension: 0.4
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
  
  const statusCtx = document.getElementById('adminStatusChart')?.getContext('2d');
  if (statusCtx) {
    new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: ['Stable','Recovering','Critical'],
        datasets: [{ data: [68, 21, 11], backgroundColor: ['#0D9488','#F59E0B','#EF4444'] }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
    });
  }
}

/* --- Doctor Charts --- */
function initDoctorCharts() {
  const trendCtx = document.getElementById('doctorTrendChart')?.getContext('2d');
  if (trendCtx) {
    new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
        datasets: [{
          label: 'My Consultations',
          data: [8, 12, 7, 15, 10, 5, 9],
          borderColor: '#0D9488',
          backgroundColor: 'rgba(13,148,136,0.1)',
          fill: true, tension: 0.4
        }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }

  const typeCtx = document.getElementById('consultationTypeChart')?.getContext('2d');
  if (typeCtx) {
    new Chart(typeCtx, {
      type: 'doughnut',
      data: {
        labels: ['Follow-up','New Patient','Emergency'],
        datasets: [{ data: [45, 30, 25], backgroundColor: ['#0D9488','#3B82F6','#F59E0B'] }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
    });
  }

  const statusCtx = document.getElementById('patientStatusChartDoctor')?.getContext('2d');
  if (statusCtx) {
    new Chart(statusCtx, {
      type: 'doughnut',
      data: {
        labels: ['Stable','Recovering','Critical'],
        datasets: [{ data: [68, 21, 11], backgroundColor: ['#0D9488','#F59E0B','#EF4444'] }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
    });
  }

  // Notes logic
  const notesArea = document.getElementById('doctorNotes');
  if (notesArea) {
    notesArea.value = localStorage.getItem('hms_doctor_notes') || '';
    notesArea.addEventListener('input', () => localStorage.setItem('hms_doctor_notes', notesArea.value));
  }
}

/* --- Staff Charts (Placeholder or simple stats) --- */
function initStaffCharts() {
  // Staff view mostly uses tables and counters
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initRoleDashboard);
