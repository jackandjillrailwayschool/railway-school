// js/classreport.js

function renderUserManagement() {
    const contentArea = document.getElementById('content');

    contentArea.innerHTML = `
    <div class="card" style="background:#fff; padding:24px;">

        <div style="border-bottom:2px solid #e2e8f0; padding-bottom:16px; margin-bottom:24px;">
            <h2 style="color:#233d91; margin:0 0 4px; font-size:20px; font-weight:700;">📋 Class Report Generator</h2>
            <p style="margin:0; color:#64748b; font-size:13px;">
                Select a class, section and exam to generate a full student report — marks, attendance &amp; fee dues.
            </p>
        </div>

        <div style="display:flex; flex-wrap:wrap; gap:14px; align-items:flex-end;
                    background:#f8fafc; border:1px solid #e2e8f0; padding:16px 18px;
                    border-radius:10px; margin-bottom:24px;">

            <div style="display:flex; flex-direction:column; gap:5px;">
                <label style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Class</label>
                <select id="cr_class"
                    style="padding:9px 14px; border-radius:7px; border:1px solid #ddd;
                           background:#fff; font-size:14px; color:#1e293b; min-width:130px;">
                    <option value="">-- Select --</option>
                    ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}">Class ${n}</option>`).join('')}
                </select>
            </div>

            <div style="display:flex; flex-direction:column; gap:5px;">
                <label style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Section</label>
                <select id="cr_section"
                    style="padding:9px 14px; border-radius:7px; border:1px solid #ddd;
                           background:#fff; font-size:14px; color:#1e293b; min-width:130px;">
                    <option value="">-- Select --</option>
                    ${['A','B','C','D','E','F'].map(s => `<option value="${s}">Section ${s}</option>`).join('')}
                </select>
            </div>

            <div style="display:flex; flex-direction:column; gap:5px;">
                <label style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:0.5px;">Exam</label>
                <select id="cr_exam"
                    style="padding:9px 14px; border-radius:7px; border:1px solid #ddd;
                           background:#fff; font-size:14px; color:#1e293b; min-width:160px;">
                    <option value="">-- Select Exam --</option>
                    <optgroup label="Formative Assessment">
                        ${['FA1','FA2','FA3','FA4'].map(e => `<option value="${e}">${e}</option>`).join('')}
                    </optgroup>
                    <optgroup label="Summative Assessment">
                        <option value="SA1">SA1</option>
                        <option value="SA2">SA2</option>
                        <option value="SA3">SA3</option>
                    </optgroup>
                </select>
            </div>

            <button id="cr_genBtn"
                style="padding:10px 26px; background:#233d91; color:#fff; border:none;
                       border-radius:7px; font-size:14px; font-weight:700; cursor:pointer;
                       align-self:flex-end; letter-spacing:0.3px;">
                Generate Report
            </button>

            <button id="cr_printBtn"
                style="display:none; padding:10px 20px; background:#fff; color:#233d91;
                       border:2px solid #233d91; border-radius:7px; font-size:14px;
                       font-weight:700; cursor:pointer; align-self:flex-end;">
                🖨️ Print
            </button>
        </div>

        <div id="cr_summary" style="display:none; grid-template-columns:repeat(auto-fit,minmax(140px,1fr));
              gap:12px; margin-bottom:24px;"></div>

        <div id="cr_tableWrapper">
            <p style="text-align:center; padding:40px; color:#94a3b8; font-size:14px;">
                Select a class, section and exam above, then click <strong>Generate Report</strong>.
            </p>
        </div>

    </div>`;

    document.getElementById('cr_genBtn').addEventListener('click', function () {
        const cls     = document.getElementById('cr_class').value;
        const section = document.getElementById('cr_section').value;
        const exam    = document.getElementById('cr_exam').value;
        if (!exam) { alert('Please select an exam.'); return; }
        generateClassReport(cls, section, exam);
    });

    document.getElementById('cr_printBtn').addEventListener('click', function () {
        printClassReport();
    });
}

// ── Helper: compute maxTotal from marks record if backend didn't send it ──────
function crComputeMaxTotal(m) {
    const FA_EXAMS = ['FA1','FA2','FA3','FA4'];
    const cls      = m.class || '';
    const c        = parseInt(cls);
    const isPrimary = c >= 1 && c <= 5;
    const marksArr  = Array.isArray(m.marks) ? m.marks : [];
    const subCount  = marksArr.length || 1;

    if (FA_EXAMS.includes(m.exam)) {
        return isPrimary ? 50 * 5 : 50 * subCount;
    }
    if (m.exam === 'SA1') {
        if (isPrimary) return 100 * 5;
        return 80 * subCount;
    }
    if (m.exam === 'SA2' || m.exam === 'SA3') {
        if (isPrimary) return 100 * 5;
        return 100 * subCount;
    }
    // Legacy
    if (m.exam === 'Annual')     return isPrimary ? 100 * 5 : 100 * subCount;
    if (m.exam === 'Quarterly' || m.exam === 'Half-Yearly')
                                  return isPrimary ? 80  * 5 : 80  * subCount;
    return 50 * (isPrimary ? 5 : subCount);
}

// ─── MAIN GENERATOR ──────────────────────────────────────────────────────────
async function generateClassReport(cls, section, exam) {

    if (!cls || !section || !exam) {
        alert('Please select Class, Section and Exam.');
        return;
    }

    const wrapper = document.getElementById('cr_tableWrapper');
    wrapper.innerHTML = `
        <div style="text-align:center; padding:40px; color:#64748b;">
            <div style="font-size:28px; margin-bottom:10px;">⏳</div>
            <p style="font-size:14px;">Loading report for Class ${cls}-${section} — ${exam}…</p>
        </div>`;

    document.getElementById('cr_summary').style.display = 'none';
    document.getElementById('cr_printBtn').style.display = 'none';

    try {
        const allStudents = (typeof students !== 'undefined' && students.length > 0)
            ? students : (window.students || []);

        const classStudents = allStudents.filter(s =>
            String(s.class).trim()   === String(cls).trim() &&
            String(s.section).trim().toUpperCase() === String(section).trim().toUpperCase()
        );

        if (classStudents.length === 0) {
            wrapper.innerHTML = `
                <div style="text-align:center; padding:40px; color:#94a3b8;">
                    <div style="font-size:32px; margin-bottom:10px;">🔍</div>
                    <p style="font-size:14px;">No students found in Class ${cls}-${section}.</p>
                </div>`;
            return;
        }

        const [allMarks, allFees, allAttendance] = await Promise.all([
            apiRequest('/marks').catch(() => []),
            apiRequest('/fees').catch(() => []),
            apiRequest('/attendance').catch(() => [])
        ]);

        const rows = classStudents.map(s => {
            // Find the mark record for this student + exam
            const markRecord = (allMarks || []).find(
                m => String(m.reg) === String(s.admissionNo) && m.exam === exam
            );

            let totalMarks = null, maxMarks = null, percentage = null, grade = null;
            if (markRecord) {
                totalMarks = markRecord.total ?? null;

                // maxTotal: use what the backend stored, fallback to computed
                maxMarks = (markRecord.maxTotal != null && markRecord.maxTotal !== undefined)
                    ? markRecord.maxTotal
                    : crComputeMaxTotal(markRecord);

                // percentage: use stored, fallback to compute
                percentage = (markRecord.percentage != null && markRecord.percentage !== undefined)
                    ? markRecord.percentage
                    : (maxMarks > 0 ? Number(((totalMarks / maxMarks) * 100).toFixed(1)) : 0);

                grade = markRecord.grade ?? null;
            }

            const passFail = totalMarks !== null
                ? (parseFloat(percentage) >= 35 ? 'Pass' : 'Fail')
                : null;

            const stuFees  = (allFees || []).filter(f => String(f.reg) === String(s.admissionNo));
            const totalDue = stuFees.reduce((acc, f) => acc + Number(f.pending || 0), 0);
            const feeStatus = stuFees.length === 0 ? null
                : totalDue > 0 ? 'Dues' : 'Clear';

            const stuAtt      = (allAttendance || []).filter(a => a.studentId === s.studentId);
            const totalDays   = stuAtt.length;
            const presentDays = stuAtt.filter(a => a.status === 'Present').length;
            const attPct      = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null;

            return { s, totalMarks, maxMarks, percentage, grade, examName: markRecord ? exam : null,
                     passFail, totalDue, feeStatus, attPct, totalDays, presentDays };
        });

        window._classReportData = { cls, section, exam, rows };

        // ── Summary cards (no "No Marks Yet" card) ───────────────────────────
        const total     = rows.length;
        const passed    = rows.filter(r => r.passFail === 'Pass').length;
        const failed    = rows.filter(r => r.passFail === 'Fail').length;
        const totalDues = rows.reduce((a, r) => a + r.totalDue, 0);
        const attRows   = rows.filter(r => r.attPct !== null);
        const avgAtt    = attRows.length > 0
            ? Math.round(attRows.reduce((a, r) => a + r.attPct, 0) / attRows.length) : null;

        const summaryEl = document.getElementById('cr_summary');
        summaryEl.style.display = 'grid';
        summaryEl.innerHTML = [
            { label: 'Total Students', value: total,                                  color: '#233d91', bg: '#eff6ff' },
            { label: 'Passed',         value: passed,                                 color: '#15803d', bg: '#f0fdf4' },
            { label: 'Failed',         value: failed,                                 color: '#b91c1c', bg: '#fef2f2' },
            { label: 'Pass %',         value: total > 0 ? Math.round((passed/total)*100)+'%' : '—',
                                                                                       color: '#1d4ed8', bg: '#dbeafe' },
            { label: 'Avg Attendance', value: avgAtt !== null ? avgAtt + '%' : '—',   color: '#0369a1', bg: '#f0f9ff' },
            { label: 'Total Fees Due', value: '₹' + totalDues.toLocaleString('en-IN'),color: '#7c3aed', bg: '#faf5ff' },
        ].map(m => `
            <div style="background:${m.bg}; border:1px solid #e2e8f0; border-top:3px solid ${m.color};
                        border-radius:8px; padding:14px 16px;">
                <div style="font-size:10px; font-weight:700; color:${m.color};
                            text-transform:uppercase; letter-spacing:0.6px; margin-bottom:6px;">${m.label}</div>
                <div style="font-size:22px; font-weight:700; color:${m.color};">${m.value}</div>
            </div>`).join('');

        // ── Table ─────────────────────────────────────────────────────────────
        const TH = `padding:10px 12px; text-align:left; font-size:11px; font-weight:700; color:#233d91;
                    text-transform:uppercase; letter-spacing:0.5px; border-bottom:2px solid #e2e8f0; white-space:nowrap;`;
        const TD = `padding:10px 12px; vertical-align:middle; font-size:13px;`;

        wrapper.innerHTML = `
        <div style="overflow-x:auto; border:1px solid #e2e8f0; border-radius:8px;">
        <table style="width:100%; border-collapse:collapse; font-size:13px; background:#fff; min-width:900px;">
            <thead>
                <tr style="background:#f1f5f9;">
                    <th style="${TH}">#</th>
                    <th style="${TH}">Adm. No</th>
                    <th style="${TH}">Name</th>
                    <th style="${TH}">Marks</th>
                    <th style="${TH}">%</th>
                    <th style="${TH}">Grade</th>
                    <th style="${TH}">Result</th>
                    <th style="${TH}">Attendance</th>
                    <th style="${TH}">Fees Due</th>
                    <th style="${TH}">Fee Status</th>
                </tr>
            </thead>
            <tbody>
                ${rows.map((r, i) => `
                    <tr style="border-bottom:1px solid #f1f5f9; background:${i % 2 === 0 ? '#fff' : '#fafbff'};">
                        <td style="${TD} color:#94a3b8;">${i + 1}</td>
                        <td style="${TD} font-weight:700; color:#233d91;">${String(r.s.admissionNo).padStart(4,'0')}</td>
                        <td style="${TD} font-weight:600; color:#1e293b;">${r.s.name}</td>
                        <td style="${TD}">${r.totalMarks !== null ? r.totalMarks + ' / ' + r.maxMarks : '<span style="color:#94a3b8;">No Record</span>'}</td>
                        <td style="${TD}">${r.percentage !== null ? r.percentage + '%' : '—'}</td>
                        <td style="${TD}">${r.grade ? crGradeBadge(r.grade) : '—'}</td>
                        <td style="${TD}">${r.passFail ? crResultBadge(r.passFail) : '—'}</td>
                        <td style="${TD}">
                            ${r.attPct !== null
                                ? `<span style="font-weight:600; color:${r.attPct >= 75 ? '#15803d' : r.attPct >= 50 ? '#d97706' : '#b91c1c'};">
                                       ${r.attPct}%
                                   </span>
                                   <span style="color:#94a3b8; font-size:11px;"> (${r.presentDays}/${r.totalDays})</span>`
                                : '—'}
                        </td>
                        <td style="${TD}">
                            ${r.totalDue > 0
                                ? `<span style="color:#b91c1c; font-weight:700;">₹${r.totalDue.toLocaleString('en-IN')}</span>`
                                : `<span style="color:#94a3b8;">—</span>`}
                        </td>
                        <td style="${TD}">${r.feeStatus ? crFeeBadge(r.feeStatus) : '—'}</td>
                    </tr>`).join('')}
            </tbody>
        </table>
        </div>`;

        document.getElementById('cr_printBtn').style.display = 'inline-block';

    } catch (err) {
        wrapper.innerHTML = `
            <div style="text-align:center; padding:40px; color:#b91c1c;">
                <div style="font-size:28px; margin-bottom:10px;">⚠️</div>
                <p style="font-size:14px;">Error: ${err.message}</p>
            </div>`;
        console.error('[ClassReport] Error:', err);
    }
}

// ─── BADGE HELPERS ────────────────────────────────────────────────────────────
function crGradeBadge(grade) {
    const map = { 'A+': 'background:#dcfce7;color:#15803d;', 'A': 'background:#dbeafe;color:#1d4ed8;',
                  'B':  'background:#fef9c3;color:#854d0e;', 'C': 'background:#ffedd5;color:#c2410c;' };
    const s = map[grade] || 'background:#fee2e2;color:#b91c1c;';
    return `<span style="${s} padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700;">${grade}</span>`;
}
function crResultBadge(result) {
    const s = result === 'Pass' ? 'background:#dcfce7;color:#15803d;' : 'background:#fee2e2;color:#b91c1c;';
    return `<span style="${s} padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700;">${result}</span>`;
}
function crFeeBadge(status) {
    const s = status === 'Clear' ? 'background:#dcfce7;color:#15803d;' : 'background:#fef9c3;color:#854d0e;';
    return `<span style="${s} padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700;">${status}</span>`;
}

// ─── PRINT ────────────────────────────────────────────────────────────────────
function printClassReport() {
    const data = window._classReportData;
    if (!data) return;
    const { cls, section, exam, rows } = data;
    const total     = rows.length;
    const passed    = rows.filter(r => r.passFail === 'Pass').length;
    const failed    = rows.filter(r => r.passFail === 'Fail').length;
    const totalDues = rows.reduce((a, r) => a + r.totalDue, 0);
    const attRows   = rows.filter(r => r.attPct !== null);
    const avgAtt    = attRows.length > 0
        ? Math.round(attRows.reduce((a, r) => a + r.attPct, 0) / attRows.length) : null;
    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html>
<html><head><title>Class ${cls}-${section} — ${exam} Report</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:Arial,sans-serif;padding:24px;color:#1a1a1a;background:#fff;}
.header{text-align:center;border-bottom:3px double #233d91;padding-bottom:12px;margin-bottom:16px;}
.header h2{color:#233d91;font-size:20px;}
.header p{color:#555;font-size:12px;margin-top:4px;}
.banner{background:#233d91;color:#fff;padding:10px 16px;border-radius:6px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;}
.summary{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:16px;}
.sum-box{border:1px solid #e2e8f0;border-top:3px solid #233d91;border-radius:6px;padding:8px 10px;text-align:center;}
.sum-box .lbl{font-size:9px;font-weight:bold;color:#555;text-transform:uppercase;margin-bottom:4px;}
.sum-box .val{font-size:16px;font-weight:bold;}
table{width:100%;border-collapse:collapse;font-size:11px;}
thead tr{background:#f1f5f9;}
th{padding:7px 8px;text-align:left;font-weight:700;font-size:10px;text-transform:uppercase;color:#233d91;border-bottom:2px solid #c8d3e8;white-space:nowrap;}
td{padding:7px 8px;border-bottom:1px solid #f1f5f9;vertical-align:middle;}
tr:nth-child(odd) td{background:#fafbff;}tr:nth-child(even) td{background:#fff;}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:bold;}
.pass{background:#dcfce7;color:#15803d;}.fail{background:#fee2e2;color:#b91c1c;}
.dues{background:#fef9c3;color:#854d0e;}.clear{background:#dcfce7;color:#15803d;}
.grade-ap{background:#dcfce7;color:#15803d;}.grade-a{background:#dbeafe;color:#1d4ed8;}
.grade-b{background:#fef9c3;color:#854d0e;}.grade-c{background:#ffedd5;color:#c2410c;}
.grade-f{background:#fee2e2;color:#b91c1c;}
.footer{margin-top:40px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;text-align:center;}
.footer div{border-top:1px solid #333;padding-top:6px;font-size:10px;color:#444;}
@media print{body{padding:10px;}@page{margin:8mm;size:A4 landscape;}}
</style></head><body>
<div class="header">
    <h2>JACK AND JILL SCHOOL</h2>
    <p>Class Report — Class ${cls}-${section} | ${exam}</p>
</div>
<div class="banner">
    <span style="font-size:16px;font-weight:bold;">Class ${cls} — Section ${section} — ${exam}</span>
    <span style="font-size:11px;opacity:0.85;">Generated: ${today}</span>
</div>
<div class="summary">
    <div class="sum-box"><div class="lbl">Total</div><div class="val" style="color:#233d91;">${total}</div></div>
    <div class="sum-box"><div class="lbl">Passed</div><div class="val" style="color:#15803d;">${passed}</div></div>
    <div class="sum-box"><div class="lbl">Failed</div><div class="val" style="color:#b91c1c;">${failed}</div></div>
    <div class="sum-box"><div class="lbl">Pass %</div><div class="val" style="color:#1d4ed8;">${total > 0 ? Math.round((passed/total)*100) : 0}%</div></div>
    <div class="sum-box"><div class="lbl">Avg Attendance</div><div class="val" style="color:#0369a1;">${avgAtt !== null ? avgAtt + '%' : '—'}</div></div>
    <div class="sum-box"><div class="lbl">Fees Due</div><div class="val" style="color:#7c3aed;">₹${totalDues.toLocaleString('en-IN')}</div></div>
</div>
<table><thead><tr>
    <th>#</th><th>Adm. No</th><th>Name</th><th>Marks</th>
    <th>%</th><th>Grade</th><th>Result</th><th>Attendance</th><th>Fees Due</th><th>Fee Status</th>
</tr></thead><tbody>
${rows.map((r, i) => {
    const gc = r.grade==='A+' ? 'grade-ap' : r.grade==='A' ? 'grade-a' : r.grade==='B' ? 'grade-b' : r.grade==='C' ? 'grade-c' : 'grade-f';
    return `<tr>
    <td>${i+1}</td>
    <td><strong>${String(r.s.admissionNo).padStart(4,'0')}</strong></td>
    <td><strong>${r.s.name}</strong></td>
    <td>${r.totalMarks !== null ? r.totalMarks + '/' + r.maxMarks : '—'}</td>
    <td>${r.percentage !== null ? r.percentage + '%' : '—'}</td>
    <td>${r.grade ? `<span class="badge ${gc}">${r.grade}</span>` : '—'}</td>
    <td>${r.passFail ? `<span class="badge ${r.passFail.toLowerCase()}">${r.passFail}</span>` : '—'}</td>
    <td style="color:${r.attPct !== null ? (r.attPct >= 75 ? '#15803d' : r.attPct >= 50 ? '#d97706' : '#b91c1c') : '#94a3b8'};font-weight:600;">
        ${r.attPct !== null ? r.attPct + '% (' + r.presentDays + '/' + r.totalDays + ')' : '—'}
    </td>
    <td style="color:${r.totalDue > 0 ? '#b91c1c' : '#94a3b8'};font-weight:${r.totalDue > 0 ? '700' : '400'};">
        ${r.totalDue > 0 ? '₹' + r.totalDue.toLocaleString('en-IN') : '—'}
    </td>
    <td>${r.feeStatus ? `<span class="badge ${r.feeStatus.toLowerCase()}">${r.feeStatus}</span>` : '—'}</td>
    </tr>`;
}).join('')}
</tbody></table>
<div class="footer">
    <div>Class Teacher Signature</div><div>Principal Signature</div><div>Date: _______________</div>
</div>
</body></html>`);
    w.document.close();
    w.print();
}