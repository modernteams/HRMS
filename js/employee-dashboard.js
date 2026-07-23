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

document.getElementById("employeeDepartment")
.innerText =
profile.department;


document.getElementById("employeeDesignation")
.innerText =
profile.designation;


// PROFILE PHOTO

if(profile.profile_image){

document.getElementById("employeePhoto").src =
profile.profile_image;

}


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
new Date(data.check_in).toLocaleTimeString(
"en-IN",
{
timeZone:"Asia/Kolkata",
hour:"2-digit",
minute:"2-digit",
hour12:true
}
);
}



if(data.check_out){

document.getElementById("checkOutTime")
.innerText =
new Date(data.check_out).toLocaleTimeString(
"en-IN",
{
timeZone:"Asia/Kolkata",
hour:"2-digit",
minute:"2-digit",
hour12:true
}
);
}



if(data.working_hours != null){

document.getElementById("workingHours").innerText =
formatWorkingHours(data.working_hours);

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
new Date().toLocaleDateString(
"en-CA",
{
timeZone:"Asia/Kolkata"
}
);

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





// GPS VERIFY FIRST

const location =
await verifyOfficeLocation();



if(!location){

return;

}



if(!location.allowed){


alert(
"❌ You are outside office area"
);


document.getElementById(
"attendanceMessage"
).innerText =
"Location not verified";


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


checkin_latitude:
location.latitude,


checkin_longitude:
location.longitude,


location_verified:true


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
new Date().toLocaleDateString(
"en-CA",
{
timeZone:"Asia/Kolkata"
}
);

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
const totalBreakMinutes =
await getTotalBreakMinutes();


const totalMinutes =
calculateHours(
data.check_in,
now
);


const finalMinutes =
totalMinutes - totalBreakMinutes;


const finalHours =
finalMinutes / 60;

const {error}=await supabaseClient
.from("attendance")
.update({


check_out:
now,


working_hours:
Number(finalHours.toFixed(2)),


total_break_minutes:
totalBreakMinutes


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

// ===============================
// GPS LOCATION CHECK
// ===============================
async function verifyOfficeLocation(){


return new Promise(async(resolve)=>{


// GPS AVAILABLE CHECK

if(!navigator.geolocation){

alert(
"GPS is not supported on this device"
);

resolve(null);

return;

}




// GET OFFICE LOCATION


const {data:office,error}=

await supabaseClient

.from("office_location")

.select("*")

.single();





if(error || !office){


alert(
"Office location not found"
);


resolve(null);

return;

}






navigator.geolocation.getCurrentPosition(



(position)=>{



const userLat =
position.coords.latitude;



const userLng =
position.coords.longitude;





const distance =

calculateDistance(

userLat,

userLng,

office.latitude,

office.longitude

);





console.log(
"Distance From Office:",
distance,
"meters"
);






if(distance <= office.radius){



resolve({

allowed:true,

latitude:userLat,

longitude:userLng


});



}

else{


resolve({

allowed:false


});


}



},



(error)=>{


console.log(
"GPS ERROR",
error
);



alert(
"Please enable GPS permission"
);



resolve(null);



},



{

enableHighAccuracy:true,

timeout:15000,

maximumAge:0


}



);



});


}




// DISTANCE CALCULATOR

function calculateDistance(
lat1,
lon1,
lat2,
lon2
){


const R = 6371000;


const dLat =
(lat2-lat1) *
Math.PI/180;


const dLon =
(lon2-lon1) *
Math.PI/180;



const a =
Math.sin(dLat/2) *
Math.sin(dLat/2)

+

Math.cos(lat1*Math.PI/180)
*
Math.cos(lat2*Math.PI/180)
*
Math.sin(dLon/2)
*
Math.sin(dLon/2);



const c =
2 *
Math.atan2(
Math.sqrt(a),
Math.sqrt(1-a)
);



return R*c;


}



// ==========================
// HOURS CALCULATOR
// ==========================
function calculateHours(start,end){


const startTime =
Date.parse(start);


const endTime =
Date.parse(end);


const difference =
endTime-startTime;


// minutes

const minutes =
Math.floor(
difference/(1000*60)
);


return minutes;

}


function formatWorkingHours(hours){

    if(hours == null || isNaN(hours))
        return "--";

    const totalMinutes = Math.round(Number(hours) * 60);

    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if(h > 0 && m > 0)
        return `${h}h ${m}m`;

    if(h > 0)
        return `${h}h`;

    return `${m}m`;

}


async function getTotalBreakMinutes(){

const today =
new Date().toLocaleDateString(
"en-CA",
{
timeZone:"Asia/Kolkata"
}
);


const {data,error}=await supabaseClient
.from("employee_breaks")
.select("duration_minutes")
.eq(
"employee_id",
currentEmployee.id
)

.gte(
"created_at",
today+"T00:00:00"
)
.lte(
"created_at",
today+"T23:59:59"
);

if(error){
console.log(error);
return 0;
}



let total=0;


data.forEach(item=>{

total += item.duration_minutes || 0;

});


return total;


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
// =====================================
// BREAK MANAGEMENT
// =====================================


let breakTimerInterval = null;
let breakStartTime = null;


// START BREAK

async function startBreak(type){


if(!currentEmployee){

alert("Employee not found");
return;

}


// check running break

const {data:active}=await supabaseClient
.from("employee_breaks")
.select("*")
.eq("employee_id",currentEmployee.id)
.is("end_time",null)
.maybeSingle();



if(active){

alert("Already break running");

return;

}

const startTime = new Date(
new Date().toLocaleString(
"en-US",
{
timeZone:"Asia/Kolkata"
}
)
);

const {error}=await supabaseClient
.from("employee_breaks")
.insert({

employee_id:currentEmployee.id,

break_type:type,

start_time:startTime

});



if(error){

alert(error.message);
return;

}


// important for timer

breakStartTime = startTime;



document.getElementById("breakStatus").innerText =
type+" Break Started";



startBreakTimer();



}



// END BREAK


async function endBreak(){


const {data:active,error}=await supabaseClient
.from("employee_breaks")
.select("*")
.eq("employee_id",currentEmployee.id)
.is("end_time",null)
.single();



if(error || !active){

alert("No active break");

return;

}

const endTime = new Date(
new Date().toLocaleString(
"en-US",
{
timeZone:"Asia/Kolkata"
}
)
);

const startTime = new Date(
new Date(active.start_time).toLocaleString(
"en-US",
{
timeZone:"Asia/Kolkata"
}
)
);

const diffMilliseconds =
endTime - startTime;


const minutes = Math.floor(
    diffMilliseconds / 60000
);

const {error:updateError}=await supabaseClient
.from("employee_breaks")
.update({

end_time:endTime,

duration_minutes:minutes

})
.eq(
"id",
active.id
);


if(updateError){

alert(updateError.message);

return;

}
clearInterval(breakTimerInterval);



document.getElementById("breakTimer").innerText=
"00:00:00";


document.getElementById("breakStatus").innerText=
active.break_type+
" Break Ended ("+
minutes+
" min)";


breakStartTime=null;


}




// TIMER


function startBreakTimer(){


clearInterval(breakTimerInterval);



breakTimerInterval=setInterval(()=>{


if(!breakStartTime)
return;



const diff =
new Date()-breakStartTime;



let h=Math.floor(
diff/(1000*60*60)
);



let m=Math.floor(
(diff/(1000*60))%60
);



let s=Math.floor(
(diff/1000)%60
);



document.getElementById("breakTimer").innerText =

String(h).padStart(2,"0")
+
":"
+
String(m).padStart(2,"0")
+
":"
+
String(s).padStart(2,"0");



},1000);



}




// BUTTONS


document
.getElementById("lunchBreakBtn")
.addEventListener(
"click",
()=>startBreak("Lunch")
);



document
.getElementById("teaBreakBtn")
.addEventListener(
"click",
()=>startBreak("Tea")
);



document
.getElementById("otherBreakBtn")
.addEventListener(
"click",
()=>startBreak("Other")
);



document
.getElementById("endBreakBtn")
.addEventListener(
"click",
()=>endBreak()
);

loadEmployeeDashboard();
