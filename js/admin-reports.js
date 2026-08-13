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



function normalizeDate(value){

    if(!value){
        return null;
    }


    // Date object
    if(value instanceof Date){

        if(isNaN(value.getTime())){
            return null;
        }

        return formatDate(value);

    }


    // Already YYYY-MM-DD
    if(
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    ){

        return value;

    }


    let date = new Date(value);


    if(isNaN(date.getTime())){
        return null;
    }


    return formatDate(date);

}



function getWorkingDays(from,to,holidays){

    let days=[];


    let start=new Date(from);

    let end=new Date(to);



    while(start<=end){

        let date=formatDate(start);

        let day=start.getDay();



        // =================================================
        // SUNDAY = WEEK OFF
        // =================================================

        if(
            day !== 0 &&
            !holidays.includes(date)
        ){

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



    // =================================================
    // HOLIDAYS
    // =================================================


    const {
        data:holidays,
        error:holidayError
    } = await supabaseClient

    .from("holidays")

    .select(
        "holiday_date"
    );



    if(holidayError){

        console.error(
            "Holiday loading error:",
            holidayError
        );

    }



    holidaysData =
    (holidays || [])

    .map(h =>
        normalizeDate(
            h.holiday_date
        )
    )

    .filter(Boolean);



    // =================================================
    // WORKING DAYS
    // =================================================


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



    // =================================================
    // EMPLOYEES
    // =================================================


    const {
        data:employees,
        error:employeeError
    } = await supabaseClient

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



    if(employeeError){

        console.error(
            "Employee loading error:",
            employeeError
        );

        alert(
            "Unable to load employees"
        );

        return;

    }



    // =================================================
    // ATTENDANCE
    // =================================================


    const {
        data:attendance,
        error:attendanceError
    } = await supabaseClient

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



    if(attendanceError){

        console.error(
            "Attendance loading error:",
            attendanceError
        );

        alert(
            "Unable to load attendance"
        );

        return;

    }



    // =================================================
    // LEAVES
    // =================================================


    const {
        data:leaves,
        error:leaveError
    } = await supabaseClient

    .from("leave_requests")

    .select("*")

    .eq(
        "status",
        "Approved"
    );



    if(leaveError){

        console.error(
            "Leave loading error:",
            leaveError
        );

        alert(
            "Unable to load approved leaves"
        );

        return;

    }



    // =================================================
    // BUILD REPORT
    // =================================================


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



        // =================================================
        // EMPLOYEE APPROVED LEAVES
        // =================================================


        let employeeLeaves =
        leaves.filter(l=>{

            return String(
                l.employee_id
            ) === String(
                emp.id
            );

        });



        // =================================================
        // CHECK EVERY WORKING DAY
        // =================================================


        workingDays.forEach(date=>{


            // =================================================
            // LEAVE CHECK
            // =================================================


            let isLeave =
            employeeLeaves.some(l=>{


                let leaveFrom =
                normalizeDate(
                    l.from_date
                );


                let leaveTo =
                normalizeDate(
                    l.to_date
                );


                if(
                    !leaveFrom ||
                    !leaveTo
                ){

                    return false;

                }


                return (
                    date >= leaveFrom &&
                    date <= leaveTo
                );

            });



            // =================================================
            // APPROVED LEAVE
            // =================================================


            if(isLeave){

                leave++;

                return;

            }



            // =================================================
            // FIND ATTENDANCE
            // =================================================


            let att =
            attendance.find(a=>{


                let attendanceEmployee =
                a.employee_id;


                let attendanceDate =
                normalizeDate(
                    a.attendance_date
                );


                return (

                    String(
                        attendanceEmployee
                    ) === String(
                        emp.id
                    )

                    &&

                    attendanceDate === date

                );

            });



            // =================================================
            // NO ATTENDANCE
            // =================================================


            if(!att){

                // Working day
                // No approved leave
                // No attendance
                // = Absent

                absent++;

                return;

            }



            // =================================================
            // ATTENDANCE STATUS
            // =================================================


            let status =
            String(
                att.status || ""
            )
            .toLowerCase()
            .trim();



            let checkIn =
            att.check_in;



            // =================================================
            // MANUALLY MARKED PRESENT
            // =================================================
            //
            // Example:
            //
            // attendance_date = 2026-08-12
            // status = Present
            // check_in = NULL
            //
            // Employee was actually present but forgot
            // check-in.
            //
            // This MUST count as Present.
            // =================================================


            if(
                status === "present" ||
                status === "completed" ||
                status === "late"
            ){

                present++;


                if(
                    status === "late"
                ){

                    late++;

                }


                return;

            }



            // =================================================
            // CHECK-IN EXISTS
            // =================================================


            if(checkIn){


                let checkInDate =
                new Date(
                    checkIn
                );



                // Invalid check-in protection

                if(
                    isNaN(
                        checkInDate.getTime()
                    )
                ){

                    absent++;

                    return;

                }



                // =================================================
                // OFFICE LATE TIME = 10:15 AM
                // =================================================


                let officeTime =
                new Date(
                    `${date}T10:15:00`
                );



                // =================================================
                // LATE
                // =================================================


                if(
                    checkInDate > officeTime
                ){

                    late++;

                }


                present++;

                return;

            }



            // =================================================
            // FALLBACK
            // =================================================


            // Attendance row exists,
            // but no status and no check-in.
            //
            // Working day + no valid attendance
            // = Absent


            absent++;


        });



        // =================================================
        // EFFECTIVE WORKING DAYS
        // =================================================
        //
        // Sunday already excluded.
        // Holidays already excluded.
        // Approved leave removed from denominator.
        // =================================================


        let totalWorkingDays =
        Math.max(
            0,
            workingDays.length - leave
        );



        // =================================================
        // ATTENDANCE PERCENTAGE
        // =================================================


        let percentage=0;



        if(
            totalWorkingDays > 0
        ){

            percentage =
            Math.round(
                (
                    present /
                    totalWorkingDays
                )
                *
                100
            );

        }



        // =================================================
        // REPORT DATA
        // =================================================


        reportData.push({

            employee:emp,

            totalDays:
            totalWorkingDays,

            present:
            present,

            late:
            late,

            absent:
            absent,

            leave:
            leave,

            percentage:
            percentage

        });


    });



    // =================================================
    // DEBUG
    // =================================================


    console.log(
        "FINAL REPORT",
        reportData
    );



    // =================================================
    // SUMMARY
    // =================================================


    calculateSummary(
        reportData
    );



    // =================================================
    // RENDER REPORT
    // =================================================


    renderReport(
        reportData
    );


}





// =====================================================
// SUMMARY CARDS
// =====================================================


function calculateSummary(data){


    // =================================================
    // GET ELEMENTS SAFELY
    // =================================================


    const totalEmployees =
    document.getElementById(
        "totalEmployees"
    );


    const presentCount =
    document.getElementById(
        "presentCount"
    );


    const absentCount =
    document.getElementById(
        "absentCount"
    );


    const lateCount =
    document.getElementById(
        "lateCount"
    );


    const leaveCount =
    document.getElementById(
        "leaveCount"
    );



    // =================================================
    // TOTAL EMPLOYEES
    // =================================================


    if(totalEmployees){

        totalEmployees.innerText =
        data.length;

    }



    // =================================================
    // TOTAL COUNTS
    // =================================================


    let totalPresent=0;

    let totalAbsent=0;

    let totalLate=0;

    let totalLeave=0;



    data.forEach(item=>{


        totalPresent +=
        Number(
            item.present
        ) || 0;


        totalAbsent +=
        Number(
            item.absent
        ) || 0;


        totalLate +=
        Number(
            item.late
        ) || 0;


        totalLeave +=
        Number(
            item.leave
        ) || 0;


    });



    // =================================================
    // PRESENT
    // =================================================


    if(presentCount){

        presentCount.innerText =
        totalPresent;

    }



    // =================================================
    // ABSENT
    // =================================================


    if(absentCount){

        absentCount.innerText =
        totalAbsent;

    }



    // =================================================
    // LATE
    // =================================================


    if(lateCount){

        lateCount.innerText =
        totalLate;

    }



    // =================================================
    // LEAVE
    // =================================================


    if(leaveCount){

        leaveCount.innerText =
        totalLeave;

    }



    // =================================================
    // DEBUG
    // =================================================


    console.log(
        "REPORT SUMMARY",
        {
            employees:
            data.length,

            present:
            totalPresent,

            absent:
            totalAbsent,

            late:
            totalLate,

            leave:
            totalLeave
        }
    );


}





// =====================================================
// TABLE RENDER
// =====================================================


function renderReport(data){


    let table =
    document.getElementById(
        "reportTableBody"
    );



    // Safety check

    if(!table){

        console.error(
            "reportTableBody not found in HTML"
        );

        return;

    }



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



    let table =
    document.getElementById(
        "reportTableBody"
    );



    if(table){

        table.innerHTML=`

            <tr>

                <td colspan="8">

                    Generate report to view data

                </td>

            </tr>

        `;

    }


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



    const fromInput =
    document.getElementById(
        "reportFromDate"
    );


    const toInput =
    document.getElementById(
        "reportToDate"
    );



    if(fromInput){

        fromInput.value =
        formatDate(first);

    }



    if(toInput){

        toInput.value =
        formatDate(today);

    }


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



        // =================================================
        // AUTO GENERATE
        // =================================================


        generateReport();


    }

);
