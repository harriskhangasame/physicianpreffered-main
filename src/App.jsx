import React, { useState } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Chat from './components/Chat';
import Sidebar from './components/Sidebar';
import 'antd/dist/reset.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; // Import Router components

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Sidebar is open by default

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen); // Toggle sidebar visibility
  };

  return (
    <Router>
      <div className="flex flex-col h-screen">
        <Navbar toggleSidebar={toggleSidebar} />
        <div className="flex flex-1">
          {isSidebarOpen && <Sidebar />}
          <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-[16vw]' : 'ml-0'}`}>
            {/* Define Routes Here */}
            <Routes>
              {/* Root path for general Chat */}
              <Route path="/" element={<Chat isSidebarOpen={isSidebarOpen} />} />
              {/* Dynamic path for specific uploads */}
              <Route path="/uploads/:id" element={<Chat isSidebarOpen={isSidebarOpen} />} />
              {/* Add more routes as needed */}
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
