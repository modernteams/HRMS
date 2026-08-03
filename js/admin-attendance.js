// =======================================
// ADMIN ATTENDANCE SYSTEM
// Cleaned & Automated Attendance Engine
// =======================================

let attendanceData = [];

// =======================================
// UTILITIES & FORMATTERS
// =======================================

function formatTime(time) {
    if (!time) return "-";
    return new Date(time).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

function getStatusClass(status) {
    switch (status) {
        case "Present": return "status-present";
        case "Absent": return "status-absent";
        case "Late": return "status-late";
        case "Holiday": return "status-holiday";
        case "Week Off": return "status-weekoff";
        case "On Leave": return "status-leave";
        default: return "";
    }
}

function getActivityClass(activity) {
    switch (activity) {
        case "Working": return "activity-working";
        case "On Break": return "activity-break";
        case "Completed": return "activity-completed";
        case "On Leave": return "activity-leave";
        default: return "";
    }
}

// =======================================
// CALCULATIONS & CALCULATORS
// =======================================

function calculateLiveWorkingHours(att) {
    if (!att.check_in) return "-";

    let endTime = att.check_out ? new Date(att.check_out) : new Date();
    let startTime = new Date(att.check_in);

    let minutes = Math.floor((endTime - startTime) / 60000);
    let breakMinutes = 0;

    if (att.breaks) {
        att.breaks.forEach(b => {
            if (b.duration_minutes) {
                breakMinutes += b.duration_minutes;
            } else if (b.start_time && !b.end_time) {
                breakMinutes += Math.floor((new Date() - new Date(b.start_time)) / 60000);
            }
        });
    }

    minutes -= breakMinutes;
    if (minutes < 0) minutes = 0;

    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
}

// ABSENT CALCULATOR LOGIC
function calculateAttendanceStatus(att) {
    if (att.isOnLeave) return "On Leave";
    if (att.isHoliday) return "Holiday";

    if (att.attendance_date) {
        const recordDate = new Date(att.attendance_date);
        if (recordDate.getDay() === 0) {
            return "Week Off";
        }
    }

    // AGAR CHECK_IN NAHI HAI -> ABSENT
    if (!att.check_in) return "Absent";

    const checkInTime = new Date(att.check_in);
    const officeStart = new Date(att.attendance_date);
    officeStart.setHours(10, 15, 0); // 10:15 AM late limit

    if (checkInTime > officeStart) {
        return "Late";
    }

    return "Present";
}

function getActivity(att) {
    if (att.isOnLeave) return "On Leave";
    if (att.check_out) return "Completed";

    if (att.breaks && att.breaks.some(b => !b.end_time)) {
        return "On Break";
    }

    if (att.check_in) return "Working";
    return "Absent";
}

function getBreakDetails(att) {
    if (!att.breaks || att.breaks.length === 0) return "-";

    let html = "";
    att.breaks.forEach(b => {
        let minutes = b.duration_minutes || 0;
        if (b.start_time && !b.end_time) {
            minutes = Math.floor((new Date() - new Date(b.start_time)) / 60000);
        }
        html += `<div class="break-item">${b.break_type || 'Break'} (${minutes}m)</div>`;
    });

    return html;
}

// =======================================
// LOAD ATTENDANCE DATA (SUPABASE)
// =======================================

async function loadAttendance() {
    // Fetch logs from Supabase
    let { data, error } = await supabaseClient
        .from("attendance")
        .select(`
            *,
            profiles(
                full_name,
                email,
                department
            )
        `)
        .order("attendance_date", { ascending: false });

    if (error) {
        console.error("Attendance Fetch Error:", error);
        return;
    }

    if (!data || data.length === 0) {
        attendanceData = [];
        renderAttendance([]);
        return;
    }

    const employeeIds = [...new Set(data.map(att => att.employee_id))];

    // Related data fetch
    const [breakRes, leaveRes, holidayRes] = await Promise.all([
        supabaseClient.from("employee_breaks").select("*").in("employee_id", employeeIds),
        supabaseClient.from("leave_requests").select("*").eq("status", "Approved"),
        supabaseClient.from("holidays").select("*")
    ]);

    const breakData = breakRes.data || [];
    const leaveData = leaveRes.data || [];
    const holidayData = holidayRes.data || [];

    // Calculate dynamic statuses
    data.forEach(att => {
        att.breaks = breakData.filter(
            b => b.employee_id === att.employee_id && b.attendance_date === att.attendance_date
        );

        att.isOnLeave = leaveData.some(leave => 
            leave.employee_id === att.employee_id &&
            att.attendance_date >= leave.from_date &&
            att.attendance_date <= leave.to_date
        );

        att.isHoliday = holidayData.some(
            h => h.holiday_date === att.attendance_date
        );

        att.computedStatus = calculateAttendanceStatus(att);
        att.computedActivity = getActivity(att);
    });

    attendanceData = data;
    applyAttendanceFilters(); // Execute filters on fetched data
}

// =======================================
// FILTER EXECUTION ENGINE
// =======================================

function applyAttendanceFilters() {
    const searchText = (document.getElementById("attendanceSearch")?.value || "").toLowerCase().trim();
    const selectedDate = document.getElementById("attendanceDate")?.value || "";
    const selectedDepartment = document.getElementById("attendanceDepartment")?.value || "";
    const selectedStatus = document.getElementById("attendanceStatus")?.value || "";

    let filtered = [...attendanceData];

    if (searchText) {
        filtered = filtered.filter(att =>
            (att.profiles?.full_name || "").toLowerCase().includes(searchText)
        );
    }

    if (selectedDepartment) {
        filtered = filtered.filter(att => att.profiles?.department === selectedDepartment);
    }

    if (selectedDate) {
        filtered = filtered.filter(att => att.attendance_date === selectedDate);
    }

    if (selectedStatus) {
        filtered = filtered.filter(att => att.computedStatus === selectedStatus);
    }

    renderAttendance(filtered);
}

// =======================================
// RENDER TABLE
// =======================================

function renderAttendance(data) {
    const table = document.getElementById("attendanceTableBody");
    if (!table) return;

    if (!data || data.length === 0) {
        table.innerHTML = `<tr><td colspan="8" style="text-align: center;">No Attendance Records Found</td></tr>`;
        return;
    }

    let rows = "";
    data.forEach(att => {
        const activity = att.computedActivity || getActivity(att);
        const status = att.computedStatus || calculateAttendanceStatus(att);

        const formattedDate = att.attendance_date ? new Date(att.attendance_date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }) : "-";

        rows += `
        <tr>
            <td><strong>${att.profiles?.full_name || "Unknown"}</strong></td>
            <td>${formattedDate}</td>
            <td>${formatTime(att.check_in)}</td>
            <td>${formatTime(att.check_out)}</td>
            <td class="working-hours">${calculateLiveWorkingHours(att)}</td>
            <td><div class="break-box">${getBreakDetails(att)}</div></td>
            <td><span class="badge ${getActivityClass(activity)}">${activity}</span></td>
            <td><span class="badge ${getStatusClass(status)}">${status}</span></td>
        </tr>
        `;
    });

    table.innerHTML = rows;
}

// =======================================
// INITIALIZATION & EVENT LISTENERS
// =======================================

document.addEventListener("DOMContentLoaded", () => {
    // Filter trigger inputs
    document.getElementById("attendanceSearch")?.addEventListener("input", applyAttendanceFilters);
    document.getElementById("attendanceDate")?.addEventListener("change", applyAttendanceFilters);
    document.getElementById("attendanceDepartment")?.addEventListener("change", applyAttendanceFilters);
    document.getElementById("attendanceStatus")?.addEventListener("change", applyAttendanceFilters);

    const searchBtn = document.getElementById("attendanceSearchBtn");
    if (searchBtn) searchBtn.addEventListener("click", applyAttendanceFilters);

    const resetBtn = document.getElementById("resetAttendanceBtn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (document.getElementById("attendanceSearch")) document.getElementById("attendanceSearch").value = "";
            if (document.getElementById("attendanceDate")) document.getElementById("attendanceDate").value = "";
            if (document.getElementById("attendanceDepartment")) document.getElementById("attendanceDepartment").value = "";
            if (document.getElementById("attendanceStatus")) document.getElementById("attendanceStatus").value = "";
            applyAttendanceFilters();
        });
    }

    loadAttendance();
});
