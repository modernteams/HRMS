// =====================================================
// MODERN TEAMS HRMS
// ADMIN PAYROLL ENGINE
// =====================================================
//
// FINAL PAYROLL RULES
//
// Monthly Base = 30 Points
//
// Present  = 0 deduction
// Half Day = 0.5 deduction
// Absent   = 1 deduction
//
// Late      = No deduction
// Sunday    = No deduction
// Holiday   = No deduction
// Leave     = No deduction
//
// 30-day month = Base 30
// 31-day month = Base 30
//
// =====================================================


let payrollData = [];

let employeesData = [];


// =====================================================
// CONSTANTS
// =====================================================

const MONTHLY_BASE_POINTS = 30;

const HALF_DAY_DEDUCTION = 0.5;

const ABSENT_DEDUCTION = 1;


// =====================================================
// DATE HELPERS
// =====================================================

function normalizeDate(value) {

    if (!value) {
        return null;
    }

    return String(value).substring(0, 10);

}


function getMonthStart(monthValue) {

    return `${monthValue}-01`;

}


function getMonthEnd(monthValue) {

    const [year, month] =
        monthValue.split("-").map(Number);

    const lastDay =
        new Date(
            year,
            month,
            0
        ).getDate();

    return `${monthValue}-${String(lastDay).padStart(2, "0")}`;

}


function isSunday(dateString) {

    const date =
        new Date(
            `${dateString}T00:00:00`
        );

    return date.getDay() === 0;

}


// =====================================================
// LOAD EMPLOYEES
// =====================================================

async function loadEmployees() {

    const {
        data,
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


    if (error) {

        console.error(
            "Employee Fetch Error:",
            error
        );

        return;

    }


    employeesData =
        data || [];


    populateEmployeeDropdown();

}


// =====================================================
// EMPLOYEE DROPDOWN
// =====================================================

function populateEmployeeDropdown() {

    const select =
        document.getElementById(
            "payrollEmployee"
        );


    if (!select) {
        return;
    }


    select.innerHTML = `

        <option value="">
            All Employees
        </option>

    `;


    employeesData.forEach(
        employee => {

            select.innerHTML += `

                <option value="${employee.id}">

                    ${employee.full_name}

                </option>

            `;

        }
    );

}


// =====================================================
// GET ATTENDANCE STATUS
// =====================================================
//
// Payroll calculation deliberately uses
// attendance records only.
//
// Existing attendance engine rules:
//
// >= 6 hours       Present
// 3 - <6 hours     Half Day
// < 3 hours        Absent
//
// =====================================================

function getAttendanceStatus(att) {

    if (!att) {

        return "Absent";

    }


    const status =
        String(
            att.status || ""
        )
        .trim()
        .toLowerCase();


    if (
        status === "half day" ||
        status === "halfday"
    ) {

        return "Half Day";

    }


    if (status === "absent") {

        return "Absent";

    }


    if (status === "present") {

        return "Present";

    }


    if (status === "holiday") {

        return "Holiday";

    }


    if (
        status === "week off" ||
        status === "weekoff"
    ) {

        return "Week Off";

    }


    if (
        status === "on leave" ||
        status === "leave"
    ) {

        return "On Leave";

    }


    // -------------------------------------------------
    // FALLBACK
    // -------------------------------------------------

    if (!att.check_in) {

        return "Absent";

    }


    if (
        att.check_in &&
        !att.check_out
    ) {

        // Existing attendance record
        // without checkout is not forcefully
        // deducted here.
        //
        // Manager can correct attendance later.

        return "Present";

    }


    const start =
        new Date(
            att.check_in
        );


    const end =
        new Date(
            att.check_out
        );


    if (
        isNaN(start.getTime()) ||
        isNaN(end.getTime())
    ) {

        return "Absent";

    }


    const hours =
        (
            end - start
        ) / 3600000;


    if (hours >= 6) {

        return "Present";

    }


    if (
        hours >= 3 &&
        hours < 6
    ) {

        return "Half Day";

    }


    return "Absent";

}


// =====================================================
// GENERATE PAYROLL
// =====================================================

async function generatePayroll() {

    const month =
        document.getElementById(
            "payrollMonth"
        )?.value;


    const employeeId =
        document.getElementById(
            "payrollEmployee"
        )?.value || "";


    if (!month) {

        alert(
            "Please select a month"
        );

        return;

    }


    const fromDate =
        getMonthStart(month);


    const toDate =
        getMonthEnd(month);


    console.log(
        "Payroll Period:",
        fromDate,
        toDate
    );


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


    if (attendanceError) {

        console.error(
            "Attendance Error:",
            attendanceError
        );

        alert(
            "Unable to load attendance"
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

        .select("*")

        .gte(
            "holiday_date",
            fromDate
        )

        .lte(
            "holiday_date",
            toDate
        );


    if (holidayError) {

        console.error(
            "Holiday Error:",
            holidayError
        );

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


    if (leaveError) {

        console.error(
            "Leave Error:",
            leaveError
        );

    }


    const attendanceData =
        attendance || [];


    const holidayData =
        holidays || [];


    const leaveData =
        leaves || [];


    // =================================================
    // EMPLOYEE FILTER
    // =================================================

    let selectedEmployees =
        [...employeesData];


    if (employeeId) {

        selectedEmployees =
            selectedEmployees.filter(
                employee =>
                    String(employee.id) ===
                    String(employeeId)
            );

    }


    // =================================================
    // BUILD PAYROLL
    // =================================================

    payrollData = [];


    selectedEmployees.forEach(
        employee => {


            let present = 0;

            let halfDay = 0;

            let absent = 0;

            let weekOff = 0;

            let holiday = 0;

            let leave = 0;


            // ------------------------------------------------
            // GET ATTENDANCE FOR EMPLOYEE
            // ------------------------------------------------

            const employeeAttendance =
                attendanceData.filter(
                    att =>
                        String(
                            att.employee_id
                        ) ===
                        String(
                            employee.id
                        )
                );


            // ------------------------------------------------
            // MONTH CALENDAR
            // ------------------------------------------------

            const [
                year,
                monthNumber
            ] =
                month
                .split("-")
                .map(Number);


            const daysInMonth =
                new Date(
                    year,
                    monthNumber,
                    0
                ).getDate();


            for (
                let day = 1;
                day <= daysInMonth;
                day++
            ) {


                const date =
                    `${month}-${String(day).padStart(2, "0")}`;


                // ============================================
                // SUNDAY
                // ============================================

                if (
                    isSunday(date)
                ) {

                    weekOff++;

                    continue;

                }


                // ============================================
                // HOLIDAY
                // ============================================

                const isHoliday =
                    holidayData.some(
                        h =>
                            normalizeDate(
                                h.holiday_date
                            ) === date
                    );


                if (isHoliday) {

                    holiday++;

                    continue;

                }


                // ============================================
                // APPROVED LEAVE
                // ============================================

                const isLeave =
                    leaveData.some(
                        leave => {

                            if (
                                String(
                                    leave.employee_id
                                ) !==
                                String(
                                    employee.id
                                )
                            ) {

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


                            return (
                                date >= from &&
                                date <= to
                            );

                        }
                    );


                if (isLeave) {

                    leave++;

                    continue;

                }


                // ============================================
                // ATTENDANCE
                // ============================================

                const att =
                    employeeAttendance.find(
                        record =>
                            normalizeDate(
                                record.attendance_date
                            ) === date
                    );


                const status =
                    getAttendanceStatus(
                        att
                    );


                switch (status) {

                    case "Present":

                        present++;

                        break;


                    case "Half Day":

                        halfDay++;

                        break;


                    case "Absent":

                        absent++;

                        break;


                    case "Holiday":

                        holiday++;

                        break;


                    case "Week Off":

                        weekOff++;

                        break;


                    case "On Leave":

                        leave++;

                        break;


                    default:

                        absent++;

                        break;

                }

            }


            // =================================================
            // PAYROLL CALCULATION
            // =================================================

            const halfDayDeduction =
                halfDay *
                HALF_DAY_DEDUCTION;


            const absentDeduction =
                absent *
                ABSENT_DEDUCTION;


            const totalDeduction =
                halfDayDeduction +
                absentDeduction;


            let finalPoints =
                MONTHLY_BASE_POINTS -
                totalDeduction;


            if (finalPoints < 0) {

                finalPoints = 0;

            }


            finalPoints =
                Number(
                    finalPoints.toFixed(2)
                );


            payrollData.push({

                employee,

                workingDays:
                    daysInMonth -
                    weekOff -
                    holiday -
                    leave,

                present,

                halfDay,

                absent,

                weekOff,

                holiday,

                leave,

                basePoints:
                    MONTHLY_BASE_POINTS,

                deduction:
                    Number(
                        totalDeduction.toFixed(2)
                    ),

                finalPoints

            });

        }
    );


    renderPayroll();

    calculatePayrollSummary();

}


// =====================================================
// RENDER PAYROLL
// =====================================================

function renderPayroll() {

    const table =
        document.getElementById(
            "payrollTableBody"
        );


    if (!table) {

        return;

    }


    if (
        !payrollData.length
    ) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="12"
                    class="no-data"
                >

                    No payroll data found

                </td>

            </tr>

        `;

        return;

    }


    let html = "";


    payrollData.forEach(
        item => {


            let pointClass =
                "points-good";


            if (
                item.finalPoints < 25
            ) {

                pointClass =
                    "points-danger";

            }
            else if (
                item.finalPoints < 28
            ) {

                pointClass =
                    "points-warning";

            }


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

                        ${item.workingDays}

                    </td>


                    <td>

                        ${item.present}

                    </td>


                    <td>

                        ${item.halfDay}

                    </td>


                    <td>

                        ${item.absent}

                    </td>


                    <td>

                        ${item.weekOff}

                    </td>


                    <td>

                        ${item.holiday}

                    </td>


                    <td>

                        ${item.leave}

                    </td>


                    <td>

                        <strong>

                            ${item.basePoints}

                        </strong>

                    </td>


                    <td>

                        <strong class="deduction">

                            -${item.deduction}

                        </strong>

                    </td>


                    <td>

                        <strong
                            class="payroll-points ${pointClass}"
                        >

                            ${item.finalPoints}

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
// SUMMARY
// =====================================================

function calculatePayrollSummary() {

    const employeeCount =
        payrollData.length;


    let totalHalfDay = 0;

    let totalAbsent = 0;

    let totalPoints = 0;


    payrollData.forEach(
        item => {

            totalHalfDay +=
                item.halfDay;

            totalAbsent +=
                item.absent;

            totalPoints +=
                item.finalPoints;

        }
    );


    const averagePoints =
        employeeCount > 0
            ? (
                totalPoints /
                employeeCount
            ).toFixed(2)
            : "30";


    document.getElementById(
        "payrollEmployeeCount"
    ).innerText =
        employeeCount;


    document.getElementById(
        "payrollHalfDayCount"
    ).innerText =
        totalHalfDay;


    document.getElementById(
        "payrollAbsentCount"
    ).innerText =
        totalAbsent;


    document.getElementById(
        "payrollAveragePoints"
    ).innerText =
        averagePoints;

}


// =====================================================
// RESET
// =====================================================

function resetPayroll() {

    const month =
        document.getElementById(
            "payrollMonth"
        );


    const employee =
        document.getElementById(
            "payrollEmployee"
        );


    if (month) {

        month.value = "";

    }


    if (employee) {

        employee.value = "";

    }


    payrollData = [];


    document.getElementById(
        "payrollEmployeeCount"
    ).innerText =
        "0";


    document.getElementById(
        "payrollHalfDayCount"
    ).innerText =
        "0";


    document.getElementById(
        "payrollAbsentCount"
    ).innerText =
        "0";


    document.getElementById(
        "payrollAveragePoints"
    ).innerText =
        "30";


    document.getElementById(
        "payrollTableBody"
    ).innerHTML = `

        <tr>

            <td
                colspan="12"
                class="no-data"
            >

                Select a month and generate payroll

            </td>

        </tr>

    `;

}


// =====================================================
// EXPORT EXCEL
// =====================================================

function exportPayroll() {

    if (
        !payrollData.length
    ) {

        alert(
            "Generate payroll first"
        );

        return;

    }


    if (
        typeof XLSX === "undefined"
    ) {

        alert(
            "Excel library not loaded"
        );

        return;

    }


    const excelData =
        payrollData.map(
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

                Week_Off:
                    item.weekOff,

                Holiday:
                    item.holiday,

                Approved_Leave:
                    item.leave,

                Monthly_Base:
                    item.basePoints,

                Deduction:
                    item.deduction,

                Final_Payroll_Points:
                    item.finalPoints

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
        "Monthly Payroll"
    );


    const month =
        document.getElementById(
            "payrollMonth"
        )?.value ||
        "Payroll";


    XLSX.writeFile(
        workbook,
        `Modern_Teams_Payroll_${month}.xlsx`
    );

}


// =====================================================
// DEFAULT MONTH
// =====================================================

function setDefaultPayrollMonth() {

    const input =
        document.getElementById(
            "payrollMonth"
        );


    if (!input) {

        return;

    }


    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    input.value =
        `${year}-${month}`;

}


// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {


        setDefaultPayrollMonth();


        await loadEmployees();


        document
            .getElementById(
                "generatePayrollBtn"
            )
            ?.addEventListener(
                "click",
                generatePayroll
            );


        document
            .getElementById(
                "resetPayrollBtn"
            )
            ?.addEventListener(
                "click",
                resetPayroll
            );


        document
            .getElementById(
                "exportPayrollBtn"
            )
            ?.addEventListener(
                "click",
                exportPayroll
            );


        // Employee change
        document
            .getElementById(
                "payrollEmployee"
            )
            ?.addEventListener(
                "change",
                generatePayroll
            );


        // Auto generate current month
        await generatePayroll();

    }
);
