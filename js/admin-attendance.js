// ===============================
// ADMIN ATTENDANCE JS
// ===============================


function formatWorkingHours(hours){

    if(!hours){
        return "-";
    }

    let h = Math.floor(hours);

    let m = Math.round((hours-h)*60);

    return `${h} Hours ${m} Minutes`;

}




function formatTime(time){

    if(!time){
        return "-";
    }


    return new Date(time)
    .toLocaleTimeString(
        "en-IN",
        {
            hour:"2-digit",
            minute:"2-digit",
            hour12:true
        }
    );

}







// ===============================
// LOAD ATTENDANCE
// ===============================


async function loadAttendance(){


let searchText =
document
.getElementById("attendanceSearch")
.value
.toLowerCase();



let selectedDate =
document
.getElementById("attendanceDate")
.value;



let selectedDepartment =
document
.getElementById("attendanceDepartment")
.value;





let query = supabaseClient
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





// DATE FILTER

if(selectedDate){

query =
query.eq(
"attendance_date",
selectedDate
);

}





const {data,error}=await query;



if(error){

console.log(error);
return;

}




let filteredData = data;






// EMPLOYEE SEARCH

if(searchText){


filteredData =
filteredData.filter(att=>{


let name =
att.profiles?.full_name
?.toLowerCase()
|| "";



return name.includes(searchText);


});


}





// DEPARTMENT FILTER


if(
selectedDepartment &&
selectedDepartment !== "All Departments"
){


filteredData =
filteredData.filter(att=>{


return att.profiles?.department
=== selectedDepartment;


});


}






renderAttendance(filteredData);



}








// ===============================
// SHOW TABLE DATA
// ===============================


function renderAttendance(data){


let rows="";




if(!data || data.length===0){


rows=`

<tr>

<td colspan="6">

No Attendance Found

</td>

</tr>

`;


}

else{


data.forEach(att=>{


rows += `


<tr>


<td>

${att.profiles?.full_name || "Unknown"}

</td>



<td>

${att.attendance_date}

</td>



<td>

${formatTime(att.check_in)}

</td>



<td>

${formatTime(att.check_out)}

</td>



<td>

${formatWorkingHours(att.working_hours)}

</td>



<td>

${att.status || "Present"}

</td>



</tr>


`;



});


}




document
.getElementById(
"attendanceTableBody"
)
.innerHTML = rows;


}







// ===============================
// BUTTON EVENTS
// ===============================


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


console.log(
"Attendance Search Clicked"
);


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
"attendanceDate"
).value="";



document.getElementById(
"attendanceSearch"
).value="";



document.getElementById(
"attendanceDepartment"
).value="";



loadAttendance();


});


}



loadAttendance();



});
