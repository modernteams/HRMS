// ======================================
// MODERN TEAMS HRMS
// ADMIN DASHBOARD
// ======================================


async function loadAdminDashboard(){


console.log("Admin Dashboard Loading...");

// ===============================
// DYNAMIC GREETING
// ===============================

function updateGreeting(){

const greetingElement = 
document.getElementById("greetingText");


if(!greetingElement){
    return;
}


const hour = new Date().getHours();


let greeting = "";


if(hour >= 5 && hour < 12){

    greeting = "Good Morning";

}

else if(hour >= 12 && hour < 17){

    greeting = "Good Afternoon";

}

else if(hour >= 17 && hour < 21){

    greeting = "Good Evening";

}

else{

    greeting = "Good Night";

}



greetingElement.innerHTML =
`${greeting}, Admin 👋`;


}



// Run when page loads

updateGreeting();

// ===============================
// TOTAL EMPLOYEES
// ===============================


const {data:employees,error:employeeError}=

await supabaseClient

.from("profiles")

.select("*")

.eq("role","employee");



if(employeeError){

console.log("Employee Error:",employeeError);

}
else{


document.getElementById(
"totalEmployees"
).innerText = employees.length;


}




// ===============================
// PRESENT TODAY
// ===============================


const today =
new Date()
.toLocaleDateString("en-CA");

const {data:attendance,error:attendanceError}=await supabaseClient
.from("attendance")
.select("*")
.eq(
"attendance_date",
today
)
.not(
"check_in",
"is",
null
);


if(attendanceError){

console.log(
"Attendance Error:",
attendanceError
);


}
else{


document.getElementById(
"presentToday"
).innerText =
attendance.length;


}






// ===============================
// PENDING LEAVES
// ===============================


const {data:leaves,error:leaveError}=

await supabaseClient

.from("leave_requests")

.select("*")

.eq(
"status",
"Pending"
);



if(leaveError){

console.log(
"Leave Error:",
leaveError
);


}
else{


document.getElementById(
"pendingLeaves"
).innerText =
leaves.length;


}







// ===============================
// DEPARTMENTS
// ===============================


const {data:departments,error:departmentError}=

await supabaseClient

.from("departments")

.select("*");



if(departmentError){

console.log(
"Department Error:",
departmentError
);


}
else{


document.getElementById(
"totalDepartments"
).innerText =
departments.length;


}





}





loadAdminDashboard();
// =================================
// 7 DAYS ATTENDANCE LINE CHART
// =================================

async function loadAttendanceChart(){


const today = new Date();

let labels = [];
let attendanceData = [];



// Last 7 Days Calculate

for(let i = 6; i >= 0; i--){


let date = new Date();

date.setDate(
today.getDate() - i
);


let dateString =
date.toLocaleDateString("en-CA");


let dayName =
date.toLocaleDateString(
"en-IN",
{
weekday:"short"
}
);



labels.push(dayName);




// Attendance Count
const {data,error}=await supabaseClient
.from("attendance")
.select("*")
.eq(
"attendance_date",
dateString
)
.not(
"check_in",
"is",
null
);


if(error){

console.log(error);

attendanceData.push(0);

}
else{

attendanceData.push(
data.length
);


}


}






const ctx =
document.getElementById(
"attendanceChart"
);



if(!ctx)
return;



new Chart(ctx,{

type:"line",


data:{


labels:labels,


datasets:[{


label:"Present Employees",


data:attendanceData,


borderWidth:3,


tension:0.4,


fill:true,


pointRadius:5,


pointHoverRadius:8



}]

},




options:{


responsive:true,


maintainAspectRatio:false,



plugins:{


legend:{


display:true,


position:"top"


}


},



scales:{


y:{


beginAtZero:true,


ticks:{


stepSize:10


}



}



}



}



});



}



loadAttendanceChart();

function autoRefreshAtMidnight(){

const now = new Date();

const midnight = new Date();

midnight.setHours(24,0,0,0);

const timeLeft = midnight - now;


setTimeout(()=>{

location.reload();

},timeLeft);


}


autoRefreshAtMidnight();
