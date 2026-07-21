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
.toISOString()
.split("T")[0];



const {data:attendance,error:attendanceError}=

await supabaseClient

.from("attendance")

.select("*")

.eq(
"attendance_date",
today
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
