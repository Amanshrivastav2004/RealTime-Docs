import './App.css'
import Signup from './pages/Signup'
import { BrowserRouter as Router , Routes , Route , Navigate } from 'react-router-dom'
import Signin from './pages/Signin'
import { Verify } from './pages/verify'
import { ForgotPassword } from './pages/forgotPassword'
import Home from './pages/Home'
import Document from './pages/Document'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = sessionStorage.getItem("token")
  return token ? <>{children}</> : <Navigate to="/Signin" replace />
}

function App() {
  

  return (
    <>
      <Router>
        <Routes>
          <Route path="/Signup" element={<Signup/>}/>
          <Route path="/Signin" element={<Signin/>}/>
          <Route path="/verifyemail" element={<Verify/>} />
          <Route path="/verifyemail/:verificationtoken" element={<Verify/>} />
          <Route path="/forgot-password" element={<ForgotPassword/>} />
          <Route path="/reset-password/:resetToken" element={<ForgotPassword/>} />
          <Route path="/" element={<ProtectedRoute><Home/></ProtectedRoute>} />
          <Route path='/document/:docId' element={<ProtectedRoute><Document/></ProtectedRoute>}/>
          <Route path="*" element={<Navigate to="/Signin" replace />} />
        </Routes>
      </Router> 
    </>
  )
}

export default App
