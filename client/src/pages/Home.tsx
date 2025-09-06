
import Navbar from "../components/Navbar"
import { Body } from "../components/Body"
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";


const Home=()=>{

 const navigate = useNavigate()
 const token = sessionStorage.getItem("token") as string

 useEffect(()=>{
     if(!token){
    alert("Please login first")
    navigate('/Signin')
 }
 },[])


    return(
        <div className="min-h-screen w-screen bg-gray-300 flex flex-col">
            <Navbar></Navbar>
            <div className="grow">
                <Body></Body>
            </div>
            <footer className="bg-blue-500">
                © 2025 Docify. All rights Reserved
            </footer>
        </div>
    )
}


export default Home