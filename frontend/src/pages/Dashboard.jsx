import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Code, Lock, Unlock, Heart } from 'lucide-react';
import axios from 'axios';

export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newProjectData, setNewProjectData] = useState({ title: '', language: 'javascript', visibility: 'public' });

  useEffect(() => {
    // Fetch real projects from PHP backend
    axios.get('http://localhost:8000/api/project.php?action=list')
      .then(res => {
        if (Array.isArray(res.data)) {
          setProjects(res.data);
        }
      })
      .catch(err => console.error("Could not fetch projects: ", err));
  }, []);

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:8000/api/project.php?action=create', {
        title: newProjectData.title || 'Untitled Project',
        language: newProjectData.language,
        visibility: newProjectData.visibility,
        owner: user.username
      });
      if (res.data.success) {
        setShowModal(false);
        navigate(`/project/${res.data.id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProjects = projects.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {user.username}!</h1>
          <p className="text-slate-400">Discover public projects or continue working on your own.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          <span>New Project</span>
        </button>
      </div>

      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-500" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-4 border border-slate-700 rounded-xl leading-5 bg-slate-800 text-slate-300 placeholder-slate-500 focus:outline-none focus:bg-slate-700/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm transition-all"
          placeholder="Search for projects by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <h2 className="text-xl font-semibold mb-4 border-b border-slate-700 pb-2">Top Public Projects</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {filteredProjects.filter(p => p.visibility === 'public').map(project => (
          <ProjectCard key={project.id} project={project} onClick={() => navigate(`/project/${project.id}`)} />
        ))}
      </div>

      <h2 className="text-xl font-semibold mb-4 border-b border-slate-700 pb-2">Your Projects</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {filteredProjects.filter(p => p.author === user.username || p.owner === user.username).map(project => (
          <ProjectCard key={project.id} project={project} onClick={() => navigate(`/project/${project.id}`)} />
        ))}
      </div>
      
      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-700" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/80">
              <h2 className="text-xl font-semibold text-white">Create New Project</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors">
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitProject} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Project Title</label>
                <input
                  type="text"
                  required
                  value={newProjectData.title}
                  onChange={(e) => setNewProjectData({ ...newProjectData, title: e.target.value })}
                  placeholder="e.g. Authentication API"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-slate-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Language</label>
                <select
                  value={newProjectData.language}
                  onChange={(e) => setNewProjectData({ ...newProjectData, language: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="php">PHP</option>
                  <option value="html">HTML/CSS</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Visibility</label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      value="public"
                      checked={newProjectData.visibility === 'public'}
                      onChange={(e) => setNewProjectData({ ...newProjectData, visibility: e.target.value })}
                      className="text-blue-500 focus:ring-blue-500 bg-slate-900 border-slate-700"
                    />
                    <span className="text-slate-300 text-sm">Public</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="visibility"
                      value="private"
                      checked={newProjectData.visibility === 'private'}
                      onChange={(e) => setNewProjectData({ ...newProjectData, visibility: e.target.value })}
                      className="text-blue-500 focus:ring-blue-500 bg-slate-900 border-slate-700"
                    />
                    <span className="text-slate-300 text-sm">Private</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end pt-4 space-x-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-slate-800 rounded-xl border border-slate-700 p-5 hover:border-blue-500/50 hover:bg-slate-800/80 cursor-pointer transition-all hover:shadow-lg hover:shadow-blue-500/10 group"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
          {project.title}
        </h3>
        {project.visibility === 'public' ? (
          <Unlock className="w-4 h-4 text-slate-400" />
        ) : (
          <Lock className="w-4 h-4 text-slate-400" />
        )}
      </div>
      <div className="flex items-center space-x-4 text-sm text-slate-400 mb-4">
        <span className="flex items-center space-x-1">
          <Code className="w-4 h-4" />
          <span>{project.lang}</span>
        </span>
        <span className="flex items-center space-x-1">
          <Heart className="w-4 h-4 text-red-400" />
          <span>{project.likes}</span>
        </span>
      </div>
      <div className="text-sm border-t border-slate-700 pt-3">
        By <span className="font-medium text-slate-300">@{project.owner || project.author}</span>
      </div>
    </div>
  );
}
