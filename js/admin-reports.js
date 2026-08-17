// =====================================================
// MODERN TEAMS HRMS
// ADMIN REPORT ENGINE
// FINAL ATTENDANCE + PAYROLL REPORT
// =====================================================
//
// FINAL RULES
//
// Present          = 0 deduction
// Half Day         = 0.5 deduction
// Absent           = 1 deduction
// Approved Leave   = 1 deduction
// Holiday          = 0 deduction
// Sunday           = 0 deduction
//
// Monthly Payroll Base = 30 Points
//
// Payroll = 30
//           - (Half Day × 0.5)
//           - Absent
//           - Approved Leave
//
// REPORT DOES NOT USE:
// - Working Hours
// - Attendance Percentage
//
// =====================================================


let reportData = [];

let holidaysData = [];


// =====================================================
// DATE HELPERS
// =====================================================


function formatDate(date){

    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            date.getDate()
        ).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


function parseDate(value){

    if(!value){

        return null;

    }


    const parts =
        String(value)
            .substring(0, 10)
            .split("-");


    if(parts.length !== 3){

        return new Date(value);

    }


    return new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    );

}


function normalizeDate(value){

    if(!value){

        return null;

    }


    return String(value)
        .substring(0, 10);

}


// =====================================================
// GET CALENDAR DAYS
// =====================================================
//
// Sunday and Holiday are NOT working days.
//
// Therefore:
// Sunday = 0 deduction
// Holiday = 0 deduction
//
// =====================================================


function getWorkingDays(
    from,
    to,
    holidays
){

    const days = [];


    let current =
        parseDate(from);


    const end =
        parseDate(to);


    while(
        current &&
        end &&
        current <= end
    ){

        const date =
            formatDate(current);


        const day =
            current.getDay();


        const isSunday =
            day === 0;


        const isHoliday =
            holidays.includes(date);


        if(
            !isSunday &&
            !isHoliday
        ){

            days.push(date);

        }


        current.setDate(
            current.getDate() + 1
        );

    }


    return days;

}


// =====================================================
// ATTENDANCE STATUS
// =====================================================
//
// FINAL STATUS RULE
//
// >= 6 hours       = Present
// 3 - <6 hours     = Half Day
// <3 hours         = Absent
//
// If check-in exists but checkout is missing:
// Present temporarily.
//
// Existing explicit Half Day / Absent status
// is respected.
//
// =====================================================


function getAttendanceStatus(att){

    if(!att){

        return "Absent";

    }


    const existingStatus =
        String(
            att.status || ""
        )
        .trim()
        .toLowerCase();


    // Explicit Half Day

    if(
        existingStatus === "half day" ||
        existingStatus === "halfday"
    ){

        return "Half Day";

    }


    // Explicit Absent

    if(
        existingStatus === "absent"
    ){

        return "Absent";

    }


    // No Check In

    if(!att.check_in){

        return "Absent";

    }


    // Check In exists but Check Out missing

    if(!att.check_out){

        return "Present";

    }


    // Calculate working hours only for determining status.
    // Working hours are NOT displayed in the report.

    const start =
        new Date(att.check_in);


    const end =
        new Date(att.check_out);


    if(
        isNaN(start.getTime()) ||
        isNaN(end.getTime())
    ){

        return "Present";

    }


    const milliseconds =
        end.getTime() -
        start.getTime();


    if(milliseconds < 0){

        return "Present";

    }


    const hours =
        milliseconds /
        (1000 * 60 * 60);


    // Present

    if(hours >= 6){

        return "Present";

    }


    // Half Day

    if(hours >= 3){

        return "Half Day";

    }


    // Absent

    return "Absent";

}


// =====================================================
// LATE CHECK
// =====================================================
//
// Late after 09:30 AM
//
// =====================================================


function isLateCheckIn(
    checkIn,
    attendanceDate
){

    if(!checkIn){

        return false;

    }


    const checkInDate =
        new Date(checkIn);


    if(
        isNaN(
            checkInDate.getTime()
        )
    ){

        return false;

    }


    const officeStart =
        parseDate(
            attendanceDate
        );


    if(!officeStart){

        return false;

    }


    officeStart.setHours(
        9,
        30,
        0,
        0
    );


    return (
        checkInDate >
        officeStart
    );

}


// =====================================================
// APPROVED LEAVE CHECK
// =====================================================


function isEmployeeOnLeave(
    employeeId,
    date,
    leaves
){

    return leaves.some(
        leave => {

            if(
                String(
                    leave.employee_id
                )
                !==
                String(
                    employeeId
                )
            ){

                return false;

            }


            const from =
                normalizeDate(
                    leave.from_date
                );


            const to =
                normalizeDate(
                    leave.to_date
                );


            if(
                !from ||
                !to
            ){

                return false;

            }


            return (
                date >= from &&
                date <= to
            );

        }
    );

}


// =====================================================
// LOAD REPORT
// =====================================================


async function generateReport(){

    try{

        const fromDate =
            document.getElementById(
                "reportFromDate"
            )?.value;


        const toDate =
            document.getElementById(
                "reportToDate"
            )?.value;


        const department =
            document.getElementById(
                "reportDepartment"
            )?.value || "";


        const employeeId =
            document.getElementById(
                "reportEmployee"
            )?.value || "";


        // =================================================
        // VALIDATE DATE
        // =================================================


        if(
            !fromDate ||
            !toDate
        ){

            alert(
                "Please select From Date and To Date."
            );

            return;

        }


        if(
            parseDate(fromDate) >
            parseDate(toDate)
        ){

            alert(
                "From Date cannot be greater than To Date."
            );

            return;

        }


        // =================================================
        // HOLIDAYS
        // =================================================


        const {
            data: holidays,
            error: holidayError
        } = await supabaseClient

            .from("holidays")

            .select("holiday_date");


        if(holidayError){

            console.error(
                "Holiday loading error:",
                holidayError
            );

            holidaysData = [];

        }
        else{

            holidaysData =
                (holidays || [])
                .map(
                    holiday =>
                        normalizeDate(
                            holiday.holiday_date
                        )
                )
                .filter(Boolean);

        }


        // =================================================
        // WORKING DAYS
        // =================================================


        const workingDays =
            getWorkingDays(
                fromDate,
                toDate,
                holidaysData
            );


        console.log(
            "Working Days:",
            workingDays.length
        );


        console.log(
            "Working Dates:",
            workingDays
        );


        // =================================================
        // EMPLOYEES
        // =================================================


        const {
            data: employees,
            error: employeeError
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
                "Unable to load employees."
            );

            return;

        }


        // =================================================
        // ATTENDANCE
        // =================================================


        const {
            data: attendance,
            error: attendanceError
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
                "Unable to load attendance data."
            );

            return;

        }


        // =================================================
        // APPROVED LEAVES
        // =================================================


        const {
            data: leaves,
            error: leaveError
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
                "Unable to load approved leave data."
            );

            return;

        }


        // =================================================
        // FILTER EMPLOYEES
        // =================================================


        let filteredEmployees =
            employees || [];


        // Department Filter

        if(department){

            filteredEmployees =
                filteredEmployees.filter(
                    employee =>
                        String(
                            employee.department || ""
                        )
                        ===
                        String(
                            department
                        )
                );

        }


        // Employee Filter

        if(employeeId){

            filteredEmployees =
                filteredEmployees.filter(
                    employee =>
                        String(
                            employee.id
                        )
                        ===
                        String(
                            employeeId
                        )
                );

        }


        // =================================================
        // BUILD REPORT
        // =================================================


        buildEmployeeReport(
            filteredEmployees,
            attendance || [],
            leaves || [],
            workingDays
        );

    }
    catch(error){

        console.error(
            "Report generation error:",
            error
        );

        alert(
            "Something went wrong while generating the report."
        );

    }

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

    reportData = [];


    employees.forEach(
        employee => {


            let present = 0;

            let halfDay = 0;

            let absent = 0;

            let leave = 0;

            let late = 0;


            // =================================================
            // DATE BY DATE
            // =================================================


            workingDays.forEach(
                date => {


                    // -----------------------------------------
                    // APPROVED LEAVE
                    // -----------------------------------------


                    const onLeave =
                        isEmployeeOnLeave(
                            employee.id,
                            date,
                            leaves
                        );


                    if(onLeave){

                        leave++;

                        return;

                    }


                    // -----------------------------------------
                    // FIND ATTENDANCE
                    // -----------------------------------------


                    const att =
                        attendance.find(
                            record =>

                                String(
                                    record.employee_id
                                )
                                ===
                                String(
                                    employee.id
                                )

                                &&

                                normalizeDate(
                                    record.attendance_date
                                )
                                ===
                                date
                        );


                    // -----------------------------------------
                    // NO ATTENDANCE
                    //
                    // No check-in / no attendance:
                    // Absent
                    // -----------------------------------------


                    if(!att){

                        absent++;

                        return;

                    }


                    // -----------------------------------------
                    // STATUS
                    // -----------------------------------------


                    const status =
                        getAttendanceStatus(
                            att
                        );


                    // -----------------------------------------
                    // PRESENT
                    // -----------------------------------------


                    if(
                        status === "Present"
                    ){

                        present++;

                    }


                    // -----------------------------------------
                    // HALF DAY
                    // -----------------------------------------


                    else if(
                        status === "Half Day"
                    ){

                        halfDay++;

                    }


                    // -----------------------------------------
                    // ABSENT
                    // -----------------------------------------


                    else{

                        absent++;

                    }


                    // -----------------------------------------
                    // LATE
                    // -----------------------------------------


                    if(
                        isLateCheckIn(
                            att.check_in,
                            date
                        )
                    ){

                        late++;

                    }

                }
            );


            // =================================================
            // PAYROLL
            // =================================================
            //
            // Base = 30
            //
            // Present       = 0
            // Half Day      = 0.5
            // Absent        = 1
            // Approved Leave= 1
            // Holiday       = 0
            // Sunday        = 0
            //
            // =================================================


            const monthlyBase =
                30;


            const halfDayDeduction =
                halfDay * 0.5;


            const absentDeduction =
                absent;


            const leaveDeduction =
                leave;


            const totalDeduction =
                halfDayDeduction +
                absentDeduction +
                leaveDeduction;


            let payroll =
                monthlyBase -
                totalDeduction;


            // Never below zero

            if(payroll < 0){

                payroll = 0;

            }


            payroll =
                Number(
                    payroll.toFixed(2)
                );


            // =================================================
            // PUSH REPORT DATA
            // =================================================


            reportData.push({

                employee:
                    employee,

                workingDays:
                    workingDays.length,

                present:
                    present,

                halfDay:
                    halfDay,

                absent:
                    absent,

                leave:
                    leave,

                late:
                    late,

                payroll:
                    payroll

            });

        }
    );


    console.log(
        "FINAL REPORT:",
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
// SUMMARY
// =====================================================


function calculateSummary(data){

    const totalEmployees =
        document.getElementById(
            "totalEmployees"
        );


    if(totalEmployees){

        totalEmployees.innerText =
            data.length;

    }


    let present = 0;

    let halfDay = 0;

    let absent = 0;

    let leave = 0;

    let late = 0;


    data.forEach(
        item => {

            present +=
                item.present;

            halfDay +=
                item.halfDay;

            absent +=
                item.absent;

            leave +=
                item.leave;

            late +=
                item.late;

        }
    );


    const presentCount =
        document.getElementById(
            "presentCount"
        );


    if(presentCount){

        presentCount.innerText =
            present;

    }


    const halfDayCount =
        document.getElementById(
            "halfDayCount"
        );


    if(halfDayCount){

        halfDayCount.innerText =
            halfDay;

    }


    const absentCount =
        document.getElementById(
            "absentCount"
        );


    if(absentCount){

        absentCount.innerText =
            absent;

    }


    const leaveCount =
        document.getElementById(
            "leaveCount"
        );


    if(leaveCount){

        leaveCount.innerText =
            leave;

    }


    const lateCount =
        document.getElementById(
            "lateCount"
        );


    if(lateCount){

        lateCount.innerText =
            late;

    }

}


// =====================================================
// RENDER REPORT TABLE
// =====================================================
//
// Columns:
//
// Employee
// Department
// Working Days
// Present
// Half Day
// Absent
// On Leave
// Late
// Payroll Points
//
// NO:
// Working Hours
// Attendance %
//
// =====================================================


function renderReport(data){

    const table =
        document.getElementById(
            "reportTableBody"
        );


    if(!table){

        console.error(
            "reportTableBody not found."
        );

        return;

    }


    if(!data.length){

        table.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    style="text-align:center;"
                >

                    No Report Found

                </td>

            </tr>

        `;

        return;

    }


    let html = "";


    data.forEach(
        item => {


            html += `

                <tr>

                    <td>

                        <strong>

                            ${
                                item.employee.full_name
                            }

                        </strong>

                    </td>


                    <td>

                        ${
                            item.employee.department ||
                            "-"
                        }

                    </td>


                    <td>

                        ${
                            item.workingDays
                        }

                    </td>


                    <td>

                        ${
                            item.present
                        }

                    </td>


                    <td>

                        ${
                            item.halfDay
                        }

                    </td>


                    <td>

                        ${
                            item.absent
                        }

                    </td>


                    <td>

                        ${
                            item.leave
                        }

                    </td>


                    <td>

                        ${
                            item.late
                        }

                    </td>


                    <td>

                        <strong>

                            ${
                                item.payroll
                            }

                        </strong>

                    </td>

                </tr>

            `;

        }
    );


    table.innerHTML =
        html;

}


// =====================================================
// EXCEL EXPORT
// =====================================================


function exportExcel(){

    if(!reportData.length){

        alert(
            "Generate report first."
        );

        return;

    }


    const excelData =
        reportData.map(
            item => ({

                Employee:
                    item.employee.full_name,

                Department:
                    item.employee.department || "-",

                Working_Days:
                    item.workingDays,

                Present:
                    item.present,

                Half_Day:
                    item.halfDay,

                Absent:
                    item.absent,

                Approved_Leave:
                    item.leave,

                Late:
                    item.late,

                Payroll_Points:
                    item.payroll

            })
        );


    const sheet =
        XLSX.utils.json_to_sheet(
            excelData
        );


    const workbook =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        workbook,
        sheet,
        "Payroll Report"
    );


    XLSX.writeFile(
        workbook,
        "Modern_Teams_Payroll_Report.xlsx"
    );

}


// =====================================================
// PDF EXPORT
// =====================================================


function exportPDF(){

    if(!reportData.length){

        alert(
            "Generate report first."
        );

        return;

    }


    if(
        !window.jspdf ||
        !window.jspdf.jsPDF
    ){

        alert(
            "PDF library is not loaded."
        );

        return;

    }


    const {
        jsPDF
    } = window.jspdf;


    const doc =
        new jsPDF(
            "landscape"
        );


    doc.text(
        "Modern Teams HRMS Payroll Report",
        14,
        15
    );


    const rows =
        reportData.map(
            item => [

                item.employee.full_name,

                item.employee.department || "-",

                item.workingDays,

                item.present,

                item.halfDay,

                item.absent,

                item.leave,

                item.late,

                item.payroll

            ]
        );


    doc.autoTable({

        startY: 25,

        head: [[

            "Employee",

            "Department",

            "Working Days",

            "Present",

            "Half Day",

            "Absent",

            "On Leave",

            "Late",

            "Payroll Points"

        ]],

        body:
            rows

    });


    doc.save(
        "Modern_Teams_Payroll_Report.pdf"
    );

}


// =====================================================
// PRINT REPORT
// =====================================================


function printReport(){

    if(!reportData.length){

        alert(
            "Generate report first."
        );

        return;

    }


    window.print();

}


// =====================================================
// RESET FILTER
// =====================================================


function resetReport(){

    const inputs =
        document.querySelectorAll(
            ".filter-card input"
        );


    inputs.forEach(
        input => {

            input.value = "";

        }
    );


    const selects =
        document.querySelectorAll(
            ".filter-card select"
        );


    selects.forEach(
        select => {

            select.value = "";

        }
    );


    reportData = [];


    const table =
        document.getElementById(
            "reportTableBody"
        );


    if(table){

        table.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    style="text-align:center;"
                >

                    Generate report to view data

                </td>

            </tr>

        `;

    }


    setDefaultDates();

}


// =====================================================
// DEFAULT DATES
// =====================================================


function setDefaultDates(){

    const today =
        new Date();


    const firstDay =
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
            formatDate(
                firstDay
            );

    }


    if(toInput){

        toInput.value =
            formatDate(
                today
            );

    }

}


// =====================================================
// LOAD REPORT FILTERS
// =====================================================


async function loadReportFilters(){

    try{

        const {
            data: employees,
            error
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
            )

            .order(
                "full_name",
                {
                    ascending: true
                }
            );


        if(error){

            console.error(
                "Report filter loading error:",
                error
            );

            return;

        }


        const departmentSelect =
            document.getElementById(
                "reportDepartment"
            );


        const employeeSelect =
            document.getElementById(
                "reportEmployee"
            );


        // =================================================
        // DEPARTMENT FILTER
        // =================================================


        if(departmentSelect){

            const departments =
                [
                    ...new Set(
                        (employees || [])
                            .map(
                                employee =>
                                    employee.department
                            )
                            .filter(Boolean)
                    )
                ]
                .sort();


            departmentSelect.innerHTML = `

                <option value="">
                    All Departments
                </option>

            `;


            departments.forEach(
                department => {

                    const option =
                        document.createElement(
                            "option"
                        );


                    option.value =
                        department;


                    option.textContent =
                        department;


                    departmentSelect.appendChild(
                        option
                    );

                }
            );

        }


        // =================================================
        // EMPLOYEE FILTER
        // =================================================


        if(employeeSelect){

            employeeSelect.innerHTML = `

                <option value="">
                    All Employees
                </option>

            `;


            (employees || [])
                .forEach(
                    employee => {

                        const option =
                            document.createElement(
                                "option"
                            );


                        option.value =
                            employee.id;


                        option.textContent =
                            employee.full_name;


                        employeeSelect.appendChild(
                            option
                        );

                    }
                );

        }

    }
    catch(error){

        console.error(
            "Filter loading error:",
            error
        );

    }

}


// =====================================================
// REPORT TYPE
// =====================================================
//
// Current report engine is designed for the
// final attendance/payroll summary.
//
// The existing Report Type dropdown can remain,
// but all report types currently use the same
// date-range summary.
//
// =====================================================


// =====================================================
// EVENTS
// =====================================================


document.addEventListener(
    "DOMContentLoaded",
    async () => {


        // Default date range

        setDefaultDates();


        // Load filters

        await loadReportFilters();


        // Generate

        document
            .getElementById(
                "generateReportBtn"
            )
            ?.addEventListener(
                "click",
                generateReport
            );


        // Excel

        document
            .getElementById(
                "exportExcelBtn"
            )
            ?.addEventListener(
                "click",
                exportExcel
            );


        // PDF

        document
            .getElementById(
                "exportPdfBtn"
            )
            ?.addEventListener(
                "click",
                exportPDF
            );


        // Print

        document
            .getElementById(
                "printReportBtn"
            )
            ?.addEventListener(
                "click",
                printReport
            );


        // Reset

        document
            .getElementById(
                "resetReportBtn"
            )
            ?.addEventListener(
                "click",
                resetReport
            );


        // Auto generate

        await generateReport();

    }
);
