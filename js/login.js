// ======================================
// MODERN TEAMS HRMS LOGIN
// ======================================


const loginForm =
document.getElementById("loginForm");



loginForm.addEventListener(
"submit",
async(e)=>{


    e.preventDefault();



    const email =
    document.getElementById("email")
    .value
    .trim();



    const password =
    document.getElementById("password")
    .value
    .trim();



    const message =
    document.getElementById("message");



    message.innerText="Logging in...";



    console.log("Login Submitted");



    const {data,error}=

    await supabaseClient.auth.signInWithPassword({

        email:email,

        password:password

    });




    if(error){


        console.log(
        "Login Error:",
        error
        );


        message.innerText =
        error.message;


        return;


    }




    console.log(
    "Login Success",
    data.user
    );





    // GET PROFILE


    const {

        data:profile,

        error:profileError

    } = await supabaseClient


    .from("profiles")


    .select("*")


    .eq(
        "id",
        data.user.id
    )


    .single();





    console.log(
    "PROFILE:",
    profile
    );


    console.log(
    "PROFILE ERROR:",
    profileError
    );






    if(profileError || !profile){


        message.innerText =
        "Profile not found";


        return;


    }





    // ROLE REDIRECT



    if(profile.role==="admin"){



        window.location.href =
        "admin.html";



    }



    else if(profile.role==="employee"){



        window.location.href =
        "employee.html";



    }



    else{



        message.innerText =
        "Role not assigned";



    }




});
