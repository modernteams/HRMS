// =====================================================
// MODERN TEAMS HRMS
// ADMIN ATTENDANCE SYSTEM
// =====================================================
//
// FINAL ATTENDANCE RULES
//
// >= 6 hours       -> Present
// 3 to < 6 hours   -> Half Day
// < 3 hours        -> Absent
//
// Check-in > 09:30 -> Late indicator
//
// Sunday           -> Week Off
// Holiday          -> Holiday
// Approved Leave   -> On Leave
//
// IMPORTANT
// -----------------------------------------------------
// Check-in without checkout = Present temporarily
// Checkout ke baad working-hours rule final status
// determine karega.
//
// Employees without attendance record bhi table me dikhenge.
// =====================================================


let attendanceData = [];

let employeeData = [];

let leaveData = [];

let holidayData = [];

let breakData = [];


// =====================================================
// DATE HELPERS
// =====================================================


function normalizeDate(value) {

    if (!value) {
        return null;
    }

    return String(value).substring(0, 10);

}


function getTodayDate() {

    const now = new Date();

    const year = now.getFullYear();

    const month = String(
        now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        now.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


function isSunday(dateString) {

    if (!dateString) {
        return false;
    }

    const date = new Date(
        `${dateString}T00:00:00`
    );

    return date.getDay() === 0;

}


// =====================================================
// FORMAT TIME
// =====================================================


function formatTime(time) {

    if (!time) {
        return "-";
    }

    const date = new Date(time);

    if (isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleTimeString(
        "en-IN",
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }
    );

}


// =====================================================
// STATUS CLASS
// =====================================================


function getStatusClass(status) {

    switch (status) {

        case "Present":
            return "status-present";

        case "Absent":
            return "status-absent";

        case "Half Day":
            return "status-halfday";

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


// =====================================================
// ACTIVITY CLASS
// =====================================================


function getActivityClass(activity) {

    switch (activity) {

        case "Working":
            return "activity-working";

        case "On Break":
            return "activity-break";

        case "Completed":
            return "activity-completed";

        case "On Leave":
            return "activity-leave";

        default:
            return "";

    }

}


// =====================================================
// WORKING HOURS CALCULATION
// =====================================================


function calculateWorkingMinutes(att) {

    if (!att || !att.check_in) {
        return null;
    }

    const start =
        new Date(att.check_in);

    if (isNaN(start.getTime())) {
        return null;
    }


    // -------------------------------------------------
    // Checkout exists
    // -------------------------------------------------

    let end;

    if (att.check_out) {

        end =
            new Date(att.check_out);

    }

    // -------------------------------------------------
    // No checkout
    // Live calculation
    // -------------------------------------------------

    else {

        end = new Date();

    }


    if (isNaN(end.getTime())) {
        return null;
    }


    let minutes =
        Math.floor(
            (end - start) / 60000
        );


    if (minutes < 0) {
        minutes = 0;
    }


    // -------------------------------------------------
    // BREAK DEDUCTION
    // -------------------------------------------------

    let breakMinutes = 0;


    const attendanceDate =
        normalizeDate(
            att.attendance_date
        );


    const employeeBreaks =
        breakData.filter(
            b =>
                String(b.employee_id) ===
                String(att.employee_id)
                &&
                normalizeDate(
                    b.attendance_date
                ) === attendanceDate
        );


    employeeBreaks.forEach(
        breakItem => {

            if (
                breakItem.duration_minutes !== null &&
                breakItem.duration_minutes !== undefined
            ) {

                breakMinutes +=
                    Number(
                        breakItem.duration_minutes
                    );

            }

            else if (
                breakItem.start_time &&
                !breakItem.end_time
            ) {

                const breakStart =
                    new Date(
                        breakItem.start_time
                    );

                if (
                    !isNaN(
                        breakStart.getTime()
                    )
                ) {

                    breakMinutes +=
                        Math.floor(
                            (
                                new Date() -
                                breakStart
                            ) / 60000
                        );

                }

            }

        }
    );


    minutes -= breakMinutes;


    if (minutes < 0) {
        minutes = 0;
    }


    return minutes;

}


// =====================================================
// WORKING HOURS VALUE
// =====================================================


function calculateWorkingHoursValue(att) {

    const minutes =
        calculateWorkingMinutes(
            att
        );

    if (minutes === null) {
        return null;
    }

    return minutes / 60;

}


// =====================================================
// WORKING HOURS DISPLAY
// =====================================================


function calculateLiveWorkingHours(att) {

    const minutes =
        calculateWorkingMinutes(
            att
        );

    if (minutes === null) {
        return "-";
    }


    const hours =
        Math.floor(
            minutes / 60
        );

    const mins =
        minutes % 60;


    return `${hours}h ${mins}m`;

}


// =====================================================
// LEAVE CHECK
// =====================================================


function employeeHasLeave(
    employeeId,
    attendanceDate
) {

    return leaveData.some(
        leave => {

            if (
                String(
                    leave.employee_id
                )
                !==
                String(
                    employeeId
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
                attendanceDate >= from &&
                attendanceDate <= to
            );

        }
    );

}


// =====================================================
// HOLIDAY CHECK
// =====================================================


function dateIsHoliday(
    attendanceDate
) {

    return holidayData.some(
        holiday =>
            normalizeDate(
                holiday.holiday_date
            )
            ===
            attendanceDate
    );

}


// =====================================================
// FIND ATTENDANCE RECORD
// =====================================================


function findAttendance(
    employeeId,
    attendanceDate
) {

    return attendanceData.find(
        att =>

            String(
                att.employee_id
            )
            ===
            String(
                employeeId
            )

            &&

            normalizeDate(
                att.attendance_date
            )
            ===
            attendanceDate
    );

}


// =====================================================
// LATE CHECK
// =====================================================


function isLateCheckIn(
    checkIn,
    attendanceDate
) {

    if (!checkIn) {
        return false;
    }


    const checkInDate =
        new Date(checkIn);


    if (
        isNaN(
            checkInDate.getTime()
        )
    ) {

        return false;

    }


    const officeStart =
        new Date(
            `${normalizeDate(
                attendanceDate
            )}T09:30:00`
        );


    return (
        checkInDate >
        officeStart
    );

}


// =====================================================
// ATTENDANCE STATUS
// =====================================================
//
// IMPORTANT:
//
// 1. Leave
// 2. Holiday
// 3. Sunday
// 4. No check-in = Absent
// 5. Check-in without checkout = Present
// 6. Checkout + hours calculation
//
// =====================================================


function calculateAttendanceStatus(att) {

    const attendanceDate =
        normalizeDate(
            att.attendance_date
        );


    // -------------------------------------------------
    // APPROVED LEAVE
    // -------------------------------------------------

    if (
        att.isOnLeave
    ) {

        return "On Leave";

    }


    // -------------------------------------------------
    // HOLIDAY
    // -------------------------------------------------

    if (
        att.isHoliday
    ) {

        return "Holiday";

    }


    // -------------------------------------------------
    // SUNDAY
    // -------------------------------------------------

    if (
        isSunday(
            attendanceDate
        )
    ) {

        return "Week Off";

    }


    // -------------------------------------------------
    // NO CHECK-IN
    // -------------------------------------------------

    if (
        !att.check_in
    ) {

        return "Absent";

    }


    // -------------------------------------------------
    // CHECK-IN EXISTS
    // BUT CHECKOUT MISSING
    // -------------------------------------------------
    //
    // Employee is currently working.
    //
    // Therefore immediately Present.
    //
    // This fixes:
    //
    // Check In 09:20
    // Check Out NULL
    //
    // => Present
    //
    // -------------------------------------------------

    if (
        !att.check_out
    ) {

        return "Present";

    }


    // -------------------------------------------------
    // CHECKOUT EXISTS
    // CALCULATE HOURS
    // -------------------------------------------------

    const hours =
        calculateWorkingHoursValue(
            att
        );


    if (hours === null) {

        return "Present";

    }


    // -------------------------------------------------
    // >= 6 HOURS
    // -------------------------------------------------

    if (
        hours >= 6
    ) {

        return "Present";

    }


    // -------------------------------------------------
    // 3 TO <6 HOURS
    // -------------------------------------------------

    if (
        hours >= 3 &&
        hours < 6
    ) {

        return "Half Day";

    }


    // -------------------------------------------------
    // <3 HOURS
    // -------------------------------------------------

    if (
        hours < 3
    ) {

        return "Absent";

    }


    return "Absent";

}


// =====================================================
// ACTIVITY
// =====================================================


function getActivity(att) {

    if (
        att.isOnLeave
    ) {

        return "On Leave";

    }


    if (
        att.check_out
    ) {

        return "Completed";

    }


    if (
        att.breaks &&
        att.breaks.some(
            b => !b.end_time
        )
    ) {

        return "On Break";

    }


    if (
        att.check_in
    ) {

        return "Working";

    }


    return "Absent";

}


// =====================================================
// BREAK DETAILS
// =====================================================


function getBreakDetails(att) {

    const attendanceDate =
        normalizeDate(
            att.attendance_date
        );


    const employeeBreaks =
        breakData.filter(
            b =>

                String(
                    b.employee_id
                )
                ===
                String(
                    att.employee_id
                )

                &&

                normalizeDate(
                    b.attendance_date
                )
                ===
                attendanceDate
        );


    if (
        employeeBreaks.length === 0
    ) {

        return "-";

    }


    let html = "";


    employeeBreaks.forEach(
        breakItem => {

            let minutes =
                Number(
                    breakItem.duration_minutes || 0
                );


            if (
                breakItem.start_time &&
                !breakItem.end_time
            ) {

                const start =
                    new Date(
                        breakItem.start_time
                    );

                if (
                    !isNaN(
                        start.getTime()
                    )
                ) {

                    minutes =
                        Math.floor(
                            (
                                new Date() -
                                start
                            ) / 60000
                        );

                }

            }


            html += `
                <div class="break-item">
                    ${
                        breakItem.break_type ||
                        "Break"
                    }
                    (${minutes}m)
                </div>
            `;

        }
    );


    return html;

}


// =====================================================
// PAYROLL POINTS
// =====================================================


function getPayrollPoints(
    status
) {

    switch (status) {

        case "Present":
            return "30";

        case "Half Day":
            return "29.5";

        case "Absent":
            return "29";

        default:
            return "-";

    }

}


// =====================================================
// CREATE DAILY EMPLOYEE RECORDS
// =====================================================
//
// This is the MAIN FIX.
//
// Attendance table me sirf attendance table
// ke records nahi honge.
//
// Har employee ki row banegi.
//
// Attendance record milega to merge hoga.
// Attendance record nahi milega to Absent.
//
// Leave/holiday/week-off bhi automatically show.
//
// =====================================================


function buildDailyAttendance(
    attendanceDate
) {

    const rows = [];


    employeeData.forEach(
        employee => {

            const attendance =
                findAttendance(
                    employee.id,
                    attendanceDate
                );


            const row =
                attendance
                    ? {
                        ...attendance
                    }
                    : {
                        id: null,
                        employee_id:
                            employee.id,
                        attendance_date:
                            attendanceDate,
                        check_in: null,
                        check_out: null,
                        working_hours: null
                    };


            // -----------------------------------------
            // PROFILE
            // -----------------------------------------

            row.profiles = {
                full_name:
                    employee.full_name,

                email:
                    employee.email,

                department:
                    employee.department
            };


            // -----------------------------------------
            // LEAVE
            // -----------------------------------------

            row.isOnLeave =
                employeeHasLeave(
                    employee.id,
                    attendanceDate
                );


            // -----------------------------------------
            // HOLIDAY
            // -----------------------------------------

            row.isHoliday =
                dateIsHoliday(
                    attendanceDate
                );


            // -----------------------------------------
            // STATUS
            // -----------------------------------------

            row.computedStatus =
                calculateAttendanceStatus(
                    row
                );


            // -----------------------------------------
            // LATE
            // -----------------------------------------

            row.isLate =
                isLateCheckIn(
                    row.check_in,
                    attendanceDate
                );


            // -----------------------------------------
            // ACTIVITY
            // -----------------------------------------

            row.computedActivity =
                getActivity(
                    row
                );


            rows.push(row);

        }
    );


    return rows;

}


// =====================================================
// LOAD ALL EMPLOYEES
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
            email,
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

        employeeData = [];

        return;

    }


    employeeData =
        data || [];

}


// =====================================================
// LOAD ATTENDANCE
// =====================================================


async function loadAttendance() {

    try {

        // ---------------------------------------------
        // EMPLOYEES
        // ---------------------------------------------

        await loadEmployees();


        // ---------------------------------------------
        // ATTENDANCE
        // ---------------------------------------------

        const {
            data: attendance,
            error: attendanceError
        } = await supabaseClient

            .from("attendance")

            .select("*")

            .order(
                "attendance_date",
                {
                    ascending: false
                }
            );


        if (attendanceError) {

            console.error(
                "Attendance Fetch Error:",
                attendanceError
            );

            return;

        }


        attendanceData =
            attendance || [];


        // ---------------------------------------------
        // EMPLOYEE IDS
        // ---------------------------------------------

        const employeeIds =
            employeeData.map(
                employee =>
                    employee.id
            );


        // ---------------------------------------------
        // BREAKS
        // ---------------------------------------------

        let breakQuery =
            supabaseClient
                .from("employee_breaks")
                .select("*");


        if (
            employeeIds.length > 0
        ) {

            breakQuery =
                breakQuery.in(
                    "employee_id",
                    employeeIds
                );

        }


        // ---------------------------------------------
        // RELATED DATA
        // ---------------------------------------------

        const [
            breakRes,
            leaveRes,
            holidayRes
        ] = await Promise.all([

            breakQuery,

            supabaseClient
                .from("leave_requests")
                .select("*")
                .eq(
                    "status",
                    "Approved"
                ),

            supabaseClient
                .from("holidays")
                .select("*")

        ]);


        breakData =
            breakRes.data || [];


        leaveData =
            leaveRes.data || [];


        holidayData =
            holidayRes.data || [];


        // ---------------------------------------------
        // APPLY CURRENT FILTER
        // ---------------------------------------------

        applyAttendanceFilters();

    }
    catch (error) {

        console.error(
            "Attendance System Error:",
            error
        );

    }

}


// =====================================================
// GET SELECTED DATE
// =====================================================


function getSelectedAttendanceDate() {

    const dateInput =
        document.getElementById(
            "attendanceDate"
        );


    if (
        dateInput &&
        dateInput.value
    ) {

        return dateInput.value;

    }


    // No date selected
    // => Today

    return getTodayDate();

}


// =====================================================
// FILTER EXECUTION
// =====================================================


function applyAttendanceFilters() {

    const searchText =
        (
            document.getElementById(
                "attendanceSearch"
            )?.value || ""
        )
        .toLowerCase()
        .trim();


    const selectedDate =
        getSelectedAttendanceDate();


    const selectedDepartment =
        document.getElementById(
            "attendanceDepartment"
        )?.value || "";


    const selectedStatus =
        document.getElementById(
            "attendanceStatus"
        )?.value || "";


    // ---------------------------------------------
    // BUILD DAILY COMPLETE TABLE
    // ---------------------------------------------

    let filtered =
        buildDailyAttendance(
            selectedDate
        );


    // ---------------------------------------------
    // SEARCH
    // ---------------------------------------------

    if (
        searchText
    ) {

        filtered =
            filtered.filter(
                att =>

                    (
                        att.profiles
                        ?.full_name ||
                        ""
                    )
                    .toLowerCase()
                    .includes(
                        searchText
                    )
            );

    }


    // ---------------------------------------------
    // DEPARTMENT
    // ---------------------------------------------

    if (
        selectedDepartment
    ) {

        filtered =
            filtered.filter(
                att =>

                    att.profiles
                    ?.department
                    ===
                    selectedDepartment
            );

    }


    // ---------------------------------------------
    // STATUS
    // ---------------------------------------------

    if (
        selectedStatus
    ) {

        filtered =
            filtered.filter(
                att => {

                    let displayStatus =
                        att.computedStatus;


                    if (
                        displayStatus ===
                        "Present"
                        &&
                        att.isLate
                    ) {

                        displayStatus =
                            "Late";

                    }


                    return (
                        displayStatus ===
                        selectedStatus
                    );

                }
            );

    }


    renderAttendance(
        filtered
    );

}


// =====================================================
// RENDER ATTENDANCE TABLE
// =====================================================


function renderAttendance(
    data
) {

    const table =
        document.getElementById(
            "attendanceTableBody"
        );


    if (!table) {
        return;
    }


    if (
        !data ||
        data.length === 0
    ) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    style="text-align:center;"
                >

                    No Attendance Records Found

                </td>

            </tr>

        `;

        return;

    }


    let rows = "";


    data.forEach(
        att => {

            // -----------------------------------------
            // STATUS
            // -----------------------------------------

            const actualStatus =
                att.computedStatus ||
                calculateAttendanceStatus(
                    att
                );


            let displayStatus =
                actualStatus;


            if (
                actualStatus ===
                "Present"
                &&
                att.isLate
            ) {

                displayStatus =
                    "Late";

            }


            // -----------------------------------------
            // ACTIVITY
            // -----------------------------------------

            const activity =
                att.computedActivity ||
                getActivity(
                    att
                );


            // -----------------------------------------
            // DATE
            // -----------------------------------------

            const date =
                normalizeDate(
                    att.attendance_date
                );


            const formattedDate =
                date
                    ? new Date(
                        `${date}T00:00:00`
                    )
                    .toLocaleDateString(
                        "en-IN",
                        {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                        }
                    )
                    : "-";


            // -----------------------------------------
            // PAYROLL
            // -----------------------------------------

            const payrollPoints =
                getPayrollPoints(
                    actualStatus
                );


            // -----------------------------------------
            // ROW
            // -----------------------------------------

            rows += `

                <tr>

                    <td>

                        <strong>

                            ${
                                att.profiles
                                ?.full_name ||
                                "Unknown"
                            }

                        </strong>

                    </td>


                    <td>

                        ${formattedDate}

                    </td>


                    <td>

                        ${formatTime(
                            att.check_in
                        )}

                    </td>


                    <td>

                        ${formatTime(
                            att.check_out
                        )}

                    </td>


                    <td class="working-hours">

                        ${
                            calculateLiveWorkingHours(
                                att
                            )
                        }

                    </td>


                    <td>

                        <div class="break-box">

                            ${
                                getBreakDetails(
                                    att
                                )
                            }

                        </div>

                    </td>


                    <td>

                        <span
                            class="badge ${
                                getActivityClass(
                                    activity
                                )
                            }"
                        >

                            ${activity}

                        </span>

                    </td>


                    <td>

                        <span
                            class="badge ${
                                getStatusClass(
                                    displayStatus
                                )
                            }"
                        >

                            ${displayStatus}

                        </span>

                    </td>


                    <td>

                        <strong>

                            ${payrollPoints}

                        </strong>

                    </td>

                </tr>

            `;

        }
    );


    table.innerHTML =
        rows;

}

// =====================================================
// DAILY ATTENDANCE REPORT
// =====================================================

function getAttendanceReportData() {

    const searchText =
        (
            document.getElementById(
                "attendanceSearch"
            )?.value || ""
        )
        .toLowerCase()
        .trim();


    const selectedDate =
        getSelectedAttendanceDate();


    const selectedDepartment =
        document.getElementById(
            "attendanceDepartment"
        )?.value || "";


    const selectedStatus =
        document.getElementById(
            "attendanceStatus"
        )?.value || "";


    // SAME DATA jo attendance table me use ho raha hai
    let filtered =
        buildDailyAttendance(
            selectedDate
        );


    // SEARCH FILTER
    if (searchText) {

        filtered =
            filtered.filter(att =>

                (
                    att.profiles?.full_name ||
                    ""
                )
                .toLowerCase()
                .includes(searchText)

            );

    }


    // DEPARTMENT FILTER
    if (selectedDepartment) {

        filtered =
            filtered.filter(att =>

                att.profiles?.department ===
                selectedDepartment

            );

    }


    // STATUS FILTER
    if (selectedStatus) {

        filtered =
            filtered.filter(att => {

                let displayStatus =
                    att.computedStatus;


                if (
                    displayStatus === "Present" &&
                    att.isLate
                ) {

                    displayStatus = "Late";

                }


                return (
                    displayStatus ===
                    selectedStatus
                );

            });

    }


    return filtered;
}



// =====================================================
// EXCEL DOWNLOAD
// =====================================================

function downloadAttendanceExcel() {

    const data =
        getAttendanceReportData();


    if (!data.length) {

        alert(
            "Selected date/filter ke liye koi attendance record nahi mila."
        );

        return;
    }


    if (typeof XLSX === "undefined") {

        alert(
            "Excel library load nahi hui. Page reload karein."
        );

        return;
    }


    const selectedDate =
        getSelectedAttendanceDate();


    const reportData = [

        [
            "NAME",
            "Department",
            "Check-in",
            "Check-out",
            "Working Hours"
        ]

    ];


    data.forEach(att => {

        reportData.push([

            att.profiles?.full_name ||
            "Unknown",

            att.profiles?.department ||
            "-",

            formatTime(
                att.check_in
            ),

            formatTime(
                att.check_out
            ),

            calculateLiveWorkingHours(
                att
            )

        ]);

    });


    const worksheet =
        XLSX.utils.aoa_to_sheet(
            reportData
        );


    worksheet["!cols"] = [

        { wch: 28 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 18 }

    ];


    const workbook =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Attendance"
    );


    XLSX.writeFile(
        workbook,
        `Attendance_Report_${selectedDate}.xlsx`
    );

}



// =====================================================
// PDF DOWNLOAD
// =====================================================

function downloadAttendancePDF() {

    const data =
        getAttendanceReportData();


    if (!data.length) {

        alert(
            "Selected date/filter ke liye koi attendance record nahi mila."
        );

        return;
    }


    if (
        !window.jspdf ||
        !window.jspdf.jsPDF
    ) {

        alert(
            "PDF library load nahi hui. Page reload karein."
        );

        return;
    }


    const {
        jsPDF
    } = window.jspdf;


    const selectedDate =
        getSelectedAttendanceDate();


    const doc =
        new jsPDF(
            "landscape"
        );


    doc.setFontSize(16);

    doc.text(
        "Daily Attendance Report",
        14,
        15
    );


    doc.setFontSize(10);

    doc.text(
        `Date: ${selectedDate}`,
        14,
        22
    );


    const rows =
        data.map(att => [

            att.profiles?.full_name ||
            "Unknown",

            att.profiles?.department ||
            "-",

            formatTime(
                att.check_in
            ),

            formatTime(
                att.check_out
            ),

            calculateLiveWorkingHours(
                att
            )

        ]);


    doc.autoTable({

        startY: 28,

        head: [[
            "NAME",
            "Department",
            "Check-in",
            "Check-out",
            "Working Hours"
        ]],

        body: rows,

        theme: "grid",

        styles: {
            fontSize: 9,
            cellPadding: 4
        },

        headStyles: {
            fillColor: [
                17,
                17,
                17
            ],

            textColor: [
                255,
                255,
                255
            ]
        }

    });


    doc.save(
        `Attendance_Report_${selectedDate}.pdf`
    );

}



// =====================================================
// REPORT BUTTON EVENTS
// =====================================================

function setupAttendanceReportButtons() {

    const excelButton =
        document.getElementById(
            "downloadAttendanceExcelBtn"
        );


    const pdfButton =
        document.getElementById(
            "downloadAttendancePdfBtn"
        );


    if (excelButton) {

        excelButton.addEventListener(
            "click",
            downloadAttendanceExcel
        );

    }


    if (pdfButton) {

        pdfButton.addEventListener(
            "click",
            downloadAttendancePDF
        );

    }

}
// =====================================================
// AUTO REFRESH
// =====================================================
//
// Every 30 seconds table refreshes.
// Isse employee check-in kare to admin side
// par Present automatically aa jayega.
//
// =====================================================


function startAttendanceAutoRefresh() {

    setInterval(
        () => {

            loadAttendance();

        },
        30000
    );

}


// =====================================================
// INITIALIZATION
// =====================================================


document.addEventListener(
    "DOMContentLoaded",
    () => {
        // ---------------------------------------------
        // REPORT BUTTONS
        // ---------------------------------------------

        setupAttendanceReportButtons();
        // ---------------------------------------------
        // DEFAULT DATE
        // ---------------------------------------------

        const dateInput =
            document.getElementById(
                "attendanceDate"
            );


        // Blank date = today internally.
        // User ko date manually select karne ki
        // zarurat nahi.
        if (dateInput) {

            dateInput.value =
                getTodayDate();

        }


        // ---------------------------------------------
        // SEARCH
        // ---------------------------------------------

        document
            .getElementById(
                "attendanceSearch"
            )
            ?.addEventListener(
                "input",
                applyAttendanceFilters
            );


        // ---------------------------------------------
        // DATE
        // ---------------------------------------------

        document
            .getElementById(
                "attendanceDate"
            )
            ?.addEventListener(
                "change",
                applyAttendanceFilters
            );


        // ---------------------------------------------
        // DEPARTMENT
        // ---------------------------------------------

        document
            .getElementById(
                "attendanceDepartment"
            )
            ?.addEventListener(
                "change",
                applyAttendanceFilters
            );


        // ---------------------------------------------
        // STATUS
        // ---------------------------------------------

        document
            .getElementById(
                "attendanceStatus"
            )
            ?.addEventListener(
                "change",
                applyAttendanceFilters
            );


        // ---------------------------------------------
        // SEARCH BUTTON
        // ---------------------------------------------

        const searchBtn =
            document.getElementById(
                "attendanceSearchBtn"
            );


        if (searchBtn) {

            searchBtn.addEventListener(
                "click",
                applyAttendanceFilters
            );

        }


        // ---------------------------------------------
        // RESET
        // ---------------------------------------------

        const resetBtn =
            document.getElementById(
                "resetAttendanceBtn"
            );


        if (resetBtn) {

            resetBtn.addEventListener(
                "click",
                () => {

                    const search =
                        document.getElementById(
                            "attendanceSearch"
                        );

                    const date =
                        document.getElementById(
                            "attendanceDate"
                        );

                    const department =
                        document.getElementById(
                            "attendanceDepartment"
                        );

                    const status =
                        document.getElementById(
                            "attendanceStatus"
                        );


                    if (search) {
                        search.value = "";
                    }


                    if (date) {
                        date.value =
                            getTodayDate();
                    }


                    if (department) {
                        department.value = "";
                    }


                    if (status) {
                        status.value = "";
                    }


                    applyAttendanceFilters();

                }
            );

        }


        // ---------------------------------------------
        // LOAD
        // ---------------------------------------------

        loadAttendance();


        // ---------------------------------------------
        // AUTO REFRESH
        // ---------------------------------------------

        startAttendanceAutoRefresh();

    }
);
