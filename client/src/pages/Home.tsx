
import Navbar from "../components/Navbar"
import { Body } from "../components/Body"
import { useNavigate } from "react-router-dom";
import { useLayoutEffect } from "react";
import { useStore } from '../store/zustand';


const Home=()=>{

 const navigate = useNavigate()
 const token = sessionStorage.getItem("token")
 const getDocuments = useStore((state) => state.getDocuments)

 useLayoutEffect(()=>{
     if(!token){
         alert("Please login first")
         navigate('/Signin')
     } else {
         getDocuments()
     }
 }, [])


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