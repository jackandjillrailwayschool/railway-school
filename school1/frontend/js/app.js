
let students = [];
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
const contentArea = document.getElementById('content');

// 1. INITIALIZATION
async function init() {
    if (!localStorage.getItem('authToken')) {
        window.location.href = 'index.html';
        return;
    }
    const role = localStorage.getItem('userRole') || 'Teacher';
    document.getElementById('userRoleBadge').innerText = role;
    document.getElementById('headerUserName').innerText = localStorage.getItem('userName') || 'Admin';
    await loadDashboardData();
    buildSidebar(role);
}

// 2. DATA LOADER
async function loadDashboardData() {
    const role = localStorage.getItem('userRole');
    try {
     students = (await apiRequest('/students') || []).map(normaliseStudent);
     
        console.log("Students loaded:", students.length);
        if (role !== 'Teacher') {
            await apiRequest('/fees').catch(() => []);
        }
    } catch (e) {
        console.warn("Database empty or restricted access.");
    }
}

// 3. SIDEBAR BUILDER
function buildSidebar(role) {
    const menu = {
        Teacher:    ['Student Records', 'Marks Management', 'Attendance'],
        Accountant: ['Fees Management', 'Student Records'],
        Principal:  ['Statistics', 'Student Records', 'Marks Management', 'Fees Collection', 'Attendance'],
        President:  ['User Management', 'Statistics'],
        Secretary:  ['Statistics', 'Student Records', 'Marks Management', 'Fees Collection', 'Attendance'],
    };
    const sidebar = document.getElementById('sidebarNav');
    sidebar.innerHTML = '';
    if (menu[role]) {
        menu[role].forEach(item => {
            const div = document.createElement('div');
            div.className = 'nav-item';
            div.innerText = item;
            div.onclick = () => {
                document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
                div.classList.add('active');
                renderSection(item);
            };
            sidebar.appendChild(div);
        });
        renderSection(menu[role][0]);
        sidebar.firstChild.classList.add('active');

        
    }
}

function renderSection(name) {
    document.getElementById('viewTitle').innerText = name;
    if      (name === 'Student Records')   renderStudents();
    else if (name === 'Marks Management')  renderMarks();
    else if (name === 'Fees Collection')   window.location.href = 'fees.html';
    else if (name === 'Attendance')        window.location.href = 'attendance.html';
    else if (name === 'Statistics')        renderStatistics();
    else if (name === 'User Management')   renderUserManagement();
    else contentArea.innerHTML = `<div class="card"><h3>${name}</h3><p>Module Loading...</p></div>`;
}

// 4. STUDENT TABLE
function renderStudents() {
    contentArea.innerHTML = `
        <div class="card">
            <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:20px;background:#f1f5f9;padding:14px;border-radius:8px;">
                <input type="text" id="stdSearch" onkeyup="filterStudents()" placeholder="Search Name / Adm No / Roll No..."
                    style="flex:1;min-width:180px;padding:10px;border-radius:6px;border:1px solid #ddd;">
                <select id="filterStdClass" onchange="filterStudents()" style="padding:10px;border-radius:6px;border:1px solid #ddd;background:#fff;font-size:14px;">
                    <option value="">All Classes</option>
                    ${[1,2,3,4,5,6,7,8,9,10].map(n=>`<option>${n}</option>`).join('')}
                </select>
                <select id="filterStdSection" onchange="filterStudents()" style="padding:10px;border-radius:6px;border:1px solid #ddd;background:#fff;font-size:14px;">
                    <option value="">All Sections</option>
                    ${['A','B','C','D','E','F'].map(s=>`<option>${s}</option>`).join('')}
                </select>
                <button class="btn-primary" style="width:auto;padding:10px 20px;" onclick="openStudentModal()">+ Add New Admission</button>
            </div>
            <div id="stdTableWrapper"></div>
        </div>`;
    filterStudents();
}

function updateStudentTable(list) {
    const wrapper = document.getElementById('stdTableWrapper');
    if (!list || list.length === 0) {
        wrapper.innerHTML = "<p style='text-align:center;padding:20px;'>No students found.</p>";
        return;
    }
    wrapper.innerHTML = `<table>
        <thead>
            <tr>
                <th>Adm. No</th>
                <th>Roll No</th>
                <th>Name</th>
                <th>Class/Sec</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${list.map(s => `<tr>
                <td><strong>${s.admissionNo}</strong></td>
                <td>${s.studentId}</td>
                <td>${s.name}</td>
                <td>${s.class}-${s.section}</td>
               <td>
    <button class="action-btn view"   onclick="viewFullProfile('${s.admissionNo}')">View</button>
    <button class="action-btn edit"   onclick="editStudent('${s.admissionNo}')">Edit</button>
    <button class="action-btn delete" onclick="deleteStudent('${s.studentId}')">Delete</button>
                    <button class="action-btn" style="background:#7c3aed;color:#fff;"
                       
                       onclick="openRemarks('\${s.studentId}','\${s.admissionNo}','\${s.name}')">Remarks</button>
                    <button class="action-btn" style="background:#0369a1;color:#fff;" onclick="setStudentPassword('\${s.admissionNo}','\${s.name}')">?? Set Password</button>
                    <button class="action-btn" style="background:#0369a1;color:#fff;" onclick="setStudentPassword('${s.admissionNo}','${s.name}')">🔑 Set Password</button>
                    <td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

// 5. REGISTRATION FORM
function openStudentModal() {
    modal.style.display = 'flex';
    modalBody.innerHTML = `
        <h2 style="text-align:center;color:#233d91;border-bottom:2px solid #233d91;padding-bottom:10px;">ADMISSION APPLICATION</h2>
        <form id="stdForm" class="form-grid" style="max-height:80vh;overflow-y:auto;padding:20px;">

            <div style="grid-column:span 2;background:#f1f5f9;padding:8px;font-weight:bold;">OFFICE USE</div>
            <div><label>Adm No</label><input id="f_admNo" required placeholder="Enter Admission Number"></div>
            <div><label>Roll No</label><input id="f_reg"   required placeholder="Enter Roll Number"></div>
            <div><label>Class</label><select id="f_class">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<option>${n}</option>`).join('')}</select></div>
            <div><label>Section</label><select id="f_sec">${['A','B','C','D','E','F'].map(s=>`<option>${s}</option>`).join('')}</select></div>

            <div style="grid-column:span 2;background:#f1f5f9;padding:8px;font-weight:bold;margin-top:10px;">STUDENT DETAILS</div>
            <div style="grid-column:span 2"><label>1. Name (Block Letters)</label><input id="f_name" style="text-transform:uppercase" required></div>
            <div><label>2. Mother Tongue</label><input id="f_mt" required></div>
            <div><label>3a. Date of Birth</label><input type="date" id="f_dob" required></div>
            <div><label>3b. Place of Birth</label><input id="f_pob" required></div>
            <div><label>3c. Aadhaar (Child)</label><input id="f_ac"></div>
            <div><label>Blood Group</label>
                <select id="f_bc">
                    <option value="">-- Select --</option>
                    <option>A+</option><option>A-</option><option>B+</option><option>B-</option>
                    <option>AB+</option><option>AB-</option><option>O+</option><option>O-</option>
                </select>
            </div>
            <div><label>3d. Aadhaar (Mother)</label><input id="f_am"></div>
            <div><label>3e. Aadhaar (Father)</label><input id="f_af"></div>
            <div><label>4. Nationality/State</label><input id="f_nat" required></div>
            <div><label>5. Religion/Caste</label><input id="f_rel" required></div>

            <div style="grid-column:span 2;background:#f1f5f9;padding:8px;font-weight:bold;margin-top:10px;">PARENT / GUARDIAN</div>
            <div><label>6a. Parent Name</label><input id="f_pname" required></div>
            <div><label>6c. Mobile Number</label><input id="f_mob" required></div>
            <div><label>Occupation</label><input id="f_occ"></div>
            <div><label>Railway Employee?</label>
                <select id="f_rly"><option value="No">No</option><option value="Yes">Yes</option></select>
            </div>
            <div style="grid-column:span 2"><label>6b. Permanent Address</label><textarea id="f_addr"></textarea></div>

            <div style="grid-column:span 2;background:#f1f5f9;padding:8px;font-weight:bold;margin-top:10px;">GUARDIAN</div>
            <div><label>7a. Guardian Name</label><input id="f_gn"></div>
            <div><label>7b. Occupation</label><input id="f_go"></div>
            <div style="grid-column:span 2"><label>7c. Guardian Address</label><textarea id="f_ga"></textarea></div>

            <div style="grid-column:span 2;background:#f1f5f9;padding:8px;font-weight:bold;margin-top:10px;">ACADEMIC</div>
            <div><label>8. Class Last Studied</label><input id="f_lc"></div>
            <div><label>8. School Last Studied</label><input id="f_ls"></div>
            <div><label>9. Date of TC</label><input type="date" id="f_tc"></div>
            <div><label>10. Medium</label><input id="f_med" value="English"></div>
            <div><label>11a. 1st Language</label><input id="f_l1"></div>
            <div><label>11b. 2nd Language</label><input id="f_l2"></div>
            <div><label>12. Mark 1</label><input id="f_m1"></div>
            <div><label>12. Mark 2</label><input id="f_m2"></div>
            <div><label>13. PEN Number</label><input id="f_pen"></div>
            <div style="grid-column:span 2"><label>Remarks</label><textarea id="f_rem"></textarea></div>

            <div style="grid-column:span 2;padding-top:20px;display:flex;gap:12px;">
                <button type="submit" class="btn-primary" style="flex:1;height:50px;">REGISTER &amp; REFRESH LIST</button>
                <button type="button" onclick="closeModal()" style="flex:1;height:50px;background:#fff;color:#233d91;border:2px solid #233d91;border-radius:6px;cursor:pointer;font-size:15px;font-weight:600;">Cancel</button>
            </div>
        </form>`;

    document.getElementById('stdForm').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            admissionNo:       document.getElementById('f_admNo').value.trim(),
            studentId:         document.getElementById('f_reg').value.trim(),
            reg:               document.getElementById('f_reg').value.trim(),
            class:             document.getElementById('f_class').value,
            section:           document.getElementById('f_sec').value,
            name:              document.getElementById('f_name').value.toUpperCase(),
            motherTongue:      document.getElementById('f_mt').value,
            dob:               document.getElementById('f_dob').value,
            placeOfBirth:      document.getElementById('f_pob').value,
            aadhaarStudent:    document.getElementById('f_ac').value,
            bloodStudent:      document.getElementById('f_bc').value,
            motherAadhaar:     document.getElementById('f_am').value,
            fatherAadhaar:     document.getElementById('f_af').value,
            nationality:       document.getElementById('f_nat').value,
            religionCaste:     document.getElementById('f_rel').value,
            pname:             document.getElementById('f_pname').value,
            parentMob:         document.getElementById('f_mob').value,
            occupation:        document.getElementById('f_occ').value,
            isRailwayEmployee: document.getElementById('f_rly').value,
            addr:              document.getElementById('f_addr').value,
            guardianName:      document.getElementById('f_gn').value,
            guardianOccupation:document.getElementById('f_go').value,
            guardianAddress:   document.getElementById('f_ga').value,
            lastClass:         document.getElementById('f_lc').value,
            prevSchool:        document.getElementById('f_ls').value,
            tcDate:            document.getElementById('f_tc').value || null,
            medium:            document.getElementById('f_med').value,
            lang1:             document.getElementById('f_l1').value,
            lang2:             document.getElementById('f_l2').value,
            mark1:             document.getElementById('f_m1').value,
            mark2:             document.getElementById('f_m2').value,
            penNumber:         document.getElementById('f_pen').value,
            rem:               document.getElementById('f_rem').value,
            jDate:             new Date().toISOString().split('T')[0]
        };
        try {
            await apiRequest('/students', { method: 'POST', body: JSON.stringify(data) });
            alert('SUCCESS: Student registered!');
            closeModal();
            await loadDashboardData();
            renderStudents();
        } catch (err) { alert(err.message); }
    };
}

// 6. VIEW FULL PROFILE  ← KEY FIX: robust string lookup + all fields shown
function profileRow(label, value) {
    return `
        <div class="profile-row">
            <span class="profile-label">${label}</span>
            <span class="profile-value">${(value !== undefined && value !== null && value !== '') ? value : '-'}</span>
        </div>`;
}

function normaliseStudent(raw) {
    const s = { ...raw };
 
    // ── identity ──────────────────────────────────────────────────────
    s.admissionNo       = s.admissionNo       ?? s.admission_no       ?? s.admno        ?? '';
    s.studentId         = s.studentId         ?? s.student_id         ?? s.reg          ?? s.rollNo ?? '';
 
    // ── personal ──────────────────────────────────────────────────────
    s.name              = s.name              ?? '';
    s.dob               = s.dob               ?? s.date_of_birth      ?? s.dateOfBirth  ?? '';
    s.placeOfBirth      = s.placeOfBirth      ?? s.place_of_birth     ?? s.pob          ?? '';
    s.motherTongue      = s.motherTongue      ?? s.mother_tongue      ?? s.mt           ?? '';
    s.nationality       = s.nationality       ?? s.nat                ?? '';
    s.religionCaste     = s.religionCaste     ?? s.religion_caste     ?? s.religion     ?? s.rel ?? '';
    s.aadhaarStudent    = s.aadhaarStudent    ?? s.aadhaar_student    ?? s.aadhaarChild ?? s.ac  ?? '';
    s.bloodStudent      = s.bloodStudent      ?? s.blood_group        ?? s.bloodGroup   ?? s.bc  ?? '';
    s.motherAadhaar     = s.motherAadhaar     ?? s.mother_aadhaar     ?? s.am           ?? '';
    s.fatherAadhaar     = s.fatherAadhaar     ?? s.father_aadhaar     ?? s.af           ?? '';
 
    // ── parent / guardian ─────────────────────────────────────────────
    s.pname             = s.pname             ?? s.parent_name        ?? s.parentName   ?? '';
    s.parentMob         = s.parentMob         ?? s.parent_mob         ?? s.mobile       ?? s.mob ?? '';
    s.occupation        = s.occupation        ?? s.occ                ?? '';
    s.isRailwayEmployee = s.isRailwayEmployee ?? s.is_railway_employee?? s.railway      ?? 'No';
    s.addr              = s.addr              ?? s.address            ?? '';
    s.guardianName      = s.guardianName      ?? s.guardian_name      ?? s.gn           ?? '';
    s.guardianOccupation= s.guardianOccupation?? s.guardian_occupation?? s.go           ?? '';
    s.guardianAddress   = s.guardianAddress   ?? s.guardian_address   ?? s.ga           ?? '';
 
    // ── academic ──────────────────────────────────────────────────────
    s.lastClass         = s.lastClass         ?? s.last_class         ?? s.lc           ?? '';
    s.prevSchool        = s.prevSchool        ?? s.prev_school        ?? s.ls           ?? '';
    s.tcDate            = s.tcDate            ?? s.tc_date            ?? s.tc           ?? '';
    s.medium            = s.medium            ?? s.med                ?? 'English';
    s.lang1             = s.lang1             ?? s.l1                 ?? '';
    s.lang2             = s.lang2             ?? s.l2                 ?? '';
    s.mark1             = s.mark1             ?? s.m1                 ?? '';
    s.mark2             = s.mark2             ?? s.m2                 ?? '';
    s.penNumber         = s.penNumber         ?? s.pen_number         ?? s.pen          ?? '';
    s.rem               = s.rem               ?? s.remarks            ?? '';
    s.jDate             = s.jDate             ?? s.j_date             ?? s.joiningDate  ?? '';
 
    // ── class / section ───────────────────────────────────────────────
    s.class             = s.class             ?? s.className          ?? s.std          ?? '';
    s.section           = s.section           ?? s.sec                ?? '';
 
    return s;
}
 
// ── call normaliseStudent right after the API returns the list ────────
// In loadDashboardData(), change:
//   students = await apiRequest('/students') || [];
// to:
//   students = (await apiRequest('/students') || []).map(normaliseStudent);
// ─────────────────────────────────────────────────────────────────────
 
function profileRow(label, value) {
    const display = (value !== undefined && value !== null && String(value).trim() !== '')
        ? value : '-';
    return `
        <div class="profile-row">
            <span class="profile-label">${label}</span>
            <span class="profile-value">${display}</span>
        </div>`;
}
 
// 6. VIEW FULL PROFILE  ── now uses normaliseStudent for safety
function viewFullProfile(admissionNo) {
    const raw = students.find(st => String(st.admissionNo) === String(admissionNo));
    if (!raw) { alert('Student data not found. Please refresh the page.'); return; }
    const s = normaliseStudent(raw);
    window._printStudent = s;
 
    modal.style.display = 'flex';
    modalBody.innerHTML = `
        <div id="printArea">
            <div class="print-header">
                <h2>JACK AND JILL SCHOOL</h2>
                <p>Student Admission Profile</p>
            </div>
            <div class="profile-grid">
                ${profileRow('Admission No',        s.admissionNo)}
                ${profileRow('Roll No',             s.studentId)}
                ${profileRow('Name',                s.name)}
                ${profileRow('Class / Section',     s.class + ' - ' + s.section)}
                ${profileRow('Date of Birth',       s.dob)}
                ${profileRow('Place of Birth',      s.placeOfBirth)}
                ${profileRow('Mother Tongue',       s.motherTongue)}
                ${profileRow('Nationality',         s.nationality)}
                ${profileRow('Religion / Caste',    s.religionCaste)}
                ${profileRow('Aadhaar (Student)',   s.aadhaarStudent)}
                ${profileRow('Blood Group',         s.bloodStudent)}
                ${profileRow('Aadhaar (Mother)',    s.motherAadhaar)}
                ${profileRow('Aadhaar (Father)',    s.fatherAadhaar)}
                ${profileRow('Parent Name',         s.pname)}
                ${profileRow('Mobile',              s.parentMob)}
                ${profileRow('Occupation',          s.occupation)}
                ${profileRow('Railway Employee',    s.isRailwayEmployee)}
                ${profileRow('Address',             s.addr)}
                ${profileRow('Guardian Name',       s.guardianName)}
                ${profileRow('Guardian Occupation', s.guardianOccupation)}
                ${profileRow('Guardian Address',    s.guardianAddress)}
                ${profileRow('Last Class Studied',  s.lastClass)}
                ${profileRow('Previous School',     s.prevSchool)}
                ${profileRow('TC Date',             s.tcDate)}
                ${profileRow('Medium',              s.medium)}
                ${profileRow('Languages',           (s.lang1 || '-') + ' / ' + (s.lang2 || '-'))}
                ${profileRow('Marks',               (s.mark1 || '-') + ' / ' + (s.mark2 || '-'))}
                ${profileRow('PEN Number',          s.penNumber)}
                ${profileRow('Joining Date',        s.jDate)}
                ${profileRow('Remarks',             s.rem)}
            </div>
        </div>
        <div class="profile-actions">
            <button class="btn-primary" style="width:auto" onclick="printProfile()">🖨️ Print</button>
            <button class="btn-secondary" onclick="closeModal()">Close</button>
        </div>`;
}
 
// printProfile — unchanged logic, but now uses already-normalised _printStudent
function printProfile() {
    const s = window._printStudent;
    if (!s) return alert('No student data to print.');
    function r(label, value) {
        const display = (value !== undefined && value !== null && String(value).trim() !== '') ? value : '-';
        return `<tr>
            <td style="padding:4px 10px;font-weight:bold;font-size:11px;color:#233d91;
                border-right:2px solid #c8d3e8;width:35%;border-bottom:1px solid #e2e8f0;">${label}</td>
            <td style="padding:4px 10px;font-size:11px;border-bottom:1px solid #e2e8f0;">${display}</td>
        </tr>`;
    }
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Profile - ${s.name}</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:Arial,sans-serif;padding:20px;color:#1a1a1a;}
        .print-header{text-align:center;margin-bottom:12px;padding-bottom:10px;border-bottom:3px double #233d91;}
        .print-header h2{font-size:18px;color:#233d91;letter-spacing:1px;}
        .print-header p{font-size:11px;color:#555;margin-top:3px;}
        .name-banner{background:#233d91;color:#fff;padding:8px 16px;border-radius:4px;
            margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;}
        .student-name{font-size:15px;font-weight:bold;letter-spacing:1px;}
        .student-meta{font-size:11px;opacity:0.85;text-align:right;line-height:1.6;}
        table{width:100%;border-collapse:collapse;border:1px solid #c8d3e8;}
        tr:nth-child(odd){background:#f7f9fc;}tr:nth-child(even){background:#fff;}
        .print-footer{margin-top:50px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;text-align:center;}
        .print-footer div{border-top:2px solid #333;padding-top:10px;font-size:10px;color:#444;}
        @media print{body{padding:10px;}@page{margin:10mm;size:A4 portrait;}}
    </style></head><body>
    <div class="print-header"><h2>JACK AND JILL SCHOOL</h2><p>Student Admission Profile</p></div>
    <div class="name-banner">
        <div class="student-name">&#128100; ${s.name}</div>
        <div class="student-meta">Adm. No: ${s.admissionNo} &nbsp;|&nbsp; Roll No: ${s.studentId}<br>
            Class: ${s.class} - ${s.section} &nbsp;|&nbsp; DOB: ${s.dob || '-'}</div>
    </div>
    <table>
        ${r('Admission No',        s.admissionNo)}
        ${r('Roll No',             s.studentId)}
        ${r('Name',                s.name)}
        ${r('Class / Section',     s.class + ' - ' + s.section)}
        ${r('Date of Birth',       s.dob)}
        ${r('Place of Birth',      s.placeOfBirth)}
        ${r('Mother Tongue',       s.motherTongue)}
        ${r('Nationality',         s.nationality)}
        ${r('Religion / Caste',    s.religionCaste)}
        ${r('Aadhaar (Student)',   s.aadhaarStudent)}
        ${r('Blood Group',         s.bloodStudent)}
        ${r('Aadhaar (Mother)',    s.motherAadhaar)}
        ${r('Aadhaar (Father)',    s.fatherAadhaar)}
        ${r('Parent Name',         s.pname)}
        ${r('Mobile',              s.parentMob)}
        ${r('Occupation',          s.occupation)}
        ${r('Railway Employee',    s.isRailwayEmployee)}
        ${r('Address',             s.addr)}
        ${r('Guardian Name',       s.guardianName)}
        ${r('Guardian Occupation', s.guardianOccupation)}
        ${r('Guardian Address',    s.guardianAddress)}
        ${r('Last Class Studied',  s.lastClass)}
        ${r('Previous School',     s.prevSchool)}
        ${r('TC Date',             s.tcDate)}
        ${r('Medium',              s.medium)}
        ${r('Languages',           (s.lang1||'-') + ' / ' + (s.lang2||'-'))}
        ${r('Marks',               (s.mark1||'-') + ' / ' + (s.mark2||'-'))}
        ${r('PEN Number',          s.penNumber)}
        ${r('Joining Date',        s.jDate)}
        ${r('Remarks',             s.rem)}
    </table>
    <div class="print-footer">
        <div>Parent / Guardian Signature</div>
        <div>Class Teacher Signature</div>
        <div>Principal Signature</div>
    </div></body></html>`);
    w.document.close();
    w.print();
}
// 7. FILTER
function filterStudents() {
    const q       = (document.getElementById('stdSearch').value || '').toLowerCase();
    const cls     = document.getElementById('filterStdClass').value;
    const section = document.getElementById('filterStdSection').value;
    const filtered = students.filter(s => {
        const matchText    = s.name.toLowerCase().includes(q) ||
                             String(s.studentId).toLowerCase().includes(q) ||
                             String(s.admissionNo).toLowerCase().includes(q);
        const matchClass   = !cls     || String(s.class)   === String(cls);
        const matchSection = !section || s.section         === section;
        return matchText && matchClass && matchSection;
    });
    updateStudentTable(filtered);
}

function closeModal() { modal.style.display = 'none'; }
function logout() { localStorage.clear(); window.location.href = 'index.html'; }

// 8. EDIT STUDENT
function editStudent(admissionNo) {
    const raw = students.find(st => String(st.admissionNo) === String(admissionNo));
    if (!raw) return alert('Student not found.');
    const s = normaliseStudent(raw);
 
    modal.style.display = 'flex';
    modalBody.innerHTML = `
        <h2 style="text-align:center;color:#233d91;border-bottom:2px solid #233d91;padding-bottom:10px;">EDIT STUDENT</h2>
        <form id="editForm" class="form-grid" style="max-height:80vh;overflow-y:auto;padding:20px;">
 
            <div style="grid-column:span 2;background:#f1f5f9;padding:8px;font-weight:bold;">OFFICE USE</div>
            <div><label>Adm No</label><input id="e_admNo" value="${s.admissionNo}" required></div>
            <div><label>Roll No</label><input id="e_reg"   value="${s.studentId}"  required></div>
            <div><label>Class</label><select id="e_class">
                ${[1,2,3,4,5,6,7,8,9,10].map(n=>`<option ${String(s.class)==String(n)?'selected':''}>${n}</option>`).join('')}
            </select></div>
            <div><label>Section</label><select id="e_sec">
                ${['A','B','C','D','E','F'].map(x=>`<option ${s.section===x?'selected':''}>${x}</option>`).join('')}
            </select></div>
 
            <div style="grid-column:span 2;background:#f1f5f9;padding:8px;font-weight:bold;margin-top:10px;">STUDENT DETAILS</div>
            <div style="grid-column:span 2"><label>Name</label>
                <input id="e_name" value="${s.name}" style="text-transform:uppercase" required></div>
            <div><label>Mother Tongue</label><input id="e_mt"  value="${s.motherTongue}"></div>
            <div><label>Date of Birth</label><input type="date" id="e_dob" value="${s.dob}"></div>
            <div><label>Place of Birth</label><input id="e_pob" value="${s.placeOfBirth}"></div>
            <div><label>Aadhaar (Child)</label><input id="e_ac" value="${s.aadhaarStudent}"></div>
            <div><label>Blood Group</label><select id="e_bc">
                <option value="">-- Select --</option>
                ${['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg=>
                    `<option ${s.bloodStudent===bg?'selected':''}>${bg}</option>`).join('')}
            </select></div>
            <div><label>Aadhaar (Mother)</label><input id="e_am"  value="${s.motherAadhaar}"></div>
            <div><label>Aadhaar (Father)</label><input id="e_af"  value="${s.fatherAadhaar}"></div>
            <div><label>Nationality</label><input id="e_nat" value="${s.nationality}"></div>
            <div><label>Religion/Caste</label><input id="e_rel" value="${s.religionCaste}"></div>
 
            <div style="grid-column:span 2;background:#f1f5f9;padding:8px;font-weight:bold;margin-top:10px;">PARENT / GUARDIAN</div>
            <div><label>Parent Name</label><input id="e_pname" value="${s.pname}"></div>
            <div><label>Mobile</label><input id="e_mob" value="${s.parentMob}"></div>
            <div><label>Occupation</label><input id="e_occ" value="${s.occupation}"></div>
            <div><label>Railway Employee?</label><select id="e_rly">
                <option value="No"  ${(s.isRailwayEmployee==='No'||s.isRailwayEmployee==='Otherwise')?'selected':''}>No</option>
                <option value="Yes" ${(s.isRailwayEmployee==='Yes'||s.isRailwayEmployee==='Railway Employee')?'selected':''}>Yes</option>
            </select></div>
            <div style="grid-column:span 2"><label>Address</label><textarea id="e_addr">${s.addr}</textarea></div>
 
            <div style="grid-column:span 2;background:#f1f5f9;padding:8px;font-weight:bold;margin-top:10px;">GUARDIAN</div>
            <div><label>Guardian Name</label><input id="e_gn" value="${s.guardianName}"></div>
            <div><label>Guardian Occupation</label><input id="e_go" value="${s.guardianOccupation}"></div>
            <div style="grid-column:span 2"><label>Guardian Address</label><textarea id="e_ga">${s.guardianAddress}</textarea></div>
 
            <div style="grid-column:span 2;background:#f1f5f9;padding:8px;font-weight:bold;margin-top:10px;">ACADEMIC</div>
            <div><label>Last Class</label><input id="e_lc"  value="${s.lastClass}"></div>
            <div><label>Previous School</label><input id="e_ls" value="${s.prevSchool}"></div>
            <div><label>TC Date</label><input type="date" id="e_tc" value="${s.tcDate}"></div>
            <div><label>Medium</label><input id="e_med" value="${s.medium}"></div>
            <div><label>1st Language</label><input id="e_l1" value="${s.lang1}"></div>
            <div><label>2nd Language</label><input id="e_l2" value="${s.lang2}"></div>
            <div><label>Mark 1</label><input id="e_m1" value="${s.mark1}"></div>
            <div><label>Mark 2</label><input id="e_m2" value="${s.mark2}"></div>
            <div><label>PEN Number</label><input id="e_pen" value="${s.penNumber}"></div>
            <div style="grid-column:span 2"><label>Remarks</label><textarea id="e_rem">${s.rem}</textarea></div>
 
            <div style="grid-column:span 2;padding-top:20px;display:flex;gap:12px;">
                <button type="submit" class="btn-primary" style="flex:1;height:50px;">SAVE CHANGES</button>
                <button type="button" onclick="closeModal()"
                    style="flex:1;height:50px;background:#fff;color:#233d91;border:2px solid #233d91;
                           border-radius:6px;cursor:pointer;font-size:15px;font-weight:600;">Cancel</button>
            </div>
        </form>`;
 
    document.getElementById('editForm').onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            admissionNo:         document.getElementById('e_admNo').value.trim(),
            studentId:           document.getElementById('e_reg').value.trim(),
            reg:                 document.getElementById('e_reg').value.trim(),
            class:               document.getElementById('e_class').value,
            section:             document.getElementById('e_sec').value,
            name:                document.getElementById('e_name').value.toUpperCase(),
            motherTongue:        document.getElementById('e_mt').value,
            dob:                 document.getElementById('e_dob').value,
            placeOfBirth:        document.getElementById('e_pob').value,
            aadhaarStudent:      document.getElementById('e_ac').value,
            bloodStudent:        document.getElementById('e_bc').value,
            motherAadhaar:       document.getElementById('e_am').value,
            fatherAadhaar:       document.getElementById('e_af').value,
            nationality:         document.getElementById('e_nat').value,
            religionCaste:       document.getElementById('e_rel').value,
            pname:               document.getElementById('e_pname').value,
            parentMob:           document.getElementById('e_mob').value,
            occupation:          document.getElementById('e_occ').value,
            isRailwayEmployee:   document.getElementById('e_rly').value,
            addr:                document.getElementById('e_addr').value,
            guardianName:        document.getElementById('e_gn').value,
            guardianOccupation:  document.getElementById('e_go').value,
            guardianAddress:     document.getElementById('e_ga').value,
            lastClass:           document.getElementById('e_lc').value,
            prevSchool:          document.getElementById('e_ls').value,
            tcDate:              document.getElementById('e_tc').value || null,
            medium:              document.getElementById('e_med').value,
            lang1:               document.getElementById('e_l1').value,
            lang2:               document.getElementById('e_l2').value,
            mark1:               document.getElementById('e_m1').value,
            mark2:               document.getElementById('e_m2').value,
            penNumber:           document.getElementById('e_pen').value,
            rem:                 document.getElementById('e_rem').value,
        };
        try {
            await apiRequest(`/students/${s.studentId}`, { method: 'PUT', body: JSON.stringify(data) });
            alert('Student updated successfully!');
            closeModal();
            await loadDashboardData();
            renderStudents();
        } catch (err) { alert(err.message); }
    };
}
 
// 9. STATISTICS
function renderStatistics() {
    contentArea.innerHTML = `
        <div class="card">
            <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin-bottom:20px;">
                <p style="font-weight:700;color:#233d91;margin:0 0 12px;font-size:15px;">🔍 Student Report Search</p>
                <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;">
                    <input type="text" id="stat_search" placeholder="Search by Name, Adm No or Roll No..."
                        oninput="filterStatStudents()"
                        style="flex:1;min-width:200px;padding:10px;border-radius:6px;border:1px solid #ddd;">
                    <select id="stat_class" onchange="filterStatStudents()" style="padding:10px;border-radius:6px;border:1px solid #ddd;background:#fff;">
                        <option value="">All Classes</option>
                        ${[1,2,3,4,5,6,7,8,9,10].map(n=>`<option>${n}</option>`).join('')}
                    </select>
                    <select id="stat_section" onchange="filterStatStudents()" style="padding:10px;border-radius:6px;border:1px solid #ddd;background:#fff;">
                        <option value="">All Sections</option>
                        ${['A','B','C','D','E','F'].map(s=>`<option>${s}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div id="statStudentList"></div>
            <div id="statResults"></div>
        </div>`;
    filterStatStudents();
}

function filterStatStudents() {
    const q       = (document.getElementById('stat_search').value || '').toLowerCase();
    const cls     = document.getElementById('stat_class').value;
    const section = document.getElementById('stat_section').value;
    const filtered = students.filter(s => {
        const matchText    = s.name.toLowerCase().includes(q) ||
                             String(s.admissionNo).includes(q) ||
                             String(s.studentId).toLowerCase().includes(q);
        const matchClass   = !cls     || String(s.class)   === String(cls);
        const matchSection = !section || s.section         === section;
        return matchText && matchClass && matchSection;
    });

    const listWrapper = document.getElementById('statStudentList');
    document.getElementById('statResults').innerHTML = '';

    if (filtered.length === 0) {
        listWrapper.innerHTML = "<p style='text-align:center;padding:20px;color:#888;'>No students found.</p>";
        return;
    }
    listWrapper.innerHTML = `
        <p style="color:#555;margin-bottom:12px;font-size:13px;">
            ${filtered.length} student(s) found.
        </p>
        <table>
            <thead><tr><th>Adm. No</th><th>Roll No</th><th>Name</th><th>Class / Sec</th><th>Action</th></tr></thead>
            <tbody>
                ${filtered.map(s=>`
                    <tr id="student-row-${s.admissionNo}">
                        <td><strong>${s.admissionNo}</strong></td>
                        <td>${s.studentId}</td>
                        <td>${s.name}</td>
                        <td>${s.class}-${s.section}</td>
                        <td style="display:flex;gap:6px;flex-wrap:wrap;">
                            <button class="action-btn view"
                                onclick="generateStudentReport('${s.admissionNo}')">View Report</button>
                            <button class="action-btn" style="background:#7c3aed;color:#fff;"
                                onclick="openRemarks('\${s.studentId}','\${s.admissionNo}','\${s.name}')">Remarks</button>
                    <button class="action-btn" style="background:#0369a1;color:#fff;" onclick="setStudentPassword('\${s.admissionNo}','\${s.name}')">?? Set Password</button>
                                <button class="action-btn" style="background:#0369a1;color:#fff;" onclick="setStudentPassword('${s.admissionNo}','${s.name}')">🔑 Set Password</button>
                          
                                onclick="deleteStudentStat('${s.admissionNo}','${s.name}')">Delete</button>
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table>`;
}

async function deleteStudentStat(admissionNo, name) {
    if (!confirm(`Delete student "${name}" (Adm No: ${admissionNo})?\nThis cannot be undone.`)) return;
    try {
        await apiRequest(`/students/${admissionNo}`, { method: 'DELETE' });
        const idx = students.findIndex(s => String(s.admissionNo) === String(admissionNo));
        if (idx !== -1) students.splice(idx, 1);
        const row = document.getElementById(`student-row-${admissionNo}`);
        if (row) row.remove();
        document.getElementById('statResults').innerHTML = '';
        alert(`Student "${name}" deleted successfully.`);
        filterStatStudents();
    } catch (err) { alert('Failed to delete: ' + err.message); }
}

async function generateStudentReport(admissionNo) {
    const s = students.find(st => String(st.admissionNo) === String(admissionNo));
    if (!s) return;
    const wrapper = document.getElementById('statResults');
    wrapper.innerHTML = `<p style="text-align:center;padding:20px;color:#888;">Loading report...</p>`;
    try {
        const [allMarks, allFees, studentAttendance] = await Promise.all([
            apiRequest('/marks'),
            apiRequest('/fees').catch(() => []),
            apiRequest(`/attendance?studentId=${s.studentId}`).catch(() => [])
        ]);
        const studentMarks = (allMarks || []).filter(m => String(m.reg) === String(s.admissionNo));
        const studentFees  = (allFees  || []).filter(f => String(f.reg) === String(s.admissionNo));

        function gc(grade) {
            if (grade==='A+') return '#22c55e';
            if (grade==='A')  return '#3b82f6';
            if (grade==='B')  return '#f59e0b';
            if (grade==='C')  return '#f97316';
            return '#ef4444';
        }
        function sc(status) {
            if (status==='Paid')    return '#22c55e';
            if (status==='Partial') return '#f59e0b';
            return '#ef4444';
        }
        function computeMax(m) {
            const cls      = m.class || s.class || '';
            const subjects = getSubjects(cls);
            const exam     = m.exam;
            if (FA_EXAMS.includes(exam)) return subjects.length * 50;
            if (exam==='SA1')            return subjects.length * 80;
            if (exam==='SA2')            return subjects.length * 100;
            const perSub = getMaxPerSubject(exam, cls);
            if (isPrimaryClass(cls))     return perSub * 5;
            return perSub * subjects.length;
        }
        function enrichMark(m) {
            const maxTotal   = m.maxTotal ?? computeMax(m);
            const total      = m.total    ?? 0;
            const percentage = maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : '0.0';
            return { ...m, maxTotal, percentage };
        }
        const enrichedMarks = studentMarks.map(enrichMark);

        wrapper.innerHTML = `
            <div style="background:#233d91;color:#fff;padding:14px 18px;border-radius:8px;margin-bottom:20px;
                        display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-size:18px;font-weight:bold;">👤 ${s.name}</div>
                    <div style="font-size:12px;opacity:0.85;margin-top:4px;">
                        Adm No: ${s.admissionNo} &nbsp;|&nbsp; Class: ${s.class}-${s.section} &nbsp;|&nbsp; Roll No: ${s.studentId}
                    </div>
                </div>
                <button onclick="printStudentReport('${s.admissionNo}')"
                    style="background:#fff;color:#233d91;border:none;padding:10px 20px;border-radius:6px;
                           cursor:pointer;font-weight:700;font-size:13px;">🖨️ Print Report</button>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
                ${[
                    ['Admission No',        s.admissionNo],
                    ['Roll No',             s.studentId],
                    ['Name',                s.name],
                    ['Class / Section',     s.class+'-'+s.section],
                    ['Date of Birth',       s.dob],
                    ['Place of Birth',      s.placeOfBirth],
                    ['Mother Tongue',       s.motherTongue],
                    ['Nationality',         s.nationality],
                    ['Religion / Caste',    s.religionCaste],
                    ['Blood Group',         s.bloodStudent],
                    ['Aadhaar (Student)',   s.aadhaarStudent],
                    ['Aadhaar (Mother)',    s.motherAadhaar],
                    ['Aadhaar (Father)',    s.fatherAadhaar],
                    ['Parent Name',         s.pname],
                    ['Mobile',              s.parentMob],
                    ['Occupation',          s.occupation],
                    ['Railway Employee',    s.isRailwayEmployee],
                    ['Address',             s.addr],
                    ['Guardian Name',       s.guardianName],
                    ['Guardian Occupation', s.guardianOccupation],
                    ['Guardian Address',    s.guardianAddress],
                    ['Last Class Studied',  s.lastClass],
                    ['Previous School',     s.prevSchool],
                    ['TC Date',             s.tcDate],
                    ['Medium',              s.medium],
                    ['Languages',           (s.lang1||'-')+' / '+(s.lang2||'-')],
                    ['Marks',               (s.mark1||'-')+' / '+(s.mark2||'-')],
                    ['PEN Number',          s.penNumber],
                    ['Joining Date',        s.jDate],
                    ['Remarks',             s.rem],
                ].map(([k,v])=>`
                    <div style="background:#f8fafc;border-left:3px solid #233d91;padding:8px 12px;border-radius:4px;">
                        <div style="font-size:10px;font-weight:bold;color:#233d91;text-transform:uppercase;">${k}</div>
                        <div style="font-size:13px;margin-top:2px;">${v||'-'}</div>
                    </div>`).join('')}
            </div>

            <div style="margin-bottom:20px;">
                <h3 style="color:#233d91;border-bottom:2px solid #233d91;padding-bottom:6px;margin-bottom:12px;">📝 Academic Performance</h3>
                ${enrichedMarks.length===0
                    ? `<p style="color:#888;text-align:center;padding:16px;">No marks records found.</p>`
                    : enrichedMarks.map(m=>{
                        const cls      = m.class||s.class||'';
                        const subjects = getSubjects(cls);
                        const marksArr = Array.isArray(m.marks)     ? m.marks     : [];
                        const intArr   = Array.isArray(m.internals) ? m.internals : [];
                        const isSA2    = m.exam==='SA2';
                        const isSA1    = m.exam==='SA1';
                        const isFA     = FA_EXAMS.includes(m.exam);
                        const subMax   = isSA2?100:isSA1?80:isFA?50:getMaxPerSubject(m.exam,cls);
                        return `
                        <div style="background:#f8fafc;border-radius:8px;padding:14px;margin-bottom:14px;border:1px solid #e2e8f0;">
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                                <strong style="color:#233d91;font-size:14px;">${m.exam}</strong>
                                <div style="display:flex;gap:10px;">
                                    <span style="background:#f1f5f9;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;">
                                        ${m.total} / ${m.maxTotal}</span>
                                    <span style="background:#f1f5f9;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;">
                                        ${m.percentage}%</span>
                                    <span style="background:${gc(m.grade)};color:#fff;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:700;">
                                        ${m.grade}</span>
                                </div>
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
                                ${subjects.map((sub,i)=>{
                                    const sa=marksArr[i]??'-';
                                    const intV=isSA2?(intArr[i]??0):null;
                                    const tot=isSA2&&typeof sa==='number'?sa+(intV||0):sa;
                                    const subGrade=typeof tot==='number'&&subMax>0?calcGrade((tot/subMax)*100):'—';
                                    return `<div style="background:#fff;padding:7px 10px;border-radius:4px;border:1px solid #e2e8f0;text-align:center;">
                                        <div style="font-size:10px;color:#888;margin-bottom:2px;">${sub}</div>
                                        <div style="font-size:14px;font-weight:bold;color:#233d91;">${isSA2?`${sa}+${intV??0}=${tot}`:sa}</div>
                                        <span style="padding:1px 7px;border-radius:10px;font-size:11px;font-weight:bold;background:${gc(subGrade)};color:#fff;">${subGrade}</span>
                                    </div>`;
                                }).join('')}
                            </div>
                        </div>`;
                    }).join('')}
            </div>

            <div>
                <h3 style="color:#233d91;border-bottom:2px solid #233d91;padding-bottom:6px;margin-bottom:12px;">💰 Fee Records</h3>
                ${studentFees.length===0
                    ? `<p style="color:#888;text-align:center;padding:16px;">No fee records found.</p>`
                    : `<table>
                        <thead><tr><th>Date</th><th>Term</th><th>Mode</th><th>Total (₹)</th><th>Paid (₹)</th><th>Pending (₹)</th><th>Status</th></tr></thead>
                        <tbody>
                            ${studentFees.map(f=>`<tr>
                                <td>${f.date}</td><td>${f.paymentTerm}</td><td>${f.mode}</td>
                                <td>₹${Number(f.total).toLocaleString('en-IN')}</td>
                                <td>₹${Number(f.paid).toLocaleString('en-IN')}</td>
                                <td>₹${Number(f.pending).toLocaleString('en-IN')}</td>
                                <td><span style="padding:3px 10px;border-radius:12px;font-weight:bold;background:${sc(f.status)};color:#fff;">${f.status}</span></td>
                            </tr>`).join('')}
                        </tbody></table>
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:14px;">
                            <div style="background:#f1f5f9;padding:12px;border-radius:6px;text-align:center;">
                                <div style="font-size:11px;color:#555;font-weight:bold;">TOTAL BILLED</div>
                                <div style="font-size:18px;font-weight:bold;color:#233d91;">₹${studentFees.reduce((a,f)=>a+Number(f.total),0).toLocaleString('en-IN')}</div>
                            </div>
                            <div style="background:#f1f5f9;padding:12px;border-radius:6px;text-align:center;">
                                <div style="font-size:11px;color:#555;font-weight:bold;">TOTAL PAID</div>
                                <div style="font-size:18px;font-weight:bold;color:#22c55e;">₹${studentFees.reduce((a,f)=>a+Number(f.paid),0).toLocaleString('en-IN')}</div>
                            </div>
                            <div style="background:#f1f5f9;padding:12px;border-radius:6px;text-align:center;">
                                <div style="font-size:11px;color:#555;font-weight:bold;">TOTAL PENDING</div>
                                <div style="font-size:18px;font-weight:bold;color:#ef4444;">₹${studentFees.reduce((a,f)=>a+Number(f.pending),0).toLocaleString('en-IN')}</div>
                            </div>
                        </div>`}
            </div>

            <div style="margin-top:20px;">
                <h3 style="color:#233d91;border-bottom:2px solid #233d91;padding-bottom:6px;margin-bottom:12px;">📋 Attendance Records</h3>
                ${!studentAttendance||studentAttendance.length===0
                    ? `<p style="color:#888;text-align:center;padding:16px;">No attendance records found.</p>`
                    : (()=>{
                        const total  = studentAttendance.length;
                        const present= studentAttendance.filter(r=>r.status==='Present').length;
                        const absent = total-present;
                        const pct    = Math.round((present/total)*100);
                        return `
                        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:14px;">
                            <div style="background:#eff6ff;padding:12px;border-radius:6px;text-align:center;">
                                <div style="font-size:11px;font-weight:bold;color:#1e40af;">TOTAL</div>
                                <div style="font-size:22px;font-weight:bold;color:#1e40af;">${total}</div></div>
                            <div style="background:#f0fdf4;padding:12px;border-radius:6px;text-align:center;">
                                <div style="font-size:11px;font-weight:bold;color:#15803d;">PRESENT</div>
                                <div style="font-size:22px;font-weight:bold;color:#15803d;">${present}</div></div>
                            <div style="background:#fef2f2;padding:12px;border-radius:6px;text-align:center;">
                                <div style="font-size:11px;font-weight:bold;color:#b91c1c;">ABSENT</div>
                                <div style="font-size:22px;font-weight:bold;color:#b91c1c;">${absent}</div></div>
                            <div style="background:#fefce8;padding:12px;border-radius:6px;text-align:center;">
                                <div style="font-size:11px;font-weight:bold;color:#92400e;">ATTENDANCE %</div>
                                <div style="font-size:22px;font-weight:bold;color:${pct>=75?'#15803d':pct>=50?'#d97706':'#b91c1c'};">${pct}%</div></div>
                        </div>`;
                    })()}
            </div>`;

        window._reportData = { s, studentMarks: enrichedMarks, studentFees, studentAttendance };
    } catch(err) {
        wrapper.innerHTML = `<p style="text-align:center;padding:20px;color:red;">Failed to load report: ${err.message}</p>`;
    }
}

function printStudentReport(admissionNo) {
    const { s, studentMarks, studentFees, studentAttendance=[] } = window._reportData || {};
    if (!s) return;
    function gc(g){return g==='A+'?'#22c55e':g==='A'?'#3b82f6':g==='B'?'#f59e0b':g==='C'?'#f97316':'#ef4444';}
    function sc(st){return st==='Paid'?'#22c55e':st==='Partial'?'#f59e0b':'#ef4444';}
    const w = window.open('','_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>Report - ${s.name}</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:Arial,sans-serif;padding:25px;color:#1a1a1a;}
        .header{text-align:center;border-bottom:3px double #233d91;padding-bottom:12px;margin-bottom:16px;}
        .header h2{color:#233d91;font-size:20px;}.header p{color:#555;font-size:12px;margin-top:4px;}
        .banner{background:#233d91;color:#fff;padding:10px 16px;border-radius:6px;margin-bottom:16px;display:flex;justify-content:space-between;}
        .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;}
        .info-box{background:#f8fafc;border-left:3px solid #233d91;padding:6px 10px;border-radius:4px;}
        .info-box .lbl{font-size:9px;font-weight:bold;color:#233d91;text-transform:uppercase;}
        .info-box .val{font-size:12px;margin-top:2px;}
        h3{color:#233d91;font-size:13px;border-bottom:2px solid #233d91;padding-bottom:4px;margin:14px 0 8px;}
        .exam-block{background:#f8fafc;border-radius:6px;padding:10px;margin-bottom:10px;border:1px solid #e2e8f0;}
        .marks-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}
        .mark-box{background:#fff;padding:6px 8px;border-radius:4px;border:1px solid #e2e8f0;text-align:center;}
        table{width:100%;border-collapse:collapse;margin-bottom:10px;}
        th{background:#f1f5f9;padding:6px 10px;text-align:left;font-size:11px;color:#233d91;}
        td{padding:6px 10px;font-size:11px;border-bottom:1px solid #e2e8f0;}
        .summary{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:10px;}
        .sum-box{padding:10px;border-radius:6px;text-align:center;background:#f1f5f9;}
        .footer{margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;text-align:center;}
        .footer div{border-top:1px solid #333;padding-top:6px;font-size:10px;color:#444;}
        @media print{body{padding:10px;}@page{margin:10mm;}}
    </style></head><body>
    <div class="header"><h2>JACK AND JILL SCHOOL</h2><p>Student Complete Report</p></div>
    <div class="banner">
        <span style="font-size:15px;font-weight:bold;">👤 ${s.name}</span>
        <span style="font-size:12px;opacity:0.85;">Adm: ${s.admissionNo} | Class: ${s.class}-${s.section} | Roll No: ${s.studentId}</span>
    </div>
    <div class="info-grid">
        ${[['Parent','pname'],['Mobile','parentMob'],['DOB','dob'],['Blood Group','bloodStudent'],['Address','addr'],['Joining Date','jDate']]
            .map(([k,f])=>`<div class="info-box"><div class="lbl">${k}</div><div class="val">${s[f]||'-'}</div></div>`).join('')}
    </div>
    <h3>📝 Academic Performance</h3>
    ${studentMarks.length===0?`<p style="color:#888;font-size:12px;">No marks records.</p>`
        :studentMarks.map(m=>{
            const cls=m.class||s.class||'';const subjects=getSubjects(cls);
            const marksArr=Array.isArray(m.marks)?m.marks:[];
            const intArr=Array.isArray(m.internals)?m.internals:[];
            const isSA2=m.exam==='SA2';const isSA1=m.exam==='SA1';const isFA=FA_EXAMS.includes(m.exam);
            const subMax=isSA2?100:isSA1?80:isFA?50:getMaxPerSubject(m.exam,cls);
            return `<div class="exam-block">
                <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                    <strong style="font-size:13px;color:#233d91;">${m.exam}</strong>
                    <span style="font-size:12px;font-weight:600;">${m.total}/${m.maxTotal} &nbsp; ${m.percentage}%
                    &nbsp;<span style="background:${gc(m.grade)};color:#fff;padding:2px 10px;border-radius:10px;">${m.grade}</span></span>
                </div>
                <div class="marks-grid">
                    ${subjects.map((sub,i)=>{
                        const sa=marksArr[i]??'-';const intV=isSA2?(intArr[i]??0):null;
                        const tot=isSA2&&typeof sa==='number'?sa+(intV||0):sa;
                        const subGrade=typeof tot==='number'&&subMax>0?calcGrade((tot/subMax)*100):'—';
                        return `<div class="mark-box">
                            <div style="font-size:9px;color:#888;">${sub}</div>
                            <div style="font-size:12px;font-weight:bold;color:#233d91;">${isSA2?`${sa}+${intV??0}=${tot}`:sa}</div>
                            <div style="font-size:10px;font-weight:bold;color:${gc(subGrade)};">${subGrade}</div>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
        }).join('')}
    <h3>💰 Fee Records</h3>
    ${studentFees.length===0?`<p style="color:#888;font-size:12px;">No fee records.</p>`
        :`<table><thead><tr><th>Date</th><th>Term</th><th>Mode</th><th>Total</th><th>Paid</th><th>Pending</th><th>Status</th></tr></thead>
        <tbody>${studentFees.map(f=>`<tr>
            <td>${f.date}</td><td>${f.paymentTerm}</td><td>${f.mode}</td>
            <td>₹${Number(f.total).toLocaleString('en-IN')}</td>
            <td>₹${Number(f.paid).toLocaleString('en-IN')}</td>
            <td>₹${Number(f.pending).toLocaleString('en-IN')}</td>
            <td><span style="background:${sc(f.status)};color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;">${f.status}</span></td>
        </tr>`).join('')}</tbody></table>
        <div class="summary">
            <div class="sum-box"><div class="lbl">TOTAL BILLED</div>
                <div style="font-size:16px;font-weight:bold;color:#233d91;">₹${studentFees.reduce((a,f)=>a+Number(f.total),0).toLocaleString('en-IN')}</div></div>
            <div class="sum-box"><div class="lbl">TOTAL PAID</div>
                <div style="font-size:16px;font-weight:bold;color:#22c55e;">₹${studentFees.reduce((a,f)=>a+Number(f.paid),0).toLocaleString('en-IN')}</div></div>
            <div class="sum-box"><div class="lbl">TOTAL PENDING</div>
                <div style="font-size:16px;font-weight:bold;color:#ef4444;">₹${studentFees.reduce((a,f)=>a+Number(f.pending),0).toLocaleString('en-IN')}</div></div>
        </div>`}
    <h3>📋 Attendance Records</h3>
    ${studentAttendance.length===0?`<p style="color:#888;font-size:12px;">No attendance records.</p>`
        :(()=>{
            const total=studentAttendance.length;
            const present=studentAttendance.filter(r=>r.status==='Present').length;
            const absent=total-present;const pct=Math.round((present/total)*100);
            return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:10px;">
                <div class="sum-box"><div class="lbl">TOTAL</div><div style="font-size:16px;font-weight:bold;color:#1e40af;">${total}</div></div>
                <div class="sum-box"><div class="lbl">PRESENT</div><div style="font-size:16px;font-weight:bold;color:#15803d;">${present}</div></div>
                <div class="sum-box"><div class="lbl">ABSENT</div><div style="font-size:16px;font-weight:bold;color:#b91c1c;">${absent}</div></div>
                <div class="sum-box"><div class="lbl">ATTENDANCE %</div><div style="font-size:16px;font-weight:bold;color:${pct>=75?'#15803d':pct>=50?'#d97706':'#b91c1c'};">${pct}%</div></div>
            </div>
            <table><thead><tr><th>Date</th><th>Session</th><th>Class/Sec</th><th>Status</th></tr></thead>
            <tbody>${studentAttendance.map(r=>`<tr>
                <td>${r.date}</td><td>${r.session}</td><td>${r.class}-${r.section}</td>
                <td><span style="padding:2px 8px;border-radius:10px;font-size:10px;font-weight:bold;
                    background:${r.status==='Present'?'#dcfce7':'#fee2e2'};
                    color:${r.status==='Present'?'#15803d':'#b91c1c'};">
                    ${r.status==='Present'?'✓':'✗'} ${r.status}</span></td>
            </tr>`).join('')}</tbody></table>`;
        })()}
    <div class="footer">
        <div>Parent / Guardian Signature</div>
        <div>Class Teacher Signature</div>
        <div>Principal Signature</div>
    </div></body></html>`);
    w.document.close();
    w.print();
}

// 10. DELETE (from Student Records tab)
async function deleteStudent(studentId) {
    if (!confirm('Delete this student? This cannot be undone.')) return;
    try {
        await apiRequest(`/students/${studentId}`, { method: 'DELETE' });
        alert('Student deleted successfully.');
        await loadDashboardData();
        renderStudents();
    } catch (err) { alert(err.message); }
}

// 11. REMARKS
async function openRemarks(studentId, admissionNo, studentName) {
    const role    = localStorage.getItem('userRole') || 'Teacher';
    modal.style.display = 'flex';
    modalBody.innerHTML = `<p style="text-align:center;padding:20px;color:#888;">Loading remarks...</p>`;
    let remarks = [];
    try { remarks = await apiRequest(`/remarks?studentId=${studentId}`) || []; } catch(e) { remarks=[]; }

    modalBody.innerHTML = `
    <div style="padding:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <div>
                <div style="font-size:11px;font-weight:500;color:#7c3aed;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Student Remarks</div>
                <div style="font-size:18px;font-weight:600;color:#1e293b;">${studentName}</div>
            </div>
            <button onclick="closeModal()" style="width:32px;height:32px;border-radius:50%;border:1px solid #e2e8f0;background:#f8fafc;cursor:pointer;font-size:16px;color:#64748b;">✕</button>
        </div>
        <div style="background:#faf7ff;border:1px solid #e9d5ff;border-radius:10px;padding:16px;margin-bottom:20px;">
            <label style="font-size:12px;font-weight:600;color:#7c3aed;text-transform:uppercase;display:block;margin-bottom:8px;">Add new remark</label>
            <textarea id="newRemarkText" rows="3"
                style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid #ddd6fe;background:#fff;font-size:14px;resize:vertical;font-family:inherit;box-sizing:border-box;"
                placeholder="Write your remark here..."></textarea>
            <div style="display:flex;justify-content:flex-end;margin-top:10px;">
                <button onclick="submitRemark('${studentId}','${admissionNo}','${studentName}')"
                    style="padding:9px 22px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;">
                    Save remark</button>
            </div>
        </div>
        <div style="font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;margin-bottom:10px;">
            Previous remarks ${remarks.length>0?`<span style="background:#f1f5f9;color:#475569;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:4px;">${remarks.length}</span>`:''}
        </div>
        <div id="remarksList">
            ${remarks.length===0
                ? `<div style="text-align:center;padding:32px 16px;color:#94a3b8;font-size:14px;">
                       <div style="font-size:28px;margin-bottom:8px;">📝</div>No remarks added yet</div>`
                : remarks.map(r=>`
                    <div style="border:1px solid #f1f5f9;border-left:3px solid #7c3aed;border-radius:8px;padding:12px 14px;margin-bottom:10px;background:#fff;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <div style="width:28px;height:28px;border-radius:50%;background:#ede9fe;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:#7c3aed;">
                                    ${r.addedBy.charAt(0).toUpperCase()}</div>
                                <div>
                                    <div style="font-size:13px;font-weight:600;color:#1e293b;">${r.addedBy}</div>
                                    <div style="font-size:11px;color:#94a3b8;">${r.role} · ${r.date}</div>
                                </div>
                            </div>
                            ${role==='Teacher'&&r.role==='Teacher'?`
                            <button onclick="deleteRemark(${r.id},'${studentId}','${admissionNo}','${studentName}')"
                                style="padding:4px 10px;background:#fff;color:#ef4444;border:1px solid #fecaca;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;">Delete</button>`:''}
                        </div>
                        <div style="font-size:14px;color:#334155;line-height:1.6;padding-left:36px;">${r.remark}</div>
                    </div>`).join('')}
        </div>
    </div>`;
}

async function submitRemark(studentId, admissionNo, studentName) {
    const text    = document.getElementById('newRemarkText').value.trim();
    const addedBy = localStorage.getItem('userName') || 'Staff';
    const role    = localStorage.getItem('userRole')  || 'Teacher';
    if (!text) { alert('Please write a remark first.'); return; }
    try {
        await apiRequest('/remarks', {
            method: 'POST',
            body: JSON.stringify({ studentId, admissionNo, remark: text, addedBy, role })
        });
        openRemarks(studentId, admissionNo, studentName);
    } catch(err) { alert('Failed to save remark: ' + err.message); }
}

async function deleteRemark(id, studentId, admissionNo, studentName) {
    if (!confirm('Delete this remark?')) return;
    try {
        await apiRequest(`/remarks/${id}`, { method: 'DELETE' });
        openRemarks(studentId, admissionNo, studentName);
    } catch(err) { alert('Failed to delete: ' + err.message); }
}


async function setStudentPassword(admissionNo, studentName) {
    const newPassword = prompt(`Set password for ${studentName}:\n(minimum 6 characters)`);
    
    if (!newPassword) return;
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters!');
      return;
    }
  
    try {
      const res = await fetch('/api/auth/set-student-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ admissionNo, newPassword })
      });
  
      const data = await res.json();
      if (res.ok) {
        alert(`✅ Password set successfully for ${studentName}`);
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (err) {
      alert('Server error. Try again.');
    }
  }

init();

