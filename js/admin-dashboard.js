// ======================================
// MODERN TEAMS HRMS
// ADMIN DASHBOARD JS
// ======================================

let currentAdmin = null;

async function loadAdminDashboard() {
  console.log("Admin Dashboard Loading...");

  // ===============================
  // ADMIN PROFILE + GREETING
  // ===============================
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

      // ADMIN DETAILS
      const adminName = document.getElementById("adminName");
      if (adminName) adminName.innerText = name;

      const designation = document.getElementById("adminDesignation");
      if (designation) designation.innerText = profile.designation || "HR Administrator";

      const department = document.getElementById("adminDepartment");
      if (department) department.innerText = profile.department || "Administration";

      // ADMIN PROFILE IMAGE
      if (profile.profile_image) {
        const adminPhoto = document.getElementById("adminPhoto");
        const adminHeaderPhoto = document.getElementById("adminHeaderPhoto");

        if (adminPhoto) adminPhoto.src = profile.profile_image;
        if (adminHeaderPhoto) adminHeaderPhoto.src = profile.profile_image;
      }
    }
  }

  // ===============================
  // GREETING
  // ===============================
  function updateGreeting(name) {
    const greetingElement = document.getElementById("greetingText");

    if (!greetingElement) return;

    const hour = new Date().getHours();
    let greeting;

    if (hour >= 5 && hour < 12) {
      greeting = "Good Morning";
    } else if (hour >= 12 && hour < 17) {
      greeting = "Good Afternoon";
    } else if (hour >= 17 && hour < 21) {
      greeting = "Good Evening";
    } else {
      greeting = "Good Night";
    }

    greetingElement.innerHTML = `${greeting}, ${name} 👋`;
  }

  // ===============================
  // TOTAL EMPLOYEES
  // ===============================
  const { data: employees, error: employeeError } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("role", "employee");

  if (employeeError) {
    console.log(employeeError);
  } else {
    const el = document.getElementById("totalEmployees");
    if (el) el.innerText = employees.length;

    renderDepartmentOverview(employees);
  }

  // ===============================
  // PRESENT TODAY
  // ===============================
  const today = new Date().toLocaleDateString("en-CA");

  const { data: attendance, error: attendanceError } = await supabaseClient
    .from("attendance")
    .select("*")
    .eq("attendance_date", today)
    .not("check_in", "is", null);

  let presentCount = 0;

  if (attendanceError) {
    console.log(attendanceError);
  } else {
    presentCount = attendance.length;

    const el = document.getElementById("presentToday");
    if (el) el.innerText = presentCount;
  }

  // ===============================
  // ABSENT TODAY
  // ===============================
  const total = employees ? employees.length : 0;
  const absent = total - presentCount;

  const absentElement = document.getElementById("absentToday");
  if (absentElement) absentElement.innerText = absent < 0 ? 0 : absent;

  // ===============================
  // PENDING LEAVES
  // ===============================
  const { data: leaves, error: leaveError } = await supabaseClient
    .from("leave_requests")
    .select("*")
    .eq("status", "Pending");

  if (leaveError) {
    console.log(leaveError);
  } else {
    const el = document.getElementById("pendingLeaves");
    if (el) el.innerText = leaves.length;
  }

  // ===============================
  // DEPARTMENTS COUNT
  // ===============================
  const { data: departments, error: departmentError } = await supabaseClient
    .from("departments")
    .select("*");

  if (!departmentError) {
    const el = document.getElementById("totalDepartments");
    if (el) el.innerText = departments.length;
  }
}

// ======================================
// DYNAMIC DEPARTMENT OVERVIEW
// ======================================
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

// LOAD DASHBOARD
loadAdminDashboard();

// =================================
// ATTENDANCE CHART
// =================================
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

    if (error) attendanceData.push(0);
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

// =================================
// LIVE ATTENDANCE MONITOR
// =================================
async function loadLiveAttendance() {
  const today = new Date().toLocaleDateString("en-CA");

  const { data, error } = await supabaseClient
    .from("attendance")
    .select(`
      *,
      profiles(
        full_name
      )
    `)
    .eq("attendance_date", today);

  const table = document.getElementById("liveAttendanceTable");
  if (!table) return;

  if (error) {
    console.log("Error loading live attendance:", error);
    return;
  }

  table.innerHTML = "";

  if (!data || data.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="4">No attendance today</td>
      </tr>
    `;
    return;
  }

  data.forEach((item) => {
    // Check Break Condition across various database naming conventions
    const isOnBreak = 
      item.break_status === true || 
      item.break_status === "true" || 
      item.break_status === 1 ||
      item.is_on_break === true || 
      item.is_on_break === "true" || 
      item.status === "Break" || 
      item.status === "On Break";

    // Status Determination Logic
    let status = "🟢 Working";
    if (item.check_out) {
      status = "🔴 Checked Out";
    } else if (isOnBreak) {
      status = "🟡 On Break";
    }

    // Check In Time Formatting
    const checkInTime = item.check_in
      ? new Date(item.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : "--";

    // Check Out Time Logic: Displays "..." when working, and actual time when checked out
    const checkOutTime = item.check_out
      ? new Date(item.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : "...";

    table.innerHTML += `
      <tr>
        <td>${item.profiles?.full_name || "Employee"}</td>
        <td>${checkInTime}</td>
        <td>${checkOutTime}</td>
        <td>${status}</td>
      </tr>
    `;
  });
}

loadLiveAttendance();
setInterval(loadLiveAttendance, 30000);

// =================================
// MIDNIGHT REFRESH
// =================================
function autoRefreshAtMidnight() {
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);

  const time = midnight - now;

  setTimeout(() => {
    location.reload();
  }, time);
}

autoRefreshAtMidnight();
