"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";

interface TaskSession {
  id: string;
  tasks: unknown[];
  visible: number;
  locked: boolean;
  remaining: number;
  price: number;
  lockTime: string | null;
  created_at: string;
  updated_at: string;
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [taskSessions, setTaskSessions] = useState<TaskSession[]>([]);
  const [totalSpend, setTotalSpend] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    cardLast4: '',
    cardBrand: ''
  });
  const [isEditing, setIsEditing] = useState(false);

  // Generate calendar-style heatmap data with useMemo
  const { days, countsByDate } = useMemo(() => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 27); // Last 28 days
    
    const days: Date[] = [];
    const countsByDate: Record<string, number> = {};
    
    // Generate all dates and count sessions
    for (let i = 0; i < 28; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
      
      const dateStr = date.toISOString().split('T')[0];
      const sessionsOnDate = taskSessions.filter(session => {
        const sessionDate = new Date(session.created_at).toISOString().split('T')[0];
        return sessionDate === dateStr;
      });
      countsByDate[dateStr] = sessionsOnDate.length;
    }
    
    return { days, countsByDate };
  }, [taskSessions]);

  // Generate calendar grid with fixed layout
  const calendarGrid = useMemo(() => {
    if (days.length === 0) return [];
    
    const grid: (Date | null)[][] = [];
    
    // Create exactly 4 weeks with 7 days each
    for (let week = 0; week < 4; week++) {
      const currentWeek: (Date | null)[] = [];
      for (let day = 0; day < 7; day++) {
        const dayIndex = week * 7 + day;
        if (dayIndex < days.length) {
          currentWeek.push(days[dayIndex]);
        } else {
          currentWeek.push(null);
        }
      }
      grid.push(currentWeek);
    }
    
    return grid;
  }, [days]);

  // Load user's task sessions and info
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.error('No session found');
          setLoading(false);
          return;
        }

        // Load task sessions
        const sessionsResponse = await fetch("/api/user-task-sessions", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
          },
        });

        if (sessionsResponse.ok) {
          const data = await sessionsResponse.json();
          setTaskSessions(data.taskSessions);
          
          // Calculate total spend
          const total = data.taskSessions
            .filter((session: TaskSession) => session.locked)
            .reduce((sum: number, session: TaskSession) => sum + session.price, 0);
          setTotalSpend(total);
        }

        // Load user info
        const userResponse = await fetch("/api/user-info", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('Loaded user data:', userData);
          setUserInfo(userData);
        } else {
          console.error('Failed to load user info:', userResponse.status);
          const errorText = await userResponse.text();
          console.error('Error response:', errorText);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, []);

  // Get activity color for a specific date
  const getActivityColor = (date: Date | null) => {
    if (!date) return 'bg-transparent';
    const dateStr = date.toISOString().split('T')[0];
    const count = countsByDate[dateStr] || 0;
    return count > 0 ? 'bg-green-500' : 'bg-gray-200';
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-black flex flex-col items-center justify-center">
        <div className="text-sm text-gray-600">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="fixed top-4 left-4 right-4 flex justify-between items-start z-10">
        <button 
          onClick={() => window.history.back()}
          className="text-xl font-light tracking-wide text-gray-900"
          style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}
        >
          ← back
        </button>
        <div className="w-16"></div> {/* Spacer for centering */}
      </div>

      {/* Content */}
      <div className="pt-20 px-4">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-8 justify-center">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'profile'
                ? 'border-b-2 border-black text-black'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'border-b-2 border-black text-black'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Settings
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <div className="space-y-8">
            {/* Total Spend */}
                          <div className="text-center">
                <div className="text-[10rem] font-light text-gray-900">${totalSpend}</div>
                <div className="text-xl text-gray-500 -mt-2">Total spend</div>
              </div>

            {/* Activity Heatmap */}
            <div>
              <div className="grid grid-cols-7 gap-2 max-w-sm mx-auto justify-items-center">
                {/* Heatmap cells - weeks as columns, weekdays as rows */}
                {calendarGrid.map((week, weekIndex) => 
                  week.map((date, dayIndex) => {
                    if (!date) {
                      return <div key={`${weekIndex}-${dayIndex}`} className="w-7 h-7" />;
                    }
                    
                    const dateStr = date.toISOString().split('T')[0];
                    const count = countsByDate[dateStr] || 0;
                    
                    return (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className={`w-7 h-7 rounded-sm ${getActivityColor(date)} transition-colors`}
                        title={`${date.toLocaleDateString()}: ${count} sessions`}
                      />
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-md mx-auto">
            {/* Edit Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="px-4 py-2 text-sm font-medium text-black border border-black rounded-md hover:bg-black hover:text-white transition-colors"
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={userInfo.name}
                  onChange={(e) => setUserInfo({...userInfo, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  placeholder="Enter your name"
                />
              ) : (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                  {userInfo.name || 'Not set'}
                </div>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              {isEditing ? (
                <input
                  type="email"
                  value={userInfo.email}
                  onChange={(e) => setUserInfo({...userInfo, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  placeholder="Enter your email"
                />
              ) : (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-900">
                  {userInfo.email || 'Not set'}
                </div>
              )}
            </div>

            {/* Credit Card Info */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Credit Card</label>
              <div className="space-y-2">
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600">
                  {userInfo.cardLast4 ? `•••• •••• •••• ${userInfo.cardLast4}` : 'No card on file'}
                </div>
                {isEditing && (
                  <button
                    onClick={async () => {
                      try {
                        console.log('Opening billing portal...');
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) {
                          console.error('No session found');
                          return;
                        }
                        
                        console.log('Making API call to create billing portal...');
                        const response = await fetch("/api/create-billing-portal", {
                          method: "POST",
                          headers: {
                            "Authorization": `Bearer ${session.access_token}`,
                          },
                        });
                        
                        console.log('Response status:', response.status);
                        
                        if (response.ok) {
                          const data = await response.json();
                          console.log('Billing portal response:', data);
                          if (data.url) {
                            console.log('Redirecting to:', data.url);
                            window.location.href = data.url;
                          } else {
                            console.error('No URL in response');
                            alert('Failed to get billing portal URL');
                          }
                        } else {
                          const errorText = await response.text();
                          console.error('API error:', response.status, errorText);
                          alert(`Error: ${errorText}`);
                        }
                      } catch (error) {
                        console.error('Error opening billing portal:', error);
                        alert('Failed to open billing portal');
                      }
                    }}
                    className="w-full px-4 py-2 text-sm font-medium text-black border border-black rounded-md hover:bg-black hover:text-white transition-colors"
                  >
                    {userInfo.cardLast4 ? 'Change Card' : 'Add Card'}
                  </button>
                )}
              </div>
            </div>

            {/* Save Button (only when editing) */}
            {isEditing && (
              <div className="pt-4">
                <button
                  onClick={() => {
                    // TODO: Save changes to backend
                    setIsEditing(false);
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-black border border-black rounded-md hover:bg-gray-800 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            )}

            {/* Sign Out / Delete Account Button */}
            <div className="pt-4">
              {isEditing ? (
                <button
                  onClick={async () => {
                    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                      try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) return;

                        // Delete from database first
                        const response = await fetch("/api/delete-account", {
                          method: "DELETE",
                          headers: {
                            "Authorization": `Bearer ${session.access_token}`,
                          },
                        });

                        if (response.ok) {
                          // Then sign out and redirect
                          await supabase.auth.signOut();
                          window.location.href = '/login';
                        } else {
                          const errorText = await response.text();
                          alert(`Failed to delete account: ${errorText}`);
                        }
                      } catch (error) {
                        console.error('Error deleting account:', error);
                        alert('Failed to delete account');
                      }
                    }
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-md hover:bg-red-700 transition-colors"
                >
                  Delete Account
                </button>
              ) : (
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = '/login';
                  }}
                  className="w-full px-4 py-2 text-sm font-medium text-red-600 border border-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}