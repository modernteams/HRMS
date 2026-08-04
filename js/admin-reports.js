// =======================================
// MODERN TEAMS HRMS
// ADMIN REPORT MODULE
// EMPLOYEE SUMMARY REPORT ENGINE
// =======================================


let reportData = [];




// =======================================
// DATE HELPER
// =======================================

function getTodayDate(){

    let d = new Date();

    return d.toISOString().split("T")[0];

}





// =======================================
// GENERATE REPORT
// =======================================


async function generateReport(){


try{


let fromDate =
document.getElementById(
"reportFromDate"
).value;



let toDate =
document.getElementById(
"reportToDate"
).value;



let department =
document.getElementById(
"reportDepartment"
).value;





if(!fromDate){

fromDate = getTodayDate();

}


if(!toDate){

toDate = getTodayDate();

}





// ===================================
// GET EMPLOYEES
// ===================================


const {

data:employees,
error:empError

}=await supabaseClient


.from("profiles")


.select(`

id,
full_name,
department,
role,
status

`)


.eq(
"role",
"employee"
);





if(empError){

console.log(empError);

return;

}






// ===================================
// GET ATTENDANCE
// ===================================


const {

data:attendance,
error:attError

}=await supabaseClient


.from("attendance")


.select("*")


.gte(
"attendance_date",
fromDate
)


.lte(
"attendance_date",
toDate
);





if(attError){

console.log(attError);

return;

}






// ===================================
// GET LEAVES
// ===================================


const {

data:leaves

}=await supabaseClient


.from("leave_requests")


.select("*")


.eq(
"status",
"Approved"
);







// ===================================
// PROCESS EMPLOYEE SUMMARY
// ===================================



reportData=[];




employees.forEach(emp=>{



if(
department &&
emp.department!==department
){

return;

}





let empAttendance =

attendance.filter(a=>


String(a.employee_id)

===

String(emp.id)


);






let present=0;

let late=0;

let absent=0;

let leave=0;

let workingMinutes=0;






// ----------------------------
// COUNT ATTENDANCE
// ----------------------------


empAttendance.forEach(att=>{


let status =
calculateAttendanceStatus(att);



if(status==="Present"){

present++;

}



if(status==="Late"){

late++;

}





if(att.check_in){


let start =
new Date(
att.check_in
);


let end =
att.check_out
?
new Date(att.check_out)
:
new Date();



workingMinutes +=

Math.floor(
(end-start)/60000
);


}




});








// ----------------------------
// COUNT LEAVE
// ----------------------------



let empLeaves =

leaves.filter(l=>

String(l.employee_id)

===

String(emp.id)

);



leave = calculateLeaveDays(
empLeaves,
fromDate,
toDate
);






// ----------------------------
// TOTAL DAYS
// ----------------------------


let totalDays =

calculateDays(
fromDate,
toDate
);





absent =

totalDays -

present -

late -

leave;



if(absent < 0){

absent=0;

}






let percentage =

totalDays>0

?

Math.round(
((present+late)
/totalDays)
*
100
)

:

0;






reportData.push({



employee:emp,


totalDays,


present,


late,


absent,


leave,


percentage,


workingHours:

convertMinutes(
workingMinutes
)



});





});







console.log(
"FINAL REPORT",
reportData
);





renderReport(
reportData
);



}

catch(error){


console.log(
"REPORT ERROR",
error
);


}



}









// =======================================
// STATUS
// =======================================


function calculateAttendanceStatus(att){



if(!att.check_in){

return "Absent";

}




let check =
new Date(
att.check_in
);



let office =
new Date(
att.attendance_date
);



office.setHours(
10,
15,
0
);





if(check > office){

return "Late";

}



return "Present";



}









// =======================================
// DAYS CALCULATOR
// =======================================


function calculateDays(
start,
end
){



let s =
new Date(start);


let e =
new Date(end);



let diff =
e-s;



return (

Math.floor(
diff/(1000*60*60*24)
)

+1

);



}









// =======================================
// LEAVE DAYS
// =======================================


function calculateLeaveDays(
leaves,
from,
to
){



let count=0;



leaves.forEach(l=>{


let start =
new Date(
l.from_date
);


let end =
new Date(
l.to_date
);



while(start<=end){


let day =
start.toISOString()
.split("T")[0];



if(
day>=from &&
day<=to
){

count++;

}



start.setDate(
start.getDate()+1
);



}



});




return count;



}









// =======================================
// MINUTES TO HOURS
// =======================================


function convertMinutes(min){



let h =
Math.floor(
min/60
);



let m =
min%60;



return `${h}h ${m}m`;

}

// =======================================
// RENDER EMPLOYEE SUMMARY REPORT
// =======================================


function renderReport(data){


const table =

document.getElementById(
"reportTableBody"
);



if(!table)
return;





if(!data.length){


table.innerHTML=`

<tr>

<td colspan="9">

No Report Data Found

</td>

</tr>

`;


return;


}






let html="";




data.forEach(item=>{



html += `


<tr>


<td>

<strong>
${item.employee.full_name}
</strong>

</td>



<td>

${item.employee.department || "-"}

</td>




<td>

${item.totalDays}

</td>





<td>

${item.present}

</td>




<td>

${item.late}

</td>




<td>

${item.absent}

</td>




<td>

${item.leave}

</td>





<td>

${item.workingHours}

</td>





<td>

${item.percentage}%

</td>




</tr>



`;



});




table.innerHTML=html;




// update unique employee card

let total =

document.getElementById(
"totalEmployees"
);



if(total){

total.innerText =
data.length;

}



}









// =======================================
// EXCEL EXPORT
// =======================================


function exportExcel(){



if(!reportData.length){


alert(
"Generate report first"
);


return;


}




let excel=[];




reportData.forEach(item=>{


excel.push({


Employee:

item.employee.full_name,


Department:

item.employee.department || "-",



Total_Days:

item.totalDays,



Present:

item.present,



Late:

item.late,



Absent:

item.absent,



Leave:

item.leave,



Working_Hours:

item.workingHours,



Attendance_Percentage:

item.percentage+"%"


});



});






let sheet =

XLSX.utils.json_to_sheet(
excel
);





let workbook =

XLSX.utils.book_new();





XLSX.utils.book_append_sheet(

workbook,

sheet,

"Employee Summary"

);





XLSX.writeFile(

workbook,

"Modern_Teams_Employee_Report.xlsx"

);



}









// =======================================
// PDF EXPORT
// =======================================


function exportPDF(){



if(!reportData.length){


alert(
"Generate report first"
);


return;


}





const {
jsPDF

}

=
window.jspdf;





let doc =

new jsPDF();






doc.text(

"Modern Teams HRMS Employee Report",

14,

20

);






let rows=[];




reportData.forEach(item=>{


rows.push([


item.employee.full_name,


item.employee.department || "-",


item.totalDays,


item.present,


item.absent,


item.late,


item.leave,


item.percentage+"%"



]);


});








doc.autoTable({



startY:30,



head:[


[

"Employee",

"Department",

"Days",

"Present",

"Absent",

"Late",

"Leave",

"Attendance %"

]


],



body:rows



});





doc.save(

"Modern_Teams_Report.pdf"

);



}









// =======================================
// PRINT
// =======================================


function printReport(){


window.print();


}









// =======================================
// RESET
// =======================================


function resetReport(){



document
.querySelectorAll(
".filter-card input"
)

.forEach(e=>{

e.value="";

});





document
.querySelectorAll(
".filter-card select"
)

.forEach(e=>{

e.value="";

});





generateReport();



}









// =======================================
// EVENTS
// =======================================


document.addEventListener(

"DOMContentLoaded",

()=>{






document
.getElementById(
"generateReportBtn"
)
?.addEventListener(

"click",

generateReport

);






document
.getElementById(
"exportExcelBtn"
)
?.addEventListener(

"click",

exportExcel

);






document
.getElementById(
"exportPdfBtn"
)
?.addEventListener(

"click",

exportPDF

);






document
.getElementById(
"printReportBtn"
)
?.addEventListener(

"click",

printReport

);






document
.getElementById(
"resetReportBtn"
)
?.addEventListener(

"click",

resetReport

);







// auto load today


let from =

document.getElementById(
"reportFromDate"
);



let to =

document.getElementById(
"reportToDate"
);





if(from && !from.value){

from.value =
getTodayDate();

}




if(to && !to.value){

to.value =
getTodayDate();

}





generateReport();



});
