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


    return (
        <div className="w-full min-h-[70px] md:h-[80px] flex justify-between items-center px-4 md:px-7 py-2 bg-white border-b border-gray-200">
            <div className='flex items-center flex-1 min-w-0'>
                <img src={image} className="h-8 w-6 md:h-10 md:w-8 m-2 md:m-4 flex-shrink-0" alt="Logo" />
                <div className='flex-1 flex flex-col px-2 md:px-4 min-w-0 gap-1'>
                    <input 
                      className={`h-[32px] md:h-[38px] font-bold px-2 text-sm md:text-lg border border-transparent hover:border-gray-300 focus:border-blue-500 rounded bg-transparent focus:bg-white outline-none transition-all ${!canEdit ? 'cursor-not-allowed opacity-75' : ''}`}
                      value={title} 
                      placeholder="Untitled Document" 
                      onChange={(e)=>{canEdit && dataTobackend(e.target.value)}}
                      disabled={!canEdit}
                      title={!canEdit ? 'You need edit permission to change the title' : ''}
                    />
                    <div className='flex gap-3 md:gap-5 overflow-x-auto scrollbar-none whitespace-nowrap text-gray-500 pb-0.5 text-xs md:text-sm select-none'>
                        <div className='cursor-pointer hover:bg-gray-100 hover:text-gray-800 px-1.5 py-0.5 rounded transition-colors'>File</div>
                        <div className='cursor-pointer hover:bg-gray-100 hover:text-gray-800 px-1.5 py-0.5 rounded transition-colors'>Edit</div>
                        <div className='cursor-pointer hover:bg-gray-100 hover:text-gray-800 px-1.5 py-0.5 rounded transition-colors'>View</div>
                        <div className='cursor-pointer hover:bg-gray-100 hover:text-gray-800 px-1.5 py-0.5 rounded transition-colors'>Insert</div>
                        <div className='cursor-pointer hover:bg-gray-100 hover:text-gray-800 px-1.5 py-0.5 rounded transition-colors'>Format</div>
                        <div className='cursor-pointer hover:bg-gray-100 hover:text-gray-800 px-1.5 py-0.5 rounded transition-colors'>Tools</div>
                        <div className='cursor-pointer hover:bg-gray-100 hover:text-gray-800 px-1.5 py-0.5 rounded transition-colors'>Add-ons</div>
                        <div className='cursor-pointer hover:bg-gray-100 hover:text-gray-800 px-1.5 py-0.5 rounded transition-colors'>Help</div>
                    </div>
                </div>
            </div>
            <div className='flex gap-2 md:gap-3 items-center flex-shrink-0 ml-2'>
                {/* Active Users (hidden on small devices to prioritize title and controls) */}
                <div className='hidden sm:flex -space-x-1.5 mr-1 md:mr-2'>
                  {activeUsers.map((user) => (
                    <div
                      key={user.socketId}
                      className={`h-7 w-7 md:h-8 md:w-8 rounded-full ${getColorFromName(user.name)} text-white text-xs md:text-sm flex items-center justify-center border-2 border-white font-semibold transition-all`}
                      title={user.name}
                    >
                      {getInitials(user.name)}
                    </div>
                  ))}
                </div>
                <button 
                  className='bg-blue-600 hover:bg-blue-700 text-white text-xs md:text-sm font-medium rounded-full px-4 py-1.5 md:px-5 md:py-2 shadow-sm hover:shadow-md transition-all cursor-pointer'
                  onClick={()=>setisopen(true)}
                >
                  Share
                </button>
                {/* Current User Avatar */}
                {currentUser && (
                  <div 
                    className={`h-8 w-8 md:h-10 md:w-10 rounded-full ${getColorFromName(currentUser.name)} text-white text-base md:text-lg flex items-center justify-center font-semibold border border-gray-100 shadow-sm`}
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