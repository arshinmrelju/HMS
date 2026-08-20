/**
 * Wellness Medicals — Owner Executive Mobile App Controller
 * 100% Real Live Data from Google Sheets & Firestore Database
 */

(function () {
  'use strict';

  var _data = {
    patients: [],
    appointments: [],
    doctors: [],
    departments: [],
    skinPatients: [],
    orthoPatients: [],
    messages: [],
    loginSessions: [],
    checkins: []
  };

  var _pinBuffer = '';
  var _currentTab = 'tab-overview';
  var _isRefreshing = false;

  // ──────────────────────────────────────────────
  // HELPER FUNCTIONS & ROBUST DATE PARSER
  // ──────────────────────────────────────────────
  function esc(str) {
    if (typeof str !== 'string') return str || '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showToast(msg, icon) {
    var toast = document.getElementById('ownerToast');
    if (!toast) return;
    toast.innerHTML = '<span class="material-icons-round" style="font-size:18px">' + (icon || 'info') + '</span><span>' + esc(msg) + '</span>';
    toast.classList.add('show');
    setTimeout(function () {
      toast.classList.remove('show');
    }, 2800);
  }

  function isToday(dateVal) {
    if (!dateVal) return false;
    var now = new Date();
    var todayIso = now.toISOString().slice(0, 10);

    if (dateVal instanceof Date) {
      return dateVal.toISOString().slice(0, 10) === todayIso;
    }
    var s = String(dateVal).trim();
    if (!s) return false;

    // ISO YYYY-MM-DD
    if (s.slice(0, 10) === todayIso) return true;

    // DD/MM/YYYY or DD-MM-YYYY
    var matchDmy = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
    if (matchDmy) {
      var d = parseInt(matchDmy[1], 10);
      var m = parseInt(matchDmy[2], 10) - 1;
      var y = parseInt(matchDmy[3], 10);
      if (d === now.getDate() && m === now.getMonth() && y === now.getFullYear()) {
        return true;
      }
    }

    // YYYY/MM/DD
    var matchYmd = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
    if (matchYmd) {
      var y = parseInt(matchYmd[1], 10);
      var m = parseInt(matchYmd[2], 10) - 1;
      var d = parseInt(matchYmd[3], 10);
      if (d === now.getDate() && m === now.getMonth() && y === now.getFullYear()) {
        return true;
      }
    }

    var parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      return parsed.getFullYear() === now.getFullYear() &&
             parsed.getMonth() === now.getMonth() &&
             parsed.getDate() === now.getDate();
    }
    return false;
  }

  function timeAgo(dateString) {
    if (!dateString) return 'Recent';
    var d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString).slice(0, 10);
    var diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 0) return 'Today';
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return Math.floor(diffSec / 60) + 'm ago';
    if (diffSec < 86400) return Math.floor(diffSec / 3600) + 'h ago';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  // ──────────────────────────────────────────────
  // PIN KEYPAD AUTH
  // ──────────────────────────────────────────────
  function initPinAuth() {
    var pinModal = document.getElementById('ownerPinModal');
    var isAuth = false;
    try {
      var auth = JSON.parse(localStorage.getItem('hms_auth') || '{}');
      if (auth && (auth.code === 'WMPR001' || auth.role === 'Report' || auth.role === 'Admin' || auth.role === 'Developer')) {
        isAuth = true;
      }
    } catch (e) {}

    if (isAuth) {
      if (pinModal) pinModal.classList.remove('active');
      initApp();
    } else {
      if (pinModal) pinModal.classList.add('active');
    }
  }

  window.handleKeyInput = function (key) {
    var dots = document.querySelectorAll('.owner-pin-dot');
    var errorEl = document.getElementById('ownerPinError');
    if (errorEl) errorEl.textContent = '';

    if (key === 'backspace') {
      _pinBuffer = _pinBuffer.slice(0, -1);
    } else if (key === 'clear') {
      _pinBuffer = '';
    } else if (_pinBuffer.length < 6) {
      _pinBuffer += key;
    }

    dots.forEach(function (dot, idx) {
      if (idx < _pinBuffer.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });

    var validPins = ['1234', '0000', '9999', '1111', '8888', 'WMPR001'];
    if (validPins.indexOf(_pinBuffer) !== -1 || (_pinBuffer.length === 4 && (_pinBuffer === '1234' || _pinBuffer === '0000' || _pinBuffer === '9999' || _pinBuffer === '1111'))) {
      localStorage.setItem('hms_auth', JSON.stringify({
        code: 'WMPR001',
        name: 'Owner',
        role: 'Report',
        timestamp: Date.now()
      }));
      showToast('Welcome, Executive Access Granted', 'verified_user');
      setTimeout(function () {
        var pinModal = document.getElementById('ownerPinModal');
        if (pinModal) pinModal.classList.remove('active');
        _pinBuffer = '';
        initApp();
      }, 400);
    } else if (_pinBuffer.length >= 4 && validPins.indexOf(_pinBuffer) === -1 && _pinBuffer.length >= 6) {
      if (errorEl) errorEl.textContent = 'Incorrect PIN. Please try again.';
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      setTimeout(function () {
        _pinBuffer = '';
        dots.forEach(function (d) { d.classList.remove('filled'); });
      }, 500);
    }
  };

  // ──────────────────────────────────────────────
  // TAB NAVIGATION
  // ──────────────────────────────────────────────
  window.switchOwnerTab = function (tabId, btn) {
    _currentTab = tabId;
    document.querySelectorAll('.owner-tab-view').forEach(function (t) {
      t.style.display = 'none';
      t.classList.remove('active');
    });

    var targetTab = document.getElementById(tabId);
    if (targetTab) {
      targetTab.style.display = 'block';
      targetTab.classList.add('active');
    }

    document.querySelectorAll('.owner-nav-btn').forEach(function (b) {
      b.classList.remove('active');
    });

    if (btn) {
      btn.classList.add('active');
    } else {
      var navBtn = document.querySelector('.owner-nav-btn[data-tab="' + tabId + '"]');
      if (navBtn) navBtn.classList.add('active');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ──────────────────────────────────────────────
  // PULL TO REFRESH
  // ──────────────────────────────────────────────
  function initPullToRefresh() {
    var ptr = document.getElementById('ptrContainer');
    if (!ptr) return;

    var startY = 0;
    var currentY = 0;
    var isPulling = false;

    window.addEventListener('touchstart', function (e) {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    }, { passive: true });

    window.addEventListener('touchmove', function (e) {
      if (!isPulling || window.scrollY > 0) return;
      currentY = e.touches[0].clientY;
      var diff = currentY - startY;
      if (diff > 40 && !_isRefreshing) {
        ptr.classList.add('ptr-active');
      }
    }, { passive: true });

    window.addEventListener('touchend', function () {
      if (!isPulling) return;
      isPulling = false;
      var diff = currentY - startY;
      if (diff > 60 && !_isRefreshing) {
        _isRefreshing = true;
        refreshAppData().finally(function () {
          setTimeout(function () {
            ptr.classList.remove('ptr-active');
            _isRefreshing = false;
          }, 400);
        });
      } else {
        ptr.classList.remove('ptr-active');
      }
    }, { passive: true });
  }

  // ──────────────────────────────────────────────
  // EXACT DATA LOADING FROM APIS
  // ──────────────────────────────────────────────
  function refreshAppData() {
    showToast('Syncing live clinic data...', 'sync');
    var api = window.API || {};

    var pPatients = api.getPatients ? api.getPatients().then(function (r) { _data.patients = (r && r.data) || []; }).catch(function () { _data.patients = []; }) : Promise.resolve();
    var pAppts = api.getAppointments ? api.getAppointments().then(function (r) { _data.appointments = (r && r.data) || []; }).catch(function () { _data.appointments = []; }) : Promise.resolve();
    var pDoctors = api.getDoctors ? api.getDoctors().then(function (r) { _data.doctors = (r && r.data) || []; }).catch(function () { _data.doctors = []; }) : Promise.resolve();
    var pDepts = api.getDepartments ? api.getDepartments().then(function (r) { _data.departments = (r && r.data) || []; }).catch(function () { _data.departments = []; }) : Promise.resolve();
    var pSkin = api.getSkinPatients ? api.getSkinPatients().then(function (r) { _data.skinPatients = (r && r.data) || []; }).catch(function () { _data.skinPatients = []; }) : Promise.resolve();
    var pOrtho = api.getOrthopedicPatients ? api.getOrthopedicPatients().then(function (r) { _data.orthoPatients = (r && r.data) || []; }).catch(function () { _data.orthoPatients = []; }) : Promise.resolve();
    var pMsgs = api.getMessages ? api.getMessages().then(function (r) { _data.messages = (r && r.data) || []; }).catch(function () { _data.messages = []; }) : Promise.resolve();

    return Promise.all([pPatients, pAppts, pDoctors, pDepts, pSkin, pOrtho, pMsgs]).then(function () {
      renderAllViews();
      showToast('Live clinic pulse updated', 'check_circle');
    });
  }

  // ──────────────────────────────────────────────
  // EXACT LIVE RENDER FUNCTIONS
  // ──────────────────────────────────────────────
  function renderAllViews() {
    var allPatients = _data.patients;
    var appointments = _data.appointments;
    var skin = _data.skinPatients;
    var ortho = _data.orthoPatients;
    var doctors = _data.doctors;
    var depts = _data.departments;

    // Filter EXACT registrations today
    var todayPatients = allPatients.filter(function (pt) {
      return isToday(pt.created_on || pt['Created On'] || pt.createdAt || pt.date);
    });
    var todaySkin = skin.filter(function (s) {
      return isToday(s.created_on || s['Created On'] || s.createdAt || s.date);
    });
    var todayOrtho = ortho.filter(function (o) {
      return isToday(o.created_on || o['Created On'] || o.createdAt || o.date);
    });

    var todayRegCount = todayPatients.length + todaySkin.length + todayOrtho.length;
    var totalPatientsCount = allPatients.length + skin.length + ortho.length;

    // Filter EXACT Today's OPD Appointments & Waiting in Queue
    var todayOPD = appointments.filter(function (a) {
      var d = a.appointment_date || a['Appointment Date'] || a.createdAt || a['Created At'] || a.date || '';
      return isToday(d);
    });

    // In-Queue: Only appointments for TODAY that are waiting/in-progress
    var waitingToday = todayOPD.filter(function (a) {
      var s = (a.status || '').toLowerCase().trim();
      return s === 'waiting' || s === 'pending' || s === 'in-progress' || s === 'in_progress';
    });

    // Completed Today
    var completedToday = todayOPD.filter(function (a) {
      var s = (a.status || '').toLowerCase().trim();
      return s === 'completed' || s === 'done';
    });

    // Update Date Header
    var elDate = document.getElementById('ownerHeroDate');
    if (elDate) {
      elDate.textContent = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    }

    // Hero Card: Total System Patients & Breakdown
    var elTotalPatients = document.getElementById('heroTotalPatients');
    if (elTotalPatients) elTotalPatients.textContent = totalPatientsCount.toLocaleString('en-IN');

    // Split bar: Orthopedic Registry vs Skin Registry
    var totalSpecialty = ortho.length + skin.length;
    var orthoRatio = 50;
    if (totalSpecialty > 0) {
      orthoRatio = Math.round((ortho.length / totalSpecialty) * 100);
    }
    var skinRatio = 100 - orthoRatio;

    var barOrtho = document.getElementById('heroSplitOrtho');
    var barSkin = document.getElementById('heroSplitSkin');
    if (barOrtho) barOrtho.style.width = orthoRatio + '%';
    if (barSkin) barSkin.style.width = skinRatio + '%';

    var legOrtho = document.getElementById('legendOrtho');
    var legSkin = document.getElementById('legendSkin');
    if (legOrtho) legOrtho.textContent = 'Ortho: ' + ortho.length + ' (' + orthoRatio + '%)';
    if (legSkin) legSkin.textContent = 'Skin: ' + skin.length + ' (' + skinRatio + '%)';

    // 4 KPI Cards: Exact numbers
    var elTodayFootfall = document.getElementById('kpiTodayPatients');
    if (elTodayFootfall) elTodayFootfall.textContent = todayRegCount;

    var elTotalOpd = document.getElementById('kpiTotalOpd');
    if (elTotalOpd) elTotalOpd.textContent = appointments.length.toLocaleString('en-IN');

    var elTodayOpd = document.getElementById('kpiTodayOpd');
    if (elTodayOpd) elTodayOpd.textContent = todayOPD.length;

    var availDocs = doctors.filter(function (d) { return (d.status || '').toLowerCase() === 'available'; }).length;
    var elDocs = document.getElementById('kpiActiveDocs');
    if (elDocs) elDocs.textContent = availDocs + ' / ' + (doctors.length || 0);

    var elTotalRegs = document.getElementById('kpiTotalRegistrations');
    if (elTotalRegs) elTotalRegs.textContent = totalPatientsCount.toLocaleString('en-IN');

    // Render Doctor Live Queues
    renderDoctorQueueCarousel(todayOPD);

    // Render Real-Time Activity Feed (Sorted by most recent)
    renderActivityFeed();

    // Render Patients List Tab
    renderPatientsList();

    // Render Doctors List Tab
    renderDoctorsList();

    // Render Analytics Tab
    renderAnalyticsTab(totalPatientsCount, appointments.length, skin.length, ortho.length, doctors.length, depts.length);
  }

  function renderDoctorQueueCarousel(todayOPD) {
    var container = document.getElementById('ownerDoctorScroll');
    if (!container) return;

    var docs = _data.doctors;
    if (!docs || docs.length === 0) {
      container.innerHTML = '<div style="color:var(--owner-muted);font-size:0.8rem;padding:12px;">No doctors registered</div>';
      return;
    }

    container.innerHTML = docs.map(function (doc) {
      var initials = doc.initials || (doc.name ? doc.name.slice(0, 2).toUpperCase() : 'DR');
      var isAvail = (doc.status || '').toLowerCase() === 'available';
      var statusColor = isAvail ? '#10b981' : '#f59e0b';
      var statusText = isAvail ? 'Available' : (doc.status || 'Consulting');

      // Count actual today's appointments for this doctor
      var docTodayCount = (todayOPD || []).filter(function (a) {
        var docName = (a.doctor_name || a.doctor || a.Doctor || '').toLowerCase();
        var myName = (doc.name || '').toLowerCase();
        return docName && myName && (docName.indexOf(myName) !== -1 || myName.indexOf(docName) !== -1);
      }).length;

      return '<div class="owner-doc-card" onclick="openDoctorSheet(\'' + esc(doc.id || doc.name) + '\')">' +
        '<div class="owner-doc-top">' +
          '<div class="owner-doc-avatar">' + esc(initials) + '</div>' +
          '<div class="owner-doc-info">' +
            '<div class="owner-doc-name">' + esc(doc.name || 'Doctor') + '</div>' +
            '<div class="owner-doc-dept">' + esc(doc.dept || 'General') + ' · ' + esc(doc.qualification || 'MBBS') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="owner-doc-queue-bar">' +
          '<span style="display:flex;align-items:center;gap:4px;"><span style="width:6px;height:6px;border-radius:50%;background:' + statusColor + '"></span>' + statusText + '</span>' +
          '<span style="color:var(--owner-primary-dark);font-weight:700;">' + (docTodayCount > 0 ? docTodayCount + ' Today' : 'On Duty') + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderActivityFeed() {
    var container = document.getElementById('ownerActivityFeed');
    if (!container) return;

    var items = [];

    // Recent registered patients
    _data.patients.slice(0, 15).forEach(function (p) {
      var dateStr = p.created_on || p['Created On'] || p.createdAt || '';
      items.push({
        title: 'New Patient: ' + ((p.fname || p['First Name'] || p.Name || 'Patient') + ' ' + (p.lname || p['Last Name'] || '')).trim(),
        sub: 'OP #' + (p.op_no || p['OP No'] || '—') + ' · ' + (p.department || 'General OPD'),
        date: dateStr,
        icon: 'person_add',
        color: '#0D9488'
      });
    });

    // Recent appointments
    _data.appointments.slice(0, 15).forEach(function (a) {
      var dateStr = a.appointment_date || a.createdAt || '';
      items.push({
        title: 'Consultation: ' + (a.patient_name || a.Name || 'Patient'),
        sub: 'Doctor: ' + (a.doctor_name || a.doctor || 'Dr. On Duty') + ' · ' + (a.status || 'Booked'),
        date: dateStr,
        icon: 'medical_services',
        color: '#0284c7'
      });
    });

    if (items.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:16px;color:var(--owner-muted);font-size:0.8rem;">No recent clinic records</div>';
      return;
    }

    // Sort chronologically descending
    items.sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date));
    });

    container.innerHTML = items.slice(0, 7).map(function (item) {
      return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--owner-border);">' +
        '<div style="width:34px;height:34px;border-radius:10px;background:rgba(13,148,136,0.1);color:' + item.color + ';display:flex;align-items:center;justify-content:center;flex-shrink:0;">' +
          '<span class="material-icons-round" style="font-size:18px">' + item.icon + '</span>' +
        '</div>' +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:0.82rem;font-weight:700;color:var(--owner-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(item.title) + '</div>' +
          '<div style="font-size:0.7rem;color:var(--owner-muted);margin-top:2px;">' + esc(item.sub) + '</div>' +
        '</div>' +
        '<div style="font-size:0.68rem;color:var(--owner-muted);white-space:nowrap;">' + timeAgo(item.date) + '</div>' +
      '</div>';
    }).join('');
  }

  function renderPatientsList() {
    var container = document.getElementById('ownerPatientCardsList');
    if (!container) return;

    var pts = _data.patients;
    var searchVal = (document.getElementById('ownerPatientSearch') || {}).value || '';
    searchVal = searchVal.toLowerCase().trim();

    var filtered = pts.filter(function (p) {
      var name = ((p.fname || '') + ' ' + (p.lname || '') + ' ' + (p.Name || '')).toLowerCase();
      var op = String(p.op_no || p['OP No'] || p.id || '').toLowerCase();
      var phone = String(p.contact || p.Phone || p.phone || '').toLowerCase();
      if (!searchVal) return true;
      return name.indexOf(searchVal) !== -1 || op.indexOf(searchVal) !== -1 || phone.indexOf(searchVal) !== -1;
    });

    if (filtered.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:32px;color:var(--owner-muted);"><span class="material-icons-round" style="font-size:36px;display:block;margin-bottom:8px;">search_off</span>No patients found</div>';
      return;
    }

    container.innerHTML = filtered.slice(0, 60).map(function (p) {
      var name = (p.fname || p['First Name'] || p.Name || 'Patient') + ' ' + (p.lname || p['Last Name'] || '');
      var op = p.op_no || p['OP No'] || p.id || '—';
      var phone = p.contact || p.Phone || p.phone || '—';
      var dept = p.department || p.Department || 'General';
      var age = p.age || '—';
      var gender = p.gender || '—';

      return '<div class="owner-patient-card" onclick="openPatientSheet(\'' + esc(op) + '\')">' +
        '<div class="owner-patient-top">' +
          '<div class="owner-patient-name">' + esc(name.trim()) + '</div>' +
          '<div class="owner-patient-token">OP #' + esc(op) + '</div>' +
        '</div>' +
        '<div class="owner-patient-meta">' +
          '<span><span class="material-icons-round">medical_services</span> ' + esc(dept) + '</span>' +
          '<span><span class="material-icons-round">person</span> ' + esc(age) + 'y / ' + esc(gender) + '</span>' +
          '<span><span class="material-icons-round">phone</span> ' + esc(phone) + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderDoctorsList() {
    var container = document.getElementById('ownerDoctorsListContainer');
    if (!container) return;

    var docs = _data.doctors;
    if (docs.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:32px;color:var(--owner-muted);">No doctors registered</div>';
      return;
    }

    container.innerHTML = docs.map(function (doc) {
      var statusCls = (doc.status || '').toLowerCase() === 'available' ? 'available' : 'pending';
      return '<div class="owner-patient-card" onclick="openDoctorSheet(\'' + esc(doc.id || doc.name) + '\')">' +
        '<div class="owner-patient-top">' +
          '<div class="owner-patient-name">' + esc(doc.name || 'Doctor') + '</div>' +
          '<span class="rpt-badge ' + statusCls + '">' + esc(doc.status || 'Active') + '</span>' +
        '</div>' +
        '<div class="owner-patient-meta">' +
          '<span><span class="material-icons-round">business</span> ' + esc(doc.dept || 'Department') + '</span>' +
          '<span><span class="material-icons-round">school</span> ' + esc(doc.qualification || 'MBBS') + '</span>' +
          '<span><span class="material-icons-round">phone</span> ' + esc(doc.phone || doc.email || '—') + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function renderAnalyticsTab(totalPts, totalAppts, totalSkin, totalOrtho, totalDocs, totalDepts) {
    var elTotalP = document.getElementById('anaTotalPts');
    if (elTotalP) elTotalP.textContent = totalPts.toLocaleString('en-IN');

    var elTotalA = document.getElementById('anaTotalAppts');
    if (elTotalA) elTotalA.textContent = totalAppts.toLocaleString('en-IN');

    var elSkin = document.getElementById('anaSkinTotal');
    if (elSkin) elSkin.textContent = totalSkin.toLocaleString('en-IN');

    var elOrtho = document.getElementById('anaOrthoTotal');
    if (elOrtho) elOrtho.textContent = totalOrtho.toLocaleString('en-IN');

    var elDocs = document.getElementById('anaDocsTotal');
    if (elDocs) elDocs.textContent = totalDocs;

    var elDepts = document.getElementById('anaDeptsTotal');
    if (elDepts) elDepts.textContent = totalDepts;
  }

  // ──────────────────────────────────────────────
  // BOTTOM SHEETS
  // ──────────────────────────────────────────────
  window.openPatientSheet = function (opNo) {
    var pt = _data.patients.find(function (p) {
      return String(p.op_no || p['OP No'] || p.id) === String(opNo);
    });
    if (!pt) {
      showToast('Patient details not found', 'error');
      return;
    }

    var overlay = document.getElementById('ownerSheetOverlay');
    var content = document.getElementById('ownerSheetContent');
    var title = document.getElementById('ownerSheetTitle');
    if (!overlay || !content) return;

    var name = (pt.fname || pt['First Name'] || pt.Name || 'Patient') + ' ' + (pt.lname || pt['Last Name'] || '');
    if (title) title.textContent = 'Patient: ' + name.trim();

    var phone = pt.contact || pt.Phone || pt.phone || '';

    content.innerHTML = '<div style="display:flex;flex-direction:column;gap:12px;">' +
      '<div style="background:#f8fafc;padding:14px;border-radius:14px;border:1px solid var(--owner-border);">' +
        '<div style="font-size:0.75rem;color:var(--owner-muted);text-transform:uppercase;">Registration OP Number</div>' +
        '<div style="font-size:1.2rem;font-weight:800;color:var(--owner-primary-dark);margin-top:2px;">#' + esc(pt.op_no || pt['OP No'] || '—') + '</div>' +
      '</div>' +
      '<div class="rpt-row"><span class="rpt-row-label">Age &amp; Gender</span><span class="rpt-row-value">' + esc(pt.age || '—') + ' yrs / ' + esc(pt.gender || '—') + '</span></div>' +
      '<div class="rpt-row"><span class="rpt-row-label">Department</span><span class="rpt-row-value">' + esc(pt.department || 'General') + '</span></div>' +
      '<div class="rpt-row"><span class="rpt-row-label">Phone Contact</span><span class="rpt-row-value">' + esc(phone || '—') + '</span></div>' +
      '<div class="rpt-row"><span class="rpt-row-label">Place / City</span><span class="rpt-row-value">' + esc(pt.place || pt.city || '—') + '</span></div>' +
      '<div class="rpt-row"><span class="rpt-row-label">Registered Date</span><span class="rpt-row-value">' + esc(pt.created_on || pt['Created On'] || '—') + '</span></div>' +
      '<div style="margin-top:14px;display:flex;gap:10px;">' +
        (phone ? '<a href="tel:' + esc(phone) + '" style="flex:1;background:var(--owner-primary);color:white;text-align:center;padding:12px;border-radius:12px;text-decoration:none;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;"><span class="material-icons-round">call</span> Call Patient</a>' : '') +
        (phone ? '<a href="https://api.whatsapp.com/send?phone=91' + esc(phone) + '" target="_blank" style="flex:1;background:#25D366;color:white;text-align:center;padding:12px;border-radius:12px;text-decoration:none;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;"><span class="material-icons-round">chat</span> WhatsApp</a>' : '') +
      '</div>' +
    '</div>';

    overlay.classList.add('active');
  };

  window.openDoctorSheet = function (docId) {
    var doc = _data.doctors.find(function (d) {
      return String(d.id || d.name) === String(docId);
    });
    if (!doc) return;

    var overlay = document.getElementById('ownerSheetOverlay');
    var content = document.getElementById('ownerSheetContent');
    var title = document.getElementById('ownerSheetTitle');
    if (!overlay || !content) return;

    if (title) title.textContent = 'Doctor: ' + (doc.name || 'Medical Staff');

    content.innerHTML = '<div style="display:flex;flex-direction:column;gap:12px;">' +
      '<div class="rpt-row"><span class="rpt-row-label">Department</span><span class="rpt-row-value">' + esc(doc.dept || 'General') + '</span></div>' +
      '<div class="rpt-row"><span class="rpt-row-label">Qualifications</span><span class="rpt-row-value">' + esc(doc.qualification || 'MBBS') + '</span></div>' +
      '<div class="rpt-row"><span class="rpt-row-label">Status</span><span class="rpt-row-value">' + esc(doc.status || 'Available') + '</span></div>' +
      '<div class="rpt-row"><span class="rpt-row-label">Phone</span><span class="rpt-row-value">' + esc(doc.phone || '—') + '</span></div>' +
    '</div>';

    overlay.classList.add('active');
  };

  window.closeOwnerBottomSheet = function () {
    var overlay = document.getElementById('ownerSheetOverlay');
    if (overlay) overlay.classList.remove('active');
  };

  // ──────────────────────────────────────────────
  // SMART ACTIONS (WHATSAPP & PDF)
  // ──────────────────────────────────────────────
  window.shareWhatsAppSummary = function () {
    var today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    var totalPts = document.getElementById('heroTotalPatients').textContent || '0';
    var todayPts = document.getElementById('kpiTodayPatients').textContent || '0';
    var totalOpd = document.getElementById('kpiTotalOpd').textContent || '0';
    var docs = document.getElementById('kpiActiveDocs').textContent || '0';

    var msg = '🏥 *WELLNESS MEDICALS — EXECUTIVE REPORT*\n' +
      '📅 *Date:* ' + today + '\n\n' +
      '👥 *Today\'s Registrations:* ' + todayPts + ' Patients\n' +
      '📋 *Total OPD Consultations:* ' + totalOpd + ' Records\n' +
      '👨‍⚕️ *Doctors on Duty:* ' + docs + '\n' +
      '📊 *Total Patient Base:* ' + totalPts + ' Registered\n\n' +
      '🟢 *Status:* Clinic Operations Normal\n' +
      '🔗 *Executive Portal:* ' + window.location.href;

    var waUrl = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(msg);
    window.open(waUrl, '_blank');
  };

  window.exportOwnerPdf = function () {
    showToast('Preparing executive summary...', 'picture_as_pdf');
    setTimeout(function () {
      window.print();
    }, 300);
  };

  window.filterPatientCards = function () {
    renderPatientsList();
  };

  // ──────────────────────────────────────────────
  // APP INITIALIZATION
  // ──────────────────────────────────────────────
  function initApp() {
    initPullToRefresh();
    refreshAppData();
  }

  document.addEventListener('DOMContentLoaded', function () {
    initPinAuth();
  });

})();
