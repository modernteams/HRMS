// =====================================================
// MODERN TEAMS HRMS
// ADMIN REPORT ENGINE
// Employee Wise Attendance Summary
// =====================================================


let reportData = [];

let holidaysData = [];



// =====================================================
// DATE HELPERS
// =====================================================


function formatDate(date){

    return date
    .toISOString()
    .split("T")[0];

}



function getWorkingDays(from,to,holidays){


    let days=[];


    let start=new Date(from);

    let end=new Date(to);



    while(start<=end){


        let date=formatDate(start);


        let day=start.getDay();



        // Sunday remove

        if(day!==0 && 
        !holidays.includes(date)){


            days.push(date);

        }


        start.setDate(
            start.getDate()+1
        );


    }


    return days;

}





// =====================================================
// LOAD REPORT
// =====================================================


async function generateReport(){



let fromDate =
document.getElementById(
"reportFromDate"
).value;



let toDate =
document.getElementById(
"reportToDate"
).value;



if(!fromDate || !toDate){


alert(
"Please select date range"
);


return;


}





// =============================
// HOLIDAYS
// =============================


const {

data:holidays

}=await supabaseClient


.from("holidays")

.select(
"holiday_date"
);



holidaysData =
(holidays || [])
.map(h=>h.holiday_date);





// =============================
// WORKING DAYS
// =============================


let workingDays =
getWorkingDays(
fromDate,
toDate,
holidaysData
);



console.log(
"Working Days",
workingDays
);






// =============================
// EMPLOYEES
// =============================


const {

data:employees

}=await supabaseClient


.from("profiles")

.select(`
id,
full_name,
department,
role
`)


.eq(
"role",
"employee"
);





// =============================
// ATTENDANCE
// =============================


const {

data:attendance

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







// =============================
// LEAVES
// =============================


const {

data:leaves

}=await supabaseClient


.from("leave_requests")


.select("*")


.eq(
"status",
"Approved"
);





buildEmployeeReport(
employees || [],
attendance || [],
leaves || [],
workingDays
);



}


// =====================================================
// BUILD EMPLOYEE REPORT
// =====================================================


function buildEmployeeReport(
employees,
attendance,
leaves,
workingDays
){



reportData=[];



employees.forEach(emp=>{



let present=0;

let late=0;

let absent=0;

let leave=0;



let totalWorkingDays =
workingDays.length;





workingDays.forEach(date=>{



// =========================
// ATTENDANCE FIND
// =========================


let att =
attendance.find(a=>

String(a.employee_id)
===
String(emp.id)

&&

a.attendance_date===date

);




// =========================
// LEAVE CHECK
// =========================


let isLeave =
leaves.some(l=>

String(l.employee_id)
===
String(emp.id)

&&

date >= l.from_date

&&

date <= l.to_date

);





// =========================
// STATUS CALCULATION
// =========================



if(isLeave){


leave++;


return;


}





if(!att){


absent++;


return;


}





let checkIn =
new Date(
att.check_in
);




let officeTime =
new Date(date);



officeTime.setHours(
10,
15,
0
);





if(checkIn > officeTime){


late++;

present++;


}

else{


present++;


}



});







let percentage=0;



if(totalWorkingDays>0){


percentage =
Math.round(
(present / totalWorkingDays)
*
100
);


}







reportData.push({


employee:emp,


totalDays:totalWorkingDays,


present:present,


late:late,


absent:absent,


leave:leave,


percentage:percentage



});



});




console.log(
"FINAL REPORT",
reportData
);




calculateSummary(
reportData
);



renderReport(
reportData
);



}





// =====================================================
// SUMMARY CARDS
// =====================================================


function calculateSummary(data){



// Reports me total employees
// duplicate nahi hoga


document.getElementById(
"totalEmployees"
).innerText =
data.length;



// Ye dashboard ke liye nahi
// isliye total count nahi


let totalPresent=0;

let totalAbsent=0;

let totalLate=0;

let totalLeave=0;



data.forEach(item=>{


totalPresent += item.present;


totalAbsent += item.absent;


totalLate += item.late;


totalLeave += item.leave;


});




document.getElementById(
"presentCount"
).innerText =
totalPresent;



document.getElementById(
"absentCount"
).innerText =
totalAbsent;



document.getElementById(
"lateCount"
).innerText =
totalLate;



document.getElementById(
"leaveCount"
).innerText =
totalLeave;



}







// =====================================================
// TABLE RENDER
// =====================================================


function renderReport(data){



let table =
document.getElementById(
"reportTableBody"
);




if(!data.length){


table.innerHTML=`

<tr>

<td colspan="8">

No Report Found

</td>

</tr>

`;


return;


}






let html="";




data.forEach(item=>{



html+=`

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

${item.present}

</td>



<td>

${item.late}

</td>



<td>

${item.leave}

</td>



<td>

${item.absent}

</td>



<td>

${item.totalDays}

</td>



<td>

${item.percentage}%

</td>



</tr>

`;



});





table.innerHTML=html;



}

// =====================================================
// EXCEL EXPORT
// =====================================================


function exportExcel(){



if(!reportData.length){


alert(
"Generate report first"
);


return;


}



let excelData = [];



reportData.forEach(item=>{


excelData.push({

Employee:
item.employee.full_name,


Department:
item.employee.department || "-",


Working_Days:
item.totalDays,


Present:
item.present,


Late:
item.late,


Leave:
item.leave,


Absent:
item.absent,


Attendance_Percentage:
item.percentage+"%"



});


});





let sheet =
XLSX.utils.json_to_sheet(
excelData
);



let workbook =
XLSX.utils.book_new();



XLSX.utils.book_append_sheet(

workbook,

sheet,

"Attendance Report"

);



XLSX.writeFile(

workbook,

"Modern_Teams_Attendance_Report.xlsx"

);



}







// =====================================================
// PDF EXPORT
// =====================================================


function exportPDF(){



if(!reportData.length){


alert(
"Generate report first"
);


return;


}




const {

jsPDF

}=window.jspdf;




let doc =
new jsPDF();





doc.text(

"Modern Teams HRMS Attendance Report",

14,

20

);





let rows =
reportData.map(item=>[


item.employee.full_name,


item.employee.department || "-",


item.present,


item.late,


item.leave,


item.absent,


item.percentage+"%"


]);







doc.autoTable({

startY:30,


head:[

[

"Employee",

"Department",

"Present",

"Late",

"Leave",

"Absent",

"Attendance %"


]

],



body:rows



});





doc.save(

"Modern_Teams_Report.pdf"

);



}








// =====================================================
// PRINT REPORT
// =====================================================


function printReport(){


window.print();


}








// =====================================================
// RESET FILTER
// =====================================================


function resetReport(){



document
.querySelectorAll(
".filter-card input"
)
.forEach(input=>{

input.value="";

});



document
.querySelectorAll(
".filter-card select"
)
.forEach(select=>{

select.value="";

});




reportData=[];



document.getElementById(
"reportTableBody"
).innerHTML=`

<tr>

<td colspan="8">

Generate report to view data

</td>

</tr>

`;



}





// =====================================================
// DEFAULT DATE
// =====================================================


function setDefaultDates(){


let today =
new Date();



let first =
new Date(
today.getFullYear(),
today.getMonth(),
1
);




document.getElementById(
"reportFromDate"
).value =
formatDate(first);




document.getElementById(
"reportToDate"
).value =
formatDate(today);



}







// =====================================================
// EVENTS
// =====================================================


document.addEventListener(

"DOMContentLoaded",

()=>{





setDefaultDates();






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






// auto generate

generateReport();



});
