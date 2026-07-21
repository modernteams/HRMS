let currentUser = null;
let selectedImage = null;
// =====================
// LOAD PROFILE
// =====================

async function loadEmployeeProfile(){


const {data:userData,error:userError}
=
await supabaseClient.auth.getUser();



if(userError || !userData.user){

window.location.href="login.html";
return;

}



currentUser = userData.user;




const {data:profile,error}
=
await supabaseClient
.from("profiles")
.select("*")
.eq(
"id",
currentUser.id
)
.maybeSingle();




if(error){

console.log(error);
return;

}



if(!profile){

console.log("Profile not found");
return;

}




// =====================
// PROFILE CARD
// =====================


document.getElementById("employeeName")
.innerText =
profile.full_name || "Employee";





document.getElementById("employeeDesignation")
.innerText =
profile.designation || "Employee";



document.getElementById("employeeDepartment")
.innerText =
profile.department || "Not Assigned";





// =====================
// UPDATE FORM
// =====================


document.getElementById("name")
.value =
profile.full_name || "";



document.getElementById("email")
.value =
profile.email || currentUser.email;



document.getElementById("phone")
.value =
profile.phone || "";



document.getElementById("address")
.value =
profile.address || "";






// =====================
// COMPANY DETAILS
// =====================


document.getElementById("department")
.innerText =
profile.department || "-";



document.getElementById("designation")
.innerText =
profile.designation || "-";



document.getElementById("employeeId")
.innerText =
profile.id;



if(profile.created_at){

document.getElementById("joiningDate")
.innerText =
new Date(profile.created_at)
.toLocaleDateString("en-IN");

}






// =====================
// PROFILE IMAGE
// =====================


if(profile.profile_image){


document.getElementById("employeePhoto")
.src =
profile.profile_image;


}





}


async function uploadProfileImage(){


if(!selectedImage){
return null;
}


console.log("Uploading:", selectedImage);


const fileName =
currentUser.id +
"-" +
Date.now();


const {data,error}=await supabaseClient
.storage
.from("profile-images")
.upload(
fileName,
selectedImage,
{
cacheControl:"3600",
upsert:true
}
);


console.log("UPLOAD DATA:",data);
console.log("UPLOAD ERROR:",error);


if(error){

return null;

}


const {data:urlData}=supabaseClient
.storage
.from("profile-images")
.getPublicUrl(fileName);



console.log(
"IMAGE URL:",
urlData.publicUrl
);



return urlData.publicUrl;

}


// =====================
// UPDATE PROFILE
// =====================


document
.getElementById("updateProfileBtn")
.addEventListener(
"click",
async()=>{

let imageUrl = null;


if(selectedImage){

imageUrl =
await uploadProfileImage();

}



const updates={


full_name:
document.getElementById("name").value,


phone:
document.getElementById("phone").value,


address:
document.getElementById("address").value


};


if(imageUrl){

updates.profile_image = imageUrl;

}


const {error}
=
await supabaseClient
.from("profiles")
.update(updates)
.eq(
"id",
currentUser.id
);





if(error){


document.getElementById("profileMessage")
.innerText =
error.message;


return;


}




document.getElementById("profileMessage")
.innerText =
"Profile Updated Successfully ✅";

if(imageUrl){

document.getElementById("employeeImage").src = imageUrl;

}



});









// =====================
// CHANGE PASSWORD
// =====================


document
.getElementById("changePasswordBtn")
.addEventListener(
"click",
async()=>{


const password =
document.getElementById("newPassword")
.value;




if(!password){

alert("Enter new password");
return;

}




const {error}
=
await supabaseClient.auth.updateUser({

password:password

});




if(error){

alert(error.message);

return;

}



alert(
"Password Changed Successfully"
);



});



document
.getElementById("profilePhoto")
.addEventListener(
"change",
(e)=>{


selectedImage =
e.target.files[0];


if(selectedImage){

document.getElementById("employeeImage").src =
URL.createObjectURL(selectedImage);

}


});




loadEmployeeProfile();
