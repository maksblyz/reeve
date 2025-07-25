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
  const [tasks, setTasks] = useState<Task[]>(
    Array.from({ length: MAX }, (_, i) => ({ id: i + 1, text: "", done: false}))
  );
  const [visible, setVisible] = useState<number>(1);
  const [locked, setLocked] = useState<boolean>(false);
  const [remaining, setRemaining] = useState<number>(TWELVE_HOURS_SEC);
  const [price, setPrice] = useState<number>(10);
  const [charging, setCharging] = useState<boolean>(false);
  const [chargeResult, setChargeResult] = useState<string>("");

  // Check if all tasks are completed
  const allTasksCompleted = tasks.every(task => task.done);

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
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [locked, remaining]);

  // reset when all tasks are completed
  useEffect(() => {
    if (allTasksCompleted && locked) {
      setTimeout(() => {
        reset();
      }, 1000); // Wait 1 second before resetting
    }
  }, [allTasksCompleted, locked]);

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
    if (e.key === "Enter" && visible < MAX && !locked) {
      setVisible((v) => v + 1);
    }
  };

  const updateText = (idx: number, text: string) => {
    setTasks((tasks) => 
      tasks.map((t, i) => (i === idx ? { ...t, text } : t))
    );
  };

  const toggleDone = (idx: number) => {
    setTasks((tasks) => 
      tasks.map((t, i) => (i === idx ? { ...t, done: !t.done } : t))
    );
  };

  const lock = () => {
    if (locked) return;
    setLocked(true);
    setRemaining(TWELVE_HOURS_SEC);
  };

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

  const reset = () => {
    setTasks(Array.from({ length: MAX }, (_, i) => ({ id: i + 1, text: "", done: false})));
    setVisible(1);
    setLocked(false);
    setRemaining(TWELVE_HOURS_SEC);
    setPrice(10);
  };

  return (
    <main className="min-h-screen bg-white text-black flex flex-col items-center test-style">
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
          {Array.from({ length: visible }).map((_, i) => (
            <div key={i} className="flex items-center">
              {/* checkbox */}
              <button
                onClick={() => toggleDone(i)}
                className={`h-5 w-5 rounded border flex items-center justify-center mr-2 ${
                  tasks[i].done
                    ? "bg-black text-white border-black"
                    : "border-gray-400"
                }`}
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
                disabled={locked}
                autoFocus={i === visible - 1 && !locked}
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
                    className="w-20 px-2 py-2 text-base border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                  />
                </div>
                <button
                  onClick={lock}
                  className="px-4 py-2 text-base font-medium border border-black rounded hover:bg-black hover:text-white transition"
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