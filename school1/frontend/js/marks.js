// js/marks.js

// Subjects by class group
const SUBJECTS_PRIMARY   = ['Telugu', 'English', 'Maths', 'Hindi', 'EVS', 'GK', 'Computer']; // Classes 1–5
const SUBJECTS_SECONDARY = ['Telugu', 'Hindi', 'English', 'Maths', 'Science', 'Social'];       // Classes 6–8
const SUBJECTS_910_BASE  = ['Telugu', 'Hindi', 'English', 'Maths'];
const SUBJECTS_910_SPLIT = [
    { label: 'Science (N.S)', key: 'SciNS' },
    { label: 'Science (P.S)', key: 'SciPS' },
  
    { label: 'Social (Civics/Eco)', key: 'SocCE' },
];

// Exams by class group
const FA_EXAMS  = ['FA1', 'FA2', 'FA3', 'FA4'];
const SA_EXAMS  = ['SA1', 'SA2'];
const OLD_EXAMS = ['Unit Test 1', 'Unit Test 2', 'Unit Test 3', 'Unit Test 4', 'Unit Test 5',
                   'Quarterly', 'Half-Yearly', 'Annual'];

const FA_MAX = 50;
const SA_MAX = 100;

// FA sub-component maxima: AS1=10, AS2=10, AS3=10, AS4=20 → total 50
const FA_SUB_LABELS = ['AS1 (/10)', 'AS2 (/10)', 'AS3 (/10)', 'AS4 (/20)'];
const FA_SUB_MAX    = [10, 10, 10, 20];

function isPrimaryClass(cls) {
    return cls !== '' && parseInt(cls) >= 1 && parseInt(cls) <= 5;
}
function isSecondaryClass(cls) {
    return cls !== '' && parseInt(cls) >= 6 && parseInt(cls) <= 8;
}
function is910Class(cls) {
    return cls !== '' && parseInt(cls) >= 9 && parseInt(cls) <= 10;
}
function isSecondaryOrAbove(cls) {
    return isSecondaryClass(cls) || is910Class(cls);
}

function getSubjects(cls) {
    if (isPrimaryClass(cls))   return SUBJECTS_PRIMARY;
    if (isSecondaryClass(cls)) return SUBJECTS_SECONDARY;
    // 9–10: base + 4 split subjects
    return [...SUBJECTS_910_BASE, ...SUBJECTS_910_SPLIT.map(s => s.label)];
}

function getExamList(cls) {
    if (!cls) return [...FA_EXAMS, ...SA_EXAMS, ...OLD_EXAMS];
    if (isPrimaryClass(cls))        return [...FA_EXAMS, ...SA_EXAMS];   // primary uses SA1–SA3 in old code but we normalise
    if (isSecondaryOrAbove(cls))    return [...FA_EXAMS, ...SA_EXAMS];
    return OLD_EXAMS;
}

function getMaxPerSubject(exam, cls) {
    if (FA_EXAMS.includes(exam)) return FA_MAX;
    if (SA_EXAMS.includes(exam)) return SA_MAX;
    // old exam names
    if (exam === 'Annual') return 100;
    if (exam === 'Quarterly' || exam === 'Half-Yearly') return 80;
    return 50;
}

function getMaxTotal(exam, cls) {
    const maxPerSub = getMaxPerSubject(exam, cls);
    if (isPrimaryClass(cls)) return maxPerSub * 5;
    const subjects = getSubjects(cls);
    return maxPerSub * subjects.length;
}

// ─── RENDER LIST ───────────────────────────────────────────────────────────
function renderMarks() {
    contentArea.innerHTML = `
        <div class="card">
            <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:20px;">
                <input type="text" id="markSearch" onkeyup="filterMarks()" placeholder="Search by Name/Reg..."
                    style="flex:1; min-width:180px; padding:10px; border-radius:6px; border:1px solid #ddd;">
                <select id="filterClass" onchange="filterMarks()" style="padding:10px; border-radius:6px; border:1px solid #ddd;">
                    <option value="">All Classes</option>
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option>${n}</option>`).join('')}
                </select>
                <select id="filterSection" onchange="filterMarks()" style="padding:10px; border-radius:6px; border:1px solid #ddd;">
                    <option value="">All Sections</option>
                    ${['A','B','C','D','E','F'].map(s => `<option>${s}</option>`).join('')}
                </select>
                
                <!-- SIMPLIFIED DROPDOWN BELOW -->
                <select id="filterExam" onchange="filterMarks()" style="padding:10px; border-radius:6px; border:1px solid #ddd;">
                    <option value="">All Exams</option>
                    ${[...FA_EXAMS, ...SA_EXAMS].map(e => `<option>${e}</option>`).join('')}
                </select>
                
                <button class="btn-primary" style="width:auto; padding:10px 20px;" onclick="openMarksModal()">+ Add Marks</button>
            </div>
            <div id="marksTableWrapper"></div>
        </div>`;
    loadAndRenderMarks();
}

async function loadAndRenderMarks() {
    try {
        const marks = await apiRequest('/marks') || [];
        window._allMarks = marks;
        updateMarksTable(marks);
    } catch (e) {
        document.getElementById('marksTableWrapper').innerHTML =
            "<p style='text-align:center; padding:20px;'>Failed to load marks.</p>";
    }
}

function updateMarksTable(list) {
    const wrapper = document.getElementById('marksTableWrapper');
    if (!list || list.length === 0) {
        wrapper.innerHTML = "<p style='text-align:center; padding:20px;'>No marks records found.</p>";
        return;
    }
    wrapper.innerHTML = `<table>
        <thead>
            <tr>
                <th>Reg No</th><th>Name</th><th>Class</th><th>Exam</th>
                <th>Total</th><th>Grade</th><th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${list.map(m => {
                const student = (students || []).find(s => s.admissionNo == m.reg);
                const cls = m.class || student?.class || '';
                const maxT = getMaxTotal(m.exam, cls);
                return `<tr>
                    <td>${m.reg}</td>
                    <td>${m.name || student?.name || '-'}</td>
                    <td>${cls ? `${cls}${(m.section || student?.section) ? '-'+(m.section||student?.section) : ''}` : '-'}</td>
                    <td>${m.exam}</td>
                    <td>${m.total} / ${maxT}</td>
                    <td><span style="padding:3px 10px; border-radius:12px; font-weight:bold;
                        background:${gradeColor(m.grade)}; color:#fff;">${m.grade}</span></td>
                    <td><button class="action-btn view" onclick="viewMarks(${m.id})">View</button></td>
                </tr>`;
            }).join('')}
        </tbody>
    </table>`;
}

function gradeColor(grade) {
    if (grade === 'A+') return '#22c55e';
    if (grade === 'A')  return '#3b82f6';
    if (grade === 'B')  return '#f59e0b';
    if (grade === 'C')  return '#f97316';
    return '#ef4444';
}

function filterMarks() {
    const q       = (document.getElementById('markSearch').value || '').toLowerCase();
    const cls     = document.getElementById('filterClass').value;
    const section = document.getElementById('filterSection').value;
    const exam    = document.getElementById('filterExam').value;
    const filtered = (_allMarks || []).filter(m => {
        const matchText    = (m.name || '').toLowerCase().includes(q) || String(m.reg).includes(q);
        const matchExam    = !exam || m.exam === exam;
        const student      = (students || []).find(s => s.admissionNo == m.reg);
        const matchClass   = !cls     || String(m.class || student?.class) === String(cls);
        const matchSection = !section || (m.section || student?.section) === section;
        return matchText && matchExam && matchClass && matchSection;
    });
    updateMarksTable(filtered);
}

// ─── MODAL OPEN ────────────────────────────────────────────────────────────

function openMarksModal() {
    modal.style.display = 'flex';
    modalBody.innerHTML = `
        <h2 style="text-align:center; color:#233d91; border-bottom:2px solid #233d91;
                   padding-bottom:10px; margin-bottom:24px; font-size:20px; letter-spacing:1px;">
            ADD MARKS
        </h2>
        <form id="marksForm" style="padding:0 10px 10px;">

            <!-- Row 1: Class + Section -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
                <div>
                    <label style="font-weight:600; display:block; margin-bottom:6px; color:#333;">Class</label>
                    <select id="m_class" onchange="onClassChange()"
                        style="width:100%; padding:12px; border-radius:8px; border:1.5px solid #ddd;
                               font-size:15px; background:#fff; color:#333; appearance:auto;">
                        <option value="">-- Select Class --</option>
                        ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}">${n}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label style="font-weight:600; display:block; margin-bottom:6px; color:#333;">Section</label>
                    <select id="m_section" onchange="filterStudentsByClass()"
                        style="width:100%; padding:12px; border-radius:8px; border:1.5px solid #ddd;
                               font-size:15px; background:#fff; color:#333; appearance:auto;">
                        <option value="">-- Select Section --</option>
                        ${['A','B','C','D','E','F'].map(s => `<option>${s}</option>`).join('')}
                    </select>
                </div>
            </div>

            <!-- Row 2: Student + Exam -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px;">
                <div>
                    <label style="font-weight:600; display:block; margin-bottom:6px; color:#333;">Student</label>
                    <select id="m_reg"
                        style="width:100%; padding:12px; border-radius:8px; border:1.5px solid #ddd;
                               font-size:15px; background:#fff; color:#333; appearance:auto;">
                        <option value="">-- Select Class & Section First --</option>
                    </select>
                </div>
                <div>
                    <label style="font-weight:600; display:block; margin-bottom:6px; color:#333;">Exam</label>
                    <select id="m_exam" onchange="updateMarksInputArea()"
                        style="width:100%; padding:12px; border-radius:8px; border:1.5px solid #ddd;
                               font-size:15px; background:#fff; color:#333; appearance:auto;">
                        <option value="">-- Select Class First --</option>
                    </select>
                </div>
            </div>

            <!-- Dynamic marks area -->
            <div id="marksInputArea"></div>

            <!-- Buttons -->
            <div style="display:flex; gap:12px; padding-top:20px;">
                <button type="submit" class="btn-primary" style="flex:1; height:50px; font-size:15px;">SAVE MARKS</button>
                <button type="button" onclick="closeModal()"
                    style="flex:1; height:50px; background:#fff; color:#233d91; border:2px solid #233d91;
                           border-radius:6px; cursor:pointer; font-size:15px; font-weight:600;">Cancel</button>
            </div>
        </form>`;

    document.getElementById('marksForm').onsubmit = submitMarks;
}

// ─── CLASS CHANGE → populate exam dropdown ─────────────────────────────────

function onClassChange() {
    const cls = document.getElementById('m_class').value;
    const examSel = document.getElementById('m_exam');
    examSel.innerHTML = `<option value="">-- Select Exam --</option>`;

    if (!cls) { 
        document.getElementById('marksInputArea').innerHTML = ''; 
        filterStudentsByClass(); 
        return; 
    }

    // Now same logic for ALL classes (1-10)
    examSel.innerHTML += `
        <optgroup label="Formative Assessment">
            ${FA_EXAMS.map(e => `<option value="${e}">${e}</option>`).join('')}
        </optgroup>
        <optgroup label="Summative Assessment">
            <option value="SA1">SA1</option>
            <option value="SA2">SA2</option>
        </optgroup>`;

    document.getElementById('marksInputArea').innerHTML = '';
    filterStudentsByClass();
}

// ─── EXAM CHANGE → render marks input area ────────────────────────────────

function updateMarksInputArea() {
    const cls  = document.getElementById('m_class').value;
    const exam = document.getElementById('m_exam').value;
    const area = document.getElementById('marksInputArea');
    if (!area || !exam || !cls) { if (area) area.innerHTML = ''; return; }

    if (isPrimaryClass(cls)) {
        // Use original primary rendering
        renderPrimaryMarksArea(cls, exam, area);
    } else {
        renderSecondaryMarksArea(cls, exam, area);
    }
}

// ─── PRIMARY MARKS AREA (unchanged logic, kept intact) ────────────────────

function renderPrimaryMarksArea(cls, exam, area) {
    const subjects = getSubjects(cls);
    const max      = getMaxPerSubject(exam, cls);
    const isFASA   = isPrimaryClass(cls);
    const examType = FA_EXAMS.includes(exam) ? 'Formative Assessment'
                   : SA_EXAMS.includes(exam) ? 'Summative Assessment' : exam;

    if (FA_EXAMS.includes(exam) || SA_EXAMS.includes(exam)) {
        const maxTotalCore = max * 5;
        area.innerHTML = `
            <div style="margin-bottom:12px;">
                <div style="background:#233d91; color:#fff; padding:8px 14px; border-radius:6px 6px 0 0;
                            display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:700; font-size:14px;">${examType} — ${exam}</span>
                    <span style="font-size:12px; opacity:0.85;">Max per subject: ${max}</span>
                </div>
                <div style="border:1px solid #233d91; border-top:none; border-radius:0 0 6px 6px; overflow:hidden;">
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="background:#eef1fb;">
                                <th style="padding:8px 14px; text-align:left; font-size:12px; color:#233d91; width:40px;">#</th>
                                <th style="padding:8px 14px; text-align:left; font-size:12px; color:#233d91;">Subject</th>
                                <th style="padding:8px 14px; text-align:center; font-size:12px; color:#233d91;">Marks (/${max})</th>
                                <th style="padding:8px 14px; text-align:center; font-size:12px; color:#233d91;">Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${subjects.map((sub, i) => `
                                <tr style="border-bottom:1px solid #e2e8f0; ${i >= 5 ? 'background:#fff9f0' : (i%2===0?'background:#f8fafc':'background:#fff')}">
                                    <td style="padding:8px 14px; font-size:13px; color:#888;">${i+1}</td>
                                    <td style="padding:8px 14px; font-size:13px; font-weight:600;">
                                        ${sub} ${i >= 5 ? '<br><small style="color:#f59e0b; font-weight:normal;">Non-GPA</small>' : ''}
                                    </td>
                                    <td style="padding:6px 14px; text-align:center;">
                                        <input type="number" id="m_s${i}" min="0" max="${max}" value=""
                                            placeholder="0" oninput="updateSubjectGrade(${i}, ${max})"
                                            style="width:80px; padding:6px; border-radius:5px; border:1px solid #bbb;
                                                   text-align:center; font-size:14px; font-weight:600;">
                                    </td>
                                    <td style="padding:6px 14px; text-align:center;">
                                        <span id="grade_s${i}" style="padding:3px 10px; border-radius:12px; font-size:12px;
                                              font-weight:bold; background:#e5e7eb; color:#555;">—</span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="background:#eef1fb; border-top:2px solid #233d91;">
                                <td colspan="2" style="padding:10px 14px; font-weight:700; font-size:13px; color:#233d91;">
                                    CORE TOTAL (/${maxTotalCore})
                                </td>
                                <td style="padding:10px 14px; text-align:center; font-weight:700; font-size:15px; color:#233d91;">
                                    <span id="liveTotal">0</span>
                                    <span style="font-size:11px; color:#888;"> /${maxTotalCore}</span>
                                </td>
                                <td style="padding:10px 14px; text-align:center;">
                                    <div id="livePercent" style="font-size:11px; color:#666; font-weight:bold; margin-bottom:2px;">0.0%</div>
                                    <span id="liveTotalGrade" style="padding:3px 10px; border-radius:12px; font-size:13px;
                                          font-weight:bold; background:#e5e7eb; color:#555;">—</span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>`;
    } else {
        area.innerHTML = `
            <p style="margin:12px 0 10px; color:#555; font-size:13px;">Max marks per subject: <strong>${max}</strong></p>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                ${subjects.map((sub, i) => `
                    <div>
                        <label style="font-weight:600; display:block; margin-bottom:4px; font-size:13px;">${sub}</label>
                        <input type="number" id="m_s${i}" min="0" max="${max}" value="0"
                            style="width:100%; padding:8px; border-radius:6px; border:1px solid #ddd;">
                    </div>
                `).join('')}
            </div>`;
    }
}

// ─── SECONDARY MARKS AREA (Classes 6–10) ─────────────────────────────────

function renderSecondaryMarksArea(cls, exam, area) {
    const subjects = getSubjects(cls);
    const isFAExam = FA_EXAMS.includes(exam);
    const isSA2    = exam === 'SA2';
    const isSA1    = exam === 'SA1';

    if (isFAExam) {
        // FA: each subject gets 4 sub-inputs (10,10,10,20) = 50 total + live grade
        area.innerHTML = `
            <div style="margin-bottom:12px;">
                <div style="background:#233d91; color:#fff; padding:8px 14px; border-radius:6px 6px 0 0;
                            display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:700; font-size:14px;">Formative Assessment — ${exam}</span>
                    <span style="font-size:12px; opacity:0.85;">AS1(10) + AS2(10) + AS3(10) + AS4(20) = 50</span>
                </div>
                <div style="border:1px solid #233d91; border-top:none; border-radius:0 0 6px 6px; overflow:hidden;">
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="background:#eef1fb;">
                                <th style="padding:8px 10px; text-align:left; font-size:12px; color:#233d91; width:100px;">Subject</th>
                                <th style="padding:8px 6px; text-align:center; font-size:11px; color:#233d91;">AS1<br><span style="font-weight:400;">/10</span></th>
                                <th style="padding:8px 6px; text-align:center; font-size:11px; color:#233d91;">AS2<br><span style="font-weight:400;">/10</span></th>
                                <th style="padding:8px 6px; text-align:center; font-size:11px; color:#233d91;">AS3<br><span style="font-weight:400;">/10</span></th>
                                <th style="padding:8px 6px; text-align:center; font-size:11px; color:#233d91;">AS4<br><span style="font-weight:400;">/20</span></th>
                                <th style="padding:8px 6px; text-align:center; font-size:11px; color:#233d91;">Total<br><span style="font-weight:400;">/50</span></th>
                                <th style="padding:8px 6px; text-align:center; font-size:11px; color:#233d91;">Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${subjects.map((sub, i) => `
                                <tr style="border-bottom:1px solid #e2e8f0; ${i%2===0?'background:#f8fafc':'background:#fff'}">
                                    <td style="padding:8px 10px; font-size:13px; font-weight:600;">${sub}</td>
                                    ${FA_SUB_MAX.map((mx, j) => `
                                        <td style="padding:4px 4px; text-align:center;">
                                            <input type="number" id="m_s${i}_fa${j}"
                                                min="0" max="${mx}" value="" placeholder="0"
                                                oninput="updateFASubTotal(${i})"
                                                style="width:46px; padding:5px 3px; border-radius:5px;
                                                       border:1px solid #bbb; text-align:center;
                                                       font-size:13px; font-weight:600;">
                                        </td>
                                    `).join('')}
                                    <td style="padding:4px 6px; text-align:center;">
                                        <span id="fa_total_${i}" style="font-weight:700; font-size:14px; color:#233d91;">0</span>
                                        <span style="font-size:10px; color:#888;">/50</span>
                                    </td>
                                    <td style="padding:4px 6px; text-align:center;">
                                        <span id="fa_grade_${i}" style="padding:3px 10px; border-radius:12px;
                                              font-size:12px; font-weight:bold; background:#e5e7eb; color:#555;">—</span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;

    } else if (isSA1) {
        // SA1: 80m per subject, grade, grand total
        area.innerHTML = `
            <div style="margin-bottom:12px;">
                <div style="background:#233d91; color:#fff; padding:8px 14px; border-radius:6px 6px 0 0;
                            display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:700; font-size:14px;">Summative Assessment — SA1</span>
                    <span style="font-size:12px; opacity:0.85;">Max per subject: 80</span>
                </div>
                <div style="border:1px solid #233d91; border-top:none; border-radius:0 0 6px 6px; overflow:hidden;">
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="background:#eef1fb;">
                                <th style="padding:8px 14px; text-align:left; font-size:12px; color:#233d91;">#</th>
                                <th style="padding:8px 14px; text-align:left; font-size:12px; color:#233d91;">Subject</th>
                                <th style="padding:8px 14px; text-align:center; font-size:12px; color:#233d91;">Marks (/80)</th>
                                <th style="padding:8px 14px; text-align:center; font-size:12px; color:#233d91;">%</th>
                                <th style="padding:8px 14px; text-align:center; font-size:12px; color:#233d91;">Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${subjects.map((sub, i) => `
                                <tr style="border-bottom:1px solid #e2e8f0; ${i%2===0?'background:#f8fafc':'background:#fff'}">
                                    <td style="padding:8px 14px; font-size:13px; color:#888;">${i+1}</td>
                                    <td style="padding:8px 14px; font-size:13px; font-weight:600;">${sub}</td>
                                    <td style="padding:6px 14px; text-align:center;">
                                        <input type="number" id="m_s${i}" min="0" max="80" value="" placeholder="0"
                                            oninput="updateSARow(${i}, 80)"
                                            style="width:70px; padding:6px; border-radius:5px; border:1px solid #bbb;
                                                   text-align:center; font-size:14px; font-weight:600;">
                                    </td>
                                    <td style="padding:6px 14px; text-align:center;">
                                        <span id="sa_pct_${i}" style="font-size:13px; color:#555;">—</span>
                                    </td>
                                    <td style="padding:6px 14px; text-align:center;">
                                        <span id="sa_grade_${i}" style="padding:3px 10px; border-radius:12px;
                                              font-size:12px; font-weight:bold; background:#e5e7eb; color:#555;">—</span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="background:#eef1fb; border-top:2px solid #233d91;">
                                <td colspan="2" style="padding:10px 14px; font-weight:700; font-size:13px; color:#233d91;">
                                    TOTAL (/${subjects.length * 80})
                                </td>
                                <td style="padding:10px 14px; text-align:center; font-weight:700; font-size:15px; color:#233d91;">
                                    <span id="liveTotal">0</span>
                                </td>
                                <td style="padding:10px 14px; text-align:center;">
                                    <span id="livePercent" style="font-size:11px; color:#666; font-weight:bold;">0.0%</span>
                                </td>
                                <td style="padding:10px 14px; text-align:center;">
                                    <span id="liveTotalGrade" style="padding:3px 10px; border-radius:12px;
                                          font-size:13px; font-weight:bold; background:#e5e7eb; color:#555;">—</span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>`;

    } else if (isSA2) {
        // SA2: 80m SA + 20m internals = 100 per subject
        area.innerHTML = `
            <div style="margin-bottom:12px;">
                <div style="background:#233d91; color:#fff; padding:8px 14px; border-radius:6px 6px 0 0;
                            display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:700; font-size:14px;">Summative Assessment — SA2</span>
                    <span style="font-size:12px; opacity:0.85;">SA (80) + Internals (20) = Total (100)</span>
                </div>
                <div style="border:1px solid #233d91; border-top:none; border-radius:0 0 6px 6px; overflow:hidden;">
                    <table style="width:100%; border-collapse:collapse;">
                        <thead>
                            <tr style="background:#eef1fb;">
                                <th style="padding:8px 10px; text-align:left; font-size:12px; color:#233d91;">#</th>
                                <th style="padding:8px 10px; text-align:left; font-size:12px; color:#233d91;">Subject</th>
                                <th style="padding:8px 8px; text-align:center; font-size:11px; color:#233d91;">SA Marks<br><span style="font-weight:400;">/80</span></th>
                                <th style="padding:8px 8px; text-align:center; font-size:11px; color:#0a7a0a;">Internals<br><span style="font-weight:400;">/20</span></th>
                                <th style="padding:8px 8px; text-align:center; font-size:11px; color:#233d91;">Total<br><span style="font-weight:400;">/100</span></th>
                                <th style="padding:8px 8px; text-align:center; font-size:11px; color:#233d91;">%</th>
                                <th style="padding:8px 8px; text-align:center; font-size:11px; color:#233d91;">Grade</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${subjects.map((sub, i) => `
                                <tr style="border-bottom:1px solid #e2e8f0; ${i%2===0?'background:#f8fafc':'background:#fff'}">
                                    <td style="padding:8px 10px; font-size:13px; color:#888;">${i+1}</td>
                                    <td style="padding:8px 10px; font-size:13px; font-weight:600;">${sub}</td>
                                    <td style="padding:4px 6px; text-align:center;">
                                        <input type="number" id="m_s${i}" min="0" max="80" value="" placeholder="0"
                                            oninput="updateSA2Row(${i})"
                                            style="width:58px; padding:5px 3px; border-radius:5px; border:1px solid #bbb;
                                                   text-align:center; font-size:13px; font-weight:600;">
                                    </td>
                                    <td style="padding:4px 6px; text-align:center; background:#f0fff0;">
                                        <input type="number" id="m_int${i}" min="0" max="20" value="" placeholder="0"
                                            oninput="updateSA2Row(${i})"
                                            style="width:50px; padding:5px 3px; border-radius:5px; border:1px solid #88bb88;
                                                   text-align:center; font-size:13px; font-weight:600;">
                                    </td>
                                    <td style="padding:4px 6px; text-align:center;">
                                        <span id="sa2_total_${i}" style="font-weight:700; font-size:14px; color:#233d91;">0</span>
                                        <span style="font-size:10px; color:#888;">/100</span>
                                    </td>
                                    <td style="padding:4px 6px; text-align:center;">
                                        <span id="sa2_pct_${i}" style="font-size:12px; color:#555;">—</span>
                                    </td>
                                    <td style="padding:4px 6px; text-align:center;">
                                        <span id="sa2_grade_${i}" style="padding:3px 10px; border-radius:12px;
                                              font-size:12px; font-weight:bold; background:#e5e7eb; color:#555;">—</span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="background:#eef1fb; border-top:2px solid #233d91;">
                                <td colspan="2" style="padding:10px 14px; font-weight:700; font-size:13px; color:#233d91;">
                                    GRAND TOTAL (/${subjects.length * 100})
                                </td>
                                <td id="liveSA2SATotal" style="padding:10px 8px; text-align:center; font-size:13px; color:#555;">0</td>
                                <td id="liveIntTotal" style="padding:10px 8px; text-align:center; font-size:13px; color:#0a7a0a;">0</td>
                                <td style="padding:10px 8px; text-align:center; font-weight:700; font-size:15px; color:#233d91;">
                                    <span id="liveTotal">0</span>
                                </td>
                                <td style="text-align:center;">
                                    <span id="livePercent" style="font-size:11px; color:#666; font-weight:bold;">0.0%</span>
                                </td>
                                <td style="text-align:center;">
                                    <span id="liveTotalGrade" style="padding:3px 10px; border-radius:12px;
                                          font-size:13px; font-weight:bold; background:#e5e7eb; color:#555;">—</span>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>`;
    }
}

// ─── LIVE UPDATE FUNCTIONS ─────────────────────────────────────────────────

// FA sub-total live update (classes 6-10)
function updateFASubTotal(subjectIndex) {
    let total = 0;
    FA_SUB_MAX.forEach((mx, j) => {
        const el = document.getElementById(`m_s${subjectIndex}_fa${j}`);
        if (el) {
            const val = Math.min(parseInt(el.value) || 0, mx);
            el.value = val;
            total += val;
        }
    });
    const totalEl = document.getElementById(`fa_total_${subjectIndex}`);
    const gradeEl = document.getElementById(`fa_grade_${subjectIndex}`);
    if (totalEl) totalEl.textContent = total;
    if (gradeEl) {
        const pct = (total / 50) * 100;
        const grade = calcGrade(pct);
        gradeEl.textContent = grade;
        gradeEl.style.background = gradeColor(grade);
        gradeEl.style.color = '#fff';
    }
}

// SA1 row live update
function updateSARow(idx, max) {
    const el  = document.getElementById(`m_s${idx}`);
    const val = Math.min(parseInt(el?.value) || 0, max);
    if (el) el.value = val;
    const pct   = max > 0 ? (val / max) * 100 : 0;
    const grade = calcGrade(pct);

    const pctEl   = document.getElementById(`sa_pct_${idx}`);
    const gradeEl = document.getElementById(`sa_grade_${idx}`);
    if (pctEl)   pctEl.textContent = pct.toFixed(1) + '%';
    if (gradeEl) {
        gradeEl.textContent = grade;
        gradeEl.style.background = gradeColor(grade);
        gradeEl.style.color = '#fff';
    }

    // update grand total
    const cls      = document.getElementById('m_class').value;
    const subjects = getSubjects(cls);
    let grandTotal = 0;
    subjects.forEach((_, i) => {
        const v = parseInt(document.getElementById(`m_s${i}`)?.value) || 0;
        grandTotal += v;
    });
    const maxTotal = subjects.length * max;
    const totalPct = maxTotal > 0 ? (grandTotal / maxTotal) * 100 : 0;
    const tGrade   = calcGrade(totalPct);

    const totalEl  = document.getElementById('liveTotal');
    const percentEl= document.getElementById('livePercent');
    const tGradeEl = document.getElementById('liveTotalGrade');
    if (totalEl)   totalEl.textContent  = grandTotal;
    if (percentEl) percentEl.textContent = totalPct.toFixed(1) + '%';
    if (tGradeEl) {
        tGradeEl.textContent = tGrade;
        tGradeEl.style.background = gradeColor(tGrade);
        tGradeEl.style.color = '#fff';
    }
}

// SA2 row live update (SA 80 + internals 20 = 100)
function updateSA2Row(idx) {
    const saEl  = document.getElementById(`m_s${idx}`);
    const intEl = document.getElementById(`m_int${idx}`);
    const sa    = Math.min(parseInt(saEl?.value)  || 0, 80);
    const intM  = Math.min(parseInt(intEl?.value) || 0, 20);
    if (saEl)  saEl.value  = sa;
    if (intEl) intEl.value = intM;

    const total = sa + intM;
    const pct   = (total / 100) * 100;
    const grade = calcGrade(pct);

    const tEl = document.getElementById(`sa2_total_${idx}`);
    const pEl = document.getElementById(`sa2_pct_${idx}`);
    const gEl = document.getElementById(`sa2_grade_${idx}`);
    if (tEl) tEl.textContent = total;
    if (pEl) pEl.textContent = pct.toFixed(1) + '%';
    if (gEl) { gEl.textContent = grade; gEl.style.background = gradeColor(grade); gEl.style.color = '#fff'; }

    // grand totals
    const cls      = document.getElementById('m_class').value;
    const subjects = getSubjects(cls);
    let grandSA = 0, grandInt = 0, grandTotal = 0;
    subjects.forEach((_, i) => {
        grandSA    += Math.min(parseInt(document.getElementById(`m_s${i}`)?.value)    || 0, 80);
        grandInt   += Math.min(parseInt(document.getElementById(`m_int${i}`)?.value)  || 0, 20);
        grandTotal += (Math.min(parseInt(document.getElementById(`m_s${i}`)?.value)   || 0, 80) +
                       Math.min(parseInt(document.getElementById(`m_int${i}`)?.value) || 0, 20));
    });
    const maxTotal = subjects.length * 100;
    const totalPct = maxTotal > 0 ? (grandTotal / maxTotal) * 100 : 0;
    const tGrade   = calcGrade(totalPct);

    const saTotEl  = document.getElementById('liveSA2SATotal');
    const intTotEl = document.getElementById('liveIntTotal');
    const totalEl  = document.getElementById('liveTotal');
    const percentEl= document.getElementById('livePercent');
    const tGradeEl = document.getElementById('liveTotalGrade');
    if (saTotEl)   saTotEl.textContent  = grandSA;
    if (intTotEl)  intTotEl.textContent = grandInt;
    if (totalEl)   totalEl.textContent  = grandTotal;
    if (percentEl) percentEl.textContent = totalPct.toFixed(1) + '%';
    if (tGradeEl) {
        tGradeEl.textContent = tGrade;
        tGradeEl.style.background = gradeColor(tGrade);
        tGradeEl.style.color = '#fff';
    }
}

// Primary subject grade (unchanged)
function updateSubjectGrade(idx, max) {
    const val   = parseInt(document.getElementById(`m_s${idx}`)?.value) || 0;
    const pct   = max > 0 ? (val / max) * 100 : 0;
    const grade = calcGrade(pct);
    const badge = document.getElementById(`grade_s${idx}`);
    if (badge) { badge.textContent = grade; badge.style.background = gradeColor(grade); badge.style.color = '#fff'; }

    const cls      = document.getElementById('m_class').value;
    const subjects = getSubjects(cls);
    let total = 0;
    subjects.forEach((_, i) => {
        if (isPrimaryClass(cls) ? i < 5 : true)
            total += parseInt(document.getElementById(`m_s${i}`)?.value) || 0;
    });

    const totalEl   = document.getElementById('liveTotal');
    const tGradeEl  = document.getElementById('liveTotalGrade');
    const percentEl = document.getElementById('livePercent');
    if (totalEl) totalEl.textContent = total;
    if (tGradeEl) {
        const maxT     = isPrimaryClass(cls) ? (max * 5) : (max * subjects.length);
        const totalPct = maxT > 0 ? (total / maxT) * 100 : 0;
        const tGrade   = calcGrade(totalPct);
        if (percentEl) percentEl.textContent = totalPct.toFixed(1) + '%';
        tGradeEl.textContent = tGrade;
        tGradeEl.style.background = gradeColor(tGrade);
        tGradeEl.style.color = '#fff';
    }
}

function calcGrade(pct) {
    if (pct >= 90) return 'A+';
    if (pct >= 75) return 'A';
    if (pct >= 60) return 'B';
    if (pct >= 40) return 'C';
    return 'D';
}

function filterStudentsByClass() {
    const cls     = document.getElementById('m_class').value;
    const section = document.getElementById('m_section').value;
    const select  = document.getElementById('m_reg');
    if (!cls || !section) {
        select.innerHTML = '<option value="">-- Select Class & Section First --</option>';
        return;
    }
    const filtered = students.filter(s => String(s.class) === String(cls) && s.section === section);
    select.innerHTML = filtered.length
        ? `<option value="">-- Select Student --</option>` +
          filtered.map(s => `<option value="${s.admissionNo}">${String(s.admissionNo).padStart(4,'0')} - ${s.name}</option>`).join('')
        : `<option value="">No students in ${cls}-${section}</option>`;
}

// ─── SUBMIT MARKS ─────────────────────────────────────────────────────────

async function submitMarks(e) {
    e.preventDefault();
    const reg     = document.getElementById('m_reg').value;
    const exam    = document.getElementById('m_exam').value;
    const cls     = document.getElementById('m_class').value;
    const section = document.getElementById('m_section').value;
    if (!reg || !exam) return alert('Please select student and exam.');

    const subjects = getSubjects(cls);
    let marks = [];
    let internals = [];
    let finalTotal = 0;
    let maxT = 0;

    if (isSecondaryOrAbove(cls) && FA_EXAMS.includes(exam)) {
        // FA: collect 4 sub-scores per subject, store as sum per subject
        marks = subjects.map((_, i) => {
            let subTotal = 0;
            FA_SUB_MAX.forEach((mx, j) => {
                subTotal += Math.min(parseInt(document.getElementById(`m_s${i}_fa${j}`)?.value) || 0, mx);
            });
            return subTotal;
        });
        finalTotal = marks.reduce((a, b) => a + b, 0);
        maxT = subjects.length * 50;

    } else if (isSecondaryOrAbove(cls) && exam === 'SA2') {
        // SA2: SA + internals per subject
        marks = subjects.map((_, i) =>
            Math.min(parseInt(document.getElementById(`m_s${i}`)?.value) || 0, 80)
        );
        internals = subjects.map((_, i) =>
            Math.min(parseInt(document.getElementById(`m_int${i}`)?.value) || 0, 20)
        );
        finalTotal = marks.reduce((a, b) => a + b, 0) + internals.reduce((a, b) => a + b, 0);
        maxT = subjects.length * 100;

    } else if (isSecondaryOrAbove(cls) && exam === 'SA1') {
        marks = subjects.map((_, i) =>
            Math.min(parseInt(document.getElementById(`m_s${i}`)?.value) || 0, 80)
        );
        finalTotal = marks.reduce((a, b) => a + b, 0);
        maxT = subjects.length * 80;

    } else {
        // Primary
        const max = getMaxPerSubject(exam, cls);
        marks = subjects.map((_, i) => {
            const val = parseInt(document.getElementById(`m_s${i}`)?.value);
            return isNaN(val) ? 0 : Math.min(val, max);
        });
        while (marks.length < 8) marks.push(0);
        if (isPrimaryClass(cls)) {
            for (let i = 0; i < 5; i++) finalTotal += marks[i];
            maxT = max * 5;
        } else {
            finalTotal = marks.reduce((a, b) => a + b, 0);
            maxT = max * subjects.length;
        }
    }

    const finalGrade = calcGrade((finalTotal / maxT) * 100);
    const regSelect  = document.getElementById('m_reg');
    const studentName = regSelect.options[regSelect.selectedIndex].text.split(' - ')[1] || '';

    const payload = {
        reg: parseInt(reg), name: studentName,
        class: parseInt(cls), section, exam,
        marks, total: finalTotal, grade: finalGrade
    };
    if (internals.length) payload.internals = internals;

    try {
        await apiRequest('/marks', { method: 'POST', body: JSON.stringify(payload) });
        alert('Marks saved successfully!');
        closeModal();
        loadAndRenderMarks();
    } catch (err) { alert('Error: ' + err.message); }
}

// ─── VIEW MARKS ────────────────────────────────────────────────────────────

function viewMarks(id) {
    const m = (window._allMarks || []).find(m => m.id === id);
    if (!m) return alert('Record not found.');

    const student    = (students || []).find(s => s.admissionNo == m.reg);
    const cls        = m.class || student?.class || '';
    const subjects   = getSubjects(cls);
    const max        = getMaxPerSubject(m.exam, cls);
    const marksArray = Array.isArray(m.marks) ? m.marks : [];
    const intArray   = Array.isArray(m.internals) ? m.internals : [];

    let total = 0, maxTotal = 0;
    if (isPrimaryClass(cls)) {
        for (let i = 0; i < 5; i++) total += (marksArray[i] || 0);
        maxTotal = max * 5;
    } else {
        total    = m.total ?? marksArray.reduce((a, b) => a + b, 0);
        maxTotal = m.exam === 'SA2' ? subjects.length * 100
                 : m.exam === 'SA1' ? subjects.length * 80
                 : FA_EXAMS.includes(m.exam) ? subjects.length * 50
                 : max * subjects.length;
    }
    const percentage = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : '0.0';

    modal.style.display = 'flex';
    modalBody.innerHTML = `
        <div style="padding:20px;">
            <div style="text-align:center; border-bottom:2px solid #233d91; padding-bottom:10px; margin-bottom:20px;">
                <h2 style="color:#233d91; margin:0;">MARK SHEET</h2>
            </div>
            <div style="background:#233d91; color:#fff; padding:10px 16px; border-radius:6px;
                        margin-bottom:16px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:6px;">
                <span style="font-size:15px; font-weight:bold;">👤 ${m.name || student?.name || '-'}</span>
                <span style="font-size:12px; opacity:0.85;">Reg: ${m.reg} | Class: ${cls} | Exam: ${m.exam}</span>
            </div>
            <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:8px 12px; text-align:left; font-size:13px; color:#233d91;">Subject</th>
                        <th style="padding:8px 12px; text-align:center; font-size:13px; color:#233d91;">Marks</th>
                        ${m.exam === 'SA2' ? '<th style="padding:8px 12px; text-align:center; font-size:13px; color:#0a7a0a;">Internals</th><th style="padding:8px 12px; text-align:center; font-size:13px; color:#233d91;">Total</th>' : ''}
                        <th style="padding:8px 12px; text-align:center; font-size:13px; color:#233d91;">Max</th>
                        <th style="padding:8px 12px; text-align:center; font-size:13px; color:#233d91;">Grade</th>
                    </tr>
                </thead>
                <tbody>
                    ${subjects.map((sub, i) => {
                        const val     = marksArray[i] ?? '-';
                        const intVal  = intArray[i] ?? 0;
                        const rowMax  = m.exam === 'SA2' ? 100 : max;
                        const rowTotal= m.exam === 'SA2' ? ((typeof val==='number'?val:0) + intVal) : val;
                        const subGrade= typeof rowTotal === 'number' && rowMax > 0 ? calcGrade((rowTotal/rowMax)*100) : '—';
                        return `<tr style="border-bottom:1px solid #e2e8f0; ${i%2===0?'background:#f8fafc':''}">
                            <td style="padding:8px 12px; font-size:13px;">${sub}</td>
                            <td style="padding:8px 12px; text-align:center; font-size:13px; font-weight:600;">${val}</td>
                            ${m.exam === 'SA2' ? `<td style="padding:8px 12px; text-align:center; font-size:13px; color:#0a7a0a; font-weight:600;">${intVal}</td><td style="padding:8px 12px; text-align:center; font-size:13px; font-weight:700;">${rowTotal}</td>` : ''}
                            <td style="padding:8px 12px; text-align:center; font-size:13px; color:#888;">${rowMax}</td>
                            <td style="padding:8px 12px; text-align:center;">
                                <span style="padding:2px 8px; border-radius:10px; font-size:12px; font-weight:bold;
                                      background:${gradeColor(subGrade)}; color:#fff;">${subGrade}</span>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:20px;">
                <div style="background:#f1f5f9; padding:12px; border-radius:6px; text-align:center;">
                    <div style="font-size:11px; color:#555; font-weight:bold;">TOTAL</div>
                    <div style="font-size:20px; font-weight:bold; color:#233d91;">${total} / ${maxTotal}</div>
                </div>
                <div style="background:#f1f5f9; padding:12px; border-radius:6px; text-align:center;">
                    <div style="font-size:11px; color:#555; font-weight:bold;">PERCENTAGE</div>
                    <div style="font-size:20px; font-weight:bold; color:#233d91;">${percentage}%</div>
                </div>
                <div style="background:${gradeColor(m.grade)}; padding:12px; border-radius:6px; text-align:center;">
                    <div style="font-size:11px; color:#fff; font-weight:bold;">GRADE</div>
                    <div style="font-size:20px; font-weight:bold; color:#fff;">${m.grade}</div>
                </div>
            </div>
            <div style="display:flex; gap:12px; justify-content:flex-end;">
                <button onclick="printMarkSheet(${m.id})"
                    style="background:#233d91; color:#fff; border:none; padding:10px 28px;
                           border-radius:6px; cursor:pointer; font-size:14px; font-weight:600;">🖨️ Print</button>
                <button onclick="closeModal()"
                    style="background:#fff; color:#233d91; border:2px solid #233d91; padding:10px 28px;
                           border-radius:6px; cursor:pointer; font-size:14px; font-weight:600;">Close</button>
            </div>
        </div>`;
}

// ─── PRINT ─────────────────────────────────────────────────────────────────

function printMarkSheet(id) {
    const m = (window._allMarks || []).find(m => m.id === id);
    if (!m) return;
    const student    = (students || []).find(s => s.admissionNo == m.reg);
    const cls        = m.class || student?.class || '';
    const subjects   = getSubjects(cls);
    const max        = getMaxPerSubject(m.exam, cls);
    const marksArray = Array.isArray(m.marks) ? m.marks : [];
    const intArray   = Array.isArray(m.internals) ? m.internals : [];

    let total = 0, maxTotal = 0;
    if (isPrimaryClass(cls)) {
        for (let i = 0; i < 5; i++) total += (marksArray[i] || 0);
        maxTotal = max * 5;
    } else {
        total    = m.total ?? marksArray.reduce((a, b) => a + b, 0);
        maxTotal = m.exam === 'SA2' ? subjects.length * 100
                 : m.exam === 'SA1' ? subjects.length * 80
                 : FA_EXAMS.includes(m.exam) ? subjects.length * 50
                 : max * subjects.length;
    }
    const percentage = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : '0.0';

    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html>
<html><head><title>Mark Sheet - ${m.name}</title>
<style>
    body { font-family: Arial, sans-serif; padding: 30px; color:#333; }
    .header { text-align:center; border-bottom:3px double #233d91; padding-bottom:12px; margin-bottom:16px; }
    .banner { background:#233d91; color:#fff; padding:10px 16px; border-radius:6px; display:flex; justify-content:space-between; margin-bottom:16px; }
    table { width:100%; border-collapse:collapse; margin-bottom:16px; }
    th { background:#f1f5f9; padding:8px; text-align:left; color:#233d91; font-size:12px; }
    td { padding:8px; border-bottom:1px solid #eee; font-size:12px; }
    .summary { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin-top:20px; }
    .summary div { padding:10px; border-radius:6px; text-align:center; background:#f1f5f9; }
    .footer { display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; margin-top:40px; text-align:center; }
    .footer div { border-top:1px solid #333; padding-top:5px; font-size:11px; }
    @media print { body { padding:10px; } }
</style></head><body>
<div class="header"><h2>JACK AND JILL SCHOOL</h2><p>Official Mark Sheet</p></div>
<div class="banner">
    <span><strong>${m.name || student?.name}</strong></span>
    <span>Reg: ${m.reg} | Class: ${cls} | Exam: ${m.exam}</span>
</div>
<table>
    <thead><tr>
        <th>Subject</th>
        <th style="text-align:center;">Marks${m.exam==='SA2'?' (/80)':''}</th>
        ${m.exam === 'SA2' ? '<th style="text-align:center;">Internals (/20)</th><th style="text-align:center;">Total (/100)</th>' : ''}
        <th style="text-align:center;">Max</th>
        <th style="text-align:center;">Grade</th>
    </tr></thead>
    <tbody>
        ${subjects.map((sub, i) => {
            const val      = marksArray[i] ?? '-';
            const intVal   = intArray[i] ?? 0;
            const rowMax   = m.exam === 'SA2' ? 100 : max;
            const rowTotal = m.exam === 'SA2' ? ((typeof val==='number'?val:0) + intVal) : val;
            const subGrade = typeof rowTotal === 'number' && rowMax > 0 ? calcGrade((rowTotal/rowMax)*100) : '—';
            return `<tr>
                <td>${sub}</td>
                <td style="text-align:center; font-weight:bold;">${val}</td>
                ${m.exam === 'SA2' ? `<td style="text-align:center; color:#0a7a0a; font-weight:bold;">${intVal}</td><td style="text-align:center; font-weight:bold;">${rowTotal}</td>` : ''}
                <td style="text-align:center;">${rowMax}</td>
                <td style="text-align:center; color:${gradeColor(subGrade)}; font-weight:bold;">${subGrade}</td>
            </tr>`;
        }).join('')}
    </tbody>
</table>
<div class="summary">
    <div><strong>TOTAL</strong><br>${total} / ${maxTotal}</div>
    <div><strong>PERCENTAGE</strong><br>${percentage}%</div>
    <div style="background:${gradeColor(m.grade)}; color:#fff;"><strong>GRADE</strong><br>${m.grade}</div>
</div>
<div class="footer"><div>Parent Signature</div><div>Class Teacher</div><div>Principal</div></div>
</body></html>`);
    w.document.close();
    w.print();
}