// =========================================================
// ATTENDANCE AUTOMATION ENGINE (HRMS CORE LOGIC)
// =========================================================

/**
 * Single Date Status Calculator
 * Priority Rules:
 * 1. Approved Leave (🟡 On Leave)
 * 2. Official Holiday (🎉 Holiday)
 * 3. Weekly Off - e.g. Sunday (📅 Week Off)
 * 4. Actual Punch Record (🟢 Present / ⏰ Late / 🟠 Half Day)
 * 5. Default -> 🔴 Absent (If working day & no punch record)
 */

export async function calculateDailyAttendanceStatus(employeeId, targetDateStr) {
    const targetDate = new Date(targetDateStr);
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday

    // 1. Check Approved Leaves
    const { data: leaveData } = await supabaseClient
        .from("leaves")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("status", "Approved")
        .gte("end_date", targetDateStr)
        .lte("start_date", targetDateStr);

    if (leaveData && leaveData.length > 0) {
        return { status: "On Leave", badge: "🟡 On Leave", priority: 1 };
    }

    // 2. Check Official Holidays
    const { data: holidayData } = await supabaseClient
        .from("holidays")
        .select("*")
        .eq("holiday_date", targetDateStr);

    if (holidayData && holidayData.length > 0) {
        return { 
            status: "Holiday", 
            badge: `🎉 ${holidayData[0].holiday_name}`, 
            priority: 2 
        };
    }

    // 3. Check Week Off (Sunday)
    if (dayOfWeek === 0) {
        return { status: "Week Off", badge: "📅 Week Off", priority: 3 };
    }

    // 4. Check Punch Attendance Log
    const { data: attendanceLog } = await supabaseClient
        .from("attendance")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("date", targetDateStr)
        .maybeSingle();

    if (attendanceLog) {
        // Agar pehle se final status calculate hokar save hai
        return { 
            status: attendanceLog.status, 
            badge: getStatusBadge(attendanceLog.status),
            punchIn: attendanceLog.punch_in,
            punchOut: attendanceLog.punch_out,
            priority: 4 
        };
    }

    // 5. If Past Date and No Punch -> Mark Absent
    const todayStr = new Date().toISOString().split("T")[0];
    if (targetDateStr < todayStr) {
        return { status: "Absent", badge: "🔴 Absent", priority: 5 };
    }

    return { status: "Pending", badge: "⚪ Pending", priority: 6 };
}

// Helper Badge Generator
function getStatusBadge(status) {
    switch (status) {
        case "Present": return "🟢 Present";
        case "Late": return "⏰ Late";
        case "Half Day": return "🟠 Half Day";
        case "Absent": return "🔴 Absent";
        case "On Leave": return "🟡 On Leave";
        case "Holiday": return "🎉 Holiday";
        case "Week Off": return "📅 Week Off";
        default: return "⚪ Pending";
    }
}
