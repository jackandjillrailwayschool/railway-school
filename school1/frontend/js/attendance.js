// js/attendance.js
// Standalone Attendance Module for JACK AND JILL SCHOOL
// Requires: js/api.js (shared apiRequest helper)

/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
let allStudents     = [];
let currentSession  = 'Morning';
let attendanceMap   = {};   // { studentId: 'Present' | 'Absent' }
let currentClass    = '';
let currentSection  = '';
let currentDate     = '';

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
async function init() {
    if (!localStorage.getItem('authToken')) {
        window.location.href = 'index.html';
        return;
    }

    const role = localStorage.getItem('userRole') || 'Teacher';
    const name = localStorage.getItem('userName') || 'Admin';
    document.getElementById('userRoleBadge').innerText = role;
    document.getElementById('headerUserName').innerText = name;

    // Set today's date as default
    document.getElementById('att_date').value = todayISO();
    document.getElementById('hist_date').value = todayISO();

    buildSidebar(role);

    try {
        allStudents = await apiRequest('/students') || [];
    } catch (e) {
        allStudents = [];
    }
}

/* ─────────────────────────────────────────
   SIDEBAR  (mirrors app.js style)
───────────────────────────────────────── */
function buildSidebar(role) {
    const menus = {
        Teacher:    ['Student Records', 'Marks Management', 'Attendance'],
        Accountant: ['Fees Management', 'Student Records'],
        Principal:  ['Statistics', 'Student Records', 'Marks Management', 'Fees Collection', 'Attendance'],
        President:  ['User Management', 'Statistics'],
    };

    const routes = {
        'Student Records':  'dashboard.html',
        'Marks Management': 'dashboard.html',
        'Fees Management':  'fees.html',
        'Fees Collection':  'fees.html',
        'Statistics':       'dashboard.html',
        'User Management':  'dashboard.html',
        'Attendance':       'attendance.html',
    };

    const nav = document.getElementById('sidebarNav');
    nav.innerHTML = '';

    (menus[role] || []).forEach(item => {
        const a = document.createElement('a');
        a.className = 'nav-item' + (item === 'Attendance' ? ' active' : '');
        a.innerText = item;
        a.href = routes[item] || '#';
        nav.appendChild(a);
    });
}

/* ─────────────────────────────────────────
   TAB SWITCHER
───────────────────────────────────────── */
function switchTab(tab) {
    document.getElementById('markSection').style.display    = tab === 'mark'    ? 'block' : 'none';
    document.getElementById('historySection').style.display = tab === 'history' ? 'block' : 'none';
    document.getElementById('tab-mark').classList.toggle('active',    tab === 'mark');
    document.getElementById('tab-history').classList.toggle('active', tab === 'history');
}

/* ─────────────────────────────────────────
   SESSION SELECT
───────────────────────────────────────── */
function selectSession(session) {
    currentSession = session;
    document.getElementById('sess-morning').classList.toggle('active',   session === 'Morning');
    document.getElementById('sess-afternoon').classList.toggle('active', session === 'Afternoon');
    renderAttendanceTable();   // re-render so any saved data for that session loads
}

/* ─────────────────────────────────────────
   LOAD STUDENTS FOR ATTENDANCE
───────────────────────────────────────── */
async function loadStudentsForAttendance() {
    currentClass   = document.getElementById('att_class').value;
    currentSection = document.getElementById('att_section').value;
    currentDate    = document.getElementById('att_date').value;

    if (!currentClass || !currentSection) {
        showToast('Please select both Class and Section.', 'error');
        return;
    }
    if (!currentDate) {
        showToast('Please select a date.', 'error');
        return;
    }

    const filtered = allStudents.filter(s =>
        String(s.class) === String(currentClass) && s.section === currentSection
    );

    if (filtered.length === 0) {
        document.getElementById('attendanceTableWrapper').innerHTML =
            `<div class="empty-state"><div class="icon">🔍</div><p>No students found in Class ${currentClass}-${currentSection}.</p></div>`;
        document.getElementById('sessionRow').style.display    = 'none';
        document.getElementById('quickActions').style.display  = 'none';
        document.getElementById('saveSection').style.display   = 'none';
        document.getElementById('summaryBar').style.display    = 'none';
        return;
    }

    // Initialise attendanceMap with nulls for all students
    attendanceMap = {};
    filtered.forEach(s => { attendanceMap[s.studentId] = null; });

    // Try to fetch existing attendance for this date/class/section/session
    try {
        const existing = await apiRequest(
            `/attendance?date=${currentDate}&class=${currentClass}&section=${currentSection}&session=${currentSession}`
        );
        if (Array.isArray(existing)) {
            existing.forEach(rec => {
                attendanceMap[rec.studentId] = rec.status;
            });
        }
    } catch (e) { /* no prior records is fine */ }

    document.getElementById('sessionRow').style.display   = 'block';
    document.getElementById('quickActions').style.display = 'flex';
    document.getElementById('summaryBar').style.display   = 'flex';
    document.getElementById('saveSection').style.display  = 'flex';

    renderAttendanceTable(filtered);
}

/* ─────────────────────────────────────────
   RENDER TABLE
───────────────────────────────────────── */
function renderAttendanceTable(studentList) {
    // If no list passed, re-derive it
    if (!studentList) {
        studentList = allStudents.filter(s =>
            String(s.class) === String(currentClass) && s.section === currentSection
        );
    }

    updateSummary(studentList);

    const wrapper = document.getElementById('attendanceTableWrapper');
    wrapper.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th style="width:80px;">Adm. No</th>
                    <th style="width:110px;">Student ID</th>
                    <th>Name</th>
                    <th style="width:220px;">Attendance</th>
                </tr>
            </thead>
            <tbody>
                ${studentList.map((s, i) => `
                    <tr id="row-${s.studentId}">
                        <td><strong>${String(s.admissionNo).padStart(4,'0')}</strong></td>
                        <td>${s.studentId}</td>
                        <td>${s.name}</td>
                        <td>
                            <div class="att-toggle">
                                <button
                                    class="att-btn present ${attendanceMap[s.studentId] === 'Present' ? 'selected' : ''}"
                                    id="btn-present-${s.studentId}"
                                    onclick="setStatus('${s.studentId}', 'Present')">
                                    ✓ Present
                                </button>
                                <button
                                    class="att-btn absent ${attendanceMap[s.studentId] === 'Absent' ? 'selected' : ''}"
                                    id="btn-absent-${s.studentId}"
                                    onclick="setStatus('${s.studentId}', 'Absent')">
                                    ✗ Absent
                                </button>
                            </div>
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table>`;

    updateSaveNote(studentList);
}

/* ─────────────────────────────────────────
   SET STATUS (single student)
───────────────────────────────────────── */
function setStatus(studentId, status) {
    attendanceMap[studentId] = status;

    // Update button highlights without re-rendering whole table (fast)
    const btnP = document.getElementById(`btn-present-${studentId}`);
    const btnA = document.getElementById(`btn-absent-${studentId}`);
    if (btnP) btnP.classList.toggle('selected', status === 'Present');
    if (btnA) btnA.classList.toggle('selected', status === 'Absent');

    // Update summary
    const studentList = allStudents.filter(s =>
        String(s.class) === String(currentClass) && s.section === currentSection
    );
    updateSummary(studentList);
    updateSaveNote(studentList);
}

/* ─────────────────────────────────────────
   MARK ALL
───────────────────────────────────────── */
function markAll(status) {
    const studentList = allStudents.filter(s =>
        String(s.class) === String(currentClass) && s.section === currentSection
    );
    studentList.forEach(s => setStatus(s.studentId, status));
}

/* ─────────────────────────────────────────
   SUMMARY BAR
───────────────────────────────────────── */
function updateSummary(studentList) {
    const total    = studentList.length;
    const present  = Object.values(attendanceMap).filter(v => v === 'Present').length;
    const absent   = Object.values(attendanceMap).filter(v => v === 'Absent').length;
    const unmarked = total - present - absent;

    document.getElementById('summaryBar').innerHTML = `
        <div class="summary-chip chip-total">   👥 Total: ${total}</div>
        <div class="summary-chip chip-present">  ✅ Present: ${present}</div>
        <div class="summary-chip chip-absent">   ❌ Absent: ${absent}</div>
        <div class="summary-chip chip-unmarked"> ⏳ Unmarked: ${unmarked}</div>`;
}

function updateSaveNote(studentList) {
    const total    = studentList.length;
    const marked   = Object.values(attendanceMap).filter(v => v !== null).length;
    const unmarked = total - marked;
    const note     = document.getElementById('saveNote');
    if (note) {
        note.textContent = unmarked > 0
            ? `⚠️ ${unmarked} student(s) not yet marked`
            : '✅ All students marked — ready to save';
        note.style.color = unmarked > 0 ? '#92400e' : '#15803d';
    }
}

/* ─────────────────────────────────────────
   SAVE ATTENDANCE
───────────────────────────────────────── */
async function saveAttendance() {
    const studentList = allStudents.filter(s =>
        String(s.class) === String(currentClass) && s.section === currentSection
    );

    const records = studentList.map(s => ({
        studentId:  s.studentId,
        admissionNo: s.admissionNo,
        name:       s.name,
        class:      currentClass,
        section:    currentSection,
        date:       currentDate,
        session:    currentSession,
        status:     attendanceMap[s.studentId] || 'Absent',  // default absent if missed
    }));

    try {
        await apiRequest('/attendance', {
            method: 'POST',
            body: JSON.stringify({
                date:    currentDate,
                class:   currentClass,
                section: currentSection,
                session: currentSession,
                records,
            }),
        });
        showToast(`Attendance saved for Class ${currentClass}-${currentSection} (${currentSession})`, 'success');
    } catch (err) {
        showToast('Error saving attendance: ' + err.message, 'error');
    }
}

/* ─────────────────────────────────────────
   HISTORY
───────────────────────────────────────── */
async function loadHistory() {
    const date    = document.getElementById('hist_date').value;
    const cls     = document.getElementById('hist_class').value;
    const section = document.getElementById('hist_section').value;
    const session = document.getElementById('hist_session').value;

    let url = '/attendance?';
    if (date)    url += `date=${date}&`;
    if (cls)     url += `class=${cls}&`;
    if (section) url += `section=${section}&`;
    if (session) url += `session=${session}&`;

    const wrapper = document.getElementById('historyWrapper');
    wrapper.innerHTML = `<div class="empty-state"><div class="icon">⏳</div><p>Loading...</p></div>`;

    try {
        const records = await apiRequest(url) || [];

        if (records.length === 0) {
            wrapper.innerHTML = `<div class="empty-state"><div class="icon">📭</div><p>No attendance records found for the selected filters.</p></div>`;
            return;
        }

        // Group by date → class → section → session
        wrapper.innerHTML = `
            <p style="font-size:13px; color:#64748b; margin-bottom:14px;">${records.length} record(s) found</p>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Class/Sec</th>
                        <th>Session</th>
                        <th>Adm. No</th>
                        <th>Name</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${records.map(r => `
                        <tr>
                            <td>${r.date}</td>
                            <td>${r.class}-${r.section}</td>
                            <td>${r.session}</td>
                            <td><strong>${String(r.admissionNo).padStart(4,'0')}</strong></td>
                            <td>${r.name}</td>
                            <td>
                                <span class="status-badge ${r.status === 'Present' ? 'badge-present' : 'badge-absent'}">
                                    ${r.status === 'Present' ? '✓' : '✗'} ${r.status}
                                </span>
                            </td>
                        </tr>`).join('')}
                </tbody>
            </table>`;
    } catch (err) {
        wrapper.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>Failed to load history: ${err.message}</p></div>`;
    }
}

/* ─────────────────────────────────────────
   UTILITIES
───────────────────────────────────────── */
function todayISO() {
    return new Date().toISOString().split('T')[0];
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

let _toastTimer = null;
function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = `show ${type}`;
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => { t.className = ''; }, 3500);
}

// ── BOOT ──
init();