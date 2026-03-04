import { ExternalLink } from 'lucide-react'
import type { Deployment } from '@/types'

const deployments: Deployment[] = [
  {
    university: 'Georgia Tech',
    department: 'College of Computing',
    researcherCount: 177,
    url: 'https://poloclub.github.io/ai-map/',
  },
]

export default function Deployments() {
  return (
    <section className="py-16 sm:py-20">
      <div className="max-w-5xl mx-auto px-6">
        <h2 className="text-2xl font-bold text-stone-900">Deployed maps</h2>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {deployments.map((d) => (
            <a
              key={d.url}
              href={d.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block border border-stone-200 rounded-lg p-5 hover:border-brand-teal transition-colors bg-white"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-stone-900 group-hover:text-brand-teal transition-colors">
                    {d.university}
                  </h3>
                  <p className="text-sm text-stone-500 mt-1">{d.department}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-stone-400 group-hover:text-brand-teal transition-colors shrink-0 mt-1" />
              </div>
              <p className="text-xs text-stone-400 mt-3">
                {d.researcherCount} researchers
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
