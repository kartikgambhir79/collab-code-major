import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import { useState, useEffect } from 'react';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore auth state from localStorage before rendering routes
  useEffect(() => {
    const savedUser = localStorage.getItem('collab_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('collab_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('collab_user');
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-white flex flex-col">
        {loading ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {user && <Navbar user={user} onLogout={handleLogout} />}
            <main className="flex-grow flex flex-col">
              <Routes>
                <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
                <Route path="/" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
                <Route path="/project/:id" element={user ? <Editor user={user} /> : <Navigate to="/login" />} />
                <Route path="/profile/:username" element={user ? <Profile user={user} /> : <Navigate to="/login" />} />
              </Routes>
            </main>
          </>
        )}
      </div>
    </Router>
  );
}

export default App;
