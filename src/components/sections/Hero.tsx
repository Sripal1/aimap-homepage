import { ExternalLink, Github, Star } from 'lucide-react'
import { useGitHubStars } from '@/hooks/useGitHubStars'

const DEMO_URL = 'https://poloclub.github.io/ai-map/'
const BASE = import.meta.env.BASE_URL

export default function Hero() {
  const stars = useGitHubStars('poloclub/ai-map')

  return (
    <section className="min-h-[calc(100vh-3.5rem)] flex items-center py-10 overflow-hidden">
      <div className="w-full max-w-[100rem] mx-auto px-6 lg:px-12 xl:px-20">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14">
          {/* Left — text */}
          <div className="lg:w-[360px] lg:shrink-0">
            <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 tracking-tight">
              AI Map
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-stone-600">
              An open-source tool that generates interactive 2D maps of
              university research groups from Google Scholar data.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={DEMO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-500 text-white text-sm font-medium rounded-md hover:bg-sky-600 transition-colors"
              >
                Try the Demo
                <ExternalLink className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/poloclub/ai-map"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 border border-stone-300 text-stone-700 text-sm font-medium rounded-md hover:border-stone-400 hover:bg-stone-50 transition-colors"
              >
                <Github className="w-4 h-4" />
                View on GitHub
                {stars !== null && (
                  <span className="inline-flex items-center gap-1 ml-1 text-stone-500">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {stars}
                  </span>
                )}
              </a>
            </div>

            <p className="mt-6 text-sm text-stone-400">
              Georgia Tech College of Computing — 177 researchers
            </p>
          </div>

          {/* Right — screenshot, bleeds all the way to the right edge */}
          <div className="flex-1 min-w-0">
            <a
              href={DEMO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              <div className="relative cursor-pointer">
                {/* Soft glow behind the card */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-brand-teal/20 to-stone-200/40 blur-xl opacity-60 transition-opacity duration-500 group-hover:opacity-85" />

                <div className="relative rounded-2xl shadow-2xl shadow-stone-300/50 border border-stone-200/60 bg-white p-4 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:shadow-[-6px_8px_30px_rgba(0,0,0,0.12)] group-hover:border-brand-teal/30">
                  <img
                    src={`${BASE}screenshots/gt-map-preview.png`}
                    alt="Georgia Tech AI Map showing 177 researchers plotted on a 2D layout"
                    className="w-full rounded-lg"
                  />
                </div>

                {/* External link icon — top-right corner of the card */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 scale-90 group-hover:scale-100">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-stone-800/70 backdrop-blur-sm text-white shadow-md">
                    <ExternalLink className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
