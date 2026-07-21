// ======================================
// MODERN TEAMS HRMS
// UPDATE PASSWORD
// ======================================


async function checkSession(){

const { data, error } = await supabaseClient.auth.getSession();


console.log("CURRENT SESSION:", data.session);


if(!data.session){

document.getElementById("message").innerText =
"Reset link expired. Please request again.";

return;

}

console.log("SESSION:",data);



if(error || !data.session){


document.getElementById("message").innerText =
"Invalid or expired reset link";


return false;


}


return true;


}




checkSession();





const updateBtn =
document.getElementById(
"updatePasswordBtn"
);





updateBtn.addEventListener(
"click",
async()=>{



const newPassword =
document.getElementById(
"newPassword"
).value.trim();



const confirmPassword =
document.getElementById(
"confirmPassword"
).value.trim();



const message =
document.getElementById(
"message"
);





if(newPassword !== confirmPassword){


message.innerText =
"Passwords do not match";


return;


}





if(newPassword.length < 6){


message.innerText =
"Password minimum 6 characters";


return;


}






const {error}=

await supabaseClient.auth.updateUser({

password:newPassword

});





if(error){


console.log(error);


message.innerText =
error.message;


return;


}




message.innerText =
"Password Updated Successfully";





setTimeout(()=>{


window.location.href="login.html";


},2000);



});
