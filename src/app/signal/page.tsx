"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Task {
  id: number;
  text: string;
  done: boolean;
}

const MAX = 3;
const TWELVE_HOURS_SEC = 12 * 60 * 60;

export default function Page() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [visible, setVisible] = useState<number>(1);
  const [locked, setLocked] = useState<boolean>(false);
  const [remaining, setRemaining] = useState<number>(TWELVE_HOURS_SEC);
  const [price, setPrice] = useState<number>(10);
  const [charging, setCharging] = useState<boolean>(false);
  const [chargeResult, setChargeResult] = useState<string>("");
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [lockTime, setLockTime] = useState<Date | null>(null);

  // Check if all tasks are completed
  const allTasksCompleted = tasks.every(task => task.done);

  // Function to save task state to database
  const saveTaskState = async (tasks: Task[], visible: number, locked: boolean, remaining: number, price: number, lockTime: Date | null) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No session found for saving task state');
        // Fallback to localStorage
        localStorage.setItem('reeve-tasks', JSON.stringify(tasks));
        localStorage.setItem('reeve-visible', JSON.stringify(visible));
        localStorage.setItem('reeve-locked', JSON.stringify(locked));
        localStorage.setItem('reeve-remaining', JSON.stringify(remaining));
        localStorage.setItem('reeve-price', JSON.stringify(price));
        if (lockTime) {
          localStorage.setItem('reeve-lockTime', lockTime.getTime().toString());
        } else {
          localStorage.removeItem('reeve-lockTime');
        }
        return;
      }

      const response = await fetch("/api/save-task-state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tasks,
          visible,
          locked,
          remaining,
          price,
          lockTime: lockTime?.toISOString() || null,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to save to database:', response.status, errorText);
        // Fallback to localStorage
        localStorage.setItem('reeve-tasks', JSON.stringify(tasks));
        localStorage.setItem('reeve-visible', JSON.stringify(visible));
        localStorage.setItem('reeve-locked', JSON.stringify(locked));
        localStorage.setItem('reeve-remaining', JSON.stringify(remaining));
        localStorage.setItem('reeve-price', JSON.stringify(price));
        if (lockTime) {
          localStorage.setItem('reeve-lockTime', lockTime.getTime().toString());
        } else {
          localStorage.removeItem('reeve-lockTime');
        }
      }
    } catch (error) {
      console.error('Error saving task state:', error);
      // Fallback to localStorage
      localStorage.setItem('reeve-tasks', JSON.stringify(tasks));
      localStorage.setItem('reeve-visible', JSON.stringify(visible));
      localStorage.setItem('reeve-locked', JSON.stringify(locked));
      localStorage.setItem('reeve-remaining', JSON.stringify(remaining));
      localStorage.setItem('reeve-price', JSON.stringify(price));
      if (lockTime) {
        localStorage.setItem('reeve-lockTime', lockTime.getTime().toString());
      } else {
        localStorage.removeItem('reeve-lockTime');
      }
    }
  };

  // Load saved state from database on mount
  useEffect(() => {
    const loadTaskState = async () => {
      try {
        // Get the current session from Supabase
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.error('No session found');
          // Fallback to default state
          setTasks(Array.from({ length: MAX }, (_, i) => ({ id: i + 1, text: "", done: false})));
          setIsLoaded(true);
          return;
        }

        console.log('Session found, access token length:', session.access_token?.length || 0);

        console.log('Loading task state...');
        const response = await fetch("/api/load-task-state", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
          },
        });

        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);

        if (response.ok) {
          const data = await response.json();
          setTasks(data.tasks);
          setVisible(data.visible);
          setLocked(data.locked);
          setRemaining(data.remaining);
          setPrice(data.price);
          setLockTime(data.lockTime ? new Date(data.lockTime) : null);
          
          // If timer has expired, charge the user
          if (data.locked && data.remaining <= 0) {
            setTimeout(() => chargeUser(), 100);
          }
        } else {
          console.error('Failed to load task state:', response.status);
          const errorText = await response.text();
          console.error('Error response:', errorText);
          
          // Try localStorage fallback
          try {
            const savedTasks = localStorage.getItem('reeve-tasks');
            if (savedTasks) {
              console.log('Using localStorage fallback');
              const tasks = JSON.parse(savedTasks);
              setTasks(tasks);
              
              const savedVisible = localStorage.getItem('reeve-visible');
              if (savedVisible) setVisible(JSON.parse(savedVisible));
              
              const savedLocked = localStorage.getItem('reeve-locked');
              if (savedLocked) setLocked(JSON.parse(savedLocked));
              
              const savedRemaining = localStorage.getItem('reeve-remaining');
              if (savedRemaining) setRemaining(JSON.parse(savedRemaining));
              
              const savedPrice = localStorage.getItem('reeve-price');
              if (savedPrice) setPrice(JSON.parse(savedPrice));
            } else {
              // Fallback to default state
              setTasks(Array.from({ length: MAX }, (_, i) => ({ id: i + 1, text: "", done: false})));
            }
          } catch (fallbackError) {
            console.error('Fallback error:', fallbackError);
            // Final fallback to default state
            setTasks(Array.from({ length: MAX }, (_, i) => ({ id: i + 1, text: "", done: false})));
          }
        }
      } catch (error) {
        console.error('Error loading task state:', error);
        // Fallback to default state
        setTasks(Array.from({ length: MAX }, (_, i) => ({ id: i + 1, text: "", done: false})));
      } finally {
        setIsLoaded(true);
      }
    };

    loadTaskState();
  }, []);

  const chargeUser = async () => {
    setCharging(true);
    try {
      // Get the current session from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No session found');
        setChargeResult('No session found');
        return;
      }

      const response = await fetch("/api/charge-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ amount: price }),
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        console.log(`Successfully charged $${price}`);
        setChargeResult(`Charged $${price} successfully!`);
      } else {
        console.error('Payment failed:', result.error);
        setChargeResult(`Payment failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error charging user:', error);
      setChargeResult('Payment error occurred');
    } finally {
      setCharging(false);
    }
  };

  // countdown
  useEffect(() => {
    if (!locked || remaining <= 0) return;
    const iv = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          // Timer expired - charge the user
          chargeUser();
          return 0;
        }
        const newRemaining = s - 1;
        saveTaskState(tasks, visible, locked, newRemaining, price, lockTime);
        return newRemaining;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [locked, remaining, tasks, visible, price, lockTime]); // Added dependencies for saveTaskState

  // Save price changes to database
  useEffect(() => {
    if (isLoaded) {
      saveTaskState(tasks, visible, locked, remaining, price, lockTime);
    }
  }, [price, isLoaded, tasks, visible, locked, remaining, lockTime]);

  // reset when all tasks are completed
  useEffect(() => {
    if (allTasksCompleted && isLoaded) {
      setIsResetting(true);
      setTimeout(() => {
        reset();
        setIsResetting(false);
      }, 1000); // Wait 1 second before resetting
    }
  }, [allTasksCompleted, isLoaded]);

  const format = (s: number) => {
    const h = Math.floor(s / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((s % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60)
      .toString()
      .padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  const onEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && visible < MAX && !locked && !isResetting) {
      setVisible((v) => {
        const newVisible = v + 1;
        saveTaskState(tasks, newVisible, locked, remaining, price, lockTime);
        return newVisible;
      });
    }
  };

  const updateText = (idx: number, text: string) => {
    setTasks((tasks) => {
      const newTasks = tasks.map((t, i) => (i === idx ? { ...t, text } : t));
      saveTaskState(newTasks, visible, locked, remaining, price, lockTime);
      return newTasks;
    });
  };

  const toggleDone = (idx: number) => {
    setTasks((tasks) => {
      const newTasks = tasks.map((t, i) => (i === idx ? { ...t, done: !t.done } : t));
      saveTaskState(newTasks, visible, locked, remaining, price, lockTime);
      return newTasks;
    });
  };

  const lock = () => {
    if (locked) return;
    const newLockTime = new Date();
    setLocked(true);
    setRemaining(TWELVE_HOURS_SEC);
    setLockTime(newLockTime);
    saveTaskState(tasks, visible, true, TWELVE_HOURS_SEC, price, newLockTime);
  };

  const reset = () => {
    const newTasks = Array.from({ length: MAX }, (_, i) => ({ id: i + 1, text: "", done: false}));
    setTasks(newTasks);
    setVisible(1);
    setLocked(false);
    setRemaining(TWELVE_HOURS_SEC);
    setPrice(10);
    setLockTime(null);
    
    // Save reset state to database
    saveTaskState(newTasks, 1, false, TWELVE_HOURS_SEC, 10, null);
  };

  // Don't render until data is loaded
  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-white text-black flex flex-col items-center justify-center">
        <div className="text-sm text-gray-600">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black flex flex-col items-center">
      {/* header with logo, timer, and profile */}
      <div className="fixed top-4 left-4 right-4 flex justify-between items-start">
        <h1 className="text-xl font-light tracking-wide text-gray-900" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>reeve</h1>
        
        {locked && (
          <div className="absolute left-1/2 transform -translate-x-1/2 space-y-2">
            <div className="text-sm font-mono">{format(remaining)}</div>
            {charging && (
              <div className="text-sm text-blue-600 font-medium">Processing payment...</div>
            )}
            {chargeResult && (
              <div className={`text-sm font-medium ${
                chargeResult.includes('successfully') ? 'text-green-600' : 'text-red-600'
              }`}>
                {chargeResult}
              </div>
            )}
          </div>
        )}
        
        <div className="text-xl font-light tracking-wide text-gray-900" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>profile</div>
      </div>

      {/* central block */}
      <div className="flex-1 w-full flex flex-col items-center justify-center">
        <div className="w-full max-w-sm space-y-3">
          {isResetting && (
            <div className="text-center py-4">
              <div className="text-sm text-green-600 font-medium">Tasks completed! Resetting</div>
            </div>
          )}
          {Array.from({ length: visible }).map((_, i) => (
            <div key={i} className="flex items-center">
              {/* checkbox */}
              <button
                onClick={() => toggleDone(i)}
                disabled={isResetting}
                className={`h-5 w-5 rounded border flex items-center justify-center mr-2 ${
                  tasks[i].done
                    ? "bg-black text-white border-black"
                    : "border-gray-400"
                } ${isResetting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {tasks[i].done && (
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
              <label className="text-sm mr-2 w-6 text-right">{i + 1}.</label>
              <input
                className="flex-1 border-b border-gray-300 focus:outline-none text-sm disabled:bg-transparent"
                value={tasks[i].text}
                onChange={(e) => updateText(i, e.target.value)}
                onKeyDown={onEnter}
                disabled={locked || isResetting}
                autoFocus={i === visible - 1 && !locked && !isResetting}
              />
            </div>
          ))}
          
          {/* lock button and price input */}
          <div className="pt-8 flex justify-center">
            {!locked ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <span className="text-base font-medium text-gray-900 mr-2">$</span>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    disabled={isResetting}
                    className={`w-20 px-2 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black ${
                      isResetting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
                <button
                  onClick={lock}
                  disabled={isResetting}
                  className={`px-4 py-2 text-base font-medium border border-black rounded transition ${
                    isResetting 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-black hover:text-white'
                  }`}
                >
                  Lock
                </button>
              </div>
            ) : (
              <div className="px-6 py-2 text-base font-medium border border-gray-300 rounded bg-gray-100 text-gray-600">
                ${price}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}