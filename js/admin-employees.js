// ======================================
// MODERN TEAMS HRMS
// ADMIN EMPLOYEE MANAGEMENT
// ======================================


console.log("Admin Employee JS Loaded");


let allEmployees = [];
let allAdmins = [];

let deleteId = null;




// ================================
// LOAD USERS
// ================================


async function loadUsers(){


const {data,error}=await supabaseClient
.from("profiles")
.select("*")
.order(
"created_at",
{
ascending:false
}
);



if(error){

console.log(error);

return;

}




allEmployees = data.filter(
user=>user.role==="employee"
);



allAdmins = data.filter(
user=>user.role==="admin"
);



displayEmployees(allEmployees);

displayAdmins(allAdmins);



}









// ================================
// DISPLAY EMPLOYEES
// ================================


function displayEmployees(data){


const table =
document.getElementById("employeeTable");



if(!table)
return;



table.innerHTML="";



if(data.length===0){


table.innerHTML=`

<tr>

<td colspan="6">
No Employees Found
</td>

</tr>

`;


return;

}





data.forEach(emp=>{


table.innerHTML += `


<tr>

<td>
${emp.full_name || "-"}
</td>


<td>
${emp.email || "-"}
</td>


<td>
${emp.department || "-"}
</td>


<td>
${emp.designation || "-"}
</td>


<td>
${emp.phone || "-"}
</td>



<td>

<button 
class="delete-btn"
onclick="openDelete('${emp.id}')">

Delete

</button>


</td>


</tr>


`;


});



}









// ================================
// DISPLAY ADMINS
// ================================


function displayAdmins(data){


const table =
document.getElementById("adminTable");



if(!table)
return;



table.innerHTML="";



if(data.length===0){


table.innerHTML=`

<tr>

<td colspan="7">
No Admin Found
</td>

</tr>

`;

return;


}




data.forEach(admin=>{


table.innerHTML += `


<tr>


<td>
${admin.full_name || "-"}
</td>


<td>
${admin.email || "-"}
</td>



<td>
${admin.department || "-"}
</td>



<td>
${admin.designation || "-"}
</td>


<td>
${admin.phone || "-"}
</td>

</tr>


`;


});


}









// ================================
// CREATE EMPLOYEE
// ================================


document
.getElementById("addEmployeeBtn")
?.addEventListener(
"click",
async()=>{


const userData={


full_name:
employeeName.value.trim(),


email:
employeeEmail.value.trim(),


password:
employeePassword.value.trim(),


phone:
employeePhone.value.trim(),


department:
employeeDepartment.value.trim(),


designation:
employeeDesignation.value.trim(),


role:"employee"


};



createUser(userData);


});











// ================================
// CREATE ADMIN
// ================================


document
.getElementById("addAdminBtn")
?.addEventListener(
"click",
async()=>{


const userData={


full_name:
adminName.value.trim(),


email:
adminEmail.value.trim(),


password:
adminPassword.value.trim(),


phone:
adminPhone.value.trim(),


department:
adminDepartment.value.trim(),


designation:
adminDesignation.value.trim(),
role:"admin"

};



createUser(userData);



});











// ================================
// CREATE USER FUNCTION
// ================================


async function createUser(userData){



if(
!userData.full_name ||
!userData.email ||
!userData.password
){


alert(
"Name Email Password Required"
);


return;


}




const {error}=await supabaseClient.functions.invoke(

"create-employee",

{

body:userData

}

);





if(error){


alert(error.message);

return;


}



alert(
`${userData.role} Created Successfully`
);



clearForm();



loadUsers();



}











// ================================
// DELETE POPUP
// ================================


function openDelete(id){


deleteId=id;



document
.getElementById("deleteModal")
.style.display="flex";



}





document
.getElementById("cancelDelete")
?.addEventListener(
"click",
()=>{


document
.getElementById("deleteModal")
.style.display="none";


deleteId=null;


});







document
.getElementById("confirmDelete")
?.addEventListener(
"click",
async()=>{



if(!deleteId)
return;



const {error}=await supabaseClient
.from("profiles")
.delete()
.eq(
"id",
deleteId
);



if(error){


alert(error.message);

return;


}




alert(
"User Deleted Successfully"
);



document
.getElementById("deleteModal")
.style.display="none";



deleteId=null;



loadUsers();



});









// ================================
// SEARCH
// ================================


document
.getElementById("searchEmployee")
?.addEventListener(
"input",
(e)=>{



const value =
e.target.value.toLowerCase();




const employeeFilter =
allEmployees.filter(emp=>

(emp.full_name||"")
.toLowerCase()
.includes(value)

||

(emp.email||"")
.toLowerCase()
.includes(value)

);



const adminFilter =
allAdmins.filter(admin=>

(admin.full_name||"")
.toLowerCase()
.includes(value)

||

(admin.email||"")
.toLowerCase()
.includes(value)

);



displayEmployees(employeeFilter);

displayAdmins(adminFilter);



});









// ================================
// CLEAR FORMS
// ================================


function clearForm(){



document
.querySelectorAll(".form-card input")
.forEach(input=>{


input.value="";


});



}







// START


loadUsers();
