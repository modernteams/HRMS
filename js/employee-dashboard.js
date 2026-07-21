let currentEmployee = null;



async function loadEmployeeDashboard(){

// ===============================
// DYNAMIC USER GREETING
// ===============================

async function updateGreeting(){

const greetingElement = 
document.getElementById("greetingText");


if(!greetingElement){
    return;
}


const hour = new Date().getHours();


let greeting="";


if(hour >= 5 && hour < 12){

    greeting="Good Morning";

}

else if(hour >= 12 && hour < 17){

    greeting="Good Afternoon";

}

else if(hour >= 17 && hour < 21){

    greeting="Good Evening";

}

else{

    greeting="Good Night";

}



// get logged in user

const {data:{user}} = 
await supabaseClient.auth.getUser();



let userName="User";



if(user){


const {data:profile,error}=

await supabaseClient

.from("profiles")

.select("full_name")

.eq("id",user.id)

.single();



if(profile){

userName = profile.full_name;

}


}



greetingElement.innerHTML =

`${greeting}, ${userName} 👋`;


}



updateGreeting();
    
const user =
await supabaseClient.auth.getUser();



const email =
user.data.user.email;



const {data:profile,error}=await supabaseClient
.from("profiles")
.select("*")
.eq("email",email)
.single();



if(!profile){

console.log("Profile not found");

return;

}



currentEmployee = profile;

if(profile){


document.getElementById("employeeName")
.innerText =
profile.full_name;


}



loadTodayAttendance();


loadAnnouncements();


}







async function loadTodayAttendance(){


const today =
new Date()
.toISOString()
.split("T")[0];



const {data,error}=await supabaseClient
.from("attendance")
.select("*")
.eq(
"employee_id",
currentEmployee.id
)
.eq(
"attendance_date",
today
)
.maybeSingle();



if(error){

console.log(error);
return;

}



if(data){


if(data.check_in){

document.getElementById("checkInTime")
.innerText =
new Date(data.check_in)
.toLocaleTimeString();

}



if(data.check_out){

document.getElementById("checkOutTime")
.innerText =
new Date(data.check_out)
.toLocaleTimeString();

}



if(data.working_hours){


document.getElementById("workingHours")
.innerText =
data.working_hours + " Hours";


}



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


const today =
new Date()
.toISOString()
.split("T")[0];

const now = new Date().toISOString();

const {data:exist}=await supabaseClient
.from("attendance")
.select("*")
.eq(
"employee_id",
currentEmployee.id
)
.eq(
"attendance_date",
today
)
.maybeSingle()





if(exist){


alert(
"You already checked in"
);

return;


}






const {error}=await supabaseClient
.from("attendance")
.insert({


employee_id:
currentEmployee.id,


attendance_date:
today,


check_in:
now,

});



if(error){
    alert(error.message);
}else{

    alert("✅ Check In Successful");

    document.getElementById("attendanceMessage").innerText =
    "Check In Successful";

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


const today =
new Date()
.toISOString()
.split("T")[0];

const now = new Date().toISOString();




const {data}=await supabaseClient
.from("attendance")
.select("*")
.eq(
"employee_id",
currentEmployee.id
)
.eq(
"attendance_date",
today
)
.maybeSingle()






if(!data){


alert(
"Please Check In First"
);


return;


}


if (data.check_out) {
    alert("You have already checked out today.");
    return;
}


const {error}=await supabaseClient
.from("attendance")
.update({


check_out:
now,


working_hours:
calculateHours(
data.check_in,
now
)


})
.eq(
"id",
data.id
);




if(error){


alert(error.message);


}

else{


alert("Check Out Successful");

document.getElementById(
"attendanceMessage"
)
.innerText=
"Check Out Successful";


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
function calculateHours(start,end){


if(!start || !end)

return 0;



const startTime =
Date.parse(start);



const endTime =
Date.parse(end);



const difference =
endTime - startTime;



const hours =
difference / (1000 * 60 * 60);



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


const {data}=await supabaseClient
.from("announcements")
.select("*")
.order(
"id",
{
ascending:false
}
)
.limit(3);



let box =
document.getElementById(
"announcementPreview"
);



box.innerHTML="";



data.forEach(item=>{


box.innerHTML+=`

<div class="activity">

📢 ${item.title}

</div>

`;

});


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
