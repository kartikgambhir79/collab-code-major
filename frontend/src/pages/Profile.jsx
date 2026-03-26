import { useParams } from 'react-router-dom';
import { Trophy, Star, Users, Briefcase } from 'lucide-react';

export default function Profile({ user }) {
  const { username } = useParams();

  // Mock data for MVP
  const isOwnProfile = user.username === username;
  const profileData = {
    username: username,
    rank: 'Gold',
    totalLikes: 245,
    collaborations: 12,
    projectsCreated: 8,
    recentProjects: [
      { id: '1', title: 'Data Viz Dashboard', lang: 'JavaScript', likes: 120 },
      { id: '2', title: 'Sorting Applet', lang: 'Python', likes: 85 }
    ]
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
      <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 shadow-2xl relative overflow-hidden">
        {/* Decorative Background Element */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-500 rounded-full blur-[80px] opacity-10 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-1 shrink-0">
            <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-5xl font-bold text-white shadow-inner">
              {profileData.username.charAt(0).toUpperCase()}
            </div>
          </div>
          
          <div className="text-center md:text-left flex-1">
            <h1 className="text-4xl font-extrabold text-white mb-2 tracking-tight">@{profileData.username}</h1>
            <div className="flex items-center justify-center md:justify-start space-x-2 text-blue-400 font-medium mb-6">
              <Trophy className="w-5 h-5" />
              <span>{profileData.rank} Rank</span>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 hover:border-blue-500/30 transition-colors">
                <Briefcase className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white mb-1">{profileData.projectsCreated}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Projects</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 hover:border-blue-500/30 transition-colors">
                <Star className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white mb-1">{profileData.totalLikes}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Likes</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 hover:border-blue-500/30 transition-colors">
                <Users className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white mb-1">{profileData.collaborations}</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Collabs</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold mt-12 mb-6 border-b border-slate-700 pb-3 inline-flex items-center text-white">
        <Briefcase className="w-6 h-6 mr-3 text-slate-400" />
        Recent Projects
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {profileData.recentProjects.map(project => (
          <div key={project.id} className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:bg-slate-750 transition-all hover:border-blue-500/40 relative group cursor-pointer">
            <h3 className="text-lg font-bold text-white mb-3 group-hover:text-blue-400 transition-colors flex items-center justify-between">
              {project.title}
              <Star className="w-5 h-5 text-amber-400/50 group-hover:text-amber-400 transition-colors" />
            </h3>
            <div className="flex justify-between items-center text-sm">
              <span className="text-blue-300 font-mono bg-blue-900/30 px-3 py-1 rounded-full">{project.lang}</span>
              <span className="text-slate-400 font-medium flex items-center">
                {project.likes} Likes
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
