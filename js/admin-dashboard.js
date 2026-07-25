// ======================================
// MODERN TEAMS HRMS
// ADMIN DASHBOARD JS (SAFE FIXED VERSION)
// ======================================

let currentAdmin = null;

async function loadAdminDashboard() {
  console.log("Admin Dashboard Loading...");

  // ADMIN PROFILE + GREETING
  const { data: { user } } = await supabaseClient.auth.getUser();

  if (user) {
    const { data: profile, error } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile) {
      currentAdmin = profile;
      const name = profile.full_name || "Admin";

      updateGreeting(name);

      const adminName = document.getElementById("adminName");
      if (adminName) adminName.innerText = name;

      const designation = document.getElementById("adminDesignation");
      if (designation) designation.innerText = profile.designation || "HR Administrator";

      const department = document.getElementById("adminDepartment");
      if (department) department.innerText = profile.department || "Administration";

      if (profile.profile_image) {
        const adminPhoto = document.getElementById("adminPhoto");
        const adminHeaderPhoto = document.getElementById("adminHeaderPhoto");

        if (adminPhoto) adminPhoto.src = profile.profile_image;
        if (adminHeaderPhoto) adminHeaderPhoto.src = profile.profile_image;
      }
    }
  }

  function updateGreeting(name) {
    const greetingElement = document.getElementById("greetingText");
    if (!greetingElement) return;

    const hour = new Date().getHours();
    let greeting;

    if (hour >= 5 && hour < 12) greeting = "Good Morning";
    else if (hour >= 12 && hour < 17) greeting = "Good Afternoon";
    else if (hour >= 17 && hour < 21) greeting = "Good Evening";
    else greeting = "Good Night";

    greetingElement.innerHTML = `${greeting}, ${name} 👋`;
  }

  // TOTAL EMPLOYEES
  const { data: employees, error: employeeError } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("role", "employee");

  if (!employeeError) {
    const el = document.getElementById("totalEmployees");
    if (el) el.innerText = employees ? employees.length : 0;
    renderDepartmentOverview(employees);
  }

  // PRESENT TODAY
  const today = new Date().toLocaleDateString("en-CA");
  const { data: attendance, error: attendanceError } = await supabaseClient
    .from("attendance")
    .select("*")
    .eq("attendance_date", today)
    .not("check_in", "is", null);

  let presentCount = 0;
  if (!attendanceError && attendance) {
    presentCount = attendance.length;
    const el = document.getElementById("presentToday");
    if (el) el.innerText = presentCount;
  }

  // ABSENT TODAY
  const total = employees ? employees.length : 0;
  const absent = total - presentCount;
  const absentElement = document.getElementById("absentToday");
  if (absentElement) absentElement.innerText = absent < 0 ? 0 : absent;

  // PENDING LEAVES
  const { data: leaves, error: leaveError } = await supabaseClient
    .from("leave_requests")
    .select("*")
    .eq("status", "Pending");

  if (!leaveError && leaves) {
    const el = document.getElementById("pendingLeaves");
    if (el) el.innerText = leaves.length;
  }

  // DEPARTMENTS COUNT
  const { data: departments, error: departmentError } = await supabaseClient
    .from("departments")
    .select("*");

  if (!departmentError && departments && document.getElementById("totalDepartments")) {
    document.getElementById("totalDepartments").innerText = departments.length;
  }
}

function renderDepartmentOverview(employees) {
  const container = document.getElementById("departmentList");
  if (!container) return;

  if (!employees || employees.length === 0) {
    container.innerHTML = "<p style='color:#777;'>No employees found.</p>";
    return;
  }

  const totalEmployees = employees.length;
  const departmentCounts = {};

  employees.forEach((emp) => {
    const deptName = emp.department || "Unassigned";
    departmentCounts[deptName] = (departmentCounts[deptName] || 0) + 1;
  });

  container.innerHTML = "";
  Object.keys(departmentCounts).forEach((deptName) => {
    const count = departmentCounts[deptName];
    const percentage = Math.round((count / totalEmployees) * 100);

    container.innerHTML += `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: 500; margin-bottom: 5px;">
          <span>${deptName} (${count})</span>
          <span>${percentage}%</span>
        </div>
        <div class="progress">
          <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  });
}

loadAdminDashboard();

// ATTENDANCE CHART
async function loadAttendanceChart() {
  let labels = [];
  let attendanceData = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    let date = new Date();
    date.setDate(today.getDate() - i);
    let dateString = date.toLocaleDateString("en-CA");
    let day = date.toLocaleDateString("en-IN", { weekday: "short" });

    labels.push(day);

    const { data, error } = await supabaseClient
      .from("attendance")
      .select("*")
      .eq("attendance_date", dateString)
      .not("check_in", "is", null);

    if (error || !data) attendanceData.push(0);
    else attendanceData.push(data.length);
  }

  const canvas = document.getElementById("attendanceChart");
  if (!canvas) return;

  new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Present Employees",
          data: attendanceData,
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
    },
  });
}

loadAttendanceChart();

// LIVE ATTENDANCE MONITOR (SAFE VERSION)
async function loadLiveAttendance() {
  const today = new Date().toLocaleDateString("en-CA");
  const table = document.getElementById("liveAttendanceTable");
  if (!table) return;

  try {
    const { data: attendanceData, error: attendanceError } = await supabaseClient
      .from("attendance")
      .select("*")
      .eq("attendance_date", today);

    if (attendanceError) return;

    const { data: profiles } = await supabaseClient
      .from("profiles")
      .select("id, full_name");

    const profileMap = {};
    if (profiles) {
      profiles.forEach(p => profileMap[p.id] = p.full_name);
    }

    table.innerHTML = "";

    if (!attendanceData || attendanceData.length === 0) {
      table.innerHTML = `<tr><td colspan="4">No attendance today</td></tr>`;
      return;
    }

    attendanceData.forEach((item) => {
      const empName = profileMap[item.user_id || item.employee_id] || "Employee";
      const isOnBreak = 
        item.break_status === true || 
        item.break_status === "true" || 
        item.is_on_break === true || 
        item.status === "Break" || 
        item.status === "On Break";

      let status = "🟢 Working";
      if (item.check_out) status = "🔴 Checked Out";
      else if (isOnBreak) status = "🟡 On Break";

      const checkInTime = item.check_in
        ? new Date(item.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : "--";

      const checkOutTime = item.check_out
        ? new Date(item.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : "...";

      table.innerHTML += `
        <tr>
          <td>${empName}</td>
          <td>${checkInTime}</td>
          <td>${checkOutTime}</td>
          <td>${status}</td>
        </tr>
      `;
    });
  } catch (e) {
    console.error("Live attendance error:", e);
  }
}

loadLiveAttendance();
setInterval(loadLiveAttendance, 30000);

// RECENT ACTIVITIES (FIXED ANNOUNCEMENTS AND RELATIONAL ERRORS)
async function loadRecentActivities() {
  const container = document.getElementById("recentActivity");
  const timeSpan = document.getElementById("lastUpdatedTime");

  if (!container) return;

  try {
    const { data: allProfiles } = await supabaseClient
      .from("profiles")
      .select("id, full_name");

    const profileMap = {};
    if (allProfiles) {
      allProfiles.forEach(p => profileMap[p.id] = p.full_name);
    }

    const [
      { data: newEmps },
      { data: attendanceLogs },
      { data: leaveLogs },
      { data: announcements }
    ] = await Promise.all([
      supabaseClient
        .from("profiles")
        .select("id, full_name, created_at, role")
        .eq("role", "employee")
        .order("created_at", { ascending: false })
        .limit(3),

      supabaseClient
        .from("attendance")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5),

      supabaseClient
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3),

      supabaseClient
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(3)
    ]);

    let activities = [];

    if (newEmps) {
      newEmps.forEach((e) => {
        activities.push({
          icon: "👤",
          text: `New employee joined: <strong>${e.full_name || 'User'}</strong>`,
          time: new Date(e.created_at || Date.now())
        });
      });
    }

    if (attendanceLogs) {
      attendanceLogs.forEach((a) => {
        const name = profileMap[a.user_id || a.employee_id] || "Employee";
        let actionText = "updated attendance";
        let icon = "🕒";

        const isOnBreak = a.break_status === true || a.break_status === "true" || a.status === "On Break";

        if (a.check_out) {
          actionText = "Checked Out";
          icon = "🔴";
        } else if (isOnBreak) {
          actionText = "went on a Break";
          icon = "🟡";
        } else if (a.check_in) {
          actionText = "Checked In";
          icon = "🟢";
        }

        const logTime = a.updated_at ? new Date(a.updated_at) : new Date(a.created_at || Date.now());

        activities.push({
          icon: icon,
          text: `<strong>${name}</strong> ${actionText}`,
          time: logTime
        });
      });
    }

    if (leaveLogs) {
      leaveLogs.forEach((l) => {
        const name = profileMap[l.user_id || l.employee_id] || "Employee";
        activities.push({
          icon: "📄",
          text: `<strong>${name}</strong> applied for <strong>${l.leave_type || 'Leave'}</strong> (${l.status || 'Pending'})`,
          time: new Date(l.created_at || Date.now())
        });
      });
    }

    if (announcements) {
      announcements.forEach((ann) => {
        if (ann.title) {
          activities.push({
            icon: "📢",
            text: `Announcement: <strong>"${ann.title}"</strong>`,
            time: new Date(ann.created_at || Date.now())
          });
        }
      });
    }

    activities.sort((a, b) => b.time - a.time);
    activities = activities.slice(0, 6);

    container.innerHTML = "";
    if (activities.length === 0) {
      container.innerHTML = `<div class="activity-item"><div class="activity-item-text">No recent activity recorded yet.</div></div>`;
      return;
    }

    activities.forEach((act) => {
      const timeFormatted = isNaN(act.time) ? "--:--" : act.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      container.innerHTML += `
        <div class="activity-item">
          <div class="activity-item-text">${act.icon} ${act.text}</div>
          <div class="activity-item-time">⏱ ${timeFormatted}</div>
        </div>
      `;
    });

    if (timeSpan) {
      timeSpan.innerText = `Last updated: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

  } catch (err) {
    console.error("Error loading activities:", err);
  }
}

loadRecentActivities();

function setupRealtimeActivities() {
  supabaseClient
    .channel("admin-live-tracker")
    .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => loadRecentActivities())
    .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => {
      loadRecentActivities();
      loadLiveAttendance();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "leave_requests" }, () => loadRecentActivities())
    .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => loadRecentActivities())
    .subscribe();
}

setupRealtimeActivities();
// Add this at the bottom of admin-dashboard.js
async function refreshActivityManual() {
  const btn = document.getElementById('refreshActivityBtn');
  if (btn) btn.innerText = '🔄 Refreshing...';
  await loadRecentActivities();
  await loadLiveAttendance();
  if (btn) btn.innerText = '🔄 Refresh';
}
