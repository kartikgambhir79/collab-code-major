import { Link, useNavigate } from 'react-router-dom';
import { Home, User, LogOut, Bell } from 'lucide-react';

export default function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  return (
    <nav className="border-b border-slate-700 bg-slate-800 shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
              CollabCode
            </Link>
          </div>
          <div className="flex items-center space-x-6">
            <button className="text-slate-300 hover:text-white relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-slate-800"></span>
            </button>
            <Link to="/" className="text-slate-300 hover:text-white flex items-center space-x-1">
              <Home className="w-5 h-5" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <Link to={`/profile/${user.username}`} className="text-slate-300 hover:text-white flex items-center space-x-1">
              <User className="w-5 h-5" />
              <span className="hidden sm:inline">Profile</span>
            </Link>
            <button
              onClick={() => {
                onLogout();
                navigate('/login');
              }}
              className="text-red-400 hover:text-red-300 flex items-center space-x-1"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
