import { CheckCircle, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

interface SuccessScreenProps {
  owner: string
  repo: string
  repoUrl: string
}

export default function SuccessScreen({ owner, repo, repoUrl }: SuccessScreenProps) {
  return (
    <div className="flex flex-col items-center text-center py-8">
      <CheckCircle className="h-16 w-16 text-brand-teal" />
      <h2 className="mt-4 text-2xl font-bold text-stone-900">
        Repository Created
      </h2>
      <p className="mt-2 text-stone-600 max-w-md">
        Your research map repository has been set up and the generation workflow is running.
      </p>

      <div className="mt-6 w-full max-w-sm rounded-md border border-stone-200 bg-stone-50 p-4 text-sm">
        <p className="text-stone-500">Repository</p>
        <a
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 font-mono text-brand-teal hover:underline break-all"
        >
          {owner}/{repo}
          <ExternalLink className="h-3 w-3 flex-shrink-0" />
        </a>
      </div>

      <Link
        to={`/progress/${owner}/${repo}`}
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-brand-teal text-white text-sm font-medium rounded-md hover:bg-brand-teal-dark transition-colors"
      >
        View Progress
      </Link>

      <Link
        to="/"
        className="mt-3 text-sm text-stone-500 hover:text-brand-teal transition-colors"
      >
        Back to Home
      </Link>
    </div>
  )
}
