import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import { Edit, Trash2, Plus, History, Calendar } from 'lucide-react';

interface Session {
  id: number;
  name: string;
  preview?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

interface SessionSelectorProps {
  onSessionSelect: (session: Session) => void;
  onSessionCreate?: () => void;
  className?: string;
}

export const SessionSelector: React.FC<SessionSelectorProps> = ({
  onSessionSelect,
  onSessionCreate,
  className = '',
}) => {
  const { user } = useAuthStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.fetch('/api/sessions');
      if (!response.ok) {
        throw new Error('Failed to load sessions');
      }

      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (err: any) {
      console.error('Error loading sessions:', err);
      setError(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadSessions();
    }
  }, [user]);

  const handleCreateSession = async () => {
    try {
      const response = await api.fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `New Session ${new Date().toLocaleString()}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      // Refresh the sessions list
      loadSessions();

      // If there's a callback, call it
      if (onSessionCreate) {
        onSessionCreate();
      }
    } catch (err: any) {
      console.error('Error creating session:', err);
      setError(err.message || 'Failed to create session');
    }
  };

  const handleDeleteSession = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }

    try {
      const response = await api.fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      // Refresh the sessions list
      loadSessions();
    } catch (err: any) {
      console.error('Error deleting session:', err);
      setError(err.message || 'Failed to delete session');
    }
  };

  const startEditingName = (sessionId: number, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(sessionId);
    setEditingName(currentName);
  };

  const saveSessionName = async (sessionId: number, e: React.FormEvent) => {
    e.preventDefault();

    if (!editingName.trim()) {
      return;
    }

    try {
      const response = await api.fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to rename session');
      }

      // Refresh the sessions list
      loadSessions();
      setEditingSessionId(null);
    } catch (err: any) {
      console.error('Error renaming session:', err);
      setError(err.message || 'Failed to rename session');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center p-4`}>
        <div className="animate-pulse text-emerald-600 dark:text-emerald-400">
          Loading sessions...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} text-red-500 p-4`}>
        Error: {error}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
          {sessions.length === 0
            ? 'No Previous Sessions'
            : `Previous Sessions (${sessions.length}/6)`}
        </h3>
        {sessions.length < 6 && (
          <button
            onClick={handleCreateSession}
            className="flex items-center gap-1 px-2 py-1 text-sm bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-md hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
          >
            <Plus className="h-4 w-4" />
            <span>New Session</span>
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <Calendar className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-center">
            You don't have any sessions yet. Create a new one or start generating spreadsheets.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSessionSelect(session)}
              className={`
                cursor-pointer border rounded-lg overflow-hidden 
                ${
                  session.is_active
                    ? 'border-emerald-500 dark:border-emerald-400'
                    : 'border-gray-200 dark:border-gray-700'
                }
                bg-white dark:bg-gray-800 hover:shadow-md transition-shadow
              `}
            >
              <div className="relative h-32 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                {session.preview ? (
                  <img
                    src={session.preview}
                    alt={session.name}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <History className="h-10 w-10 text-gray-300 dark:text-gray-600" />
                  </div>
                )}
                {session.is_active && (
                  <div className="absolute top-2 right-2 px-2 py-1 text-xs bg-emerald-500 text-white rounded-md">
                    Active
                  </div>
                )}
              </div>

              <div className="p-4">
                {editingSessionId === session.id ? (
                  <form onSubmit={(e) => saveSessionName(session.id, e)}>
                    <label htmlFor={`session-name-${session.id}`} className="sr-only">Session name</label>
                    <input
                      id={`session-name-${session.id}`}
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full p-2 border border-emerald-300 dark:border-emerald-700 rounded bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Enter session name"
                      title="Enter session name"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        type="button"
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm mr-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSessionId(null);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 text-sm"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-gray-800 dark:text-gray-200 truncate">
                        {session.name}
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) =>
                            startEditingName(session.id, session.name, e)
                          }
                          className="text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                          title="Rename session"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete session"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDate(session.updated_at)}
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};