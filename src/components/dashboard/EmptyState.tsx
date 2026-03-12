import { Link } from 'react-router-dom'
import { Map } from 'lucide-react'

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center py-20">
      <Map className="h-12 w-12 text-stone-300" />
      <h2 className="mt-4 text-xl font-bold text-stone-900">No maps yet</h2>
      <p className="mt-2 text-stone-500 max-w-sm">
        Create your first research map to get started.
      </p>
      <Link
        to="/create"
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-brand-teal text-white text-sm font-medium rounded-md hover:bg-brand-teal-dark transition-colors"
      >
        Create a Map
      </Link>
    </div>
  )
}
