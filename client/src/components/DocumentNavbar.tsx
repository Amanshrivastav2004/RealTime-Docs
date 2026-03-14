import { useRef, useState, useEffect } from 'react';
import image from '../assets/logo.png'
import { useStore } from '../store/zustand';
import { useParams } from 'react-router-dom';
import ShowShare from './ShowShare';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';

interface ActiveUser {
  userId: number;
  name: string;
  socketId: string;
}

interface UserResponse {
  name: string;
  userId: number;
}


const DocumentNavbar = ()=>{
const title = useStore((state) => state.document.title)
const permission = useStore((state) => state.document.permission)
const setTitle = useStore((state) => state.setDocument)
const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
const updateDocs = useStore(state=>state.updateDocs)
const {docId} = useParams()  
const [isOpen , setisopen] = useState(false)
const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
const [currentUser, setCurrentUser] = useState<{ name: string; userId: number } | null>(null)
const socketRef = useRef<Socket | null>(null)
const [canEdit, setCanEdit] = useState(false)

useEffect(() => {
  // Check if user can edit (OWNER or EDIT permission)
  setCanEdit(permission === 'OWNER' || permission === 'EDIT')
}, [permission])

useEffect(() => {
  // Fetch current user info
  const fetchUser = async () => {
    try {
      const response = await axios.get<UserResponse>(
        `${import.meta.env.VITE_URL}/api/v1/user/`,
        {
          headers: {
            authorization: sessionStorage.getItem('token'),
          },
        }
      )
      setCurrentUser({ name: response.data.name, userId: response.data.userId })
    } catch (error) {
      console.error('Error fetching user:', error)
    }
  }
  fetchUser()
}, [])

useEffect(() => {
  if (!docId || !currentUser) return

  // Connect to socket
  socketRef.current = io(import.meta.env.VITE_URL)

  // Join document room and announce presence
  socketRef.current.emit('join-document', docId)
  socketRef.current.emit('user-joined', {
    docId,
    userId: currentUser.userId,
    name: currentUser.name,
  })

  // Listen for active users updates
  socketRef.current.on('active-users', (users: ActiveUser[]) => {
    setActiveUsers(users.filter(u => u.userId !== currentUser.userId))
  })

  // Listen for title updates from other users
  socketRef.current.on('title-updated', (newTitle: string) => {
    setTitle({ title: newTitle })
  })

  // Cleanup on unmount
  return () => {
    if (socketRef.current) {
      socketRef.current.emit('user-left', { docId, userId: currentUser.userId })
      socketRef.current.disconnect()
    }
  }
}, [docId, currentUser])

const dataTobackend = async(title:string) => {
    setTitle({title:title})
    if (debounce.current) clearTimeout(debounce.current)
    try {
      debounce.current = setTimeout(() => {
        updateDocs(Number(docId), { title:title})
        // Broadcast title update to other users
        if (socketRef.current) {
          socketRef.current.emit('title-change', { docId, title })
        }
      },1000)
    } catch (error) {
      console.error(error)
      alert("error while sending data to backend")
    }
  }

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  const getColorFromName = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-indigo-500',
      'bg-red-500',
      'bg-teal-500',
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }


    return(
        <div className="w-screen h-[50px] flex justify-between items-center px-7 py-10 bg-gray-200">
            <div className='flex items-center'>
                <img src={image} className="h-10 w-8 m-4" />
                <div className='grow flex flex-col px-7 gap-3'>
                    <input 
                      className={`h-[40px] font-bold p-2 ${!canEdit ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      value={title} 
                      placeholder="Untitled Document" 
                      onChange={(e)=>{canEdit && dataTobackend(e.target.value)}}
                      disabled={!canEdit}
                      title={!canEdit ? 'You need edit permission to change the title' : ''}
                    />
                    <div className='flex gap-5'>
                        <div className='text-xs'>File</div>
                        <div className='text-xs'>Edit</div>
                        <div className='text-xs'>View</div>
                        <div className='text-xs'>Insert</div>
                        <div className='text-xs'>Format</div>
                        <div className='text-xs'>Tools</div>
                        <div className='text-xs'>Add-ons</div>
                        <div className='text-xs'>Help</div>
                    </div>
                </div>
            </div>
            <div className='flex gap-3 items-center'>
                {/* Active Users */}
                <div className='flex -space-x-2'>
                  {activeUsers.map((user) => (
                    <div
                      key={user.socketId}
                      className={`h-8 w-8 rounded-full ${getColorFromName(user.name)} text-white text-sm flex items-center justify-center border-2 border-white font-semibold`}
                      title={user.name}
                    >
                      {getInitials(user.name)}
                    </div>
                  ))}
                </div>
                <button className='bg-blue-600 text-white text-xl rounded-full w-20 p-2' onClick={()=>setisopen(true)}>Share</button>
                {/* Current User Avatar */}
                {currentUser && (
                  <div 
                    className={`h-10 w-10 rounded-full ${getColorFromName(currentUser.name)} text-white text-2xl flex items-center justify-center font-semibold`}
                    title={currentUser.name}
                  >
                    {getInitials(currentUser.name)}
                  </div>
                )}
            </div>
            {docId && (
              <ShowShare
                isOpen={isOpen}
                onClose={() => setisopen(false)}
                docId={docId}
              />
            )}
        </div>
    )
}


export default DocumentNavbar;