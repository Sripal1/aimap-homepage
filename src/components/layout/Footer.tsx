import { Github, ExternalLink } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-stone-500">
          <p>
            Built at{' '}
            <a
              href="https://poloclub.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-teal hover:underline"
            >
              Polo Club of Data Science
            </a>
            {' '}· Georgia Tech
          </p>

          <div className="flex items-center gap-5">
            <a
              href="https://poloclub.github.io/ai-map/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-brand-teal transition-colors"
            >
              Demo <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="https://github.com/poloclub/ai-map"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-brand-teal transition-colors"
            >
              GitHub <Github className="w-3 h-3" />
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6">
          MIT License
        </p>
      </div>
    </footer>
  )
}
