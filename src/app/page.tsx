"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const MAX = 3;

interface Task {
  id: number;
  text: string;
  done: boolean;
}

export default function Landing() {
  const [visible, setVisible] = useState(0);

  // stagger the reveal ↑
  useEffect(() => {
    const iv = setInterval(
      () => setVisible((v) => (v < MAX ? v + 1 : (clearInterval(iv), v))),
      250
    );
    return () => clearInterval(iv);
  }, []);

  const tasks: Task[] = [
    { id: 1, text: "All signal", done: false },
    { id: 2, text: "No noise", done: false },
    { id: 3, text: "More focused", done: false },
  ];

  return (
    <main className="min-h-screen bg-white flex flex-col items-center">
      {/* centre block */}
      <div className="flex-1 w-full flex flex-col items-center justify-center -mt-16">
        <div className="w-full max-w-sm space-y-6">
          {/* logo */}
          <div className="text-center">
            <h1 className="text-4xl font-light tracking-wide text-gray-900" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>reeve</h1>
          </div>
          
          <div className="space-y-3 pt-8">
          <AnimatePresence>
            {tasks.slice(0, visible).map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center"
              >
                <div className="h-5 w-5 rounded border border-gray-400 mr-2" />
                <label className="text-base font-medium text-gray-900 mr-2 w-6 text-right">{i + 1}.</label>
                <input
                  disabled
                  value={t.text}
                  className="flex-1 border-b border-gray-300 bg-transparent text-base text-gray-400 cursor-default"
                  placeholder="your wildly ambitious task"
                />
              </motion.div>
            ))}
          </AnimatePresence>

          </div>
          
          {/* sign‑in / up */}
          <div className="pt-8 flex justify-center space-x-4">
            <Link
              href="/signup"
              className="px-4 py-2 text-sm border border-black rounded hover:bg-black hover:text-white transition"
            >
              sign up
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm border border-black rounded hover:bg-black hover:text-white transition"
            >
              log in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
