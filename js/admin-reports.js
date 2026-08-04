// =======================================
// MODERN TEAMS HRMS
// ADMIN REPORT MODULE (FIXED & UPDATED)
// =======================================

let reportData = [];

// DATE HELPER
function getTodayDate() {
    let d = new Date();
    return d.toISOString().split("T")[0];
}

// GENERATE REPORT
async function generateReport() {
    try {
        let fromDateEl = document.getElementById("reportFromDate");
        let toDateEl = document.getElementById("reportToDate");
        let deptEl = document.getElementById("reportDepartment");

        let fromDate = fromDateEl ? fromDateEl.value : getTodayDate();
        let toDate = toDateEl ? toDateEl.value : getTodayDate();
        let department = deptEl ? deptEl.value : "";

        if (!fromDate) fromDate = getTodayDate();
        if (!toDate) toDate = getTodayDate();

        // 1. GET EMPLOYEES
        let query = supabaseClient
            .from("profiles")
            .select("id, full_name, department, role, status")
            .eq("role", "employee");

        if (department) {
            query = query.eq("department", department);
        }

        const { data: employees, error: empError } = await query;

        if (empError) {
            console.error("Employee Fetch Error:", empError);
            renderError("Failed to fetch employee profiles");
            return;
        }

        if (!employees || employees.length === 0) {
            reportData = [];
            renderReport([]);
            return;
        }

        // 2. GET ATTENDANCE
        const { data: attendance, error: attError } = await supabaseClient
            .from("attendance")
            .select("*")
            .gte("attendance_date", fromDate)
            .lte("attendance_date", toDate);

        if (attError) {
            console.error("Attendance Fetch Error:", attError);
        }

        const safeAttendance = attendance || [];

        // 3. GET LEAVES
        const { data: leaves, error: leaveError } = await supabaseClient
            .from("leave_requests")
            .select("*")
            .eq("status", "Approved");

        if (leaveError) {
            console.error("Leave Fetch Error:", leaveError);
        }

        const safeLeaves = leaves || [];

        // 4. PROCESS EMPLOYEE SUMMARY
        reportData = [];
        const totalDays = calculateDays(fromDate, toDate);

        employees.forEach(emp => {
            // Check matching ID from both possible columns (user_id / employee_id / id)
            let empAttendance = safeAttendance.filter(a => {
                const attUserId = a.user_id || a.employee_id;
                return String(attUserId) === String(emp.id);
            });

            let present = 0;
            let late = 0;
            let workingMinutes = 0;

            empAttendance.forEach(att => {
                let status = calculateAttendanceStatus(att);

                if (status === "Present") present++;
                if (status === "Late") late++;

                if (att.check_in) {
                    let start = new Date(att.check_in);
                    let end = att.check_out ? new Date(att.check_out) : new Date();

                    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                        let diff = Math.floor((end - start) / 60000);
                        if (diff > 0) workingMinutes += diff;
                    }
                }
            });

            // COUNT LEAVES
            let empLeaves = safeLeaves.filter(l => {
                const leaveUserId = l.user_id || l.employee_id;
                return String(leaveUserId) === String(emp.id);
            });

            let leaveDays = calculateLeaveDays(empLeaves, fromDate, toDate);

            // ABSENT & PERCENTAGE CALCULATIONS
            let absent = totalDays - (present + late + leaveDays);
            if (absent < 0) absent = 0;

            let percentage = totalDays > 0
                ? Math.round(((present + late) / totalDays) * 100)
                : 0;

            reportData.push({
                employee: emp,
                totalDays,
                present,
                late,
                absent,
                leave: leaveDays,
                percentage,
                workingHours: convertMinutes(workingMinutes)
            });
        });

        console.log("FINAL REPORT GENERATED:", reportData);
        renderReport(reportData);

    } catch (error) {
        console.error("REPORT SYSTEM ERROR:", error);
        renderError("An error occurred while generating report.");
    }
}

// STATUS CALCULATOR
function calculateAttendanceStatus(att) {
    if (!att || !att.check_in) {
        return "Absent";
    }

    let check = new Date(att.check_in);
    let office = new Date(att.check_in); // Same day calculation
    office.setHours(10, 15, 0, 0); // 10:15 AM threshold

    if (check > office) {
        return "Late";
    }
    return "Present";
}

// DAYS CALCULATOR
function calculateDays(start, end) {
    let s = new Date(start);
    let e = new Date(end);
    let diff = e.getTime() - s.getTime();
    let days = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    return days > 0 ? days : 1;
}

// LEAVE DAYS CALCULATOR
function calculateLeaveDays(leaves, from, to) {
    let count = 0;

    leaves.forEach(l => {
        if (!l.from_date || !l.to_date) return;

        let start = new Date(l.from_date);
        let end = new Date(l.to_date);
        let current = new Date(start);

        while (current <= end) {
            let dayStr = current.toISOString().split("T")[0];

            if (dayStr >= from && dayStr <= to) {
                count++;
            }
            current.setDate(current.getDate() + 1);
        }
    });

    return count;
}

// MINUTES TO HOURS CONVERTER
function convertMinutes(min) {
    if (!min || min <= 0) return "0h 0m";
    let h = Math.floor(min / 60);
    let m = min % 60;
    return `${h}h ${m}m`;
}

// RENDER REPORT TO TABLE
function renderReport(data) {
    const table = document.getElementById("reportTableBody");
    if (!table) return;

    if (!data || data.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: #64748b; padding: 20px;">
                    No Report Data Found for Selected Range
                </td>
            </tr>
        `;
        return;
    }

    let html = "";
    data.forEach(item => {
        html += `
            <tr>
                <td><strong>${item.employee.full_name || 'Employee'}</strong></td>
                <td>${item.employee.department || "-"}</td>
                <td>${item.totalDays}</td>
                <td><span style="color: #16a34a; font-weight: 600;">${item.present}</span></td>
                <td><span style="color: #d97706; font-weight: 600;">${item.late}</span></td>
                <td><span style="color: #dc2626; font-weight: 600;">${item.absent}</span></td>
                <td><span style="color: #2563eb; font-weight: 600;">${item.leave}</span></td>
                <td>${item.workingHours}</td>
                <td><strong>${item.percentage}%</strong></td>
            </tr>
        `;
    });

    table.innerHTML = html;

    let total = document.getElementById("totalEmployees");
    if (total) {
        total.innerText = data.length;
    }
}

function renderError(msg) {
    const table = document.getElementById("reportTableBody");
    if (table) {
        table.innerHTML = `<tr><td colspan="9" style="text-align: center; color: red;">${msg}</td></tr>`;
    }
}

// EXPORT FUNCTIONS
function exportExcel() {
    if (!reportData.length) {
        alert("Please generate report first.");
        return;
    }

    let excel = reportData.map(item => ({
        Employee: item.employee.full_name,
        Department: item.employee.department || "-",
        Total_Days: item.totalDays,
        Present: item.present,
        Late: item.late,
        Absent: item.absent,
        Leave: item.leave,
        Working_Hours: item.workingHours,
        Attendance_Percentage: item.percentage + "%"
    }));

    let sheet = XLSX.utils.json_to_sheet(excel);
    let workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Employee Summary");
    XLSX.writeFile(workbook, "Modern_Teams_Employee_Report.xlsx");
}

function exportPDF() {
    if (!reportData.length) {
        alert("Please generate report first.");
        return;
    }

    const { jsPDF } = window.jspdf;
    let doc = new jsPDF();

    doc.text("Modern Teams HRMS Employee Report", 14, 20);

    let rows = reportData.map(item => [
        item.employee.full_name,
        item.employee.department || "-",
        item.totalDays,
        item.present,
        item.absent,
        item.late,
        item.leave,
        item.percentage + "%"
    ]);

    doc.autoTable({
        startY: 30,
        head: [["Employee", "Department", "Days", "Present", "Absent", "Late", "Leave", "Attendance %"]],
        body: rows
    });

    doc.save("Modern_Teams_Report.pdf");
}

function printReport() {
    window.print();
}

function resetReport() {
    let from = document.getElementById("reportFromDate");
    let to = document.getElementById("reportToDate");
    let dept = document.getElementById("reportDepartment");

    if (from) from.value = getTodayDate();
    if (to) to.value = getTodayDate();
    if (dept) dept.value = "";

    generateReport();
}

// EVENT LISTENERS
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("generateReportBtn")?.addEventListener("click", generateReport);
    document.getElementById("exportExcelBtn")?.addEventListener("click", exportExcel);
    document.getElementById("exportPdfBtn")?.addEventListener("click", exportPDF);
    document.getElementById("printReportBtn")?.addEventListener("click", printReport);
    document.getElementById("resetReportBtn")?.addEventListener("click", resetReport);

    let from = document.getElementById("reportFromDate");
    let to = document.getElementById("reportToDate");

    if (from && !from.value) from.value = getTodayDate();
    if (to && !to.value) to.value = getTodayDate();

    // Auto load report on init
    generateReport();
});
