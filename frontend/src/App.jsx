import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

function App() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // Default to dark theme for dashboard
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  return (
    <Router>
      <div className={`min-h-screen transition-colors duration-300 ${
        dark ? 'bg-[#0C0E14] text-[#EEE9E0]' : 'bg-[#F7F5F2] text-[#1A1714]'
      } font-sans`}>
        <main>
          <Routes>
            <Route path="/login" element={<Login dark={dark} setDark={setDark} />} />
            <Route path="/register" element={<Register dark={dark} setDark={setDark} />} />
            <Route path="/" element={<Dashboard dark={dark} setDark={setDark} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
