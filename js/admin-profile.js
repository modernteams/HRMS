let currentUser = null;

async function loadAdminProfile() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) return;
    currentUser = user;

    const { data: profile, error } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (error) {
        console.log("Error loading profile:", error);
        return;
    }

    // =====================================
    // DISPLAY DETAILS (Hero Banner & Cards)
    // =====================================
    const adminName = profile.full_name || "Admin Name";
    const adminRole = profile.role || "Administrator";
    const adminDept = profile.department || "Administration Department";
    const adminDesig = profile.designation || "HR Administrator";

    // Hero Banner Displays
    const nameDisp = document.getElementById("adminNameDisplay");
    if (nameDisp) nameDisp.innerText = adminName;

    const desigDisp = document.getElementById("adminDesignationDisplay");
    if (desigDisp) desigDisp.innerText = adminDesig;

    const deptDisp = document.getElementById("adminDepartmentDisplay");
    if (deptDisp) deptDisp.innerText = adminDept;

    // Company/System Card Displays
    const roleDisp = document.getElementById("adminRole");
    if (roleDisp) roleDisp.innerText = adminRole;

    const companyDeptDisp = document.getElementById("companyDept");
    if (companyDeptDisp) companyDeptDisp.innerText = adminDept;

    // =====================================
    // FORM INPUT VALUES
    // =====================================
    const nameInput = document.getElementById("name");
    if (nameInput) nameInput.value = profile.full_name || "";

    const emailInput = document.getElementById("email");
    if (emailInput) emailInput.value = profile.email || user.email;

    const phoneInput = document.getElementById("phone");
    if (phoneInput) phoneInput.value = profile.phone || "";

    const deptInput = document.getElementById("department");
    if (deptInput) deptInput.value = profile.department || "";

    // =====================================
    // PROFILE PHOTO LOAD (Fallback Included)
    // =====================================
    const photoImg = document.getElementById("adminPhoto");
    if (photoImg) {
        if (profile.profile_image) {
            photoImg.src = profile.profile_image;
        } else if (profile.photo_url) {
            photoImg.src = profile.photo_url;
        } else {
            photoImg.src = "assets/images/default-user.png";
        }

        // Image Load Error Fallback
        photoImg.onerror = function () {
            this.src = "assets/images/default-user.png";
        };
    }
}

// =====================================
// UPDATE PROFILE BUTTON LOGIC
// =====================================
const updateBtn = document.getElementById("updateProfileBtn");
if (updateBtn) {
    updateBtn.addEventListener("click", async () => {
        if (!currentUser) return;

        const updates = {
            full_name: document.getElementById("name").value,
            phone: document.getElementById("phone").value,
            department: document.getElementById("department").value
        };

        const { error } = await supabaseClient
            .from("profiles")
            .update(updates)
            .eq("id", currentUser.id);

        const msgEl = document.getElementById("profileMessage");

        if (error) {
            alert(error.message);
            if (msgEl) {
                msgEl.style.color = "red";
                msgEl.innerText = "Failed to Update Profile ❌";
            }
        } else {
            if (msgEl) {
                msgEl.style.color = "#16a34a";
                msgEl.innerText = "Profile Updated Successfully ✅";
            }
            // Realtime Update Top Name Display
            const nameDisp = document.getElementById("adminNameDisplay");
            if (nameDisp) nameDisp.innerText = updates.full_name;
        }
    });
}

// =====================================
// PHOTO UPLOAD & CHANGE LOGIC
// =====================================
const photoInput = document.getElementById("profilePhoto");
if (photoInput) {
    photoInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file || !currentUser) return;

        if (file.size > 2 * 1024 * 1024) {
            alert("File size must be under 2MB!");
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Image = event.target.result;

            // Instant UI Preview
            const photoImg = document.getElementById("adminPhoto");
            if (photoImg) photoImg.src = base64Image;

            // Database Update
            const { error } = await supabaseClient
                .from("profiles")
                .update({ profile_image: base64Image })
                .eq("id", currentUser.id);

            if (error) {
                console.error("Photo Update Error:", error);
                alert("Failed to update profile picture!");
            } else {
                const msgEl = document.getElementById("profileMessage");
                if (msgEl) {
                    msgEl.style.color = "#f3dd18";
                    msgEl.innerText = "Profile Picture Updated ✅";
                }
            }
        };

        reader.readAsDataURL(file);
    });
}

// =====================================
// CHANGE PASSWORD LOGIC
// =====================================
const pwdBtn = document.getElementById("changePasswordBtn");
if (pwdBtn) {
    pwdBtn.addEventListener("click", async () => {
        const newPassword = document.getElementById("newPassword").value;

        if (!newPassword || newPassword.length < 6) {
            alert("Password must be at least 6 characters long.");
            return;
        }

        const { error } = await supabaseClient.auth.updateUser({
            password: newPassword 
        });

        if (error) {
            alert(error.message);
        } else {
            alert("Password Changed Successfully! ✅");
            document.getElementById("newPassword").value = "";
            const oldPwd = document.getElementById("oldPassword");
            if (oldPwd) oldPwd.value = "";
        }
    });
}

// INITIAL LOAD
loadAdminProfile();
