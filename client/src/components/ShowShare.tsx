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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div ref={modalRef} className="bg-white p-6 rounded-2xl shadow-lg h-9/10 w-40/100 max-w-2xl flex flex-col">
        <h2 className="text-xl font-bold mb-4">Share Document</h2>

        <div className="mb-4">
          <h1 className="text-xl font-semibold">Email:</h1>
          <input
            type="text"
            className="border border-gray-400 w-full rounded-md p-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!canShare}
          />
        </div>

        <div>
          <h1 className="text-xl font-medium mb-2">Collaborators:</h1>
          <div className="bg-gray-100 p-2 rounded-md min-h-[130px] max-h-[230px] overflow-auto text-sm">
            {loading && <p>Loading collaborators...</p>}
            {!loading && collaborators.length === 0 && <p>No collaborators yet</p>}

            {!loading &&
              collaborators.map((user) => (
                <div key={`${user.userId}-${user.permission}`} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                  <div className="flex-1">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-gray-600 text-xs">{user.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.permission === 'OWNER' ? (
                      <div className="text-xs bg-blue-200 text-blue-800 rounded px-2 py-1">OWNER</div>
                    ) : (
                      <>
                        <select
                          value={user.permission}
                          onChange={(e) => handleChangePermission(user.id!, e.target.value as 'VIEW' | 'EDIT')}
                          disabled={!canShare}
                          className="text-xs bg-gray-200 rounded px-2 py-1 disabled:opacity-50"
                        >
                          <option value="VIEW">View Only</option>
                          <option value="EDIT">Edit</option>
                        </select>
                        {canShare && (
                          <button
                            onClick={() => handleRemoveCollaborator(user.id!)}
                            className="text-red-600 hover:text-red-800 p-1"
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

        <div className="mt-auto w-full">
          <h1 className="text-md font-medium w-full mb-2">Permission</h1>
          <select
            name="permission"
            id="permission"
            className="w-full bg-gray-200 p-1"
            value={permission}
            onChange={(e) => setPermission(e.target.value as 'VIEW' | 'EDIT' | '')}
            disabled={!canShare}
          >
            <option value="">Select permission</option>
            <option value="VIEW">View Only</option>
            <option value="EDIT">Edit</option>
          </select>

          {!canShare && (
            <p className="text-xs text-gray-600 mt-2">Only document owner can share this document.</p>
          )}

          <div className="flex justify-end gap-2 mt-2">
            <button className="p-2 bg-blue-600 text-white rounded" onClick={onClose}>
              Cancel
            </button>
            <button className="p-2 bg-blue-600 text-white rounded disabled:bg-gray-300" onClick={handleShare} disabled={!canShare}>
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShowShare;
