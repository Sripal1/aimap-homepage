import { Link } from 'react-router-dom'
import { ArrowRight, Github, FileText, CirclePlay, Globe } from 'lucide-react'

const steps = [
  {
    icon: Github,
    label: 'Sign in with GitHub',
    desc: 'Creates a repo from the AI Map template on your account to host the map',
  },
  {
    icon: FileText,
    label: 'Add researchers',
    desc: 'Paste Google Scholar URLs and provide an LLM API key',
  },
  {
    icon: [Github, CirclePlay],
    label: 'GitHub Actions runs',
    desc: 'Scrapes Google Scholar, calls your LLM API for summaries, and generates the AI Map',
  },
  {
    icon: Globe,
    label: 'Get a GitHub Pages site',
    desc: 'An interactive AI Map of your institution\u2019s researchers, deployed to github.io',
  },
]

export default function CreateCTA() {
  return (
    <section className="relative bg-white py-24 lg:py-32">
      {/* Gradient divider at top */}
      <div className="absolute top-0 left-0 right-0 flex justify-center">
        <div className="w-full max-w-7xl h-[2px] rounded-full bg-gradient-to-r from-transparent via-stone-500 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-12 xl:px-20">
        <div className="flex flex-col lg:flex-row items-center gap-14 lg:gap-16">

          {/* Left — vertical pipeline */}
          <div className="lg:w-auto lg:shrink-0">
            <div className="relative">
              {/* Vertical connecting line */}
              <div className="absolute top-[15px] left-[14px] w-px bg-stone-300" style={{ height: 'calc(100% - 4.5rem)' }} />

              <div className="space-y-12">
                {steps.map((step) => (
                  <div key={step.label} className="flex items-start gap-5">
                    <div className="relative z-10 w-[30px] h-[30px] rounded-full border border-stone-300 bg-white flex items-center justify-center shrink-0">
                      {Array.isArray(step.icon) ? (
                        <>
                          <Github className="w-3 h-3 text-brand-teal absolute -translate-x-1 -translate-y-1" />
                          <CirclePlay className="w-3.5 h-3.5 text-brand-teal relative z-10 translate-x-0.5 translate-y-0.5" />
                        </>
                      ) : (
                        <step.icon className="w-3.5 h-3.5 text-brand-teal" />
                      )}
                    </div>
                    <div className="pt-0.5">
                      <p className="text-sm font-medium text-stone-800">
                        {step.label}
                      </p>
                      <p className="mt-1 text-xs text-stone-400 leading-relaxed max-w-[280px]">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — heading, subtitle, CTA */}
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 tracking-tight">
              Create <span className="font-light">your university's</span> custom AI Map
            </h2>
            <ul className="mt-4 space-y-2 text-stone-400 max-w-lg">
              <li className="flex gap-2">
                <ArrowRight className="w-4 h-4 text-stone-300 shrink-0 mt-0.5" />
                <span>Provide a list of <span className="text-stone-700">Google Scholar URLs</span> and an <span className="text-stone-700">LLM API key</span>.</span>
              </li>
              <li className="flex gap-2">
                <ArrowRight className="w-4 h-4 text-stone-300 shrink-0 mt-0.5" />
                <span><span className="text-stone-700 underline underline-offset-2">No local setup required</span>. The entire pipeline runs on <span className="text-stone-700">GitHub Actions</span>.</span>
              </li>
              <li className="flex gap-2">
                <ArrowRight className="w-4 h-4 text-stone-300 shrink-0 mt-0.5" />
                <span>Deploys to <span className="text-stone-700">GitHub Pages</span>.</span>
              </li>
            </ul>
            <div className="mt-8">
              <Link
                to="/create"
                className="group inline-flex items-center gap-2 px-6 py-2.5 bg-sky-500/20 text-sky-700 text-sm font-medium rounded-md hover:bg-sky-500/30 transition-colors"
              >
                Get Started
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
