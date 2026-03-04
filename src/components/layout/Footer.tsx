import { Scale } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-stone-50">
      <div className="px-6 lg:px-12 xl:px-20 py-6 flex items-center justify-between text-xs text-stone-400">
        <p>
          Built by Sri Ranganathan Palaniappan and researchers at the{' '}
          <a
            href="https://poloclub.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-teal hover:underline"
          >
            Polo Club of Data Science
          </a>
          , Georgia Institute of Technology
        </p>
        <p className="flex items-center gap-1">
          <Scale className="w-3 h-3" />
          MIT License
        </p>
      </div>
    </footer>
  )
}
