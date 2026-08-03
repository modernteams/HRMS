// =================================
// ADMIN LEAVE MANAGEMENT ENGINE
// Optimized Queries with Joint Fetch
// =================================

let currentAdmin = null;
let allLeaves = [];

// ================================
// GET ADMIN PROFILE & INIT
// ================================

async function getAdmin() {
    const { data: userData } = await supabaseClient.auth.getUser();

    if (!userData || !userData.user) {
        window.location.href = "login.html";
        return;
    }

    const { data: profile, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("email", userData.user.email)
        .maybeSingle();

    if (error) {
        console.error("Profile load error:", error);
        return;
    }

    currentAdmin = profile;
    loadLeaveRequests();
}

// ================================
// LOAD LEAVE REQUESTS (OPTIMIZED)
// ================================

async function loadLeaveRequests() {
    const table = document.getElementById("leaveTableBody");
    if (!table) return;

    // Single Join Query (Eliminates N-1 query issues)
    const { data, error } = await supabaseClient
        .from("leave_requests")
        .select(`
            *,
            profiles!employee_id (
                full_name,
                department
            )
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching leaves:", error);
        table.innerHTML = `<tr><td colspan="7" style="text-align: center;">Failed to load leave requests.</td></tr>`;
        return;
    }

    allLeaves = data || [];
    applyLeaveFilters();
}

// ================================
// RENDER LEAVE TABLE
// ================================

function renderLeaveTable(data) {
    const table = document.getElementById("leaveTableBody");
    if (!table) return;

    table.innerHTML = "";

    if (!data || data.length === 0) {
        table.innerHTML = `<tr><td colspan="7" style="text-align: center;">No Leave Requests Found</td></tr>`;
        return;
    }

    let rows = "";
    data.forEach(item => {
        const statusLower = (item.status || "pending").toLowerCase();
        const actionCell = item.status === "Pending" ? `
            <button class="approve-btn btn-sm" onclick="updateLeave('${item.id}', 'Approved')">Approve</button>
            <button class="reject-btn btn-sm" onclick="updateLeave('${item.id}', 'Rejected')">Reject</button>
        ` : `-`;

        rows += `
        <tr>
            <td><strong>${item.profiles?.full_name || "Unknown"}</strong></td>
            <td>${item.leave_type || "General"}</td>
            <td>${item.reason || "-"}</td>
            <td>${item.from_date || "-"}</td>
            <td>${item.to_date || "-"}</td>
            <td><span class="status-badge status-${statusLower}">${item.status}</span></td>
            <td>${actionCell}</td>
        </tr>
        `;
    });

    table.innerHTML = rows;
}

// ================================
// UPDATE STATUS
// ================================

async function updateLeave(id, status) {
    if (!currentAdmin) {
        alert("Admin profile not loaded!");
        return;
    }

    if (!confirm(`Are you sure you want to mark this request as ${status}?`)) return;

    const { error } = await supabaseClient
        .from("leave_requests")
        .update({
            status: status,
            approved_by: currentAdmin.id
        })
        .eq("id", id);

    if (error) {
        alert("Update Error: " + error.message);
        return;
    }

    alert(`Leave request ${status.toLowerCase()} successfully.`);
    loadLeaveRequests();
}

// ================================
// FILTERS
// ================================

function applyLeaveFilters() {
    const statusVal = document.getElementById("leaveStatusFilter")?.value || "All";
    const typeVal = document.getElementById("leaveTypeFilter")?.value || "All";
    const searchVal = (document.getElementById("leaveSearch")?.value || "").toLowerCase().trim();

    let filtered = [...allLeaves];

    if (statusVal !== "All") {
        filtered = filtered.filter(item => item.status === statusVal);
    }

    if (typeVal !== "All") {
        filtered = filtered.filter(item => item.leave_type === typeVal);
    }

    if (searchVal) {
        filtered = filtered.filter(item =>
            (item.profiles?.full_name || "").toLowerCase().includes(searchVal)
        );
    }

    renderLeaveTable(filtered);
}

// Event Listeners for Filters
document.addEventListener("DOMContentLoaded", () => {
    const statusFilter = document.getElementById("leaveStatusFilter");
    const typeFilter = document.getElementById("leaveTypeFilter");
    const searchInput = document.getElementById("leaveSearch");

    if (statusFilter) statusFilter.addEventListener("change", applyLeaveFilters);
    if (typeFilter) typeFilter.addEventListener("change", applyLeaveFilters);
    if (searchInput) searchInput.addEventListener("input", applyLeaveFilters);

    getAdmin();
});
