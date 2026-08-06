// ======================================
// MODERN TEAMS HRMS
// FORGOT PASSWORD
// ======================================


const resetBtn =
document.getElementById("resetBtn");


resetBtn.addEventListener(
"click",
async()=>{


const email =
document.getElementById("resetEmail").value.trim();



const message =
document.getElementById("message");



if(!email){

message.innerText=
"Please enter your email";

return;

}





const {error}=

await supabaseClient.auth
.resetPasswordForEmail(
email,
{
redirectTo:
window.location.origin+
"/update-password.html"
}
);




if(error){


message.innerText=
error.message;


return;


}



message.innerText=
"Reset link sent to your email";


});
