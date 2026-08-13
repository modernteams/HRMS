let currentEmployee = null;

async function loadEmployeeDashboard(){

const user = await supabaseClient.auth.getUser();

if(!user || !user.data || !user.data.user){
    window.location.href = "login.html";
    return;
}

const email = user.data.user.email;

const {data:profile, error} = await supabaseClient
.from("profiles")
.select("*")
.eq("email", email)
.single();

if(!profile){
console.log("Profile not found");
return;
}

currentEmployee = profile;

if(profile && document.getElementById("employeeName")){
document.getElementById("employeeName").innerText = profile.full_name;
}

loadTodayAttendance();
loadAnnouncements();

}

async function loadTodayAttendance(){

const today = new Date().toISOString().split("T")[0];

const {data, error} = await supabaseClient
.from("attendance")
.select("*")
.eq("employee_id", currentEmployee.id)
.eq("attendance_date", today)
.maybeSingle();

if(error){
console.log(error);
return;
}

const statusBadge = document.getElementById("employeeStatus");
const attendanceStatusElement = document.getElementById("attendanceStatus");

// CASE 1: Agar Aaj PUNCH IN Nahi Kiya Hai -> Inactive / Not Checked In
if(!data || !data.check_in){
  if(statusBadge){
    statusBadge.innerText = "Inactive";
    statusBadge.className = "badge badge-danger";
  }
  if(attendanceStatusElement){
    attendanceStatusElement.innerText = "Not Checked In";
  }
  if(document.getElementById("checkInTime")) document.getElementById("checkInTime").innerText = "--";
  if(document.getElementById("checkOutTime")) document.getElementById("checkOutTime").innerText = "--";
  if(document.getElementById("workingHours")) document.getElementById("workingHours").innerText = "--";
  return;
}

// Automatic Check-out Cutoff Logic (Raat 8:00 PM (20:00) ke baad trigger hoga)
const now = new Date();
if (data.check_in && !data.check_out && now.getHours() >= 20) {
  const checkInDate = new Date(data.check_in);
  
  // Auto checkout time set to 6:00 PM (18:00:00)
  const auto6PM = new Date(checkInDate);
  auto6PM.setHours(18, 0, 0, 0);

  const calculatedHrs = calculateHours(data.check_in, auto6PM.toISOString());

  await supabaseClient
    .from("attendance")
    .update({
      check_out: auto6PM.toISOString(),
      working_hours: calculatedHrs,
      status: "Auto Checked-Out (System)"
    })
    .eq("id", data.id);

  data.check_out = auto6PM.toISOString();
  data.working_hours = calculatedHrs;
}

// CASE 2: Punch In ho gaya hai lekin Check Out nahi hua -> ACTIVE
if (data.check_in && !data.check_out) {
  if (statusBadge) {
    statusBadge.innerText = "Active";
    statusBadge.className = "badge badge-success";
  }
  if (attendanceStatusElement) {
    attendanceStatusElement.innerText = "Active (Working)";
  }
}

// CASE 3: Check Out ho chuka hai -> COMPLETED
if (data.check_out) {
  if (statusBadge) {
    statusBadge.innerText = "Completed";
    statusBadge.className = "badge badge-info";
  }
  if (attendanceStatusElement) {
    attendanceStatusElement.innerText = "Completed (Checked Out)";
  }
}

// UI Elements Display
if(data.check_in && document.getElementById("checkInTime")){
  document.getElementById("checkInTime").innerText = formatTime(data.check_in);
}

if(data.check_out && document.getElementById("checkOutTime")){
  document.getElementById("checkOutTime").innerText = formatTime(data.check_out);
}

if(data.working_hours != null && document.getElementById("workingHours")){
  document.getElementById("workingHours").innerText = data.working_hours + " Hours";
}

}

// ==========================
// CHECK IN
// ==========================

document
.getElementById("checkInBtn")
.addEventListener(
"click",
async()=>{

const today = new Date().toISOString().split("T")[0];
const now = new Date().toISOString();

const {data:exist} = await supabaseClient
.from("attendance")
.select("*")
.eq("employee_id", currentEmployee.id)
.eq("attendance_date", today)
.maybeSingle();

if(exist){
alert("You already checked in");
return;
}

const {error} = await supabaseClient
.from("attendance")
.insert({
employee_id: currentEmployee.id,
attendance_date: today,
check_in: now,
});

if(error){
    alert(error.message);
}else{
    alert("✅ Check In Successful");

    if(document.getElementById("attendanceMessage")){
        document.getElementById("attendanceMessage").innerText = "Check In Successful";
    }

    loadTodayAttendance();
}

});

// ==========================
// CHECK OUT
// ==========================

document
.getElementById("checkOutBtn")
.addEventListener(
"click",
async()=>{

const today = new Date().toISOString().split("T")[0];
const now = new Date();

const {data} = await supabaseClient
.from("attendance")
.select("*")
.eq("employee_id", currentEmployee.id)
.eq("attendance_date", today)
.maybeSingle();

if(!data){
alert("Please Check In First");
return;
}

if (data.check_out) {
    alert("You have already checked out today.");
    return;
}

let finalCheckOutTime = now.toISOString();
let statusVal = "Present";

// Agar Raat 8 PM (20:00) ya uske baad Manual Check Out press hoga
if (now.getHours() >= 20) {
  const checkInDate = new Date(data.check_in);
  const auto6PM = new Date(checkInDate);
  auto6PM.setHours(18, 0, 0, 0);
  
  finalCheckOutTime = auto6PM.toISOString();
  statusVal = "Auto Checked-Out (System)";
}

const hoursWorked = calculateHours(data.check_in, finalCheckOutTime);

const {error} = await supabaseClient
.from("attendance")
.update({
check_out: finalCheckOutTime,
working_hours: hoursWorked,
status: statusVal
})
.eq("id", data.id);

if(error){
alert(error.message);
}
else{
alert("Check Out Successful");

if(document.getElementById("attendanceMessage")){
    document.getElementById("attendanceMessage").innerText = "Check Out Successful";
}

await loadTodayAttendance();
}

});

function formatTime(timestamp){
    if(!timestamp) return "--";

    return new Date(timestamp).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

// ==========================
// HOURS CALCULATOR
// ==========================
function calculateHours(start, end){

if(!start || !end) return 0;

const startTime = Date.parse(start);
const endTime = Date.parse(end);

const difference = endTime - startTime;

if(difference <= 0) return 0;

let hours = difference / (1000 * 60 * 60);

// Safe Cap Safeguard (14 Ghante se zyada kabhi display/calculate nahi hoga)
if(hours > 14) {
    hours = 9.0;
}

return Number(hours.toFixed(2));

}

function formatWorkingHours(hours){

    if(hours == null) return "--";

    const totalMinutes = Math.round(hours * 60);

    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    return `${h}h ${m}m`;
}

async function loadAnnouncements(){

const {data} = await supabaseClient
.from("announcements")
.select("*")
.order("id", { ascending:false })
.limit(3);

let box = document.getElementById("announcementPreview");

if(!box) return;

box.innerHTML="";

if(data){
  data.forEach(item=>{
  box.innerHTML+=`
  <div class="activity">
  📢 ${item.title}
  </div>
  `;
  });
}

}

function autoRefreshAtMidnight(){

    const now = new Date();
    const midnight = new Date();

    midnight.setHours(24,0,0,0);

    const ms = midnight - now;

    setTimeout(() => {
        location.reload();
    }, ms);

}

autoRefreshAtMidnight();

loadEmployeeDashboard();
