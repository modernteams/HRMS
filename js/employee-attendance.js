let currentUser = null;



async function loadMyAttendance(){


const {data:userData,error:userError} =
await supabaseClient.auth.getUser();



if(userError || !userData.user){

window.location.href="login.html";
return;

}



const email =
userData.user.email;




const {data:profile,error} =
await supabaseClient
.from("profiles")
.select("*")
.eq(
"email",
email
)
.maybeSingle();




if(error || !profile){

console.log("Profile Error:",error);
return;

}



currentUser = profile;



console.log(
"Current Employee:",
currentUser
);



showTodayDate();


loadAttendanceData();



}









function showTodayDate(){



const date =
new Date()
.toLocaleDateString(
"en-IN",
{
day:"2-digit",
month:"short",
year:"numeric"
}
);



document.getElementById(
"todayDate"
)
.innerText=date;



}









async function loadAttendanceData(){



console.log(
"Loading attendance for:",
currentUser.id
);



const {data,error}=

await supabaseClient
.from("attendance")
.select("*")
.eq(
"employee_id",
currentUser.id
)
.order(
"attendance_date",
{
ascending:false
}
);





if(error){

console.log(
"Attendance Error:",
error
);

return;

}





console.log(
"Attendance Data:",
data
);






if(data && data.length>0){



const latest=data[0];



document.getElementById(
"checkInTime"
)
.innerText=
formatTime(
latest.check_in
);




document.getElementById(
"checkOutTime"
)
.innerText=
formatTime(
latest.check_out
);




document.getElementById(
"totalHours"
)
.innerText=
formatHours(
latest.working_hours
);



}







let table="";




if(!data || data.length===0){



table=`

<tr>

<td colspan="5">

No Attendance Records Found

</td>

</tr>

`;



}

else{



data.forEach(item=>{


table+=`

<tr>


<td>
${item.attendance_date}
</td>


<td>
${formatTime(item.check_in)}
</td>


<td>
${formatTime(item.check_out)}
</td>


<td>
${formatHours(item.working_hours)}
</td>


<td>
${item.status || "Present"}
</td>


</tr>


`;



});


}




document.getElementById(
"myAttendanceTable"
)
.innerHTML=table;



}









function formatTime(time){


if(!time)

return "--";



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









function formatHours(value){



if(!value)

return "0 Hours 0 Minutes";



let minutes =
Math.round(
Number(value)*60
);



let hours =
Math.floor(
minutes/60
);



let mins =
minutes%60;



return `${hours} Hours ${mins} Minutes`;



}






loadMyAttendance();
