// =======================================
// ADMIN ATTENDANCE
// PART-1
// Utilities + Load Attendance
// =======================================

let attendanceData = [];

function formatTime(time){

    if(!time) return "-";

    return new Date(time).toLocaleTimeString("en-IN",{

        hour:"2-digit",
        minute:"2-digit",
        hour12:true

    });

}

function formatWorkingHours(hours){

    if(hours==null || isNaN(hours))
        return "-";

    const totalMinutes=Math.round(Number(hours)*60);

    const h=Math.floor(totalMinutes/60);

    const m=totalMinutes%60;

    return `${h}h ${m}m`;

}

function formatBreak(minutes){

    if(!minutes)
        return "0m";

    const h=Math.floor(minutes/60);

    const m=minutes%60;

    if(h>0)
        return `${h}h ${m}m`;

    return `${m}m`;

}

function getStatusClass(status){

    switch(status){

        case "Present":

            return "status-present";

        case "Absent":

            return "status-absent";

        case "Late":

            return "status-late";

        case "Holiday":

            return "status-holiday";

        case "Week Off":

            return "status-weekoff";

        case "On Leave":

            return "status-leave";

        default:

            return "";

    }

}

function getBreakSummary(att){


if(!att.employee_breaks || att.employee_breaks.length===0){

return "0m";

}


let html="";


att.employee_breaks.forEach(b=>{


html += `

<div>
${b.break_type} (${b.duration_minutes || 0}m)
</div>

`;


});


return html;


}

function getActivityClass(activity){

    switch(activity){

        case "Working":

            return "activity-working";

        case "On Break":

            return "activity-break";

        case "Completed":

            return "activity-completed";

        default:

            return "";

    }

}


// =======================================
// LIVE WORKING HOURS
// =======================================

function calculateLiveWorkingHours(att){

    if(!att.check_in)
        return "-";

    let endTime =
    att.check_out
    ?
    new Date(att.check_out)
    :
    new Date();

    let startTime =
    new Date(att.check_in);

    let minutes =
    Math.floor(
    (endTime-startTime)/60000
    );
let breakMinutes = 0;


if(att.breaks){

att.breaks.forEach(b=>{


if(b.duration_minutes){

breakMinutes += b.duration_minutes;

}


});

}


minutes -= breakMinutes;

    if(minutes<0)
        minutes=0;

    const h=Math.floor(minutes/60);

    const m=minutes%60;

    return `${h}h ${m}m`;

}


function calculateAttendanceStatus(att){

const today = new Date();

const day =
today.getDay();


// Sunday

if(day === 0){

return "Week Off";

}



// No check in

if(!att.check_in){

return "Absent";

}



// Late timing

const checkIn =
new Date(att.check_in);


const lateTime =
new Date();

lateTime.setHours(10,15,0);



if(checkIn > lateTime){

return "Late";

}



return "Present";


}
// =======================================
// LOAD ATTENDANCE
// =======================================

async function loadAttendance(){

const searchText=
document
.getElementById("attendanceSearch")
.value
.toLowerCase();

const selectedDate=
document
.getElementById("attendanceDate")
.value;

const selectedDepartment=
document
.getElementById("attendanceDepartment")
.value;


// attendance

let {data,error}=await supabaseClient

.from("attendance")

.select(`
*,
profiles(
full_name,
email,
department
)
`)

.order(
"attendance_date",
{
ascending:false
}
);

if(error){

console.log(error);

return;

}

// FETCH BREAK DATA

const employeeIds = data.map(
(att)=>att.employee_id
);


const {data:breakData,error:breakError}=

await supabaseClient
.from("employee_breaks")
.select("*")
.in(
"employee_id",
employeeIds
);



if(breakError){

console.log(
"Break Fetch Error",
breakError
);

}



// attach breaks with attendance


data.forEach(att=>{

att.breaks =
breakData.filter(
(b)=>
b.employee_id === att.employee_id
);

});


// search

if(searchText){

data=data.filter(att=>

(att.profiles?.full_name || "")

.toLowerCase()

.includes(searchText)

);

}



// department

if(

selectedDepartment &&

selectedDepartment!="All Departments"

){

data=data.filter(att=>

att.profiles?.department===selectedDepartment

);

}



// date

if(selectedDate){

data=data.filter(att=>

att.attendance_date===selectedDate

);

}



attendanceData=data;

renderAttendance(attendanceData);

}

// =======================================
// PART-2
// Activity + Break + Table Render
// =======================================


// =======================================
// EMPLOYEE CURRENT ACTIVITY
// =======================================
function getActivity(att){

    if(att.check_out){

        return "Completed";

    }


    if(
        att.breaks &&
        att.breaks.some(
            b => !b.end_time
        )
    ){

        return "On Break";

    }


    if(att.check_in){

        return "Working";

    }


    return "-";


}




// =======================================
// LIVE BREAK STATUS
// =======================================


function getLiveBreakStatus(att){


    // no break

    if(!att.breaks || att.breaks.length===0){

        return "0m";

    }



    let totalMinutes=0;


    att.breaks.forEach(b=>{


        // completed break

        if(b.duration_minutes){

            totalMinutes +=
            b.duration_minutes;

        }


        // running break

        else if(
            b.start_time &&
            !b.end_time
        ){

            const start =
            new Date(b.start_time);


            const now =
            new Date();


            totalMinutes +=
            Math.floor(
            (now-start)/60000
            );

        }


    });



    return formatBreak(totalMinutes);


}




// =======================================
// BREAK TYPE DETAILS
// =======================================


function getBreakDetails(att){


    if(!att.breaks ||
       att.breaks.length===0){

        return "-";

    }


    let html="";


    att.breaks.forEach(b=>{


        let minutes =
        b.duration_minutes || 0;



        // running break

        if(
            b.start_time &&
            !b.end_time
        ){

            minutes =
            Math.floor(
            (new Date()-new Date(b.start_time))
            /
            60000
            );


        }



        html += `

        <div class="break-item">

            ${b.break_type}
            (${minutes}m)

        </div>

        `;


    });



    return html;


}


// =======================================
// ATTENDANCE STATUS CALCULATOR
// =======================================

function calculateAttendanceStatus(att){


const today = new Date();


// =====================
// WEEK OFF (SUNDAY)
// =====================

if(today.getDay() === 0){

    return "Week Off";

}


// =====================
// ABSENT
// =====================

if(!att.check_in){

    return "Absent";

}



// =====================
// LATE CHECK
// =====================


const checkInTime =
new Date(att.check_in);



const officeStart =
new Date(att.attendance_date);


officeStart.setHours(
10,
0,
0
);



if(checkInTime > officeStart){

    return "Late";

}



// =====================
// PRESENT
// =====================

return "Present";


}


// =======================================
// TABLE RENDER
// =======================================


function renderAttendance(data){


let rows="";



if(!data || data.length===0){


rows=`

<tr>

<td colspan="8">

No Attendance Found

</td>

</tr>

`;



}

else{


data.forEach(att=>{



const activity =
getActivity(att);



rows += `

<tr>


<td>

${att.profiles?.full_name || "Unknown"}

</td>



<td>

${new Date(att.attendance_date)
.toLocaleDateString(
"en-IN",
{
day:"2-digit",
month:"short",
year:"numeric"
}
)}

</td>



<td>

${formatTime(att.check_in)}

</td>



<td>

${formatTime(att.check_out)}

</td>




<td class="working-hours">


${calculateLiveWorkingHours(att)}


</td>




<td>


<div class="break-box">

${getBreakDetails(att)}

</div>


</td>




<td>


<span class="
${getActivityClass(activity)}
">


${activity}


</span>


</td>




<td>


<span class="
${getStatusClass(
calculateAttendanceStatus(att)
)}
">


${calculateAttendanceStatus(att)}


</span>


</td>


</tr>


`;



});


}




const table =
document.getElementById(
"attendanceTableBody"
);



if(table){

table.innerHTML=rows;

}


}

// =======================================
// PART-3
// Live Refresh + Events
// =======================================



function startLiveAttendance(){


    setInterval(()=>{


        if(attendanceData.length>0){


            renderAttendance(attendanceData);


        }


    },1000);



}




// =======================================
// BUTTON EVENTS
// =======================================


document.addEventListener(
"DOMContentLoaded",
()=>{



const searchBtn =
document.getElementById(
"attendanceSearchBtn"
);



if(searchBtn){


searchBtn.addEventListener(
"click",
()=>{


loadAttendance();


});


}





const resetBtn =
document.getElementById(
"resetAttendanceBtn"
);



if(resetBtn){


resetBtn.addEventListener(
"click",
()=>{


document.getElementById(
"attendanceSearch"
).value="";



document.getElementById(
"attendanceDate"
).value="";



document.getElementById(
"attendanceDepartment"
).value="";



loadAttendance();



});


}




// first load

loadAttendance();



// live timer

startLiveAttendance();



});





// =======================================
// AUTO DATABASE REFRESH
// =======================================


setInterval(()=>{


loadAttendance();


},5000);

