import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import { AlertCircle, Users, FileText, BarChart, ArrowUp, ArrowDown, Shield, Calendar } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [botUsers, setBotUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingBots, setIsLoadingBots] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalGenerations: 0,
    newUsers24h: 0,
    failedPayments: 0
  });

  useEffect(() => {
    // Sjekk om brukeren er super admin

    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        const response = await api.fetch('/api/admin/users');
        
        if (response.ok) {
          const data = await response.json();
          setActiveUsers(data.users);
          
          // Kalkuler grunnleggende statistikk
          setStats(prevStats => ({
            ...prevStats,
            totalUsers: data.users.length,
            activeSubscriptions: data.users.filter((u: any) => u.subscription_status === 'active').length,
            totalGenerations: data.users.reduce((acc: number, u: any) => acc + (u.total_generations || 0), 0),
            newUsers24h: data.users.filter((u: any) => {
              const created = new Date(u.created_at);
              const now = new Date();
              const diff = now.getTime() - created.getTime();
              return diff < 24 * 60 * 60 * 1000;
            }).length
          }));
        } else {
          setError('Failed to load users');
        }
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Error loading users data');
      } finally {
        setIsLoadingUsers(false);
      }
    };
    
    const fetchBots = async () => {
      try {
        setIsLoadingBots(true);
        const response = await api.fetch('/api/admin/bots');
        
        if (response.ok) {
          const data = await response.json();
          setBotUsers(data.bots || []);
        } else {
          console.warn('Failed to load bot users');
        }
      } catch (err) {
        console.error('Error fetching bot users:', err);
      } finally {
        setIsLoadingBots(false);
      }
    };
    
    fetchUsers();
    fetchBots();
  }, []);
  
  const reactivateUser = async (userId: string) => {
    try {
      const response = await api.fetch(`/api/admin/activate-user/${userId}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Oppdater bot-listen
        setBotUsers(prevBots => prevBots.filter(bot => bot.id !== userId));
        alert('User reactivated successfully');
      } else {
        alert('Failed to reactivate user');
      }
    } catch (err) {
      console.error('Error reactivating user:', err);
      alert('Error reactivating user');
    }
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mb-6">Admin Dashboard</h1>
        
        {error && (
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-4 mb-6 text-red-800 dark:text-red-200">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center">
            <Users className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mr-3" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center">
            <Calendar className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mr-3" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Subscriptions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeSubscriptions}</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center">
            <FileText className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mr-3" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Generations</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalGenerations}</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center">
            <ArrowUp className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mr-3" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">New Users (24h)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.newUsers24h}</p>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center">
            <Shield className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mr-3" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Blocked Bots</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{botUsers.length}</p>
            </div>
          </div>
        </div>
        
        {/* Bot Users */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-emerald-800 dark:text-emerald-200 mb-4">Blocked Bot Users</h2>
          
          {isLoadingBots ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-200 border-t-emerald-600"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading bot data...</p>
            </div>
          ) : botUsers.length > 0 ? (
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Login</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Detections</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {botUsers.map(bot => (
                    <tr key={bot.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{bot.email}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(bot.created_at)}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(bot.last_login)}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{bot.detection_count}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${bot.is_active ? 
                          'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 
                          'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>
                          {bot.is_active ? 'Active' : 'Blocked'}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                        <button 
                          onClick={() => reactivateUser(bot.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs"
                        >
                          Reactivate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
              <p className="text-gray-600 dark:text-gray-400">No bot users detected</p>
            </div>
          )}
        </div>
        
        {/* Recent Users */}
        <div>
          <h2 className="text-xl font-semibold text-emerald-800 dark:text-emerald-200 mb-4">Recent Users</h2>
          
          {isLoadingUsers ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-200 border-t-emerald-600"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading user data...</p>
            </div>
          ) : activeUsers.length > 0 ? (
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Plan</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tokens</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Created</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Last Login</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {activeUsers.slice(0, 10).map(user => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{user.email}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.plan_type}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.tokens?.toLocaleString() || 0}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(user.last_login)}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${user.is_active ? 
                          'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 
                          'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
              <p className="text-gray-600 dark:text-gray-400">No users found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}