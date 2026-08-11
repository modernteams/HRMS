// =======================================
// EMPLOYEE DASHBOARD
// PART 1
// User + Profile + Attendance + Timer
// =======================================


let currentEmployee = null;
let workingTimer = null;

// =======================================
// LOCATION CHECK ENABLE / DISABLE
// =======================================

const LOCATION_CHECK_ENABLED = true;
// true  = GPS mandatory
// false = Work From Home (GPS bypass)

// =======================================
// LOAD EMPLOYEE DASHBOARD
// =======================================

async function loadEmployeeDashboard(){


    await updateGreeting();


    const {
        data:{user}
    } = await supabaseClient.auth.getUser();



    if(!user){

        console.log("No logged in user");
        return;

    }



    const email = user.email;



    const {data:profile,error} = await supabaseClient

    .from("profiles")

    .select("*")

    .eq("email",email)

    .single();



    if(error){

        console.log(
            "Profile Error:",
            error
        );

        return;

    }



    if(!profile){

        alert(
            "Profile not found"
        );

        return;

    }



    currentEmployee = profile;



    console.log(
        "Current Employee:",
        currentEmployee
    );



    const name =
    document.getElementById(
        "employeeName"
    );


    if(name){

        name.innerText =
        profile.full_name;

    }



    const department =
    document.getElementById(
        "employeeDepartment"
    );


    if(department){

        department.innerText =
        profile.department || "-";

    }



    const designation =
    document.getElementById(
        "employeeDesignation"
    );


    if(designation){

        designation.innerText =
        profile.designation || "-";

    }



    const photo =
    document.getElementById(
        "employeePhoto"
    );


    if(photo && profile.profile_image){

        photo.src =
        profile.profile_image;

    }



    await loadTodayAttendance();

    await restoreActiveBreak();

    await loadAnnouncements();


}



// =======================================
// GREETING
// =======================================


async function updateGreeting(){



const greetingBox =
document.getElementById(
    "greetingText"
);



if(!greetingBox){

    return;

}



const hour =
new Date().getHours();



let greeting;



if(hour >=5 && hour <12){

    greeting="Good Morning";

}

else if(hour >=12 && hour <17){

    greeting="Good Afternoon";

}

else if(hour >=17 && hour <21){

    greeting="Good Evening";

}

else{

    greeting="Good Night";

}




const {
    data:{user}
}=await supabaseClient.auth.getUser();



let name="User";



if(user){


const {data:profile}=

await supabaseClient

.from("profiles")

.select("full_name")

.eq(
"id",
user.id
)

.single();



if(profile){

    name =
    profile.full_name;

}


}



greetingBox.innerHTML =

`${greeting}, ${name} 👋`;



}




// =======================================
// LOAD TODAY ATTENDANCE
// =======================================


async function loadTodayAttendance(){



if(!currentEmployee){

    return;

}



const today =

new Date().toLocaleDateString(
    "en-CA",
    {
        timeZone:"Asia/Kolkata"
    }
);



const {
    data,
    error
}

=
await supabaseClient

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





console.log(
"Today Attendance:",
data
);





if(!data){

    return;

}





const statusBox =
document.getElementById(
"todayStatus"
);



if(statusBox){


if(data.check_in && !data.check_out){

    statusBox.innerText =
    "Active";

}


else if(data.check_in && data.check_out){

    statusBox.innerText =
    "Completed";

}


else{

    statusBox.innerText =
    "Inactive";

}


}

// ===============================
// ATTENDANCE STATUS
// Present / Completed / Absent
// ===============================


const attendanceStatus =
document.getElementById(
    "attendanceStatus"
);



if(attendanceStatus){


if(data.check_in && !data.check_out){


attendanceStatus.innerText =
"Present";


}



else if(data.check_in && data.check_out){


attendanceStatus.innerText =
"Completed";


}



else{


attendanceStatus.innerText =
"Absent";


}



}


const checkIn =
document.getElementById(
"checkInTime"
);



if(checkIn && data.check_in){


checkIn.innerText =

formatTime(
data.check_in
);


}





const checkOut =
document.getElementById(
"checkOutTime"
);



if(checkOut && data.check_out){


checkOut.innerText =

formatTime(
data.check_out
);


}





if(data.check_in && !data.check_out){


startWorkingTimer(data);


}




const working =
document.getElementById(
"workingHours"
);



if(working){


if(data.active_break_type){

working.innerText =
"On Break";


}

else if(data.working_hours != null){


working.innerText =

formatWorkingHours(
data.working_hours
);


}


}



}



// =======================================
// LIVE WORKING TIMER
// =======================================

function startWorkingTimer(attendance){


clearInterval(workingTimer);


workingTimer=setInterval(async()=>{


const {data:newAttendance}=await supabaseClient
.from("attendance")
.select("*")
.eq("id",attendance.id)
.single();



if(!newAttendance)
return;



if(newAttendance.active_break_type){


document.getElementById(
"workingHours"
).innerText="On Break";


return;

}




const start =
new Date(newAttendance.check_in);


const now =
new Date();



let minutes =
Math.floor(
(now-start)/60000
);



minutes -= 
newAttendance.total_break_minutes || 0;



if(minutes<0)
minutes=0;



let h=Math.floor(minutes/60);

let m=minutes%60;



document.getElementById(
"workingHours"
).innerText=
`${h}h ${m}m`;



},1000);


}




// =======================================
// FORMAT FUNCTIONS
// =======================================


function formatTime(timestamp){


if(!timestamp){

return "--";

}



return new Date(timestamp)

.toLocaleTimeString(
"en-IN",
{

timeZone:"Asia/Kolkata",

hour:"2-digit",

minute:"2-digit",

hour12:true

}

);



}



function formatWorkingHours(hours){


if(
hours===null ||
hours===undefined ||
isNaN(hours)
){

return "--";

}



const minutes =

Math.round(
Number(hours)*60
);



const h =

Math.floor(
minutes/60
);



const m =

minutes%60;



if(h && m){

return `${h}h ${m}m`;

}



if(h){

return `${h}h`;

}



return `${m}m`;

}

// =======================================
// PART 2
// CHECK IN + CHECK OUT + GPS
// =======================================



// =======================================
// CHECK IN
// =======================================


async function employeeCheckIn(){



if(!currentEmployee){


alert(
"Employee not loaded"
);


return;


}




const today =

new Date().toLocaleDateString(
"en-CA",
{
timeZone:"Asia/Kolkata"
}
);





const {
data:existing
}

=

await supabaseClient

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





if(existing){


alert(
"You already checked in today"
);


return;


}




// GPS CHECK

const location =

await verifyOfficeLocation();





if(!location){

return;

}





if(!location.allowed){


alert(
"❌ You are outside office area"
);


return;


}





const now =

new Date().toISOString();





const {error}

=

await supabaseClient

.from("attendance")

.insert({

employee_id:
currentEmployee.id,


attendance_date:
today,


check_in:
now,


status:
"Present",


checkin_latitude:
location.latitude,


checkin_longitude:
location.longitude,


location_verified:
true


});






if(error){


console.log(error);


alert(
error.message
);


return;


}





alert(
"✅ Punch In Successful"
);





const message =

document.getElementById(
"attendanceMessage"
);



if(message){

message.innerText =
"Check In Successful";

}





await loadTodayAttendance();



}





// =======================================
// CHECK OUT
// =======================================


async function employeeCheckOut(){



if(!currentEmployee){

return;

}



const today =

new Date().toLocaleDateString(
"en-CA",
{
timeZone:"Asia/Kolkata"
}
);




const {

data:attendance

}

=

await supabaseClient

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







if(!attendance){


alert(
"Please Check In First"
);


return;


}





if(attendance.check_out){


alert(
"Already Checked Out"
);


return;


}






const now =

new Date().toISOString();






const totalBreak =

await getTotalBreakMinutes();






const totalMinutes =

calculateHours(

attendance.check_in,

now

);






let finalMinutes =

totalMinutes - totalBreak;





if(finalMinutes < 0){

finalMinutes=0;

}





const workingHours =

finalMinutes / 60;







const {error}

=

await supabaseClient

.from("attendance")

.update({

check_out:
now,


status:
"Completed",


working_hours:

Number(
workingHours.toFixed(2)
),


total_break_minutes:

totalBreak


})

.eq(
"id",
attendance.id
);








if(error){


alert(
error.message
);


return;


}





alert(
"✅ Punch Out Successful"
);




const message =

document.getElementById(
"attendanceMessage"
);



if(message){

message.innerText =
"Check Out Successful";

}





await loadTodayAttendance();



}





// =======================================
// GPS OFFICE LOCATION VERIFY
// =======================================

async function verifyOfficeLocation(){

// =======================================
// WORK FROM HOME MODE
// =======================================

if(!LOCATION_CHECK_ENABLED){

    return {
        allowed: true,
        latitude: null,
        longitude: null
    };

}

return new Promise(
async(resolve)=>{



if(!navigator.geolocation){



alert(
"GPS not supported"
);



resolve(null);


return;


}







const {

data:office,

error

}

=

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
"Distance:",
distance
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
error
);



alert(
"Please allow GPS permission"
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








// =======================================
// DISTANCE CALCULATOR
// =======================================


function calculateDistance(
lat1,
lon1,
lat2,
lon2
){



const R = 6371000;



const dLat =

(lat2-lat1)

*

Math.PI/180;




const dLon =

(lon2-lon1)

*

Math.PI/180;





const a =


Math.sin(dLat/2) *

Math.sin(dLat/2)



+

Math.cos(
lat1*Math.PI/180
)

*

Math.cos(
lat2*Math.PI/180
)

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








// =======================================
// HOURS CALCULATOR
// =======================================


function calculateHours(
start,
end
){



const startTime =

Date.parse(start);



const endTime =

Date.parse(end);




const diff =

endTime-startTime;




return Math.floor(

diff / 60000

);



}

// =======================================
// PART 3
// BREAK MANAGEMENT SYSTEM
// =======================================



let breakTimerInterval = null;
let breakStartTime = null;




// =======================================
// START BREAK
// =======================================


async function startBreak(type){



if(!currentEmployee){


alert(
"Employee not loaded"
);


return;


}




// check active break


const {

data:active

}

=

await supabaseClient

.from("employee_breaks")

.select("*")

.eq(
"employee_id",
currentEmployee.id
)

.is(
"end_time",
null
)

.maybeSingle();






if(active){


alert(
"Already break running"
);


return;


}







const today =

new Date().toLocaleDateString(
"en-CA",
{
timeZone:"Asia/Kolkata"
}
);







const startTime =

new Date().toISOString();






const {

error

}

=

await supabaseClient

.from("employee_breaks")

.insert({

employee_id:
currentEmployee.id,


break_type:
type,


start_time:
startTime,


attendance_date:
today


});







if(error){


alert(
error.message
);


return;


}







// update attendance status


await supabaseClient

.from("attendance")

.update({

active_break_type:
type,


break_start_time:
startTime,


status:
"On Break"

})

.eq(
"employee_id",
currentEmployee.id
)

.eq(
"attendance_date",
today
);







breakStartTime =
new Date(startTime);






const status =

document.getElementById(
"breakStatus"
);



if(status){

status.innerText =
type+" Break Started";

}





clearInterval(
workingTimer
);



startBreakTimer();



}








// =======================================
// END BREAK
// =======================================


async function endBreak(){





const {

data:active,

error

}

=

await supabaseClient

.from("employee_breaks")

.select("*")

.eq(
"employee_id",
currentEmployee.id
)

.is(
"end_time",
null
)

.maybeSingle();






if(error || !active){


alert(
"No active break"
);


return;


}








const endTime =

new Date();




const startTime =

new Date(
active.start_time
);





const minutes =

Math.floor(

(endTime-startTime)

/

60000

);






const {

error:updateError

}

=

await supabaseClient

.from("employee_breaks")

.update({

end_time:
endTime.toISOString(),


duration_minutes:
minutes


})

.eq(
"id",
active.id
);







if(updateError){


alert(
updateError.message
);


return;


}







const today =

new Date().toLocaleDateString(
"en-CA",
{
timeZone:"Asia/Kolkata"
}
);






const totalBreak =

await getTotalBreakMinutes();







await supabaseClient

.from("attendance")

.update({

active_break_type:null,


break_start_time:null,


status:
"Present",


total_break_minutes:
totalBreak


})

.eq(
"employee_id",
currentEmployee.id
)

.eq(
"attendance_date",
today
);








clearInterval(
breakTimerInterval
);




breakStartTime=null;





const timer =

document.getElementById(
"breakTimer"
);



if(timer){

timer.innerText =
"00:00:00";

}





const status =

document.getElementById(
"breakStatus"
);



if(status){


status.innerText =

active.break_type +

" Break Ended ("+

minutes+

" min)";


}







await loadTodayAttendance();



}









// =======================================
// RESTORE ACTIVE BREAK
// =======================================
async function restoreActiveBreak(){


if(!currentEmployee){
    return;
}



const today =
new Date().toLocaleDateString(
"en-CA",
{
timeZone:"Asia/Kolkata"
}
);



const {data,error}=await supabaseClient

.from("employee_breaks")

.select("*")

.eq(
"employee_id",
currentEmployee.id
)

.eq(
"attendance_date",
today
)

.is(
"end_time",
null
)

.maybeSingle();



if(error){

console.log(
"Restore Break Error",
error
);

return;

}



if(data){


console.log(
"Active Break Found",
data
);



// IMPORTANT FIX
breakStartTime =
new Date(data.start_time);



const breakStatus =
document.getElementById(
"breakStatus"
);


if(breakStatus){

breakStatus.innerText =
data.break_type +
" Break Running";

}




const working =
document.getElementById(
"workingHours"
);


if(working){

working.innerText =
"On Break";

}




// restart timer from old start time

startBreakTimer();



}

else{


console.log(
"No Active Break"
);


}



}


// =======================================
// BREAK TIMER
// =======================================

function startBreakTimer(){


clearInterval(
breakTimerInterval
);



breakTimerInterval = setInterval(()=>{


if(!breakStartTime){

return;

}



const diff =
new Date() - breakStartTime;



let h =
Math.floor(
diff/(1000*60*60)
);



let m =
Math.floor(
(diff/(1000*60))%60
);



let s =
Math.floor(
(diff/1000)%60
);



const timer =
document.getElementById(
"breakTimer"
);



if(timer){


timer.innerText =

String(h).padStart(2,"0")
+
":"
+
String(m).padStart(2,"0")
+
":"
+
String(s).padStart(2,"0");


}



},1000);


}


// =======================================
// TOTAL BREAK MINUTES
// =======================================


async function getTotalBreakMinutes(){



const today =

new Date().toLocaleDateString(
"en-CA",
{
timeZone:"Asia/Kolkata"
}
);







const {

data,

error

}

=

await supabaseClient

.from("employee_breaks")

.select(
"duration_minutes"
)

.eq(
"employee_id",
currentEmployee.id
)

.eq(
"attendance_date",
today
);







if(error){


console.log(error);


return 0;


}







let total = 0;





data.forEach(item=>{


total +=

item.duration_minutes || 0;


});







return total;



}

// =======================================
// PART 4
// EVENTS + INITIALIZATION
// =======================================


// =======================================
// LOAD ANNOUNCEMENTS
// =======================================


async function loadAnnouncements(){



const {

data,

error

}

=

await supabaseClient

.from("announcements")

.select("*")

.order(
"created_at",
{
ascending:false
}
)

.limit(3);






if(error){


console.log(
"Announcement Error:",
error
);


return;


}







const box =

document.getElementById(
"announcementPreview"
);






if(!box){

return;

}






box.innerHTML="";






data.forEach(item=>{



box.innerHTML += `

<div class="activity">

📢 ${item.title}

</div>

`;



});



}








// =======================================
// BUTTON EVENTS
// =======================================


// CHECK IN BUTTON


const checkInBtn =

document.getElementById(
"checkInBtn"
);





if(checkInBtn){



checkInBtn.addEventListener(

"click",

()=>{


employeeCheckIn();


}

);



}







// CHECK OUT BUTTON


const checkOutBtn =

document.getElementById(
"checkOutBtn"
);





if(checkOutBtn){



checkOutBtn.addEventListener(

"click",

()=>{


employeeCheckOut();


}

);



}







// LUNCH BREAK


const lunchBtn =

document.getElementById(
"lunchBreakBtn"
);





if(lunchBtn){



lunchBtn.addEventListener(

"click",

()=>{


startBreak(
"Lunch"
);


}

);



}







// TEA BREAK


const teaBtn =

document.getElementById(
"teaBreakBtn"
);





if(teaBtn){



teaBtn.addEventListener(

"click",

()=>{


startBreak(
"Tea"
);


}

);



}







// OTHER BREAK


const otherBtn =

document.getElementById(
"otherBreakBtn"
);





if(otherBtn){



otherBtn.addEventListener(

"click",

()=>{


startBreak(
"Other"
);


}

);



}








// END BREAK


const endBreakBtn =

document.getElementById(
"endBreakBtn"
);





if(endBreakBtn){



endBreakBtn.addEventListener(

"click",

()=>{


endBreak();


}

);



}







// START DASHBOARD


loadEmployeeDashboard();






// =======================================
// AUTO REFRESH ATTENDANCE
// =======================================


setInterval(
async()=>{



if(currentEmployee){



await loadTodayAttendance();



}



},
30000
);







// =======================================
// RESTORE TIMER BEFORE CLOSE
// =======================================


window.addEventListener(

"beforeunload",

()=>{


clearInterval(
workingTimer
);



clearInterval(
breakTimerInterval
);



}

);
