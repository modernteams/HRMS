function togglePassword(id, icon){

let input=document.getElementById(id);


if(input.type==="password"){

input.type="text";

icon.innerHTML="🙈";

}
else{

input.type="password";

icon.innerHTML="👁";

}

}
