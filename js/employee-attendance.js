let currentUser = null;

async function loadMyAttendance() {
  const { data: userData, error: userError } = await supabaseClient.auth.getUser();

  if (userError || !userData.user) {
    window.location.href = "login.html";
    return;
  }

  const email = userData.user.email;

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error || !profile) {
    console.log("Profile Error:", error);
    return;
  }

  currentUser = profile;

  console.log("Current Employee:", currentUser);

  showTodayDate();
  await loadAttendanceData();
}

function showTodayDate() {
  const date = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const todayEl = document.getElementById("todayDate");
  if (todayEl) {
    todayEl.innerText = date;
  }
}

async function loadAttendanceData() {
  console.log("Loading attendance for:", currentUser.id);

  const { data, error } = await supabaseClient
    .from("attendance")
    .select("*")
    .eq("employee_id", currentUser.id)
    .order("attendance_date", {
      ascending: false,
    });

  if (error) {
    console.log("Attendance Error:", error);
    return;
  }

  console.log("Attendance Data:", data);

  // Aaj ki Date IST Format me
  const todayIST = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });

  let todayRecord = null;
  if (data && data.length > 0) {
    todayRecord = data.find((item) => {
      if (!item.attendance_date) return false;
      return item.attendance_date.split("T")[0] === todayIST;
    });
  }

  // TOP CARDS UPDATE
  const checkInEl = document.getElementById("checkInTime");
  const checkOutEl = document.getElementById("checkOutTime");
  const totalHoursEl = document.getElementById("totalHours");

  if (todayRecord) {
    if (checkInEl) checkInEl.innerText = formatTime(todayRecord.check_in);
    if (checkOutEl) checkOutEl.innerText = formatTime(todayRecord.check_out);

    if (totalHoursEl) {
      if (todayRecord.active_break_type) {
        totalHoursEl.innerText = "On Break";
      } else {
        totalHoursEl.innerText = calculateCalculatedHours(todayRecord);
      }
    }
  } else {
    if (checkInEl) checkInEl.innerText = "--";
    if (checkOutEl) checkOutEl.innerText = "--";
    if (totalHoursEl) totalHoursEl.innerText = "0 Hours 0 Minutes";
  }

  // TABLE RENDER LOGIC
  let table = "";

  if (!data || data.length === 0) {
    table = `
      <tr>
        <td colspan="5">
          No Attendance Records Found
        </td>
      </tr>
    `;
  } else {
    data.forEach((item) => {
      table += `
        <tr>
          <td>
            ${item.attendance_date ? item.attendance_date.split("T")[0] : "--"}
          </td>
          <td>
            ${formatTime(item.check_in)}
          </td>
          <td>
            ${formatTime(item.check_out)}
          </td>
          <td>
            ${calculateCalculatedHours(item)}
          </td>
          <td>
            ${item.active_break_type ? "On Break" : item.status || "Present"}
          </td>
        </tr>
      `;
    });
  }

  const tableEl = document.getElementById("myAttendanceTable");
  if (tableEl) {
    tableEl.innerHTML = table;
  }
}

function formatTime(timestamp) {
  if (!timestamp) return "--";

  return new Date(timestamp).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// FORCE CALCULATE HOURS FUNCTION
function calculateCalculatedHours(record) {
  if (!record || !record.check_in) {
    return "0 Hours 0 Minutes";
  }

  // Option 1: Agar working_hours DB me 0 se bada positive number saved hai
  const numHours = Number(record.working_hours);
  if (!isNaN(numHours) && numHours > 0) {
    const totalMins = Math.round(numHours * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h} Hours ${m} Minutes`;
  }

  // Option 2: Live calculation (Jab Check-In hai aur DB me 0 ya null dikha raha hai)
  const checkInTime = new Date(record.check_in).getTime();
  const checkOutTime = record.check_out ? new Date(record.check_out).getTime() : new Date().getTime();

  let diffInMinutes = Math.floor((checkOutTime - checkInTime) / (1000 * 60));

  // Subtract Total Break Minutes
  const totalBreak = Number(record.total_break_minutes) || 0;
  diffInMinutes = diffInMinutes - totalBreak;

  if (diffInMinutes < 0) diffInMinutes = 0;

  const hours = Math.floor(diffInMinutes / 60);
  const minutes = diffInMinutes % 60;

  return `${hours} Hours ${minutes} Minutes`;
}

loadMyAttendance();
