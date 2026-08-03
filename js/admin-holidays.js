// ===============================================
// MODERN TEAMS - ADMIN HOLIDAY MANAGEMENT
// SUPABASE CRUD INTEGRATION
// ===============================================

// 1️⃣ LOAD HOLIDAYS
async function loadHolidays() {
    const tableBody = document.getElementById("holidayTableBody");
    const countBadge = document.getElementById("holidayCountBadge");
    if (!tableBody) return;

    // Fetch holidays from Supabase
    const { data, error } = await supabaseClient
        .from("holidays")
        .select("*")
        .order("holiday_date", { ascending: true });

    if (error) {
        console.error("Error loading holidays:", error);
        tableBody.innerHTML = `<tr><td colspan="5" class="text-center">Failed to load holidays. Please check database.</td></tr>`;
        return;
    }

    if (countBadge) {
        countBadge.innerText = `${data ? data.length : 0} Total`;
    }

    tableBody.innerHTML = "";

    if (!data || data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No Holidays Found</td>
            </tr>
        `;
        return;
    }

    data.forEach(item => {
        const formattedDate = new Date(item.holiday_date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

        tableBody.innerHTML += `
            <tr>
                <td><strong>${item.holiday_name}</strong></td>
                <td>${formattedDate}</td>
                <td><span class="holiday-badge">${item.holiday_type || "General"}</span></td>
                <td>${item.description || "-"}</td>
                <td>
                    <button class="btn-action-sm btn-action-edit" onclick="editHoliday('${item.id}', '${item.holiday_name}')">Edit</button>
                    <button class="btn-action-sm btn-action-delete" onclick="deleteHoliday('${item.id}')">Delete</button>
                </td>
            </tr>
        `;
    });
}

// 2️⃣ ADD HOLIDAY
async function addHoliday() {
    const holidayName = document.getElementById("holidayName").value.trim();
    const holidayDate = document.getElementById("holidayDate").value;
    const holidayType = document.getElementById("holidayType").value;
    const description = document.getElementById("holidayDescription").value.trim();

    if (!holidayName || !holidayDate) {
        alert("Please fill in required fields (Holiday Name and Date)");
        return;
    }

    const { error } = await supabaseClient
        .from("holidays")
        .insert({
            holiday_name: holidayName,
            holiday_date: holidayDate,
            holiday_type: holidayType,
            description: description
        });

    if (error) {
        alert("Error adding holiday: " + error.message);
        return;
    }

    // Reset Form
    document.getElementById("holidayName").value = "";
    document.getElementById("holidayDate").value = "";
    document.getElementById("holidayDescription").value = "";

    loadHolidays();
}

// 3️⃣ DELETE HOLIDAY
async function deleteHoliday(id) {
    if (!confirm("Are you sure you want to delete this holiday?")) return;

    const { error } = await supabaseClient
        .from("holidays")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Error deleting holiday: " + error.message);
        return;
    }

    loadHolidays();
}

// 4️⃣ EDIT HOLIDAY
async function editHoliday(id, currentName) {
    const newName = prompt("Edit Holiday Name:", currentName);
    if (!newName || newName.trim() === "") return;

    const { error } = await supabaseClient
        .from("holidays")
        .update({ holiday_name: newName.trim() })
        .eq("id", id);

    if (error) {
        alert("Error updating holiday: " + error.message);
        return;
    }

    loadHolidays();
}

// 5️⃣ INIT
document.addEventListener("DOMContentLoaded", () => {
    const addBtn = document.getElementById("addHolidayBtn");
    if (addBtn) {
        addBtn.addEventListener("click", addHoliday);
    }

    loadHolidays();
});
