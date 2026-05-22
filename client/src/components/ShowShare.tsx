import { useEffect, useState, useRef } from 'react';
import axios from 'axios';

interface ShowShareProps {
  isOpen: boolean;
  onClose: () => void;
  docId: number | string;
}

interface ShareResponse {
  message: string;
}

interface Collaborator {
  id?: number;
  userId: number;
  name: string;
  email: string;
  permission: 'VIEW' | 'EDIT' | 'OWNER';
}

interface GetCollaboratorsResponse {
  owner: Collaborator;
  collaborators: Collaborator[];
  canShare: boolean;
}

const ShowShare = ({ isOpen, onClose, docId }: ShowShareProps) => {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'VIEW' | 'EDIT' | ''>('');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [canShare, setCanShare] = useState(false);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const fetchCollaborators = async () => {
    setLoading(true);
    try {
      const response = await axios.get<GetCollaboratorsResponse>(
        `${import.meta.env.VITE_URL}/api/v1/document/collaborators/${docId}`,
        {
          headers: {
            authorization: sessionStorage.getItem('token'),
          },
        }
      );

      const combined = [response.data.owner, ...response.data.collaborators];
      setCollaborators(combined);
      setCanShare(response.data.canShare);
    } catch (error: any) {
      setCollaborators([]);
      setCanShare(false);
      alert(error?.response?.data?.error || 'Unable to load collaborators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchCollaborators();
  }, [isOpen, docId]);

  const handleShare = async () => {
    if (!email || !permission) {
      alert('Please provide email and permission');
      return;
    }

    try {
      const response = await axios.post<ShareResponse>(
        `${import.meta.env.VITE_URL}/api/v1/document/share/${docId}`,
        {
          email,
          permission,
        },
        {
          headers: {
            authorization: sessionStorage.getItem('token'),
          },
        }
      );

      alert(response.data.message);
      setEmail('');
      setPermission('');
      fetchCollaborators();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Error while sharing document');
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: number) => {
    if (!confirm('Are you sure you want to remove this collaborator?')) {
      return;
    }

    try {
      const response = await axios.delete<ShareResponse>(
        `${import.meta.env.VITE_URL}/api/v1/document/collaborators/${docId}/${collaboratorId}`,
        {
          headers: {
            authorization: sessionStorage.getItem('token'),
          },
        }
      );

      alert(response.data.message);
      fetchCollaborators();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Error while removing collaborator');
    }
  };

  const handleChangePermission = async (collaboratorId: number, newPermission: 'VIEW' | 'EDIT') => {
    try {
      const response = await axios.put<ShareResponse>(
        `${import.meta.env.VITE_URL}/api/v1/document/collaborators/${docId}/${collaboratorId}`,
        { permission: newPermission },
        {
          headers: {
            authorization: sessionStorage.getItem('token'),
          },
        }
      );

      alert(response.data.message);
      fetchCollaborators();
    } catch (error: any) {
      alert(error?.response?.data?.error || 'Error while updating permission');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div ref={modalRef} className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Share Document</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Add by email:</label>
          <input
            type="email"
            placeholder="collaborator@example.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:opacity-50 disabled:bg-gray-50"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!canShare}
          />
        </div>

        <div className="flex-1 min-h-0 flex flex-col mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Collaborators:</label>
          <div className="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-200 overflow-y-auto text-sm">
            {loading && (
              <div className="flex justify-center items-center py-6 text-gray-500">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
                Loading collaborators...
              </div>
            )}
            {!loading && collaborators.length === 0 && <p className="text-gray-500 text-center py-6">No collaborators yet</p>}

            {!loading &&
              collaborators.map((user) => (
                <div key={`${user.userId}-${user.permission}`} className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-b-0">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="font-semibold text-gray-800 truncate">{user.name}</div>
                    <div className="text-gray-500 text-xs truncate">{user.email}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {user.permission === 'OWNER' ? (
                      <div className="text-[10px] font-bold bg-blue-100 text-blue-800 rounded-full px-2.5 py-0.5 uppercase tracking-wide">OWNER</div>
                    ) : (
                      <>
                        <select
                          value={user.permission}
                          onChange={(e) => handleChangePermission(user.id!, e.target.value as 'VIEW' | 'EDIT')}
                          disabled={!canShare}
                          className="text-xs bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                        >
                          <option value="VIEW">Viewer</option>
                          <option value="EDIT">Editor</option>
                        </select>
                        {canShare && (
                          <button
                            onClick={() => handleRemoveCollaborator(user.id!)}
                            className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                            title="Remove collaborator"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div className="mt-auto pt-2 border-t border-gray-100 flex flex-col gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Set Permission:</label>
            <select
              name="permission"
              id="permission"
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              value={permission}
              onChange={(e) => setPermission(e.target.value as 'VIEW' | 'EDIT' | '')}
              disabled={!canShare}
            >
              <option value="">Select permission level</option>
              <option value="VIEW">Viewer (Can only read document)</option>
              <option value="EDIT">Editor (Can edit document in real-time)</option>
            </select>

            {!canShare && (
              <p className="text-xs text-amber-600 mt-1.5 flex items-center">
                <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Only document owners can share or modify permissions.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2.5 mt-1">
            <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none transition-colors cursor-pointer" onClick={onClose}>
              Cancel
            </button>
            <button 
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer" 
              onClick={handleShare} 
              disabled={!canShare || !email || !permission}
            >
              Share Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowShare;
