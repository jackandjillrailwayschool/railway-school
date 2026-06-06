// js/fees.js

document.addEventListener('DOMContentLoaded', initFeesPage);

let students = [];
let feeData  = [];

const modal          = document.getElementById('modal');
const modalBody      = document.getElementById('modalBody');
const feeTableWrapper = document.getElementById('feeTableWrapper');

// ── INIT ──────────────────────────────────────────────
async function initFeesPage() {
    if (!localStorage.getItem('authToken')) {
        window.location.href = 'index.html';
        return;
    }

    const role = localStorage.getItem('userRole');
if (role !== 'Accountant' && role !== 'Principal' && role !== 'Secretary') {
    alert('Access Denied.');
    window.location.href = 'index.html';
    return;
}

    document.getElementById('userRoleBadge').innerText = role;
    document.getElementById('headerUserName').innerText = localStorage.getItem('userName') || 'Admin';

    if (role === 'Principal') {
        document.getElementById('backToDashboard').style.display = 'block';
    }

    try {
        await loadFeeData();
        populateClassFilter();
        renderFeeTable();
    } catch (err) {
        feeTableWrapper.innerHTML = "<p style='text-align:center;padding:20px;'>Failed to load data.</p>";
    }
}

// ── DATA LOADER ───────────────────────────────────────
async function loadFeeData() {
    const [studentRes, feeRes] = await Promise.all([
        apiRequest('/students'),
        apiRequest('/fees')
    ]);
    students = studentRes || [];
    feeData  = feeRes    || [];
}


// ── CLASS FILTER POPULATE ─────────────────────────────
function populateClassFilter() {
    const classFilter = document.getElementById('classFilter');
    
    // Clear and add the default option
    classFilter.innerHTML = '<option value="">All Classes</option>';
    
    // Hardcode 1 to 10 to match your other screens
    const allPossibleClasses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    allPossibleClasses.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.innerText = `Class ${c}`;
        classFilter.appendChild(opt);
    });
}

// ── HELPERS ───────────────────────────────────────────
function findStudent(reg) {
    return students.find(s => String(s.admissionNo) === String(reg)) || {};
}

function statusColor(status) {
    if (status === 'Paid')    return '#22c55e';
    if (status === 'Partial') return '#f59e0b';
    return '#ef4444';
}

// ── TABLE RENDER ──────────────────────────────────────
function renderFeeTable(list = feeData) {
    if (!list || list.length === 0) {
        feeTableWrapper.innerHTML = "<p style='text-align:center;padding:20px;'>No fee records found.</p>";
        return;
    }

    feeTableWrapper.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Reg No</th>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Payment Term</th>
                    <th>Total (₹)</th>
                    <th>Paid (₹)</th>
                    <th>Pending (₹)</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${list.map(record => {
                    const s = findStudent(record.reg);
                    return `<tr>
                        <td><strong>${String(record.reg).padStart(4,'0')}</strong></td>
                        <td>${s.name || '-'}</td>
                        <td>${s.class ? s.class + '-' + s.section : '-'}</td>
                        <td>${record.paymentTerm || '-'}</td>
                        <td>₹${Number(record.total).toLocaleString('en-IN')}</td>
                        <td>₹${Number(record.paid).toLocaleString('en-IN')}</td>
                        <td>₹${Number(record.pending).toLocaleString('en-IN')}</td>
                        <td><span style="padding:3px 10px; border-radius:12px; font-weight:bold; background:${statusColor(record.status)}; color:#fff;">${record.status}</span></td>
                        <td>
                            <button class="action-btn view"   onclick="viewFeeRecord('${record.id}')">View</button>
                            <button class="action-btn edit"   onclick="openFeeModal('${record.id}')">Edit</button>
                            <button class="action-btn delete" onclick="deleteFeeRecord('${record.id}')">Delete</button>
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;
}

// ── FILTERS ───────────────────────────────────────────
function applyFilters() {
    const q       = (document.getElementById('regSearch').value || '').toLowerCase();
    const cls     = document.getElementById('classFilter').value;
    const section = document.getElementById('sectionFilter').value;

    const filtered = feeData.filter(record => {
        const s = findStudent(record.reg);
        const matchText    = String(record.reg).includes(q) || (s.name || '').toLowerCase().includes(q);
        const matchClass   = !cls     || String(s.class)   === String(cls);
        const matchSection = !section || s.section         === section;
        return matchText && matchClass && matchSection;
    });

    renderFeeTable(filtered);
}

// ── ADD / EDIT MODAL ──────────────────────────────────
function openFeeModal(editId = null) {
    const record = editId ? (feeData.find(f => String(f.id) === String(editId)) || {}) : {};
    const studentForEdit = editId ? findStudent(record.reg) : {};

    modal.style.display = 'flex';
    modalBody.innerHTML = `
        <h2 style="text-align:center; color:#233d91; border-bottom:2px solid #233d91; padding-bottom:10px;">
            ${editId ? 'EDIT' : 'ADD'} FEE RECORD
        </h2>
        <form id="feeForm" style="padding:20px;">

            <!-- STEP 1: Class & Section -->
            <div style="background:#f1f5f9; padding:12px; border-radius:8px; margin-bottom:16px;">
                <p style="font-weight:700; color:#233d91; margin:0 0 10px;">Step 1: Select Class & Section</p>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div>
                        <label style="font-weight:600; display:block; margin-bottom:6px;">Class</label>
                        <select id="m_class" onchange="filterModalStudents()" 
                            style="width:100%; padding:10px; border-radius:6px; border:1px solid #ddd;">
                            <option value="">-- Select Class --</option>
                            ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option>${n}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="font-weight:600; display:block; margin-bottom:6px;">Section</label>
                        <select id="m_section" onchange="filterModalStudents()"
                            style="width:100%; padding:10px; border-radius:6px; border:1px solid #ddd;">
                            <option value="">-- Select Section --</option>
                            ${['A','B','C','D','E','F'].map(s => `<option>${s}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>

            <!-- STEP 2: Search Student -->
            <div style="background:#f1f5f9; padding:12px; border-radius:8px; margin-bottom:16px;">
                <p style="font-weight:700; color:#233d91; margin:0 0 10px;">Step 2: Search Student</p>
                <input type="text" id="studentSearch" oninput="filterModalStudents()"
                    placeholder="Type name or reg no..."
                    style="width:100%; padding:10px; border-radius:6px; border:1px solid #ddd; margin-bottom:10px; box-sizing:border-box;">
                <div id="studentResults" style="max-height:160px; overflow-y:auto; border:1px solid #ddd; border-radius:6px; background:#fff;"></div>
                <input type="hidden" id="f_reg" value="${editId ? record.reg : ''}">
                <div id="selectedStudentBanner" style="display:none; margin-top:10px; background:#233d91; color:#fff; padding:8px 12px; border-radius:6px; font-size:13px;"></div>
            </div>

            <!-- STEP 3: Fee Details -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
                <div>
                    <label style="font-weight:600; display:block; margin-bottom:6px;">Payment Date</label>
                    <input type="date" id="f_date" value="${record.date || new Date().toISOString().slice(0,10)}"
                        style="width:100%; padding:10px; border-radius:6px; border:1px solid #ddd;" required>
                </div>
                <div>
                    <label style="font-weight:600; display:block; margin-bottom:6px;">Total Fee Amount (₹)</label>
                    <input type="number" id="f_total" value="${record.total || ''}" placeholder="e.g. 25000"
                        style="width:100%; padding:10px; border-radius:6px; border:1px solid #ddd;" required>
                </div>
                <div>
                    <label style="font-weight:600; display:block; margin-bottom:6px;">Amount Paid (₹)</label>
                    <input type="number" id="f_paid" value="${record.paid || ''}" placeholder="e.g. 10000"
                        style="width:100%; padding:10px; border-radius:6px; border:1px solid #ddd;" required>
                </div>
                <div>
                    <label style="font-weight:600; display:block; margin-bottom:6px;">Mode of Payment</label>
                    <select id="f_mode" style="width:100%; padding:10px; border-radius:6px; border:1px solid #ddd;" required>
                        <option value="Cash"  ${record.mode==='Cash' ?'selected':''}>Cash</option>
                        <option value="UPI"   ${record.mode==='UPI'  ?'selected':''}>UPI</option>
                        <option value="Card"  ${record.mode==='Card' ?'selected':''}>Card / NetBanking</option>
                    </select>
                </div>
                <div>
                    <label style="font-weight:600; display:block; margin-bottom:6px;">Payment Term</label>
                    <select id="f_term" style="width:100%; padding:10px; border-radius:6px; border:1px solid #ddd;" required>
                        <option value="Monthly"     ${record.paymentTerm==='Monthly'    ?'selected':''}>Monthly</option>
                        <option value="Quarterly"   ${record.paymentTerm==='Quarterly'  ?'selected':''}>Quarterly</option>
                        <option value="Half-Yearly" ${record.paymentTerm==='Half-Yearly'?'selected':''}>Half-Yearly</option>
                        <option value="Yearly"      ${record.paymentTerm==='Yearly'     ?'selected':''}>Yearly</option>
                    </select>
                </div>
                <div>
                    <label style="font-weight:600; display:block; margin-bottom:6px;">Mobile Number</label>
                    <input type="text" id="f_mobile" value="${studentForEdit.parentMob || ''}"
                        placeholder="Auto-filled" readonly
                        style="width:100%; padding:10px; border-radius:6px; border:1px solid #ddd; background:#f1f5f9;">
                </div>
            </div>

            <div style="display:flex; gap:12px; padding-top:10px;">
                <button type="submit" class="btn-primary" style="flex:1; height:50px;">${editId ? 'UPDATE' : 'SAVE'} RECORD</button>
                <button type="button" onclick="closeModal()"
                    style="flex:1; height:50px; background:#fff; color:#233d91; border:2px solid #233d91; border-radius:6px; cursor:pointer; font-size:15px; font-weight:600;">
                    Cancel
                </button>
            </div>
        </form>`;

    // Pre-fill if editing
    if (editId && studentForEdit.name) {
        document.getElementById('selectedStudentBanner').style.display = 'block';
        document.getElementById('selectedStudentBanner').innerHTML =
            `✅ ${studentForEdit.name} &nbsp;|&nbsp; Class: ${studentForEdit.class}-${studentForEdit.section}`;
    }

    document.getElementById('feeForm').onsubmit = async (e) => {
        e.preventDefault();
        const reg = document.getElementById('f_reg').value;
        if (!reg) return alert('Please select a student.');

        const total = parseFloat(document.getElementById('f_total').value) || 0;
        const paid  = parseFloat(document.getElementById('f_paid').value)  || 0;
        const payload = {
            reg,
            total,
            paid,
            mode:        document.getElementById('f_mode').value,
            date:        document.getElementById('f_date').value,
            paymentTerm: document.getElementById('f_term').value
        };

        try {
            if (editId) {
                await apiRequest(`/fees/${editId}`, { method: 'PUT',  body: JSON.stringify(payload) });
            } else {
                await apiRequest('/fees',            { method: 'POST', body: JSON.stringify(payload) });
            }
            await loadFeeData();
            closeModal();
            renderFeeTable();
        } catch (err) { alert(err.message); }
    };
}

function filterModalStudents() {
    const cls     = (document.getElementById('m_class')?.value    || '').trim();
    const section = (document.getElementById('m_section')?.value  || '').trim();
    const q       = (document.getElementById('studentSearch')?.value || '').toLowerCase();
    const results = document.getElementById('studentResults');
    if (!results) return;

    const filtered = students.filter(s => {
        const matchClass   = !cls     || String(s.class)   === String(cls);
        const matchSection = !section || s.section         === section;
        const matchSearch  = !q       || s.name.toLowerCase().includes(q) || String(s.admissionNo).includes(q);
        return matchClass && matchSection && matchSearch;
    });

    if (filtered.length === 0) {
        results.innerHTML = `<p style="padding:10px; color:#888; font-size:13px;">No students found.</p>`;
        return;
    }

    results.innerHTML = filtered.map(s => `
        <div onclick="selectModalStudent(${s.admissionNo})"
            style="padding:10px 14px; cursor:pointer; border-bottom:1px solid #f0f0f0; font-size:13px;"
            onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'">
            <strong>${String(s.admissionNo).padStart(4,'0')}</strong> — ${s.name} 
            <span style="color:#888;">(${s.class}-${s.section})</span>
        </div>`).join('');
}

function selectModalStudent(admissionNo) {
    const s = findStudent(admissionNo);
    document.getElementById('f_reg').value = admissionNo;
    document.getElementById('f_mobile').value = s.parentMob || '';
    document.getElementById('studentResults').innerHTML = '';
    document.getElementById('studentSearch').value = '';
    const banner = document.getElementById('selectedStudentBanner');
    banner.style.display = 'block';
    banner.innerHTML = `✅ <strong>${s.name}</strong> &nbsp;|&nbsp; Class: ${s.class}-${s.section} &nbsp;|&nbsp; Reg: ${String(s.admissionNo).padStart(4,'0')}`;
}
function populateStudentDetails(admissionNo) {
    const s = findStudent(admissionNo);
    const mob = document.getElementById('f_mobile');
    if (mob) mob.value = s.parentMob || '';
}

// ── VIEW RECEIPT ──────────────────────────────────────
function viewFeeRecord(id) {
    const record = feeData.find(f => String(f.id) === String(id));
    if (!record) return alert('Record not found.');
    const s = findStudent(record.reg);

    modal.style.display = 'flex';
    modalBody.innerHTML = `
        <div id="printArea" style="padding:20px; font-family:Arial,sans-serif;">
            <div style="text-align:center; border-bottom:3px double #233d91; padding-bottom:12px; margin-bottom:16px;">
                <h2 style="color:#233d91; margin:0;">JACK AND JILL SCHOOL</h2>
                <p style="margin:4px 0; color:#555;">Fee Payment Receipt</p>
            </div>

            <div style="background:#233d91; color:#fff; padding:10px 16px; border-radius:6px; margin-bottom:16px; display:flex; justify-content:space-between;">
                <span style="font-size:15px; font-weight:bold;">👤 ${s.name || '-'}</span>
                <span style="font-size:12px; opacity:0.85;">Reg: ${String(record.reg).padStart(4,'0')} &nbsp;|&nbsp; Class: ${s.class || '-'}-${s.section || '-'}</span>
            </div>

            <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding:8px 12px; text-align:left; color:#233d91; font-size:13px;">Field</th>
                        <th style="padding:8px 12px; text-align:left; color:#233d91; font-size:13px;">Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${[
                        ['Receipt ID',    record.id],
                        ['Payment Date',  record.date],
                        ['Payment Mode',  record.mode],
                        ['Payment Term',  record.paymentTerm || '-'],
                        ['Mobile',        s.parentMob || '-'],
                    ].map(([k,v], i) => `
                        <tr style="border-bottom:1px solid #e2e8f0; ${i%2===0?'background:#f8fafc':''}">
                            <td style="padding:8px 12px; font-size:13px; font-weight:600;">${k}</td>
                            <td style="padding:8px 12px; font-size:13px;">${v}</td>
                        </tr>`).join('')}
                </tbody>
            </table>

            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:20px;">
                <div style="background:#f1f5f9; padding:12px; border-radius:6px; text-align:center;">
                    <div style="font-size:11px; color:#555; font-weight:bold;">TOTAL</div>
                    <div style="font-size:18px; font-weight:bold; color:#233d91;">₹${Number(record.total).toLocaleString('en-IN')}</div>
                </div>
                <div style="background:#f1f5f9; padding:12px; border-radius:6px; text-align:center;">
                    <div style="font-size:11px; color:#555; font-weight:bold;">PAID</div>
                    <div style="font-size:18px; font-weight:bold; color:#22c55e;">₹${Number(record.paid).toLocaleString('en-IN')}</div>
                </div>
                <div style="background:${statusColor(record.status)}; padding:12px; border-radius:6px; text-align:center;">
                    <div style="font-size:11px; color:#fff; font-weight:bold;">PENDING</div>
                    <div style="font-size:18px; font-weight:bold; color:#fff;">₹${Number(record.pending).toLocaleString('en-IN')}</div>
                </div>
            </div>

            <div style="text-align:center; font-size:12px; color:#888; border-top:1px dashed #ccc; padding-top:12px;">
                Computer-generated receipt — JACK AND JILL SCHOOL Admin Portal
            </div>
        </div>

        <div style="display:flex; gap:12px; padding:16px 20px; justify-content:flex-end; border-top:1px solid #e2e8f0;">
            <button onclick="printFeeReceipt('${record.id}')" 
                style="background:#233d91; color:#fff; border:none; padding:10px 28px; border-radius:6px; cursor:pointer; font-size:14px; font-weight:600;">
                🖨️ Print
            </button>
            <button onclick="closeModal()" 
                style="background:#fff; color:#233d91; border:2px solid #233d91; padding:10px 28px; border-radius:6px; cursor:pointer; font-size:14px; font-weight:600;">
                Close
            </button>
        </div>`;
}

function printFeeReceipt(id) {
    const record = feeData.find(f => String(f.id) === String(id));
    if (!record) return;
    const s = findStudent(record.reg);

    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html>
<html>
<head>
    <title>&nbsp;</title>
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family: Arial, sans-serif; padding: 30px; }
        .header { text-align:center; border-bottom:3px double #233d91; padding-bottom:12px; margin-bottom:16px; }
        .header h2 { color:#233d91; font-size:20px; }
        .header p { color:#555; font-size:12px; margin-top:4px; }
        .banner { background:#233d91; color:#fff; padding:10px 16px; border-radius:6px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; }
        table { width:100%; border-collapse:collapse; margin-bottom:16px; }
        th { background:#f1f5f9; padding:8px 12px; text-align:left; font-size:12px; color:#233d91; }
        td { padding:8px 12px; font-size:12px; border-bottom:1px solid #e2e8f0; }
        tr:nth-child(odd) { background:#f8fafc; }
        .summary { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:30px; }
        .summary div { padding:12px; border-radius:6px; text-align:center; }
        .footer { margin-top:50px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:20px; text-align:center; }
        .footer div { border-top:1px solid #333; padding-top:6px; font-size:11px; color:#444; }
        @media print { body { padding:15px; } @page { margin:10mm; } }
    </style>
</head>
<body>
    <div class="header">
        <h2>JACK AND JILL SCHOOL</h2>
        <p>Fee Payment Receipt</p>
    </div>
    <div class="banner">
        <span style="font-size:15px; font-weight:bold;">👤 ${s.name || '-'}</span>
        <span style="font-size:12px; opacity:0.85;">Reg: ${String(record.reg).padStart(4,'0')} &nbsp;|&nbsp; Class: ${s.class || '-'}-${s.section || '-'}</span>
    </div>
    <table>
        <thead><tr><th>Field</th><th>Details</th></tr></thead>
        <tbody>
            <tr><td>Receipt ID</td><td>${record.id}</td></tr>
            <tr><td>Payment Date</td><td>${record.date}</td></tr>
            <tr><td>Payment Mode</td><td>${record.mode}</td></tr>
            <tr><td>Payment Term</td><td>${record.paymentTerm || '-'}</td></tr>
            <tr><td>Mobile</td><td>${s.parentMob || '-'}</td></tr>
        </tbody>
    </table>
    <div class="summary">
        <div style="background:#f1f5f9;">
            <div style="font-size:11px; color:#555; font-weight:bold;">TOTAL</div>
            <div style="font-size:20px; font-weight:bold; color:#233d91;">₹${Number(record.total).toLocaleString('en-IN')}</div>
        </div>
        <div style="background:#f1f5f9;">
            <div style="font-size:11px; color:#555; font-weight:bold;">PAID</div>
            <div style="font-size:20px; font-weight:bold; color:#22c55e;">₹${Number(record.paid).toLocaleString('en-IN')}</div>
        </div>
        <div style="background:${statusColor(record.status)};">
            <div style="font-size:11px; color:#fff; font-weight:bold;">PENDING</div>
            <div style="font-size:20px; font-weight:bold; color:#fff;">₹${Number(record.pending).toLocaleString('en-IN')}</div>
        </div>
    </div>
    <div class="footer">
        <div>Parent / Guardian Signature</div>
        <div>Accountant Signature</div>
        <div>Principal Signature</div>
    </div>
</body>
</html>`);
    w.document.close();
    w.print();
}
// ── DELETE ────────────────────────────────────────────
async function deleteFeeRecord(id) {
    if (!confirm('Delete this fee record? This cannot be undone.')) return;
    try {
        await apiRequest(`/fees/${id}`, { method: 'DELETE' });
        await loadFeeData();
        renderFeeTable();
    } catch (err) { alert(err.message); }
}

// ── UTILS ─────────────────────────────────────────────
function closeModal() { modal.style.display = 'none'; }
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}