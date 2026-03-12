import { Link } from 'react-router-dom'
import { Github, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { isOAuthConfigured } from '@/lib/oauth'

export default function Navbar() {
  const { user, login, logout } = useAuth()

  return (
    <nav className="border-b border-stone-200 bg-white">
      <div className="max-w-[100rem] mx-auto px-6 lg:px-12 xl:px-20 h-14 flex items-center justify-between">
        <Link to="/" className="text-lg font-bold text-stone-900 hover:text-brand-teal transition-colors">
          AI Map
        </Link>

        <div className="flex items-center gap-6 text-sm text-stone-600">
          <Link to="/create" className="hover:text-brand-teal transition-colors">
            Create
          </Link>
          {user && (
            <Link to="/dashboard" className="hover:text-brand-teal transition-colors">
              My Maps
            </Link>
          )}
          <a
            href="https://github.com/poloclub/ai-map"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-teal transition-colors"
          >
            <Github className="w-5 h-5" />
          </a>

          {!isOAuthConfigured() ? null : user ? (
            <div className="flex items-center gap-3">
              <img
                src={user.avatar_url}
                alt={user.login}
                className="w-6 h-6 rounded-full"
              />
              <span className="text-stone-700 font-medium">{user.login}</span>
              <button
                onClick={logout}
                className="flex items-center gap-1 text-stone-400 hover:text-stone-600 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={login}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white text-xs font-medium rounded-md hover:bg-stone-800 transition-colors"
            >
              <Github className="w-3.5 h-3.5" />
              Sign in with GitHub
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
